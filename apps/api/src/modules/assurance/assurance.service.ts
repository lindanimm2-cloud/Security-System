import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import {
  ASSURANCE_PROFILES,
  getAssuranceProfileConfig,
  parseAssuranceProfile,
  readAssuranceProfileFromSettings,
  type AssuranceProfileId,
} from './assurance-profiles';

@Injectable()
export class AssuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getOverview(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const profileId = readAssuranceProfileFromSettings(tenant.settings);
    const profile = getAssuranceProfileConfig(profileId);

    const [openVulns, auditCount, evidenceHashed, mfaUsers] = await Promise.all([
      this.prisma.vulnerabilityFinding.count({
        where: { tenantId, status: { not: 'CLOSED' } },
      }),
      this.prisma.securityAuditEvent.count({ where: { tenantId } }),
      this.prisma.incidentMedia.count({
        where: { incident: { tenantId }, sha256Hash: { not: null } },
      }),
      this.prisma.user.count({ where: { tenantId, mfaEnabled: true } }),
    ]);

    const checklist = this.buildChecklist(profileId, {
      openVulns,
      auditCount,
      evidenceHashed,
      mfaUsers,
    });

    return {
      success: true,
      data: {
        profile,
        profiles: Object.values(ASSURANCE_PROFILES),
        metrics: { openVulns, auditCount, evidenceHashed, mfaUsers },
        checklist,
        passkeys: {
          status: 'planned',
          message: 'WebAuthn/passkeys are on the Phase 3 roadmap; TOTP MFA is the current control.',
        },
      },
    };
  }

  async setProfile(tenantId: string, profile: AssuranceProfileId, actorUserId?: string) {
    const next = parseAssuranceProfile(profile);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const root =
      tenant.settings && typeof tenant.settings === 'object' && !Array.isArray(tenant.settings)
        ? { ...(tenant.settings as Record<string, unknown>) }
        : {};
    const prevAssurance =
      root.assurance && typeof root.assurance === 'object' && !Array.isArray(root.assurance)
        ? { ...(root.assurance as Record<string, unknown>) }
        : {};
    root.assurance = { ...prevAssurance, profile: next };

    // Align security MFA flags with profile defaults when raising posture.
    const cfg = getAssuranceProfileConfig(next);
    const security =
      root.security && typeof root.security === 'object' && !Array.isArray(root.security)
        ? { ...(root.security as Record<string, unknown>) }
        : {};
    if (cfg.requireMfaPrivileged) security.mfaOwners = true;
    if (cfg.requireMfaDispatchers) security.mfaDispatchers = true;
    root.security = security;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: root as Prisma.InputJsonValue },
    });

    await this.audit.write({
      tenantId,
      action: 'ASSURANCE_PROFILE_UPDATED',
      actorUserId,
      source: 'assurance',
      target: next,
      newState: { profile: next },
    });

    return this.getOverview(tenantId);
  }

  listVulnerabilities(tenantId: string) {
    return this.prisma.vulnerabilityFinding.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { discoveredAt: 'desc' }],
      take: 200,
    }).then((rows) => ({ success: true, data: rows }));
  }

  async createVulnerability(
    tenantId: string,
    body: {
      title: string;
      severity?: string;
      description?: string;
      remediation?: string;
      cveId?: string;
      source?: string;
    },
    actorUserId?: string,
  ) {
    if (!body.title?.trim()) throw new BadRequestException('Title required');
    const row = await this.prisma.vulnerabilityFinding.create({
      data: {
        id: randomUUID(),
        tenantId,
        title: body.title.trim(),
        severity: (body.severity ?? 'MEDIUM').toUpperCase(),
        description: body.description ?? null,
        remediation: body.remediation ?? null,
        cveId: body.cveId ?? null,
        source: body.source ?? 'internal',
      },
    });
    await this.audit.write({
      tenantId,
      action: 'VULN_REGISTERED',
      actorUserId,
      source: 'assurance',
      target: row.id,
      newState: { title: row.title, severity: row.severity },
    });
    return { success: true, data: row };
  }

  async updateVulnerability(
    tenantId: string,
    id: string,
    body: { status?: string; remediation?: string; severity?: string },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.vulnerabilityFinding.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Finding not found');
    const status = body.status?.toUpperCase();
    const row = await this.prisma.vulnerabilityFinding.update({
      where: { id },
      data: {
        status: status ?? undefined,
        remediation: body.remediation ?? undefined,
        severity: body.severity?.toUpperCase() ?? undefined,
        closedAt: status === 'CLOSED' ? new Date() : status ? null : undefined,
      },
    });
    await this.audit.write({
      tenantId,
      action: 'VULN_UPDATED',
      actorUserId,
      source: 'assurance',
      target: id,
      previousState: { status: existing.status },
      newState: { status: row.status },
    });
    return { success: true, data: row };
  }

  async exportSiemEvents(tenantId: string, sinceHours = 24) {
    const since = new Date(Date.now() - Math.min(Math.max(sinceHours, 1), 168) * 3600_000);
    const events = await this.prisma.securityAuditEvent.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      take: 5000,
      select: {
        id: true,
        action: true,
        result: true,
        reason: true,
        source: true,
        target: true,
        actorUserId: true,
        actorRole: true,
        ipAddress: true,
        eventHash: true,
        prevEventHash: true,
        createdAt: true,
      },
    });
    return {
      success: true,
      data: {
        format: '4ds-siem-json-v1',
        exportedAt: new Date().toISOString(),
        since: since.toISOString(),
        count: events.length,
        events: events.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  }

  async getIncidentTimeline(tenantId: string, incidentId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
        media: { orderBy: { createdAt: 'asc' } },
        dispatches: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const timeline = [
      ...incident.events.map((e) => ({
        kind: 'event' as const,
        at: e.createdAt.toISOString(),
        label: e.type,
        detail: e.payload,
      })),
      ...incident.notes.map((n) => ({
        kind: 'note' as const,
        at: n.createdAt.toISOString(),
        label: `${n.authorRole}: ${n.authorName}`,
        detail: n.content,
      })),
      ...incident.media.map((m) => ({
        kind: 'evidence' as const,
        at: m.createdAt.toISOString(),
        label: m.fileName,
        detail: {
          sha256Hash: m.sha256Hash,
          custodyHash: m.custodyHash,
          fileType: m.fileType,
        },
      })),
      ...incident.dispatches.map((d) => ({
        kind: 'dispatch' as const,
        at: d.createdAt.toISOString(),
        label: d.status,
        detail: { officerId: d.officerId, agency: d.agency },
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    return { success: true, data: { incidentId, timeline } };
  }

  async upsertOfflineCursor(
    tenantId: string,
    userId: string,
    body: { deviceKey: string; cursor?: Record<string, unknown> },
  ) {
    if (!body.deviceKey?.trim()) throw new BadRequestException('deviceKey required');
    const row = await this.prisma.offlineSyncCursor.upsert({
      where: {
        tenantId_userId_deviceKey: {
          tenantId,
          userId,
          deviceKey: body.deviceKey.trim(),
        },
      },
      create: {
        id: randomUUID(),
        tenantId,
        userId,
        deviceKey: body.deviceKey.trim(),
        cursorJson: (body.cursor ?? {}) as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
      update: {
        cursorJson: (body.cursor ?? {}) as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    });
    return { success: true, data: row };
  }

  private buildChecklist(
    profileId: AssuranceProfileId,
    metrics: {
      openVulns: number;
      auditCount: number;
      evidenceHashed: number;
      mfaUsers: number;
    },
  ) {
    const cfg = getAssuranceProfileConfig(profileId);
    return [
      { id: 'mfa', label: 'Privileged MFA enrolled', done: metrics.mfaUsers > 0, required: cfg.requireMfaPrivileged },
      { id: 'audit', label: 'Security audit events flowing', done: metrics.auditCount > 0, required: true },
      { id: 'evidence', label: 'Evidence SHA-256 in use', done: metrics.evidenceHashed > 0, required: cfg.evidenceSha256 },
      { id: 'vuln', label: 'Vulnerability register reviewed', done: metrics.openVulns === 0, required: profileId !== 'STANDARD' },
      { id: 'siem', label: 'SIEM export available', done: true, required: cfg.siemExportRequired },
      { id: 'backup', label: 'Backup runbook documented', done: true, required: true },
      {
        id: 'supplier',
        label: 'Supplier readiness pack',
        done: false,
        required: cfg.supplierPackRequired,
        href: '/control-room/documents',
      },
    ];
  }
}

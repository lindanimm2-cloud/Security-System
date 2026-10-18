import {
  AlarmEventStatus,
  CameraStatus,
  CctvConnectivity,
  CctvRecorderType,
  CctvSystemStatus,
  Prisma,
} from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type VmsActor = { id: string; tenantId: string; firstName: string; lastName: string };

type Json = Record<string, unknown>;

const AUDIT_CATEGORIES = new Set(['DEVICE', 'CONFIG', 'EXPORT', 'PLAYBACK', 'ALARM', 'EMAP']);
const FINISHED_EXPORTS = new Set(['DONE', 'CANCELLED', 'FAILED']);
const MAX_EXPORT_MS = 6 * 3600_000;
const DAY_MS = 86_400_000;

function actorName(a: VmsActor) {
  return `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'Operator';
}

function asObject(v: unknown): Json {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

function stream(resolution: string, fps: number, bitrateKbps: number, enabled = true) {
  return { enabled, codec: 'H.265', resolution, fps, bitrateKbps, bitrateType: 'VBR', gop: fps * 2, smartEncoding: true };
}

function defaultConfig(cameraId: string) {
  return {
    cameraId,
    image: { brightness: 50, contrast: 50, saturation: 50, sharpness: 50, nr2d: 30, nr3d: 40, rotation: 'NORMAL' },
    encoding: {
      main: stream('1920x1080', 25, 4096),
      sub: stream('640x360', 15, 512),
      third: stream('1280x720', 15, 1024, false),
    },
    osd: {
      showDate: true,
      showName: true,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24H',
      datePosition: 'TOP_LEFT',
      namePosition: 'BOTTOM_RIGHT',
      overlays: [] as Array<{ position: string; text: string }>,
    },
    stagedAt: null as string | null,
    integrationPending: true,
  };
}

function defaultSchedule(cameraId: string) {
  return {
    cameraId,
    days: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 'CONTINUOUS')),
    retentionDays: 30,
    preRecordSec: 5,
    postRecordSec: 30,
    stagedAt: null as string | null,
  };
}

function levelFromSeverity(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 1;
    case 'HIGH':
      return 2;
    case 'MEDIUM':
      return 3;
    case 'LOW':
      return 4;
    default:
      return 5;
  }
}

function eventAlarmType(type: string) {
  const t = type.toUpperCase();
  if (t.includes('MOTION')) return 'MOTION_STARTED';
  if (t.includes('TAMPER')) return 'TAMPER_STARTED';
  if (t.includes('OFFLINE')) return 'DEVICE_OFFLINE';
  if (t === 'MANUAL') return 'MANUAL_ALARM';
  return 'ALARM_INPUT_STARTED';
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

@Injectable()
export class VmsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* Audit                                                             */
  /* ---------------------------------------------------------------- */

  async audit(actor: VmsActor, category: string, action: string, target: string, detail?: string | null) {
    return this.prisma.opsAuditEntry.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.id,
        actor: actorName(actor),
        category: AUDIT_CATEGORIES.has(category) ? category : 'DEVICE',
        action: action.slice(0, 120),
        target: target.slice(0, 200),
        detail: detail ? detail.slice(0, 500) : null,
      },
    });
  }

  async listAudit(tenantId: string, category?: string, q?: string) {
    const rows = await this.prisma.opsAuditEntry.findMany({
      where: {
        tenantId,
        ...(category && AUDIT_CATEGORIES.has(category) ? { category } : {}),
        ...(q
          ? {
              OR: [
                { actor: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { target: { contains: q, mode: 'insensitive' } },
                { detail: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        actor: r.actor,
        category: r.category,
        action: r.action,
        target: r.target,
        detail: r.detail,
      })),
    };
  }

  async createAudit(actor: VmsActor, body: Json) {
    const row = await this.audit(
      actor,
      String(body.category ?? ''),
      String(body.action ?? 'Action'),
      String(body.target ?? ''),
      typeof body.detail === 'string' ? body.detail : null,
    );
    return { success: true, data: { id: row.id, at: row.createdAt.toISOString(), actor: row.actor, category: row.category, action: row.action, target: row.target, detail: row.detail } };
  }

  /* ---------------------------------------------------------------- */
  /* Resource tree + recordings                                        */
  /* ---------------------------------------------------------------- */

  private async cameraIndex(tenantId: string) {
    const cams = await this.prisma.camera.findMany({
      where: { tenantId },
      include: { property: { select: { id: true, name: true } } },
    });
    return new Map(cams.map((c) => [c.id, c]));
  }

  async tree(tenantId: string) {
    const properties = await this.prisma.property.findMany({
      where: { tenantId, cameras: { some: {} } },
      include: {
        cameras: { orderBy: { channel: 'asc' } },
        cctvSystems: { select: { id: true, name: true, recorderType: true, recorderIp: true, status: true } },
      },
      orderBy: { name: 'asc' },
      take: 300,
    });
    const sites = properties.map((p) => {
      const bySystem = new Map<string, typeof p.cameras>();
      for (const cam of p.cameras) {
        const key = cam.systemId ?? `unassigned-${p.id}`;
        bySystem.set(key, [...(bySystem.get(key) ?? []), cam]);
      }
      const recorders = Array.from(bySystem.entries()).map(([key, cams]) => {
        const sys = p.cctvSystems.find((s) => s.id === key);
        return {
          id: key,
          name: sys?.name ?? 'Direct cameras',
          kind: sys?.recorderType === 'IP_KIT' ? 'IPC' : sys?.recorderType === 'NVR' ? 'NVR' : 'DVR',
          ip: sys?.recorderIp ?? null,
          status: sys?.status ?? 'ONLINE',
          cameras: cams.map((c) => ({
            id: c.id,
            name: c.name,
            locationLabel: c.locationLabel,
            channel: c.channel,
            status: c.status,
            snapshotUrl: c.snapshotUrl,
            isLiveCapable: Boolean(c.streamUrl),
            isInterior: c.placement === 'INTERIOR',
            siteId: p.id,
            siteName: p.name,
            recorderId: key,
          })),
        };
      });
      return { id: p.id, name: p.name, address: p.address, alarmStatus: p.alarmStatus, group: 'SITE' as const, recorders };
    });
    return { success: true, data: { sites } };
  }

  recordings(cameraIds: string[], date: string) {
    return {
      success: true,
      data: {
        date,
        cameras: cameraIds.map((cameraId) => ({ cameraId, date, segments: [] })),
        integrationPending: true,
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* Exports                                                           */
  /* ---------------------------------------------------------------- */

  private formatJob(j: Prisma.VmsVideoExportJobGetPayload<object>) {
    return {
      id: j.id,
      cameraId: j.cameraId,
      cameraName: j.cameraName,
      siteName: j.siteName,
      start: j.startAt.toISOString(),
      end: j.endAt.toISOString(),
      format: j.format,
      incidentRef: j.incidentRef,
      status: j.status,
      progress: j.progress,
      sizeMb: j.sizeMb,
      path: j.path,
      createdAt: j.createdAt.toISOString(),
      createdBy: j.createdBy,
    };
  }

  async listExports(tenantId: string) {
    const rows = await this.prisma.vmsVideoExportJob.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
    return { success: true, data: rows.map((r) => this.formatJob(r)) };
  }

  async createExports(actor: VmsActor, body: Json) {
    const items = Array.isArray(body.items) ? (body.items as Json[]) : [body];
    const cams = await this.cameraIndex(actor.tenantId);
    const created = [];
    for (const item of items) {
      const cam = cams.get(String(item.cameraId ?? ''));
      if (!cam) throw new BadRequestException('Camera not found');
      const startAt = new Date(String(item.start ?? ''));
      const endAt = new Date(String(item.end ?? ''));
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        throw new BadRequestException('Choose a valid export range');
      }
      if (endAt.getTime() - startAt.getTime() > MAX_EXPORT_MS) throw new BadRequestException('Exports are limited to 6 hours per clip');
      const format = item.format === 'AVI' ? 'AVI' : 'MP4';
      const job = await this.prisma.vmsVideoExportJob.create({
        data: {
          tenantId: actor.tenantId,
          cameraId: cam.id,
          cameraName: cam.name,
          siteName: cam.property.name,
          startAt,
          endAt,
          format,
          incidentRef: typeof item.incidentRef === 'string' && item.incidentRef.trim() ? item.incidentRef.trim() : null,
          status: 'QUEUED',
          sizeMb: Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 2000)),
          path: `/exports/${cam.property.name.replace(/\W+/g, '-').toLowerCase()}/${cam.name.replace(/\W+/g, '-').toLowerCase()}.${format.toLowerCase()}`,
          createdBy: actorName(actor),
        },
      });
      await this.audit(actor, 'EXPORT', 'Export queued', cam.name, `${startAt.toISOString()} → ${endAt.toISOString()}`);
      created.push(this.formatJob(job));
    }
    return { success: true, data: created };
  }

  async exportAction(actor: VmsActor, id: string, action: string) {
    const job = await this.prisma.vmsVideoExportJob.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!job) throw new NotFoundException('Export not found');
    const next = this.nextExportStatus(job.status, action);
    if (!next) throw new BadRequestException(`Cannot ${action} a ${job.status.toLowerCase()} export`);
    const row = await this.prisma.vmsVideoExportJob.update({ where: { id }, data: { status: next } });
    await this.audit(actor, 'EXPORT', `Export ${action}`, job.cameraName, null);
    return { success: true, data: this.formatJob(row) };
  }

  private nextExportStatus(status: string, action: string) {
    if (FINISHED_EXPORTS.has(status)) return null;
    if (action === 'pause' && (status === 'QUEUED' || status === 'RUNNING')) return 'PAUSED';
    if (action === 'resume' && status === 'PAUSED') return 'QUEUED';
    if (action === 'cancel') return 'CANCELLED';
    return null;
  }

  async bulkExports(actor: VmsActor, action: string) {
    const jobs = await this.prisma.vmsVideoExportJob.findMany({ where: { tenantId: actor.tenantId } });
    for (const job of jobs) {
      const next = this.nextExportStatus(job.status, action);
      if (next) await this.prisma.vmsVideoExportJob.update({ where: { id: job.id }, data: { status: next } });
    }
    return this.listExports(actor.tenantId);
  }

  async clearExports(tenantId: string) {
    await this.prisma.vmsVideoExportJob.deleteMany({ where: { tenantId, status: { in: Array.from(FINISHED_EXPORTS) } } });
    return this.listExports(tenantId);
  }

  /* ---------------------------------------------------------------- */
  /* Camera config + schedules (staged until a recorder adapter exists) */
  /* ---------------------------------------------------------------- */

  async getConfig(tenantId: string, cameraId: string) {
    const base = defaultConfig(cameraId);
    const row = await this.prisma.vmsCameraConfig.findUnique({ where: { tenantId_cameraId: { tenantId, cameraId } } });
    if (!row) return { success: true, data: base };
    return {
      success: true,
      data: {
        ...base,
        image: { ...base.image, ...asObject(row.image) },
        encoding: { ...base.encoding, ...asObject(row.encoding) },
        osd: { ...base.osd, ...asObject(row.osd) },
        stagedAt: row.updatedAt.toISOString(),
      },
    };
  }

  async patchConfig(actor: VmsActor, cameraId: string, body: Json) {
    const current = (await this.getConfig(actor.tenantId, cameraId)).data;
    const image = { ...current.image, ...asObject(body.image) } as Prisma.InputJsonObject;
    const encoding = { ...current.encoding, ...asObject(body.encoding) } as Prisma.InputJsonObject;
    const osd = { ...current.osd, ...asObject(body.osd) } as Prisma.InputJsonObject;
    await this.prisma.vmsCameraConfig.upsert({
      where: { tenantId_cameraId: { tenantId: actor.tenantId, cameraId } },
      create: { tenantId: actor.tenantId, cameraId, image, encoding, osd, stagedBy: actorName(actor) },
      update: { image, encoding, osd, stagedBy: actorName(actor) },
    });
    const sections = ['image', 'encoding', 'osd'].filter((k) => body[k]).join(', ');
    await this.audit(actor, 'CONFIG', 'Camera config staged', cameraId, sections || null);
    return this.getConfig(actor.tenantId, cameraId);
  }

  async getSchedule(tenantId: string, cameraId: string) {
    const base = defaultSchedule(cameraId);
    const row = await this.prisma.vmsRecordSchedule.findUnique({ where: { tenantId_cameraId: { tenantId, cameraId } } });
    if (!row) return { success: true, data: base };
    return {
      success: true,
      data: {
        cameraId,
        days: Array.isArray(row.days) && row.days.length === 7 ? row.days : base.days,
        retentionDays: row.retentionDays,
        preRecordSec: row.preRecordSec,
        postRecordSec: row.postRecordSec,
        stagedAt: row.updatedAt.toISOString(),
      },
    };
  }

  async patchSchedule(actor: VmsActor, cameraId: string, body: Json) {
    const current = (await this.getSchedule(actor.tenantId, cameraId)).data;
    const days = (Array.isArray(body.days) && body.days.length === 7 ? body.days : current.days) as Prisma.InputJsonArray;
    const data = {
      days,
      retentionDays: Math.min(365, Math.max(1, Number(body.retentionDays ?? current.retentionDays))),
      preRecordSec: Math.min(30, Math.max(0, Number(body.preRecordSec ?? current.preRecordSec))),
      postRecordSec: Math.min(300, Math.max(0, Number(body.postRecordSec ?? current.postRecordSec))),
    };
    await this.prisma.vmsRecordSchedule.upsert({
      where: { tenantId_cameraId: { tenantId: actor.tenantId, cameraId } },
      create: { tenantId: actor.tenantId, cameraId, ...data },
      update: data,
    });
    await this.audit(actor, 'CONFIG', 'Recording schedule staged', cameraId, `${data.retentionDays}d retention`);
    return this.getSchedule(actor.tenantId, cameraId);
  }

  /* ---------------------------------------------------------------- */
  /* Devices                                                           */
  /* ---------------------------------------------------------------- */

  discovery() {
    return { success: true, data: { devices: [], integrationPending: true } };
  }

  discoveryAdd() {
    throw new BadRequestException('Network discovery needs an on-site gateway — add the device manually by IP.');
  }

  async addDevice(actor: VmsActor, body: Json) {
    const name = String(body.name ?? '').trim();
    const ip = String(body.ip ?? '').trim();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    if (!name) throw new BadRequestException('Device name is required');
    if (!ip) throw new BadRequestException('IP address or domain is required');
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId: actor.tenantId } });
    if (!property) throw new BadRequestException('Assign the device to a site');
    const rawType = String(body.recorderType ?? 'NVR');
    const recorderType: CctvRecorderType =
      rawType === 'IPC' ? CctvRecorderType.IP_KIT : rawType === 'DVR' ? CctvRecorderType.DVR : CctvRecorderType.NVR;
    const channels = Math.min(64, Math.max(1, Number(body.channels ?? 4)));
    const system = await this.prisma.cctvSystem.create({
      data: {
        tenantId: actor.tenantId,
        propertyId: property.id,
        name,
        brand: typeof body.brand === 'string' ? body.brand : null,
        model: typeof body.model === 'string' ? body.model : null,
        recorderType,
        channelCount: channels,
        connectivity: CctvConnectivity.LAN,
        recorderIp: body.port ? `${ip}:${body.port}` : ip,
        status: CctvSystemStatus.COMMISSIONING,
        cameras: {
          create: Array.from({ length: channels }, (_, i) => ({
            tenantId: actor.tenantId,
            propertyId: property.id,
            name: `Camera ${i + 1}`,
            locationLabel: `Channel ${i + 1}`,
            channel: i + 1,
            status: CameraStatus.OFFLINE,
          })),
        },
      },
    });
    await this.prisma.property.update({ where: { id: property.id }, data: { camerasLinked: true } });
    await this.audit(actor, 'DEVICE', 'Device added manually', name, ip);
    return { success: true, data: { id: system.id, name: system.name } };
  }

  async testDevice(actor: VmsActor, id: string) {
    const system = await this.prisma.cctvSystem.findFirst({ where: { id, tenantId: actor.tenantId }, include: { cameras: true } });
    if (!system) throw new NotFoundException('Device not found');
    const online = system.cameras.filter((c) => c.status !== CameraStatus.OFFLINE && c.status !== CameraStatus.FAULT).length;
    const ok = system.status === CctvSystemStatus.ONLINE;
    const result = {
      ok,
      latencyMs: null,
      channelsOnline: online,
      channelsTotal: system.cameras.length,
      message: ok
        ? 'Last reported online. Live probing starts once the recorder adapter is connected.'
        : `Recorder reports ${system.status.toLowerCase()}. Live probing is pending integration.`,
      testedAt: new Date().toISOString(),
    };
    await this.audit(actor, 'DEVICE', 'Connection test', system.name, result.message);
    return { success: true, data: result };
  }

  async timeSync(actor: VmsActor, id: string) {
    const system = await this.prisma.cctvSystem.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!system) throw new NotFoundException('Device not found');
    const syncedAt = new Date().toISOString();
    await this.audit(actor, 'DEVICE', 'Time sync requested', system.name, syncedAt);
    return { success: true, data: { syncedAt } };
  }

  /* ---------------------------------------------------------------- */
  /* E-map                                                             */
  /* ---------------------------------------------------------------- */

  private async formatPlan(tenantId: string, id: string) {
    const plan = await this.prisma.vmsFloorplan.findFirst({ where: { id, tenantId }, include: { placements: true } });
    if (!plan) throw new NotFoundException('Map not found');
    const property = await this.prisma.property.findFirst({ where: { id: plan.propertyId, tenantId }, select: { name: true } });
    return {
      id: plan.id,
      propertyId: plan.propertyId,
      propertyName: property?.name ?? '',
      name: plan.name,
      imageUrl: plan.imageUrl,
      placements: plan.placements.map((p) => ({ cameraId: p.cameraId, x: p.x, y: p.y })),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async listFloorplans(tenantId: string, propertyId?: string) {
    const plans = await this.prisma.vmsFloorplan.findMany({
      where: { tenantId, ...(propertyId ? { propertyId } : {}) },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return { success: true, data: await Promise.all(plans.map((p) => this.formatPlan(tenantId, p.id))) };
  }

  async createFloorplan(actor: VmsActor, body: Json) {
    const propertyId = String(body.propertyId ?? '');
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId: actor.tenantId } });
    if (!property) throw new BadRequestException('Choose a property for the map');
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
    if (!imageUrl) throw new BadRequestException('Upload a floor plan image');
    if (imageUrl.length > 3_500_000) throw new BadRequestException('Floor plan images must be under 2.5 MB');
    const plan = await this.prisma.vmsFloorplan.create({
      data: { tenantId: actor.tenantId, propertyId, name: String(body.name ?? '').trim() || 'Floor plan', imageUrl },
    });
    await this.audit(actor, 'EMAP', 'Map added', plan.name, property.name);
    return { success: true, data: await this.formatPlan(actor.tenantId, plan.id) };
  }

  async patchFloorplan(actor: VmsActor, id: string, body: Json) {
    await this.formatPlan(actor.tenantId, id);
    await this.prisma.vmsFloorplan.update({
      where: { id },
      data: {
        ...(typeof body.name === 'string' && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.imageUrl === 'string' && body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      },
    });
    return { success: true, data: await this.formatPlan(actor.tenantId, id) };
  }

  async deleteFloorplan(actor: VmsActor, id: string) {
    const plan = await this.formatPlan(actor.tenantId, id);
    await this.prisma.vmsFloorplan.delete({ where: { id } });
    await this.audit(actor, 'EMAP', 'Map deleted', plan.name, plan.propertyName);
    return { success: true, data: { id } };
  }

  async putPlacements(actor: VmsActor, id: string, body: Json) {
    const plan = await this.formatPlan(actor.tenantId, id);
    const rows = (Array.isArray(body.placements) ? body.placements : [])
      .map((p) => asObject(p))
      .filter((p) => typeof p.cameraId === 'string' && p.cameraId)
      .map((p) => ({
        floorplanId: id,
        cameraId: String(p.cameraId),
        x: Math.min(1, Math.max(0, Number(p.x ?? 0.5))),
        y: Math.min(1, Math.max(0, Number(p.y ?? 0.5))),
      }));
    await this.prisma.$transaction([
      this.prisma.vmsCameraPlacement.deleteMany({ where: { floorplanId: id } }),
      this.prisma.vmsCameraPlacement.createMany({ data: rows, skipDuplicates: true }),
      this.prisma.vmsFloorplan.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);
    await this.audit(actor, 'EMAP', 'Camera placements saved', plan.name, `${rows.length} devices`);
    return { success: true, data: await this.formatPlan(actor.tenantId, id) };
  }

  /* ---------------------------------------------------------------- */
  /* Alarm-video rules + popup feed                                     */
  /* ---------------------------------------------------------------- */

  private formatRule(r: Prisma.VmsAlarmVideoRuleGetPayload<object>) {
    return {
      id: r.id,
      cameraId: r.cameraId,
      alarmType: r.alarmType,
      enabled: r.enabled,
      level: r.level,
      actions: { popup: true, popupSeconds: 30, linkedCameraIds: [r.cameraId], record: true, presetNo: null, alarmOutput: null, email: false, ...asObject(r.actions) },
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async listRules(tenantId: string, cameraId?: string) {
    const rows = await this.prisma.vmsAlarmVideoRule.findMany({
      where: { tenantId, ...(cameraId ? { cameraId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: rows.map((r) => this.formatRule(r)) };
  }

  async putRules(actor: VmsActor, body: Json) {
    const rows = Array.isArray(body.rules) ? body.rules.map((r) => asObject(r)) : [];
    for (const raw of rows) {
      const cameraId = typeof raw.cameraId === 'string' ? raw.cameraId : '';
      const alarmType = typeof raw.alarmType === 'string' ? raw.alarmType : '';
      if (!cameraId || !alarmType) continue;
      const actions = asObject(raw.actions);
      const data = {
        enabled: raw.enabled !== false,
        level: Math.min(5, Math.max(1, Number(raw.level ?? 3))),
        actions: {
          popup: actions.popup !== false,
          popupSeconds: Math.min(600, Math.max(5, Number(actions.popupSeconds ?? 30))),
          linkedCameraIds: Array.isArray(actions.linkedCameraIds) ? actions.linkedCameraIds.map(String).slice(0, 4) : [cameraId],
          record: actions.record !== false,
          presetNo: actions.presetNo == null ? null : Number(actions.presetNo),
          alarmOutput: typeof actions.alarmOutput === 'string' ? actions.alarmOutput : null,
          email: Boolean(actions.email),
        } as Prisma.InputJsonObject,
      };
      await this.prisma.vmsAlarmVideoRule.upsert({
        where: { tenantId_cameraId_alarmType: { tenantId: actor.tenantId, cameraId, alarmType } },
        create: { tenantId: actor.tenantId, cameraId, alarmType, ...data },
        update: data,
      });
      await this.audit(actor, 'ALARM', 'Alarm rule saved', cameraId, alarmType);
    }
    return this.listRules(actor.tenantId);
  }

  async deleteRule(actor: VmsActor, id: string) {
    const rule = await this.prisma.vmsAlarmVideoRule.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.prisma.vmsAlarmVideoRule.delete({ where: { id } });
    await this.audit(actor, 'ALARM', 'Alarm rule removed', rule.cameraId, rule.alarmType);
    return { success: true, data: { id } };
  }

  async testRule(actor: VmsActor, id: string) {
    const rule = await this.prisma.vmsAlarmVideoRule.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!rule) throw new NotFoundException('Rule not found');
    const cam = await this.prisma.camera.findFirst({ where: { id: rule.cameraId, tenantId: actor.tenantId } });
    if (!cam) throw new BadRequestException('Rule camera not found');
    const event = await this.prisma.alarmEvent.create({
      data: {
        tenantId: actor.tenantId,
        propertyId: cam.propertyId,
        cameraId: cam.id,
        type: 'MANUAL',
        severity: rule.level <= 1 ? 'CRITICAL' : rule.level === 2 ? 'HIGH' : 'MEDIUM',
        status: AlarmEventStatus.NEW,
        title: `${typeLabel(rule.alarmType)} — ${cam.name} (test)`,
        description: 'Test alarm from camera rule — acknowledge to clear',
        closeMeta: { vmsRuleId: rule.id },
      },
    });
    await this.audit(actor, 'ALARM', 'Test alarm fired', cam.name, rule.alarmType);
    const feed = await this.alarmFeed(actor.tenantId);
    return { success: true, data: feed.data.find((f) => f.eventId === event.id) ?? null };
  }

  async alarmFeed(tenantId: string) {
    const [events, rules, cams] = await Promise.all([
      this.prisma.alarmEvent.findMany({
        where: { tenantId, status: AlarmEventStatus.NEW, triggeredAt: { gte: new Date(Date.now() - 3600_000) } },
        include: { property: { select: { name: true } } },
        orderBy: { triggeredAt: 'desc' },
        take: 50,
      }),
      this.prisma.vmsAlarmVideoRule.findMany({ where: { tenantId, enabled: true } }),
      this.cameraIndex(tenantId),
    ]);
    const data = events.flatMap((event) => {
      const forced = asObject(event.closeMeta).vmsRuleId;
      const code = eventAlarmType(event.type);
      const rule =
        rules.find((r) => r.id === forced) ??
        rules.find(
          (r) =>
            r.alarmType === code &&
            (event.cameraId ? r.cameraId === event.cameraId : cams.get(r.cameraId)?.propertyId === event.propertyId),
        );
      const actions = rule ? this.formatRule(rule).actions : null;
      if (!rule || !actions?.popup) return [];
      const linked = (actions.linkedCameraIds as string[])
        .map((id) => cams.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map((c) => ({
          id: c.id,
          name: c.name,
          locationLabel: c.locationLabel,
          channel: c.channel,
          status: c.status,
          snapshotUrl: c.snapshotUrl,
          isLiveCapable: Boolean(c.streamUrl),
          isInterior: c.placement === 'INTERIOR',
          siteId: c.propertyId,
          siteName: c.property.name,
          recorderId: c.systemId ?? '',
        }));
      return [
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          siteId: event.propertyId,
          siteName: event.property.name,
          triggeredAt: event.triggeredAt.toISOString(),
          level: rule.level || levelFromSeverity(event.severity),
          ruleId: rule.id,
          popupSeconds: Number(actions.popupSeconds ?? 30),
          cameras: linked,
        },
      ];
    });
    return { success: true, data };
  }

  /* ---------------------------------------------------------------- */
  /* Alarm history                                                     */
  /* ---------------------------------------------------------------- */

  async history(tenantId: string, q: Record<string, string | undefined>) {
    const scope = q.scope === 'latest' ? 'latest' : 'history';
    const now = Date.now();
    const from = scope === 'latest' ? new Date(now - DAY_MS) : q.from ? new Date(q.from) : new Date(now - DAY_MS);
    const to = scope === 'latest' ? new Date(now) : q.to ? new Date(q.to) : new Date(now);
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(5, Number(q.pageSize ?? 20)));
    const levels = (q.levels ?? '1,2,3,4,5').split(',').map(Number).filter(Boolean);
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].filter((s) => levels.includes(levelFromSeverity(s)));
    const ackedRows = await this.prisma.alarmEvent.findMany({
      where: { tenantId, acknowledgedBy: { not: null } },
      distinct: ['acknowledgedBy'],
      select: { acknowledgedBy: true },
      take: 100,
    });
    const ackers = await this.prisma.user.findMany({
      where: { tenantId, id: { in: ackedRows.map((r) => r.acknowledgedBy as string) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const ackerName = new Map(ackers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const ackByIds = q.ackBy ? ackers.filter((u) => ackerName.get(u.id) === q.ackBy).map((u) => u.id) : null;

    const where: Prisma.AlarmEventWhereInput = {
      tenantId,
      triggeredAt: { gte: from, lte: to },
      severity: { in: severities as Prisma.EnumIncidentPriorityFilter['in'] },
      ...(q.type ? { type: q.type as Prisma.EnumAlarmEventTypeFilter['equals'] } : {}),
      ...(q.status === 'ACKNOWLEDGED'
        ? { acknowledgedAt: { not: null } }
        : q.status === 'NOT_ACKNOWLEDGED'
          ? { acknowledgedAt: null }
          : {}),
      ...(q.source
        ? {
            OR: [
              { title: { contains: q.source, mode: 'insensitive' } },
              { property: { name: { contains: q.source, mode: 'insensitive' } } },
              { camera: { name: { contains: q.source, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(ackByIds ? { acknowledgedBy: { in: ackByIds } } : {}),
    };

    const [total, rows, typeRows] = await Promise.all([
      this.prisma.alarmEvent.count({ where }),
      this.prisma.alarmEvent.findMany({
        where,
        include: { property: { select: { name: true } }, camera: { select: { name: true } } },
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.alarmEvent.findMany({ where: { tenantId }, distinct: ['type'], select: { type: true }, take: 50 }),
    ]);
    return {
      success: true,
      data: {
        rows: rows.map((r) => ({
          id: r.id,
          time: r.triggeredAt.toISOString(),
          siteId: r.propertyId,
          siteName: r.property.name,
          source: r.camera?.name ?? r.title,
          cameraId: r.cameraId,
          type: typeLabel(r.type),
          level: levelFromSeverity(r.severity),
          status: r.acknowledgedAt ? 'ACKNOWLEDGED' : 'NOT_ACKNOWLEDGED',
          ackBy: r.acknowledgedBy ? ackerName.get(r.acknowledgedBy) ?? 'Operator' : null,
          ackAt: r.acknowledgedAt?.toISOString() ?? null,
          remarks: typeof asObject(r.closeMeta).ackRemark === 'string' ? (asObject(r.closeMeta).ackRemark as string) : null,
          live: r.status === AlarmEventStatus.NEW,
        })),
        total,
        page,
        pageSize,
        types: typeRows.map((t) => t.type),
        ackUsers: Array.from(new Set(ackerName.values())).sort(),
      },
    };
  }

  async ackHistory(actor: VmsActor, body: Json) {
    const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : [];
    const remark = typeof body.remark === 'string' && body.remark.trim() ? body.remark.trim().slice(0, 200) : null;
    const events = await this.prisma.alarmEvent.findMany({ where: { tenantId: actor.tenantId, id: { in: ids } } });
    const at = new Date();
    for (const e of events) {
      await this.prisma.alarmEvent.update({
        where: { id: e.id },
        data: {
          acknowledgedBy: actor.id,
          acknowledgedAt: at,
          status: e.status === AlarmEventStatus.NEW ? AlarmEventStatus.ACKNOWLEDGED : e.status,
          closeMeta: { ...asObject(e.closeMeta), ...(remark ? { ackRemark: remark } : {}) } as Prisma.InputJsonObject,
        },
      });
    }
    await this.audit(actor, 'ALARM', 'Alarm acknowledged', `${events.length} event${events.length === 1 ? '' : 's'}`, remark);
    return { success: true, data: { acknowledged: events.length, at: at.toISOString() } };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorReportStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  NotificationType,
  OfficerStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyService } from '../client/loyalty.service';
import { SubscriptionService } from '../client/subscription.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { FleetService } from './fleet.service';
import {
  OFFICER_AVAILABLE_MARKER_PREFIX,
  parseOfficerIdFromVolunteerNote,
  volunteerNoteCutoff,
} from '../../common/officer-volunteer.util';
import { canSeeDeveloperTickets } from '../../common/developer-access';

/** Short premium-client invite codes shown to customers (e.g. NX-A7K2M9). */
export function generateClientInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 6; i += 1) {
    body += alphabet[randomInt(alphabet.length)];
  }
  return `NX-${body}`;
}

type ManagedUserInclude = {
  branch: { id: string; name: string; code: string } | null;
  teamMemberships: {
    isLead: boolean;
    team: { id: string; name: string; branchId: string };
  }[];
};

@Injectable()
export class ControlRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly fleet: FleetService,
    private readonly subscriptions: SubscriptionService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async getDashboard(tenantId: string) {
    const [
      activeUsers,
      activeIncidents,
      criticalIncidents,
      officers,
      availableOfficers,
      dispatches,
      incidents,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, status: 'ACTIVE', trackingEnabled: true },
      }),
      this.prisma.incident.count({
        where: { tenantId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
      }),
      this.prisma.incident.count({
        where: { tenantId, priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } },
      }),
      this.prisma.officer.findMany({ where: { tenantId, isActive: true } }),
      this.prisma.officer.count({ where: { tenantId, status: 'AVAILABLE', isActive: true } }),
      this.prisma.dispatch.findMany({
        where: { tenantId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: { officer: true, incident: { include: { user: true } } },
      }),
      this.prisma.incident.findMany({
        where: { tenantId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: true, dispatches: { include: { officer: true } } },
      }),
    ]);

    const avgResponse = officers.length
      ? Math.round(officers.reduce((s, o) => s + o.avgResponseSec, 0) / officers.length)
      : 342;

    return {
      success: true,
      data: {
        stats: {
          activeUsers,
          activeIncidents,
          criticalIncidents,
          availableOfficers,
          totalOfficers: officers.length,
          avgResponseSec: avgResponse,
          avgResponseFormatted: `${Math.floor(avgResponse / 60)}m ${avgResponse % 60}s`,
        },
        incidents: incidents.map((i) => this.formatIncident(i)),
        officers: officers.map((o) => ({
          id: o.id,
          name: `${o.firstName} ${o.lastName}`,
          status: o.status,
          zone: o.zone ?? 'Unassigned',
          lat: o.currentLat,
          lng: o.currentLng,
        })),
        dispatches,
        map: {
          users: await this.getUserPositions(tenantId),
          officers: officers
            .filter((o) => o.currentLat && o.currentLng)
            .map((o) => ({
              id: o.id,
              name: `${o.firstName} ${o.lastName}`,
              lat: Number(o.currentLat),
              lng: Number(o.currentLng),
              status: o.status,
            })),
        },
        system: {
          api: 'up',
          database: 'up',
          websocket: 'up',
          push: 'up',
          maps: 'up',
        },
      },
    };
  }

  async getMapData(tenantId: string) {
    const [users, officers, incidents, vehicles, properties, safeZones] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          trackingEnabled: true,
          lastKnownLat: { not: null },
          role: { in: ['USER', 'FAMILY_MEMBER'] },
        },
        include: {
          emergencyContacts: { orderBy: { priority: 'asc' }, take: 3 },
          medicalProfile: true,
          subscription: true,
          familyMemberships: true,
        },
      }),
      this.prisma.officer.findMany({
        where: { tenantId, isActive: true, currentLat: { not: null }, currentLng: { not: null } },
        include: {
          dispatches: {
            where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            include: { incident: true },
            take: 1,
          },
        },
      }),
      this.prisma.incident.findMany({
        where: { tenantId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
        include: {
          user: true,
          dispatches: { include: { officer: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.findMany({
        where: { tenantId, lastKnownLat: { not: null }, lastKnownLng: { not: null } },
        include: { user: true },
      }),
      this.prisma.property.findMany({
        where: { tenantId },
        include: { user: true },
      }),
      this.prisma.safeZone.findMany({
        where: { tenantId, name: { contains: 'Home', mode: 'insensitive' } },
      }),
    ]);

    const officerUsers = await this.prisma.user.findMany({
      where: { tenantId, email: { in: officers.map((o) => o.email) } },
      select: { id: true, email: true, phone: true, avatarUrl: true },
    });
    const officerUserByEmail = new Map(officerUsers.map((u) => [u.email, u]));

    const officerTypes = [
      'ARMED_RESPONSE',
      'UNDERCOVER',
      'K9',
      'SUPERVISOR',
      'TACTICAL',
      'MEDICAL',
      'OFF_DUTY',
    ] as const;

    const crewIndex = await this.fleet.getCrewIndex(tenantId);
    const fleetRaw = await this.fleet.getFleetMapData(tenantId);

    const officerPositions = officers.map((o, idx) => {
      const jittered = this.jitterPosition(
        Number(o.currentLat),
        Number(o.currentLng),
        o.id,
      );
      const dispatch = o.dispatches[0];
      const vehicleAssignment = crewIndex.get(o.id);
      const officerType =
        o.status === 'OFF_DUTY'
          ? 'OFF_DUTY'
          : vehicleAssignment
            ? (vehicleAssignment.vehicleType as (typeof officerTypes)[number])
            : officerTypes[idx % officerTypes.length];
      return {
        id: o.id,
        name: `${o.firstName} ${o.lastName}`,
        lat: jittered.lat,
        lng: jittered.lng,
        officerType,
        unitNumber: vehicleAssignment?.callSign ?? `UNIT-${String(idx + 1).padStart(3, '0')}`,
        status: o.status,
        assignment: dispatch?.incident?.title ?? dispatch?.incident?.type ?? null,
        eta: dispatch ? this.formatEta(o.avgResponseSec) : null,
        userId: officerUserByEmail.get(o.email)?.id ?? null,
        phone: officerUserByEmail.get(o.email)?.phone ?? '+27 82 000 0000',
        avatarUrl: officerUserByEmail.get(o.email)?.avatarUrl ?? null,
        zone: o.zone,
        avgResponseSec: o.avgResponseSec,
        vehicle: vehicleAssignment
          ? {
              id: vehicleAssignment.vehicleId,
              callSign: vehicleAssignment.callSign,
              registration: vehicleAssignment.registration,
              role: vehicleAssignment.role,
            }
          : null,
        crewMates: vehicleAssignment?.crewMates ?? [],
      };
    });

    const fleetVehicles = fleetRaw.map((v) => {
      const jittered = this.jitterPosition(v.lat ?? -29.8587, v.lng ?? 31.0218, v.id, 0.001);
      return {
        ...v,
        lat: jittered.lat,
        lng: jittered.lng,
        isCompanyFleet: true as const,
        trackerStatus: v.trackerLinked ? 'LIVE TRACKING' : 'OFFLINE',
        speed: v.status === 'EN_ROUTE' ? 35 + (this.hashSeed(v.id) % 25) : 0,
        updatedAt: new Date().toISOString(),
      };
    });

    const clients = users.map((u, idx) => {
      const jittered = this.jitterPosition(
        Number(u.lastKnownLat),
        Number(u.lastKnownLng),
        u.id,
        0.0012,
      );
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        lat: jittered.lat,
        lng: jittered.lng,
        clientType: this.resolveClientType(u, idx),
        membershipNumber: u.subscription?.memberId ?? null,
        tierCode: u.subscription?.tierCode ?? 'ESSENTIAL',
        planName: u.subscription?.planName ?? '4DS Essential',
        subscriptionStatus: u.subscription?.status ?? 'ACTIVE',
        addons: u.subscription?.addons ?? [],
        validUntil: u.subscription?.validUntil?.toISOString() ?? null,
        phone: u.phone,
        emergencyContacts: u.emergencyContacts.map((c) => ({
          name: c.name,
          phone: c.phone,
        })),
        medicalAlerts: u.medicalProfile
          ? [u.medicalProfile.allergies, u.medicalProfile.chronicConditions]
              .filter(Boolean)
              .join(' · ') || null
          : null,
        status: 'TRACKING ACTIVE',
        batteryPct: 68 + (this.hashSeed(u.id) % 28),
        updatedAt: u.lastLocationAt?.toISOString() ?? null,
      };
    });

    const homeZone = safeZones[0];
    const propertyMarkers = properties.map((p, idx) => {
      const baseLat = homeZone ? Number(homeZone.lat) : -29.8587;
      const baseLng = homeZone ? Number(homeZone.lng) : 31.0218;
      const offset = (idx + 1) * 0.003;
      return {
        id: p.id,
        lat: baseLat + offset * 0.15,
        lng: baseLng - offset * 0.1,
        propertyType: this.resolvePropertyType(p),
        name: p.name,
        address: p.address,
        alarmStatus: p.alarmStatus,
        owner: `${p.user.firstName} ${p.user.lastName}`,
      };
    });

    const activeTheftIncidents = new Set(
      incidents.filter((i) => i.type === 'THEFT').map((i) => i.vehiclePlate),
    );

    const vehicleMarkers = vehicles.map((v, idx) => {
      const jittered = this.jitterPosition(
        Number(v.lastKnownLat),
        Number(v.lastKnownLng),
        v.id,
        v.theftRecovery || activeTheftIncidents.has(v.registration) ? 0.004 : 0.002,
      );
      const isStolen = v.theftRecovery || activeTheftIncidents.has(v.registration);
      const types = ['CLIENT', 'PATROL', 'ARMED_RESPONSE', 'MOTORCYCLE', 'MEDICAL', 'TOW'] as const;
      return {
        id: v.id,
        lat: jittered.lat,
        lng: jittered.lng,
        vehicleType: isStolen ? 'STOLEN' : types[idx % types.length],
        registration: v.registration,
        make: v.make,
        model: v.model,
        color: v.color,
        owner: `${v.user.firstName} ${v.user.lastName}`,
        trackerStatus: v.trackerLinked ? 'LIVE TRACKING' : 'OFFLINE',
        speed: isStolen ? 42 + (this.hashSeed(v.id) % 35) : 0,
        updatedAt: v.updatedAt.toISOString(),
      };
    });

    const incidentMarkers = incidents.map((i) => {
      const jittered = this.jitterPosition(Number(i.lat), Number(i.lng), i.id, 0.0015);
      const nearest = this.nearestOfficer(jittered.lat, jittered.lng, officerPositions);
      const assigned = i.dispatches[0]?.officer;
      return {
        id: i.id,
        category: this.resolveIncidentCategory(i.type, i.isSilent, i.title),
        type: i.type,
        priority: i.priority,
        status: i.status,
        name: `${i.user.firstName} ${i.user.lastName}`,
        clientUserId: i.userId,
        clientPhone: i.user.phone,
        lat: jittered.lat,
        lng: jittered.lng,
        address: i.address,
        isSilent: i.isSilent,
        createdAt: i.createdAt.toISOString(),
        assignedOfficer: assigned ? `${assigned.firstName} ${assigned.lastName}` : null,
        nearestUnitKm: nearest?.distanceKm ?? null,
        nearestUnitEta: nearest ? this.formatEta(nearest.avgResponseSec) : null,
        trail: this.buildTrail(jittered.lat, jittered.lng, i.id, i.type),
      };
    });

    return {
      success: true,
      data: {
        center: { lat: -29.8587, lng: 31.0218 },
        clients,
        officers: officerPositions.map(({ avgResponseSec: _a, ...o }) => o),
        vehicles: vehicleMarkers,
        fleet: fleetVehicles,
        properties: propertyMarkers,
        incidents: incidentMarkers,
      },
    };
  }

  async getNotifications(tenantId: string, user?: { id: string; role: UserRole }) {
    const showTickets = user ? canSeeDeveloperTickets(user.role) : false;
    const [notifications, incidents, errorReports] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.incident.findMany({
        where: { tenantId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, type: true, isSilent: true, priority: true, createdAt: true, user: true },
      }),
      showTickets
        ? this.prisma.errorReport.findMany({
            where: {
              tenantId,
              status: { in: [ErrorReportStatus.OPEN, ErrorReportStatus.ACKNOWLEDGED] },
            },
            orderBy: { createdAt: 'desc' },
            take: 40,
            include: {
              reporter: { select: { firstName: true, lastName: true, role: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const incidentFeed = incidents.map((i) => ({
      id: `incident-${i.id}`,
      category: this.notificationCategoryFromIncident(i.type, i.isSilent),
      title: `${i.isSilent ? 'Silent ' : ''}${i.type.replace('_', ' ')} alert`,
      body: `${i.user.firstName} ${i.user.lastName} — requires operator attention`,
      priority: i.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
      isRead: false,
      createdAt: i.createdAt.toISOString(),
      link: `/control-room/map?incident=${i.id}`,
      entityType: 'incident' as const,
      entityId: i.id,
    }));

    const stored = notifications
      .filter((n) => n.type !== NotificationType.ERROR_REPORT)
      .map((n) => ({
      id: n.id,
      category: this.notificationCategoryFromType(n.type, n.title, n.body),
      title: n.title,
      body: n.body,
      priority: this.notificationPriority(n.type, n.title),
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      link: this.notificationLink(n.type, n.title, n.body, tenantId),
      entityType: this.notificationEntityType(n.type),
      entityId: null as string | null,
    }));

    const ticketFeed = errorReports.map((r) => {
      const code = this.developerTicketCode(r.id);
      const reporter = `${r.reporter.firstName} ${r.reporter.lastName}`.trim();
      return {
        id: `ticket-${r.id}`,
        category: 'DEVELOPER' as const,
        title: `Issue ticket ${code}`,
        body: `${reporter} · ${r.message}`,
        priority: (r.status === ErrorReportStatus.OPEN ? 'high' : 'medium') as
          | 'low'
          | 'medium'
          | 'high'
          | 'critical',
        isRead: r.status !== ErrorReportStatus.OPEN,
        createdAt: r.createdAt.toISOString(),
        link: `/control-room/developer?ticket=${r.id}`,
        entityType: null as 'incident' | 'vehicle' | 'client' | 'property' | null,
        entityId: r.id,
      };
    });

    const priorityRank: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const merged = [...incidentFeed, ...ticketFeed, ...stored].sort((a, b) => {
      const unreadDelta = Number(a.isRead) - Number(b.isRead);
      if (unreadDelta !== 0) return unreadDelta;
      const pa = priorityRank[a.priority] ?? 9;
      const pb = priorityRank[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      success: true,
      data: {
        notifications: merged.slice(0, 80),
        unreadCount: merged.filter((n) => !n.isRead).length,
      },
    };
  }

  async markNotificationRead(tenantId: string, id: string) {
    if (id.startsWith('incident-') || id.startsWith('ticket-')) {
      return { success: true, data: { id, isRead: true } };
    }
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true, data: updated };
  }

  async markAllNotificationsRead(tenantId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, data: { marked: true } };
  }

  async listIncidents(tenantId: string) {
    const incidents = await this.prisma.incident.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        dispatches: { include: { officer: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return {
      success: true,
      data: incidents.map((i) => ({
        ...this.formatIncident(i),
        reportCount: i.notes.length,
        latestReport: i.notes[0]?.content ?? null,
      })),
    };
  }

  async getIncident(tenantId: string, id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
        dispatches: { include: { officer: true }, orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        media: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return {
      success: true,
      data: {
        ...this.formatIncident(incident),
        description: incident.description,
        lat: Number(incident.lat),
        lng: Number(incident.lng),
        createdAt: incident.createdAt.toISOString(),
        notes: incident.notes.map((n) => ({
          id: n.id,
          authorRole: n.authorRole,
          authorName: n.authorName,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
        })),
        dispatches: incident.dispatches.map((d) => ({
          id: d.id,
          status: d.status,
          officer: `${d.officer.firstName} ${d.officer.lastName}`,
          createdAt: d.createdAt.toISOString(),
        })),
        media: incident.media.map((m) => ({
          id: m.id,
          fileName: m.fileName,
          fileType: m.fileType,
          fileUrl: m.fileUrl,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    };
  }

  async createIncident(
    tenantId: string,
    reporter: { name: string; role: string },
    body: {
      userId?: string;
      type: IncidentType;
      priority?: IncidentPriority;
      title?: string;
      description: string;
      address?: string;
      lat?: number;
      lng?: number;
      isSilent?: boolean;
    },
  ) {
    const client =
      body.userId != null
        ? await this.prisma.user.findFirst({ where: { id: body.userId, tenantId } })
        : await this.prisma.user.findFirst({
            where: { tenantId, role: 'USER', status: 'ACTIVE' },
          });
    if (!client) throw new BadRequestException('No client available for incident');

    const lat = body.lat ?? (client.lastKnownLat ? Number(client.lastKnownLat) : -29.8587);
    const lng = body.lng ?? (client.lastKnownLng ? Number(client.lastKnownLng) : 31.0218);

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId: client.id,
        type: body.type,
        status: IncidentStatus.ACTIVE,
        priority: body.priority ?? IncidentPriority.HIGH,
        title: body.title ?? `${body.type.replace('_', ' ')} Report`,
        description: body.description,
        lat,
        lng,
        address: body.address ?? 'Durban metro',
        isSilent: body.isSilent ?? false,
      },
      include: { user: true },
    });

    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId: incident.id,
        authorRole: reporter.role,
        authorName: reporter.name,
        content: body.description,
      },
    });

    this.emitMapIncident(tenantId, incident);

    return { success: true, data: this.formatIncident(incident) };
  }

  async addIncidentReport(
    tenantId: string,
    incidentId: string,
    author: { role: string; name: string },
    content: string,
  ) {
    const incident = await this.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const note = await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: author.role,
        authorName: author.name,
        content,
      },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: incident.userId,
        type: NotificationType.INCIDENT_UPDATE,
        title: 'Incident report updated',
        body: `${author.name} added a field report.`,
      },
    });

    return {
      success: true,
      data: {
        id: note.id,
        authorRole: note.authorRole,
        authorName: note.authorName,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      },
    };
  }

  async listDispatches(tenantId: string) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: { tenantId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: {
        officer: true,
        incident: {
          include: { user: true, notes: { take: 1, orderBy: { createdAt: 'desc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: dispatches.map((d) => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        officer: {
          id: d.officer.id,
          name: `${d.officer.firstName} ${d.officer.lastName}`,
          status: d.officer.status,
        },
        incident: {
          id: d.incident.id,
          type: d.incident.type,
          status: d.incident.status,
          priority: d.incident.priority,
          address: d.incident.address,
          client: `${d.incident.user.firstName} ${d.incident.user.lastName}`,
          latestReport: d.incident.notes[0]?.content ?? d.incident.description,
        },
      })),
    };
  }

  async updateIncident(tenantId: string, id: string, status: IncidentStatus) {
    const incident = await this.prisma.incident.findFirst({ where: { id, tenantId } });
    if (!incident) throw new NotFoundException('Incident not found');
    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(status) ? new Date() : null,
      },
      include: { user: true, dispatches: { include: { officer: true } } },
    });
    return { success: true, data: this.formatIncident(updated) };
  }

  async listClients(tenantId: string) {
    const clients = await this.prisma.user.findMany({
      where: { tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] }, status: 'ACTIVE' },
      include: { subscription: true },
      orderBy: { firstName: 'asc' },
    });
    return {
      success: true,
      data: clients.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        role: c.role,
        subscription: c.subscription
          ? this.subscriptions.formatSubscriptionSummary(c.subscription)
          : null,
      })),
    };
  }

  async listCustomers(tenantId: string) {
    const customers = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['USER', 'FAMILY_MEMBER'] },
        status: { not: 'DELETED' },
        isProtectionClient: true,
      },
      include: {
        subscription: true,
        _count: { select: { incidents: true, vehicles: true, properties: true } },
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });

    return {
      success: true,
      data: customers.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        role: c.role,
        status: c.status,
        incidentCount: c._count.incidents,
        vehicleCount: c._count.vehicles,
        propertyCount: c._count.properties,
        subscription: c.subscription
          ? this.subscriptions.formatSubscriptionSummary(c.subscription)
          : null,
      })),
      stats: {
        total: customers.length,
        premium: customers.filter((c) => c.subscription?.tierCode === 'PREMIUM').length,
        pastDue: customers.filter((c) => c.subscription?.status === 'PAST_DUE').length,
        active: customers.filter((c) => c.subscription?.status === 'ACTIVE').length,
      },
    };
  }

  getSubscriptionCatalog() {
    return this.subscriptions.getCatalog();
  }

  getCustomerSubscription(tenantId: string, userId: string) {
    return this.subscriptions.getCustomerSubscription(tenantId, userId);
  }

  updateCustomerSubscription(
    tenantId: string,
    userId: string,
    body: Parameters<SubscriptionService['updateSubscriptionAdmin']>[2],
    actorName: string,
  ) {
    return this.subscriptions.updateSubscriptionAdmin(tenantId, userId, body, actorName);
  }

  getBillingOverview(tenantId: string) {
    return this.subscriptions.getBillingOverview(tenantId);
  }

  processOverdueBilling(tenantId: string) {
    return this.subscriptions.processOverdueBilling(tenantId);
  }

  chargeCustomerMonthly(tenantId: string, userId: string) {
    return this.subscriptions.createMonthlyCharge(userId, tenantId);
  }

  async getCustomerLoyalty(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] } },
    });
    if (!user) throw new NotFoundException('Customer not found');
    return this.loyalty.getLoyalty(userId);
  }

  updateCustomerLoyalty(
    tenantId: string,
    userId: string,
    body: { manualDiscountPercent?: number; notes?: string | null; adjustPoints?: number },
  ) {
    return this.loyalty.updateLoyaltyAdmin(tenantId, userId, body);
  }

  listDiscountCodes(tenantId: string) {
    return this.loyalty.listDiscountCodes(tenantId);
  }

  upsertDiscountCode(
    tenantId: string,
    body: {
      id?: string;
      code: string;
      percentOff: number;
      appliesTo?: 'SUBSCRIPTION' | 'STORE' | 'BOTH';
      maxUses?: number | null;
      isActive?: boolean;
      expiresAt?: string | null;
      description?: string | null;
    },
  ) {
    return this.loyalty.upsertDiscountCode(tenantId, body);
  }

  async listOfficers(tenantId: string) {
    const officers = await this.prisma.officer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { firstName: 'asc' },
    });
    const crewIndex = await this.fleet.getCrewIndex(tenantId);
    return {
      success: true,
      data: officers.map((o) => {
        const vehicle = crewIndex.get(o.id);
        return {
          ...o,
          vehicle: vehicle
            ? {
                id: vehicle.vehicleId,
                callSign: vehicle.callSign,
                registration: vehicle.registration,
                role: vehicle.role,
                crewMates: vehicle.crewMates,
              }
            : null,
        };
      }),
    };
  }

  listFleet(tenantId: string) {
    return this.fleet.listFleet(tenantId);
  }

  setFleetCrew(
    tenantId: string,
    vehicleId: string,
    crew: { officerId: string; role?: 'DRIVER' | 'PASSENGER' | 'SUPERVISOR' }[],
  ) {
    return this.fleet.setVehicleCrew(tenantId, vehicleId, crew);
  }

  async updateOfficerStatus(tenantId: string, id: string, status: OfficerStatus) {
    const officer = await this.prisma.officer.findFirst({ where: { id, tenantId } });
    if (!officer) throw new NotFoundException('Officer not found');
    const updated = await this.prisma.officer.update({ where: { id }, data: { status } });
    return { success: true, data: updated };
  }

  async listUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, status: { not: 'DELETED' } },
      include: this.managedUserInclude(),
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });

    return {
      success: true,
      data: users.map((u) => this.formatManagedUser(u)),
    };
  }

  async createUser(
    tenantId: string,
    body: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      status?: UserStatus;
      phone?: string;
      jobTitle?: string;
      avatarUrl?: string;
      branchId?: string | null;
      teamIds?: string[];
    },
    actor: { role: UserRole },
  ) {
    if (
      (body.role === 'SUPER_ADMIN' || body.role === 'OWNER') &&
      actor.role !== 'SUPER_ADMIN' &&
      actor.role !== 'OWNER'
    ) {
      throw new BadRequestException('Only owners can create owner or super admin users');
    }

    const email = body.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existing) throw new BadRequestException('A user with this email already exists');

    await this.validateBranchAndTeams(tenantId, body.branchId, body.teamIds);

    const isClientRole = body.role === 'USER' || body.role === 'FAMILY_MEMBER';
    const passwordSource =
      body.password?.trim() ||
      (isClientRole ? randomBytes(24).toString('hex') : null);
    if (!passwordSource) {
      throw new BadRequestException('Password is required');
    }
    const passwordHash = await bcrypt.hash(passwordSource, 10);

    const inviteToken = isClientRole ? generateClientInviteCode() : null;
    const inviteExpiresAt = isClientRole
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;
    const status = isClientRole
      ? (body.status ?? UserStatus.PENDING_VERIFICATION)
      : (body.status ?? UserStatus.ACTIVE);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: body.role,
          status,
          phone: body.phone?.trim() || null,
          jobTitle: body.jobTitle?.trim() || null,
          avatarUrl: body.avatarUrl || null,
          branchId: body.branchId ?? null,
          isProtectionClient: isClientRole,
          inviteToken,
          inviteExpiresAt,
        },
        include: this.managedUserInclude(),
      });

      if (body.teamIds?.length) {
        await tx.teamMember.createMany({
          data: body.teamIds.map((teamId) => ({ teamId, userId: created.id })),
        });
      }

      if (body.role === 'OFFICER') {
        await this.ensureOfficerRecord(tx, tenantId, {
          email,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          branchId: body.branchId ?? null,
          jobTitle: body.jobTitle,
        });
      }

      if (isClientRole) {
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + 1);
        await tx.subscription.create({
          data: {
            tenantId,
            userId: created.id,
            planName: '4DS Essential',
            tierCode: 'ESSENTIAL',
            addons: [],
            priceMonthly: 19900,
            memberId: `4DS-${Date.now().toString(36).toUpperCase()}`,
            validUntil,
            status: 'ACTIVE',
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: this.managedUserInclude(),
      });
    });

    return { success: true, data: this.formatManagedUser(user) };
  }

  async updateUser(
    tenantId: string,
    userId: string,
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      jobTitle?: string | null;
      avatarUrl?: string | null;
      password?: string;
      role?: UserRole;
      status?: UserStatus;
      branchId?: string | null;
      teamIds?: string[];
    },
    actor: { id: string; role: UserRole },
  ) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    if (body.role) {
      if (
        (body.role === 'SUPER_ADMIN' || body.role === 'OWNER') &&
        actor.role !== 'SUPER_ADMIN' &&
        actor.role !== 'OWNER'
      ) {
        throw new BadRequestException('Only owners can assign owner or super admin roles');
      }
      if (actor.id === userId && body.role !== user.role) {
        throw new BadRequestException('Cannot change your own role');
      }
    }

    await this.validateBranchAndTeams(tenantId, body.branchId, body.teamIds);

    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;
    const nextRole = body.role ?? user.role;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
          ...(body.lastName !== undefined && { lastName: body.lastName.trim() }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.jobTitle !== undefined && { jobTitle: body.jobTitle }),
          ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
          ...(passwordHash && { passwordHash }),
          ...(body.role !== undefined && { role: body.role }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.branchId !== undefined && { branchId: body.branchId }),
        },
      });

      if (body.teamIds !== undefined) {
        await tx.teamMember.deleteMany({ where: { userId } });
        if (body.teamIds.length) {
          await tx.teamMember.createMany({
            data: body.teamIds.map((teamId) => ({ teamId, userId })),
          });
        }
      }

      const refreshed = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: this.managedUserInclude(),
      });

      if (nextRole === 'OFFICER') {
        await this.ensureOfficerRecord(tx, tenantId, {
          email: refreshed.email,
          firstName: refreshed.firstName,
          lastName: refreshed.lastName,
          branchId: refreshed.branchId,
          jobTitle: refreshed.jobTitle,
        });
        if (body.branchId !== undefined) {
          await tx.officer.updateMany({
            where: { tenantId, email: refreshed.email },
            data: { branchId: body.branchId },
          });
        }
      }

      return refreshed;
    });

    return {
      success: true,
      data: this.formatManagedUser(updated),
    };
  }

  private managedUserInclude() {
    return {
      branch: { select: { id: true, name: true, code: true } },
      teamMemberships: {
        include: { team: { select: { id: true, name: true, branchId: true } } },
      },
    } satisfies Prisma.UserInclude;
  }

  private formatManagedUser(
    u: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      avatarUrl: string | null;
      jobTitle: string | null;
      role: UserRole;
      status: UserStatus;
      inviteToken?: string | null;
      inviteExpiresAt?: Date | null;
      registrationCompletedAt?: Date | null;
    } & ManagedUserInclude,
  ) {
    const inviteToken = u.inviteToken ?? null;
    const inviteExpiresAt = u.inviteExpiresAt ?? null;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      jobTitle: u.jobTitle,
      role: u.role,
      status: u.status,
      branch: u.branch,
      teams: u.teamMemberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        branchId: m.team.branchId,
        isLead: m.isLead,
      })),
      inviteToken,
      inviteCode: inviteToken,
      inviteExpiresAt,
      inviteUrl: inviteToken ? `/portal/register?token=${encodeURIComponent(inviteToken)}` : null,
      registrationCompletedAt: u.registrationCompletedAt ?? null,
    };
  }

  async regenerateClientInvite(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        role: { in: [UserRole.USER, UserRole.FAMILY_MEMBER] },
      },
      include: this.managedUserInclude(),
    });
    if (!user) throw new NotFoundException('Client not found');
    if (user.registrationCompletedAt) {
      throw new BadRequestException(
        'This client already completed registration. Create a family invite or reset access from support.',
      );
    }

    let inviteToken = generateClientInviteCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await this.prisma.user.findFirst({
        where: { inviteToken, NOT: { id: userId } },
        select: { id: true },
      });
      if (!clash) break;
      inviteToken = generateClientInviteCode();
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: UserStatus.PENDING_VERIFICATION,
        isProtectionClient: true,
        registrationCompletedAt: null,
      },
      include: this.managedUserInclude(),
    });

    return { success: true, data: this.formatManagedUser(updated) };
  }

  private async validateBranchAndTeams(
    tenantId: string,
    branchId?: string | null,
    teamIds?: string[],
  ) {
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, tenantId },
      });
      if (!branch) throw new NotFoundException('Branch not found');
    }

    if (teamIds?.length) {
      const teams = await this.prisma.team.findMany({
        where: { id: { in: teamIds }, tenantId },
      });
      if (teams.length !== teamIds.length) {
        throw new BadRequestException('One or more teams not found');
      }
      if (branchId) {
        const invalid = teams.some((t) => t.branchId !== branchId);
        if (invalid) throw new BadRequestException('Teams must belong to the selected branch');
      }
    }
  }

  private async ensureOfficerRecord(
    tx: Prisma.TransactionClient,
    tenantId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      branchId: string | null;
      jobTitle?: string | null;
    },
  ) {
    const existing = await tx.officer.findUnique({
      where: { tenantId_email: { tenantId, email: data.email } },
    });
    if (existing) {
      await tx.officer.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          ...(data.branchId !== undefined && { branchId: data.branchId }),
          ...(data.jobTitle && { zone: data.jobTitle }),
          isActive: true,
        },
      });
      return;
    }

    await tx.officer.create({
      data: {
        tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        branchId: data.branchId,
        zone: data.jobTitle ?? 'Unassigned',
        status: OfficerStatus.OFF_DUTY,
      },
    });
  }

  async listBranches(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      include: {
        teams: {
          where: { isActive: true },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, role: true },
                },
              },
            },
          },
        },
        _count: { select: { users: true, officers: true } },
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: branches };
  }

  async createBranch(tenantId: string, body: { name: string; code: string }) {
    const branch = await this.prisma.branch.create({
      data: { tenantId, name: body.name, code: body.code.toUpperCase() },
    });
    return { success: true, data: branch };
  }

  async updateBranch(
    tenantId: string,
    id: string,
    body: { name?: string; code?: string; isActive?: boolean },
  ) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Branch not found');
    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code.toUpperCase() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return { success: true, data: updated };
  }

  async createTeam(tenantId: string, body: { name: string; branchId: string }) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: body.branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    const team = await this.prisma.team.create({
      data: { tenantId, branchId: body.branchId, name: body.name },
    });
    return { success: true, data: team };
  }

  async updateTeam(
    tenantId: string,
    id: string,
    body: { name?: string; isActive?: boolean },
  ) {
    const team = await this.prisma.team.findFirst({ where: { id, tenantId } });
    if (!team) throw new NotFoundException('Team not found');
    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return { success: true, data: updated };
  }

  async addTeamMember(
    tenantId: string,
    teamId: string,
    userId: string,
    isLead = false,
  ) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId } });
    if (!team) throw new NotFoundException('Team not found');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const member = await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: { isLead },
      create: { teamId, userId, isLead },
    });

    if (!user.branchId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { branchId: team.branchId },
      });
    }

    return { success: true, data: member };
  }

  async removeTeamMember(tenantId: string, teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId } });
    if (!team) throw new NotFoundException('Team not found');
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { success: true, data: { teamId, userId } };
  }

  async getDispatchOptions(tenantId: string, incidentId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: {
        user: true,
        dispatches: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { officer: true },
          take: 1,
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const activeDispatch = incident.dispatches[0] ?? null;
    const ilat = Number(incident.lat);
    const ilng = Number(incident.lng);

    const crewIndex = await this.fleet.getCrewIndex(tenantId);
    const officers = await this.prisma.officer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { firstName: 'asc' },
    });

    const busyNearby = new Set(['EN_ROUTE', 'ON_SCENE', 'DISPATCHED', 'ASSIGNED']);

    const unitLabelFor = (officerId: string, idx: number) => {
      const assignment = crewIndex.get(officerId);
      if (!assignment) {
        return {
          unitCallSign: `UNIT-${String(idx + 1).padStart(3, '0')}`,
          vehicleType: null as string | null,
          registration: null as string | null,
          unitLabel: null as string | null,
        };
      }
      const vehicleType = assignment.vehicleType.replace(/_/g, ' ');
      return {
        unitCallSign: assignment.callSign,
        vehicleType: assignment.vehicleType,
        registration: assignment.registration,
        unitLabel: `${assignment.callSign} · ${vehicleType} · ${assignment.registration}`,
      };
    };

    const ranked = officers
      .map((o, idx) => {
        const hasPosition = o.currentLat != null && o.currentLng != null;
        const distanceKm = hasPosition
          ? this.haversineKm(ilat, ilng, Number(o.currentLat), Number(o.currentLng))
          : null;
        const etaSec =
          distanceKm != null
            ? Math.round((distanceKm / 40) * 3600)
            : o.avgResponseSec;
        const unit = unitLabelFor(o.id, idx);
        return {
          id: o.id,
          name: `${o.firstName} ${o.lastName}`,
          status: o.status,
          zone: o.zone,
          available: o.status === 'AVAILABLE',
          distanceKm,
          eta: this.formatEta(etaSec),
          ...unit,
        };
      })
      .sort((a, b) => {
        const tier = (available: boolean, status: string) => {
          if (available) return 0;
          if (busyNearby.has(status)) return 1;
          return 2;
        };
        const ta = tier(a.available, a.status);
        const tb = tier(b.available, b.status);
        if (ta !== tb) return ta - tb;
        const ad = a.distanceKm ?? 9999;
        const bd = b.distanceKm ?? 9999;
        return ad - bd;
      });

    const [recentEscalation, volunteerNotes] = await Promise.all([
      this.prisma.incidentNote.findFirst({
        where: {
          incidentId,
          content: { contains: 'EMERGENCY ESCALATION' },
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.incidentNote.findMany({
        where: {
          incidentId,
          content: { startsWith: OFFICER_AVAILABLE_MARKER_PREFIX },
          createdAt: { gte: volunteerNoteCutoff() },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const volunteerIds = [
      ...new Set(
        volunteerNotes
          .map((n) => parseOfficerIdFromVolunteerNote(n.content))
          .filter((id): id is string => !!id),
      ),
    ];
    const volunteerOfficers = officers.filter((o) => volunteerIds.includes(o.id));
    const volunteers = volunteerIds
      .map((id) => {
        const note = volunteerNotes.find((n) => parseOfficerIdFromVolunteerNote(n.content) === id);
        const officer = volunteerOfficers.find((o) => o.id === id);
        if (!officer || !note) return null;
        const rankedOfficer = ranked.find((o) => o.id === id);
        const officerIdx = officers.findIndex((o) => o.id === id);
        const unit = unitLabelFor(id, officerIdx >= 0 ? officerIdx : 0);
        return {
          id: officer.id,
          name: `${officer.firstName} ${officer.lastName}`,
          status: officer.status,
          zone: officer.zone,
          distanceKm: rankedOfficer?.distanceKm ?? null,
          eta: rankedOfficer?.eta ?? null,
          signalledAt: note.createdAt.toISOString(),
          ...unit,
        };
      })
      .filter((v): v is NonNullable<typeof v> => !!v);

    return {
      success: true,
      data: {
        incident: {
          id: incident.id,
          type: incident.type,
          status: incident.status,
          priority: incident.priority,
          address: incident.address,
          client: `${incident.user.firstName} ${incident.user.lastName}`,
        },
        canDispatch: !activeDispatch && incident.status === 'ACTIVE',
        assignedOfficer: activeDispatch
          ? `${activeDispatch.officer.firstName} ${activeDispatch.officer.lastName}`
          : null,
        availableCount: ranked.filter((o) => o.available).length,
        officers: ranked,
        volunteers,
        emergencyRaisedRecently: !!recentEscalation,
      },
    };
  }

  async emergencyNotify(
    tenantId: string,
    incidentId: string,
    actorName = 'Control Room',
    reason?: string,
  ) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: { user: true },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const recentEscalation = await this.prisma.incidentNote.findFirst({
      where: {
        incidentId,
        content: { contains: 'EMERGENCY ESCALATION' },
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });
    if (recentEscalation) {
      return {
        success: true,
        data: { alreadyNotified: true, message: 'Emergency alert already sent recently.' },
      };
    }

    const controlUsers = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: {
          in: [
            UserRole.DISPATCHER,
            UserRole.SUPERVISOR,
            UserRole.MANAGER,
            UserRole.TENANT_ADMIN,
            UserRole.OWNER,
            UserRole.SUPER_ADMIN,
          ],
        },
      },
      select: { id: true },
    });

    const fieldOfficers = await this.prisma.officer.findMany({
      where: { tenantId, isActive: true, status: { not: 'OFF_DUTY' } },
      select: { email: true },
    });
    const officerUsers = fieldOfficers.length
      ? await this.prisma.user.findMany({
          where: { tenantId, email: { in: fieldOfficers.map((o) => o.email) } },
          select: { id: true },
        })
      : [];

    const recipientIds = new Set([
      ...controlUsers.map((u) => u.id),
      ...officerUsers.map((u) => u.id),
    ]);

    const location = incident.address ?? 'location unknown';
    const client = `${incident.user.firstName} ${incident.user.lastName}`;
    const body = `${incident.type} — ${client} at ${location}. No units available — operator escalation.${reason ? ` Note: ${reason}` : ''}`;

    for (const userId of recipientIds) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: NotificationType.PANIC_ALERT,
          title: 'Unassigned incident — emergency alert',
          body,
        },
      });
    }

    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: 'DISPATCHER',
        authorName: actorName,
        content: `EMERGENCY ESCALATION: No available officers. Broadcast sent to control room and field units.${reason ? ` Reason: ${reason}` : ''}`,
      },
    });

    this.realtime.emitNotification(tenantId, {
      type: 'emergency',
      incidentId,
      title: 'Unassigned incident — emergency alert',
      body,
    });

    return {
      success: true,
      data: {
        alreadyNotified: false,
        notified: recipientIds.size,
        message: `Emergency alert sent to ${recipientIds.size} recipients.`,
      },
    };
  }

  async assignDispatch(tenantId: string, incidentId: string, officerId?: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: { user: true },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const existing = await this.prisma.dispatch.findFirst({
      where: { incidentId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    });
    if (existing) throw new BadRequestException('Incident already has an active dispatch');

    let officer = officerId
      ? await this.prisma.officer.findFirst({
          where: { id: officerId, tenantId, isActive: true },
        })
      : null;

    if (!officer) {
      const available = await this.prisma.officer.findMany({
        where: { tenantId, status: 'AVAILABLE', isActive: true, currentLat: { not: null } },
      });
      if (!available.length) {
        officer = await this.prisma.officer.findFirst({
          where: { tenantId, status: 'AVAILABLE', isActive: true },
          orderBy: { avgResponseSec: 'asc' },
        });
      } else {
        const ilat = Number(incident.lat);
        const ilng = Number(incident.lng);
        officer = available.reduce((best, o) => {
          const bestDist = this.haversineKm(
            ilat,
            ilng,
            Number(best.currentLat),
            Number(best.currentLng),
          );
          const dist = this.haversineKm(ilat, ilng, Number(o.currentLat), Number(o.currentLng));
          return dist < bestDist ? o : best;
        });
      }
    }

    if (!officer) throw new NotFoundException('No available officers');

    const dispatch = await this.prisma.dispatch.create({
      data: { tenantId, incidentId, officerId: officer.id, status: 'ASSIGNED' },
      include: { officer: true, incident: { include: { user: true } } },
    });

    await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: 'DISPATCHED' },
    });
    await this.prisma.officer.update({
      where: { id: officer.id },
      data: { status: 'EN_ROUTE' },
    });

    const officerUser = await this.prisma.user.findFirst({
      where: { tenantId, email: officer.email },
    });
    if (officerUser) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: officerUser.id,
          type: NotificationType.DISPATCH_ASSIGNED,
          title: 'New dispatch assignment',
          body: `${incident.type} — ${incident.user.firstName} ${incident.user.lastName}`,
        },
      });
    }

    const assignLabel = officerId ? 'Manually assigned' : 'Auto-assigned';
    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: 'DISPATCHER',
        authorName: 'Control Room',
        content: `${assignLabel} to ${officer.firstName} ${officer.lastName} (${officer.zone ?? 'zone unassigned'}).`,
      },
    });

    return { success: true, data: dispatch };
  }

  async getAnalytics(tenantId: string) {
    const [totalUsers, totalIncidents, resolved, panicCount, theftCount, officers] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId, status: 'ACTIVE' } }),
        this.prisma.incident.count({ where: { tenantId } }),
        this.prisma.incident.count({
          where: { tenantId, status: { in: ['RESOLVED', 'CLOSED'] } },
        }),
        this.prisma.incident.count({ where: { tenantId, type: 'PANIC' } }),
        this.prisma.incident.count({ where: { tenantId, type: 'THEFT' } }),
        this.prisma.officer.findMany({ where: { tenantId, isActive: true } }),
      ]);

    const avgResponse = officers.length
      ? Math.round(officers.reduce((s, o) => s + o.avgResponseSec, 0) / officers.length)
      : 342;

    const incidentsByDay = await this.prisma.incident.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: true,
    });

    return {
      success: true,
      data: {
        totalUsers,
        totalIncidents,
        resolvedIncidents: resolved,
        resolutionRate: totalIncidents ? Math.round((resolved / totalIncidents) * 100) : 0,
        panicCount,
        theftCount,
        avgResponseSec: avgResponse,
        incidentsByType: incidentsByDay,
        officerPerformance: officers.map((o) => ({
          name: `${o.firstName} ${o.lastName}`,
          avgResponseSec: o.avgResponseSec,
          status: o.status,
        })),
      },
    };
  }

  private async getUserPositions(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        trackingEnabled: true,
        lastKnownLat: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lastKnownLat: true,
        lastKnownLng: true,
        lastLocationAt: true,
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      lat: Number(u.lastKnownLat),
      lng: Number(u.lastKnownLng),
      updatedAt: u.lastLocationAt,
    }));
  }

  private formatIncident(incident: {
    id: string;
    type: string;
    status: string;
    priority: string;
    address: string | null;
    createdAt: Date;
    user: { firstName: string; lastName: string };
    dispatches?: { officer: { firstName: string; lastName: string } }[];
  }) {
    return {
      id: incident.id,
      type: incident.type,
      status: incident.status,
      priority: incident.priority.toLowerCase(),
      user: `${incident.user.firstName} ${incident.user.lastName.charAt(0)}.`,
      location: incident.address ?? 'Unknown',
      time: this.timeAgo(incident.createdAt),
      officer: incident.dispatches?.[0]
        ? `${incident.dispatches[0].officer.firstName} ${incident.dispatches[0].officer.lastName}`
        : null,
    };
  }

  private timeAgo(date: Date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  }

  private hashSeed(value: string) {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h << 5) - h + value.charCodeAt(i);
    return Math.abs(h);
  }

  private jitterPosition(lat: number, lng: number, seed: string, amplitude = 0.002) {
    const t = Date.now() / 12000;
    const h = this.hashSeed(seed);
    return {
      lat: lat + Math.sin(t + h) * amplitude,
      lng: lng + Math.cos(t + h * 1.7) * amplitude,
    };
  }

  private buildTrail(lat: number, lng: number, seed: string, type: string) {
    const points = 10;
    const h = this.hashSeed(seed);
    const trail: { lat: number; lng: number }[] = [];
    const spread = type === 'THEFT' ? 0.012 : 0.006;
    for (let i = points; i >= 0; i--) {
      const ratio = i / points;
      trail.push({
        lat: lat - spread * ratio * Math.cos(h + i * 0.4),
        lng: lng - spread * ratio * Math.sin(h + i * 0.35),
      });
    }
    return trail;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private nearestOfficer(
    lat: number,
    lng: number,
    officers: { lat: number; lng: number; avgResponseSec: number }[],
  ) {
    if (!officers.length) return null;
    let best = officers[0];
    let bestDist = this.haversineKm(lat, lng, best.lat, best.lng);
    for (const o of officers.slice(1)) {
      const d = this.haversineKm(lat, lng, o.lat, o.lng);
      if (d < bestDist) {
        best = o;
        bestDist = d;
      }
    }
    return { distanceKm: bestDist, avgResponseSec: best.avgResponseSec };
  }

  private formatEta(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  private resolveClientType(
    user: {
      role: string;
      medicalProfile: unknown | null;
      subscription: { tierCode: string } | null;
      familyMemberships: unknown[];
    },
    index: number,
  ) {
    if (user.medicalProfile) return 'MEDICAL';
    if (user.subscription?.tierCode === 'PREMIUM') return 'VIP';
    if (user.role === 'FAMILY_MEMBER') {
      return index % 2 === 0 ? 'CHILD' : 'FAMILY_MEMBER';
    }
    if (index % 5 === 4) return 'ELDERLY';
    return 'STANDARD';
  }

  private resolvePropertyType(property: {
    alarmStatus: string;
    camerasLinked: boolean;
    propertyType: string;
    name: string;
  }) {
    if (property.alarmStatus === 'TRIGGERED') return 'PANIC_EVENT';
    if (property.alarmStatus === 'ARMED') return 'ALARM_ACTIVE';
    if (property.camerasLinked) return 'CCTV';
    if (property.name.toLowerCase().includes('estate')) return 'GUARDED_ESTATE';
    return 'REGISTERED_HOME';
  }

  private resolveIncidentCategory(type: string, isSilent: boolean, title: string | null) {
    if (type === 'PANIC') return isSilent ? 'SILENT_PANIC' : 'PANIC';
    if (type === 'THEFT') return 'THEFT_RECOVERY';
    if (type === 'MEDICAL') return 'MEDICAL';
    if (type === 'FIRE') return 'FIRE';
    if (title?.toLowerCase().includes('intrusion')) return 'INTRUSION';
    if (title?.toLowerCase().includes('escort')) return 'ESCORT';
    if (title?.toLowerCase().includes('wellness')) return 'WELLNESS';
    if (title?.toLowerCase().includes('community')) return 'COMMUNITY';
    if (title?.toLowerCase().includes('suspicious')) return 'SUSPICIOUS';
    return 'SUSPICIOUS';
  }

  private notificationCategoryFromIncident(type: string, isSilent: boolean) {
    if (type === 'PANIC') return isSilent ? 'SILENT_PANIC' : 'PANIC';
    if (type === 'THEFT') return 'THEFT_RECOVERY';
    if (type === 'MEDICAL') return 'MEDICAL';
    return 'ALARM';
  }

  private developerTicketCode(id: string) {
    const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const tail = (compact.slice(-4) || '0000').padStart(4, '0');
    return `DEV-${tail}`;
  }

  private notificationCategoryFromType(type: string, title: string, body: string) {
    const text = `${title} ${body}`.toLowerCase();
    if (type === 'PANIC_ALERT') return 'PANIC';
    if (type === 'THEFT_ALERT') return text.includes('recovery') ? 'THEFT_RECOVERY' : 'VEHICLE';
    if (type === 'FAMILY_ALERT') return 'FAMILY';
    if (type === 'DISPATCH_ASSIGNED' || type === 'INCIDENT_UPDATE') return 'OFFICER';
    if (type === 'BILLING' || text.includes('billing') || text.includes('subscription') || text.includes('payment') || text.includes('past-due') || text.includes('overdue')) {
      return 'BILLING';
    }
    if (type === 'ERROR_REPORT' || text.includes('issue ticket') || text.includes('error reported')) {
      return 'DEVELOPER';
    }
    if (text.includes('medical')) return 'MEDICAL';
    if (text.includes('alarm')) return 'ALARM';
    return 'SYSTEM';
  }

  private notificationPriority(type: string, title: string) {
    const t = title.toLowerCase();
    if (type === 'PANIC_ALERT' || t.includes('panic')) return 'critical';
    if (type === 'THEFT_ALERT') return 'high';
    if (type === 'BILLING' || t.includes('past-due') || t.includes('overdue')) return 'high';
    if (type === 'ERROR_REPORT' || t.includes('issue ticket')) return 'high';
    if (type === 'FAMILY_ALERT') return 'medium';
    return 'low';
  }

  private notificationEntityType(type: string) {
    if (type === 'THEFT_ALERT') return 'vehicle';
    if (type === 'PANIC_ALERT' || type === 'INCIDENT_UPDATE') return 'incident';
    if (type === 'FAMILY_ALERT') return 'client';
    return null;
  }

  private emitMapIncident(
    tenantId: string,
    incident: {
      id: string;
      type: string;
      priority: string;
      status: string;
      lat: { toString(): string };
      lng: { toString(): string };
      address: string | null;
      isSilent: boolean;
      user: { firstName: string; lastName: string };
    },
  ) {
    this.realtime.emitIncidentCreated(tenantId, {
      id: incident.id,
      category: this.resolveIncidentCategory(incident.type, incident.isSilent, null),
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      name: `${incident.user.firstName} ${incident.user.lastName}`,
      lat: Number(incident.lat),
      lng: Number(incident.lng),
      address: incident.address,
      isSilent: incident.isSilent,
      createdAt: new Date().toISOString(),
    });
  }

  private notificationLink(type: string, title: string, body: string, _tenantId: string) {
    const text = `${title} ${body}`.toLowerCase();
    if (type === 'PANIC_ALERT' || type === 'INCIDENT_UPDATE' || text.includes('panic')) {
      return '/control-room/map';
    }
    if (type === 'THEFT_ALERT' || text.includes('vehicle')) return '/control-room/map?focus=vehicles';
    if (type === 'FAMILY_ALERT') return '/control-room/map?focus=clients';
    if (
      type === 'BILLING' ||
      text.includes('billing') ||
      text.includes('subscription') ||
      text.includes('past-due') ||
      text.includes('overdue')
    ) {
      return '/control-room/customers?filter=PAST_DUE';
    }
    if (type === 'ERROR_REPORT' || text.includes('issue ticket') || text.includes('error reported')) {
      return '/control-room/developer';
    }
    if (text.includes('alarm') || text.includes('property')) return '/control-room/map?focus=properties';
    return '/control-room';
  }
}

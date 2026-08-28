import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompanyVehicleStatus,
  CompanyVehicleType,
  ConversationType,
  IncidentClassification,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  NotificationPriority,
  NotificationType,
  OfficerStatus,
  Prisma,
  ResponseAgency,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  DISPATCH_EVENT_BY_STATUS,
  PlatformEvent,
  type EventSource,
  type PlatformEventType,
} from './incident-events';
import { PermissionsService } from './permissions.service';

export type EmergencyKind =
  | 'panic'
  | 'silent'
  | 'theft'
  | 'home-panic'
  | 'medical'
  | 'fire'
  | 'alarm'
  | 'manual'
  | 'service-request';

export type CreateEmergencyInput = {
  tenantId: string;
  userId: string;
  type: IncidentType;
  title?: string;
  description?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  isSilent?: boolean;
  priority?: IncidentPriority;
  propertyId?: string | null;
  vehicleId?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehiclePlate?: string | null;
  source: EventSource;
  actorUserId?: string | null;
  kind: EmergencyKind;
  autoDispatch?: boolean;
  preferredVehicleType?: CompanyVehicleType | null;
  alarmEventId?: string | null;
};

const CLASSIFICATION: Record<IncidentType, IncidentClassification> = {
  PANIC: IncidentClassification.SECURITY,
  ASSAULT: IncidentClassification.SECURITY,
  ALARM: IncidentClassification.SECURITY,
  THEFT: IncidentClassification.THEFT,
  MEDICAL: IncidentClassification.MEDICAL,
  FIRE: IncidentClassification.FIRE,
  OTHER: IncidentClassification.OTHER,
};

const AGENCY: Record<IncidentType, ResponseAgency> = {
  PANIC: ResponseAgency.SECURITY,
  ASSAULT: ResponseAgency.SECURITY,
  ALARM: ResponseAgency.SECURITY,
  THEFT: ResponseAgency.SECURITY,
  MEDICAL: ResponseAgency.MEDICAL,
  FIRE: ResponseAgency.FIRE,
  OTHER: ResponseAgency.SECURITY,
};

@Injectable()
export class IncidentKernelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly permissions: PermissionsService,
  ) {}

  async createFromEmergency(input: CreateEmergencyInput) {
    const publicRef = await this.nextPublicRef(input.tenantId);
    const classification = CLASSIFICATION[input.type] ?? IncidentClassification.OTHER;
    const agency = AGENCY[input.type] ?? ResponseAgency.SECURITY;
    const snapshot = await this.buildSnapshot(input);
    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId: input.tenantId,
        type: ConversationType.INCIDENT,
        subject: publicRef,
      },
    });

    const incident = await this.prisma.incident.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        publicRef,
        type: input.type,
        classification,
        involvedAgencies: [agency],
        status: IncidentStatus.ACTIVE,
        priority: input.priority ?? IncidentPriority.HIGH,
        title: input.title,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        propertyId: input.propertyId ?? undefined,
        vehicleId: input.vehicleId ?? undefined,
        vehicleMake: input.vehicleMake,
        vehicleModel: input.vehicleModel,
        vehicleColor: input.vehicleColor,
        vehiclePlate: input.vehiclePlate,
        isSilent: input.isSilent ?? false,
        contextSnapshot: snapshot as Prisma.InputJsonValue,
        conversationId: conversation.id,
      },
      include: { user: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { subject: incident.id },
    });

    await this.recordEvent({
      tenantId: input.tenantId,
      incidentId: incident.id,
      type: PlatformEvent.INCIDENT_CREATED,
      source: input.source,
      actorUserId: input.actorUserId ?? input.userId,
      payload: { publicRef, kind: input.kind, type: input.type },
    });

    if (input.kind === 'panic' || input.kind === 'silent' || input.kind === 'home-panic') {
      await this.recordEvent({
        tenantId: input.tenantId,
        incidentId: incident.id,
        type: PlatformEvent.PANIC_CREATED,
        source: input.source,
        actorUserId: input.actorUserId ?? input.userId,
        payload: { silent: Boolean(input.isSilent), kind: input.kind },
      });
    }
    if (input.kind === 'alarm') {
      await this.recordEvent({
        tenantId: input.tenantId,
        incidentId: incident.id,
        type: PlatformEvent.ALARM_TRIGGERED,
        source: input.source,
        actorUserId: input.actorUserId,
        payload: { alarmEventId: input.alarmEventId },
      });
    }

    await this.notifyFromEvent(incident, input);

    if (input.autoDispatch) {
      await this.autoAssign(incident.id, input.tenantId, input.preferredVehicleType ?? null, input.source);
    }

    const fresh = await this.prisma.incident.findUniqueOrThrow({
      where: { id: incident.id },
      include: { user: true },
    });
    this.emitCreatedAlias(fresh);
    return fresh;
  }

  async attachAgency(
    tenantId: string,
    incidentId: string,
    agency: ResponseAgency,
    actorUserId?: string | null,
    source: EventSource = 'control-room',
  ) {
    const incident = await this.requireIncident(tenantId, incidentId);
    const agencies = Array.from(new Set([...(incident.involvedAgencies ?? []), agency]));
    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: { involvedAgencies: agencies },
      include: { user: true },
    });
    await this.recordEvent({
      tenantId,
      incidentId,
      type: PlatformEvent.INCIDENT_ESCALATED,
      source,
      actorUserId,
      payload: { agency },
    });
    const vehicleType =
      agency === ResponseAgency.MEDICAL
        ? CompanyVehicleType.MEDICAL
        : agency === ResponseAgency.FIRE
          ? CompanyVehicleType.FIRE_TRUCK
          : null;
    await this.autoAssign(incidentId, tenantId, vehicleType, source, agency);
    return updated;
  }

  async assignResource(opts: {
    tenantId: string;
    incidentId: string;
    officerId?: string | null;
    companyVehicleId?: string | null;
    agency?: ResponseAgency;
    source?: EventSource;
    actorUserId?: string | null;
    etaSeconds?: number | null;
  }) {
    const incident = await this.requireIncident(opts.tenantId, opts.incidentId);
    const dispatch = await this.prisma.dispatch.create({
      data: {
        tenantId: opts.tenantId,
        incidentId: opts.incidentId,
        officerId: opts.officerId ?? undefined,
        companyVehicleId: opts.companyVehicleId ?? undefined,
        agency: opts.agency ?? AGENCY[incident.type],
        etaSeconds: opts.etaSeconds ?? undefined,
        status: 'ASSIGNED',
      },
      include: { officer: true, companyVehicle: true },
    });

    await this.prisma.incident.update({
      where: { id: opts.incidentId },
      data: { status: IncidentStatus.DISPATCHED, dispatchedAt: new Date() },
    });

    if (opts.officerId) {
      await this.prisma.officer.update({
        where: { id: opts.officerId },
        data: { status: OfficerStatus.EN_ROUTE },
      });
    }
    if (opts.companyVehicleId) {
      await this.prisma.companyVehicle.update({
        where: { id: opts.companyVehicleId },
        data: { status: CompanyVehicleStatus.EN_ROUTE },
      });
    }

    await this.recordEvent({
      tenantId: opts.tenantId,
      incidentId: opts.incidentId,
      type: PlatformEvent.DISPATCH_CREATED,
      source: opts.source ?? 'control-room',
      actorUserId: opts.actorUserId,
      payload: {
        dispatchId: dispatch.id,
        officerId: opts.officerId,
        companyVehicleId: opts.companyVehicleId,
        agency: dispatch.agency,
      },
    });
    await this.recordEvent({
      tenantId: opts.tenantId,
      incidentId: opts.incidentId,
      type: PlatformEvent.INCIDENT_ASSIGNED,
      source: opts.source ?? 'control-room',
      actorUserId: opts.actorUserId,
      payload: { dispatchId: dispatch.id },
    });

    if (opts.officerId) {
      const officer = await this.prisma.officer.findUnique({ where: { id: opts.officerId } });
      if (officer) {
        const officerUser = await this.prisma.user.findFirst({
          where: { tenantId: opts.tenantId, email: officer.email },
        });
        if (officerUser) {
          await this.createNotification({
            tenantId: opts.tenantId,
            userId: officerUser.id,
            incidentId: opts.incidentId,
            type: NotificationType.DISPATCH_ASSIGNED,
            priority: NotificationPriority.P1,
            title: 'New dispatch assignment',
            body: `${incident.type} — ${incident.publicRef}`,
            deepLink: `/officer/queue`,
          });
        }
      }
    }

    return dispatch;
  }

  async recordDispatchAdvance(opts: {
    tenantId: string;
    dispatchId: string;
    actorUserId?: string | null;
    source?: EventSource;
  }) {
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id: opts.dispatchId, tenantId: opts.tenantId },
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');
    const eventType = DISPATCH_EVENT_BY_STATUS[dispatch.status] ?? PlatformEvent.INCIDENT_UPDATED;
    const sla: Prisma.IncidentUpdateInput = {};
    if (dispatch.status === 'ON_SCENE') sla.onSceneAt = new Date();
    if (Object.keys(sla).length) {
      await this.prisma.incident.update({ where: { id: dispatch.incidentId }, data: sla });
    }
    await this.recordEvent({
      tenantId: opts.tenantId,
      incidentId: dispatch.incidentId,
      type: eventType,
      source: opts.source ?? 'officer',
      actorUserId: opts.actorUserId,
      payload: { dispatchId: dispatch.id, status: dispatch.status },
    });
  }

  async recordStatusChange(
    tenantId: string,
    incidentId: string,
    status: IncidentStatus,
    source: EventSource,
    actorUserId?: string | null,
  ) {
    const incident = await this.requireIncident(tenantId, incidentId);
    const sla: Prisma.IncidentUpdateInput = {};
    const firstAck =
      !incident.ackedAt &&
      status !== IncidentStatus.ACTIVE &&
      status !== IncidentStatus.CANCELLED;
    if (firstAck) sla.ackedAt = new Date();
    if (status === IncidentStatus.DISPATCHED && !incident.dispatchedAt) sla.dispatchedAt = new Date();
    if (status === IncidentStatus.ON_SCENE && !incident.onSceneAt) sla.onSceneAt = new Date();
    if (Object.keys(sla).length) {
      await this.prisma.incident.update({ where: { id: incidentId }, data: sla });
    }
    if (firstAck) {
      await this.recordEvent({
        tenantId,
        incidentId,
        type: PlatformEvent.INCIDENT_ACKNOWLEDGED,
        source,
        actorUserId,
        payload: { status },
      });
    }
    const type =
      status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED
        ? PlatformEvent.INCIDENT_RESOLVED
        : status === IncidentStatus.CANCELLED
          ? PlatformEvent.PANIC_CANCELLED
          : PlatformEvent.INCIDENT_UPDATED;
    await this.recordEvent({
      tenantId,
      incidentId,
      type,
      source,
      actorUserId,
      payload: { status },
    });
  }

  async recordNoteEvent(
    tenantId: string,
    incidentId: string,
    source: EventSource,
    actorUserId: string | null,
    preview: string,
  ) {
    await this.recordEvent({
      tenantId,
      incidentId,
      type: PlatformEvent.NOTE_ADDED,
      source,
      actorUserId,
      payload: { preview: preview.slice(0, 180) },
    });
  }

  async getHydrated(tenantId: string, incidentId: string, actor: { id: string; role: UserRole }) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            medicalProfile: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            alarmStatus: true,
            occupantDetails: true,
            gateCode: true,
            camerasLinked: true,
          },
        },
        vehicle: {
          select: { id: true, registration: true, make: true, model: true, color: true },
        },
        dispatches: {
          include: { officer: true, companyVehicle: true },
          orderBy: { createdAt: 'desc' },
        },
        conversation: { select: { id: true } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    await this.assertCanView(tenantId, incident.userId, actor);

    const [timeline, resources] = await Promise.all([
      this.getTimeline(tenantId, incidentId, actor),
      this.getResources(tenantId, incidentId, actor),
    ]);

    return {
      success: true as const,
      data: {
        ...this.serializeIncident(incident),
        timeline: timeline.data,
        resources: resources.data,
      },
    };
  }

  async getTimeline(tenantId: string, incidentId: string, actor: { id: string; role: UserRole }) {
    const incident = await this.requireIncident(tenantId, incidentId);
    await this.assertCanView(tenantId, incident.userId, actor);
    const [events, notes] = await Promise.all([
      this.prisma.incidentEvent.findMany({
        where: { incidentId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
      this.prisma.incidentNote.findMany({
        where: { incidentId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const items = [
      ...events.map((e) => ({
        id: e.id,
        kind: 'event' as const,
        type: e.type,
        source: e.source,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
      ...notes.map((n) => ({
        id: n.id,
        kind: 'note' as const,
        type: PlatformEvent.NOTE_ADDED,
        source: n.authorRole.toLowerCase(),
        payload: { authorName: n.authorName, content: n.content },
        createdAt: n.createdAt.toISOString(),
      })),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { success: true as const, data: items };
  }

  async getResources(tenantId: string, incidentId: string, actor: { id: string; role: UserRole }) {
    const incident = await this.requireIncident(tenantId, incidentId);
    await this.assertCanView(tenantId, incident.userId, actor);
    const dispatches = await this.prisma.dispatch.findMany({
      where: { incidentId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { officer: true, companyVehicle: true },
    });

    const client = this.isClientRole(actor.role);
    const medicalOnly = actor.role === UserRole.MEDICAL_CREW || actor.role === UserRole.MEDICAL_DISPATCHER;
    const fireOnly =
      actor.role === UserRole.FIRE_CREW ||
      actor.role === UserRole.FIRE_DISPATCHER ||
      actor.role === UserRole.FIRE_SUPERVISOR;

    const data = dispatches
      .map((d) => {
        const kind = this.resourceKind(d.agency, d.companyVehicle?.vehicleType);
        return {
          id: d.id,
          callSign:
            d.companyVehicle?.callSign ??
            (d.officer ? `${d.officer.firstName} ${d.officer.lastName}` : 'Unit'),
          kind,
          status: d.status,
          etaSeconds: d.etaSeconds,
          lat: d.officer?.currentLat
            ? Number(d.officer.currentLat)
            : d.companyVehicle?.currentLat
              ? Number(d.companyVehicle.currentLat)
              : null,
          lng: d.officer?.currentLng
            ? Number(d.officer.currentLng)
            : d.companyVehicle?.currentLng
              ? Number(d.companyVehicle.currentLng)
              : null,
          incidentId,
          agency: d.agency,
        };
      })
      .filter((row) => {
        if (client) return true;
        if (medicalOnly) return row.kind === 'ambulance' || row.kind === 'officer';
        if (fireOnly) return row.kind === 'fire' || row.kind === 'officer' || row.kind === 'ambulance';
        return true;
      });

    return { success: true as const, data };
  }

  async getIncidentConversation(tenantId: string, incidentId: string, actor: { id: string; role: UserRole }) {
    const incident = await this.requireIncident(tenantId, incidentId);
    await this.assertCanView(tenantId, incident.userId, actor);
    if (!this.permissions.has(actor.role, 'comms.incident')) {
      throw new ForbiddenException('No incident comms access');
    }
    let conversationId = incident.conversationId;
    if (!conversationId) {
      const conversation = await this.prisma.conversation.create({
        data: { tenantId, type: ConversationType.INCIDENT, subject: incidentId },
      });
      conversationId = conversation.id;
      await this.prisma.incident.update({
        where: { id: incidentId },
        data: { conversationId },
      });
    }
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true, phone: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      success: true as const,
      data: {
        conversationId,
        incidentId,
        publicRef: incident.publicRef,
        messages: messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          sender: m.sender,
          attachments: m.attachments,
        })),
      },
    };
  }

  async sendIncidentMessage(
    tenantId: string,
    incidentId: string,
    actor: { id: string; role: UserRole; firstName: string; lastName: string },
    content: string,
  ) {
    const room = await this.getIncidentConversation(tenantId, incidentId, actor);
    const trimmed = content.trim();
    if (!trimmed) throw new ForbiddenException('Message required');
    const message = await this.prisma.message.create({
      data: {
        conversationId: room.data.conversationId,
        senderUserId: actor.id,
        content: trimmed,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true, phone: true },
        },
        attachments: true,
      },
    });
    await this.recordEvent({
      tenantId,
      incidentId,
      type: PlatformEvent.MESSAGE_CREATED,
      source: this.sourceFromRole(actor.role),
      actorUserId: actor.id,
      payload: { messageId: message.id },
    });
    this.realtime.emitPlatformEvent(
      tenantId,
      PlatformEvent.MESSAGE_CREATED,
      {
        incidentId,
        conversationId: room.data.conversationId,
        message: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
        },
      },
      { incidentId, userId: undefined },
    );
    return { success: true as const, data: message };
  }

  async recordEvent(opts: {
    tenantId: string;
    incidentId?: string | null;
    type: PlatformEventType | string;
    source: EventSource;
    actorUserId?: string | null;
    payload?: Record<string, unknown>;
  }) {
    const event = await this.prisma.incidentEvent.create({
      data: {
        tenantId: opts.tenantId,
        incidentId: opts.incidentId ?? undefined,
        type: opts.type,
        source: opts.source,
        actorUserId: opts.actorUserId ?? undefined,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    this.realtime.emitPlatformEvent(
      opts.tenantId,
      opts.type,
      {
        id: event.id,
        incidentId: opts.incidentId,
        type: opts.type,
        source: opts.source,
        payload: opts.payload ?? {},
        createdAt: event.createdAt.toISOString(),
      },
      { incidentId: opts.incidentId, userId: opts.actorUserId },
    );
    return event;
  }

  private async autoAssign(
    incidentId: string,
    tenantId: string,
    vehicleType: CompanyVehicleType | null,
    source: EventSource,
    agency?: ResponseAgency,
  ) {
    const vehicle = vehicleType
      ? await this.prisma.companyVehicle.findFirst({
          where: {
            tenantId,
            vehicleType,
            status: { in: [CompanyVehicleStatus.AVAILABLE, CompanyVehicleStatus.DEPLOYED] },
          },
          include: { crew: true },
          orderBy: { status: 'asc' },
        })
      : null;

    const officer =
      vehicle?.crew[0]?.officerId
        ? await this.prisma.officer.findFirst({
            where: { id: vehicle.crew[0].officerId, tenantId, isActive: true },
          })
        : await this.prisma.officer.findFirst({
            where: { tenantId, status: OfficerStatus.AVAILABLE, isActive: true },
            orderBy: { avgResponseSec: 'asc' },
          });

    if (!officer && !vehicle) return null;
    return this.assignResource({
      tenantId,
      incidentId,
      officerId: officer?.id,
      companyVehicleId: vehicle?.id,
      agency:
        agency ??
        (vehicleType === CompanyVehicleType.MEDICAL
          ? ResponseAgency.MEDICAL
          : vehicleType === CompanyVehicleType.FIRE_TRUCK
            ? ResponseAgency.FIRE
            : ResponseAgency.SECURITY),
      source,
    });
  }

  private async notifyFromEvent(
    incident: { id: string; tenantId: string; userId: string; type: IncidentType; isSilent: boolean; publicRef: string; title: string | null },
    input: CreateEmergencyInput,
  ) {
    const p0 = ['panic', 'silent', 'medical', 'fire', 'home-panic'].includes(input.kind);
    const priority = p0 ? NotificationPriority.P0 : input.kind === 'theft' ? NotificationPriority.P1 : NotificationPriority.P1;
    const type =
      input.kind === 'theft'
        ? NotificationType.THEFT_ALERT
        : input.kind === 'panic' || input.kind === 'silent' || input.kind === 'home-panic'
          ? NotificationType.PANIC_ALERT
          : NotificationType.INCIDENT_UPDATE;
    await this.createNotification({
      tenantId: incident.tenantId,
      userId: incident.userId,
      incidentId: incident.id,
      type,
      priority,
      title: this.clientConfirmTitle(input.kind, input.isSilent),
      body: this.clientConfirmBody(input.kind, incident.publicRef),
      deepLink: '/portal',
    });

    const ops = await this.prisma.user.findMany({
      where: {
        tenantId: incident.tenantId,
        status: 'ACTIVE',
        role: {
          in: [
            UserRole.DISPATCHER,
            UserRole.SUPERVISOR,
            UserRole.MANAGER,
            UserRole.TENANT_ADMIN,
            UserRole.OWNER,
            UserRole.SUPER_ADMIN,
            ...(input.type === IncidentType.MEDICAL
              ? [UserRole.MEDICAL_DISPATCHER]
              : input.type === IncidentType.FIRE
                ? [UserRole.FIRE_DISPATCHER, UserRole.FIRE_SUPERVISOR]
                : []),
          ],
        },
      },
      select: { id: true },
    });
    for (const user of ops) {
      await this.createNotification({
        tenantId: incident.tenantId,
        userId: user.id,
        incidentId: incident.id,
        type,
        priority,
        title: `${incident.publicRef} · ${incident.title ?? incident.type}`,
        body: input.isSilent ? 'Silent panic — covert response' : `${incident.type} created`,
        deepLink: `/control-room/incidents?id=${incident.id}`,
      });
    }
  }

  private async createNotification(data: {
    tenantId: string;
    userId: string;
    incidentId?: string | null;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    body: string;
    deepLink?: string | null;
  }) {
    const row = await this.prisma.notification.create({ data });
    this.realtime.emitNotification(data.tenantId, {
      id: row.id,
      userId: row.userId,
      type: row.type,
      priority: row.priority,
      title: row.title,
      body: row.body,
      incidentId: row.incidentId,
      deepLink: row.deepLink,
    });
    return row;
  }

  private async buildSnapshot(input: CreateEmergencyInput) {
    const [user, medical, property, familyCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { firstName: true, lastName: true, phone: true },
      }),
      this.prisma.medicalProfile.findUnique({ where: { userId: input.userId } }),
      input.propertyId
        ? this.prisma.property.findUnique({
            where: { id: input.propertyId },
            include: { _count: { select: { cameras: true, sensors: true } } },
          })
        : Promise.resolve(null),
      this.prisma.familyMember.count({ where: { userId: input.userId } }),
    ]);
    return {
      client: user ? { name: `${user.firstName} ${user.lastName}`, phone: user.phone } : null,
      medical: medical
        ? {
            bloodType: medical.bloodType,
            allergies: medical.allergies,
            medications: medical.medications,
            chronicConditions: medical.chronicConditions,
            emergencyNotes: medical.emergencyNotes,
          }
        : null,
      property: property
        ? {
            name: property.name,
            address: property.address,
            alarmStatus: property.alarmStatus,
            cameras: property._count.cameras,
            sensors: property._count.sensors,
            gate: property.gateCode ? 'Coded' : null,
            occupants: property.occupantDetails,
          }
        : null,
      familyMembers: familyCount,
      capturedAt: new Date().toISOString(),
    };
  }

  private async nextPublicRef(tenantId: string) {
    const count = await this.prisma.incident.count({ where: { tenantId } });
    return `NX-${String(count + 1).padStart(4, '0')}`;
  }

  private async requireIncident(tenantId: string, incidentId: string) {
    const incident = await this.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  private async assertCanView(tenantId: string, ownerUserId: string, actor: { id: string; role: UserRole }) {
    if (this.isClientRole(actor.role)) {
      if (actor.id === ownerUserId) return;
      const family = await this.prisma.familyMember.findFirst({
        where: {
          userId: actor.id,
          family: {
            OR: [{ ownerUserId }, { members: { some: { userId: ownerUserId } } }],
          },
        },
      });
      if (!family) throw new ForbiddenException('Not allowed to view this incident');
      return;
    }
    if (!this.permissions.has(actor.role, 'incidents.view')) {
      throw new ForbiddenException('Missing incidents.view');
    }
    void tenantId;
  }

  private isClientRole(role: UserRole) {
    return role === UserRole.USER || role === UserRole.FAMILY_MEMBER;
  }

  private resourceKind(
    agency: ResponseAgency,
    vehicleType?: CompanyVehicleType | null,
  ): 'officer' | 'ambulance' | 'fire' | 'supervisor' {
    if (vehicleType === CompanyVehicleType.MEDICAL || agency === ResponseAgency.MEDICAL) return 'ambulance';
    if (vehicleType === CompanyVehicleType.FIRE_TRUCK || agency === ResponseAgency.FIRE) return 'fire';
    return 'officer';
  }

  private sourceFromRole(role: UserRole): EventSource {
    if (role === UserRole.OFFICER) return 'officer';
    if (role === UserRole.TECHNICIAN) return 'tech';
    if (role === UserRole.MEDICAL_CREW || role === UserRole.MEDICAL_DISPATCHER) return 'medical';
    if (role === UserRole.USER || role === UserRole.FAMILY_MEMBER) return 'portal';
    return 'control-room';
  }

  private clientConfirmTitle(kind: EmergencyKind, silent?: boolean) {
    if (kind === 'silent' || silent) return 'Silent alert sent';
    if (kind === 'medical') return 'Ambulance requested';
    if (kind === 'fire') return 'Fire response requested';
    if (kind === 'theft') return 'Theft reported';
    if (kind === 'home-panic') return 'Home panic activated';
    if (kind === 'alarm') return 'Alarm dispatched';
    if (kind === 'service-request') return 'Request received';
    return 'Panic alert sent';
  }

  private clientConfirmBody(kind: EmergencyKind, publicRef: string) {
    return `Incident ${publicRef} is open. Control room has been notified.`;
  }

  private serializeIncident(incident: {
    id: string;
    publicRef: string;
    type: IncidentType;
    classification: IncidentClassification;
    involvedAgencies: string[];
    status: IncidentStatus;
    priority: IncidentPriority;
    title: string | null;
    description: string | null;
    address: string | null;
    lat: Prisma.Decimal;
    lng: Prisma.Decimal;
    isSilent: boolean;
    contextSnapshot: Prisma.JsonValue;
    ackedAt: Date | null;
    dispatchedAt: Date | null;
    onSceneAt: Date | null;
    resolvedAt: Date | null;
    createdAt: Date;
    conversationId: string | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      email: string;
      medicalProfile: unknown;
    };
    property: unknown;
    vehicle: unknown;
    dispatches: unknown[];
  }) {
    return {
      id: incident.id,
      publicRef: incident.publicRef,
      type: incident.type,
      classification: incident.classification,
      involvedAgencies: incident.involvedAgencies,
      status: incident.status,
      priority: incident.priority,
      title: incident.title,
      description: incident.description,
      address: incident.address,
      lat: Number(incident.lat),
      lng: Number(incident.lng),
      isSilent: incident.isSilent,
      contextSnapshot: incident.contextSnapshot,
      ackedAt: incident.ackedAt?.toISOString() ?? null,
      dispatchedAt: incident.dispatchedAt?.toISOString() ?? null,
      onSceneAt: incident.onSceneAt?.toISOString() ?? null,
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      createdAt: incident.createdAt.toISOString(),
      conversationId: incident.conversationId,
      client: {
        id: incident.user.id,
        name: `${incident.user.firstName} ${incident.user.lastName}`,
        phone: incident.user.phone,
        email: incident.user.email,
        medicalProfile: incident.user.medicalProfile,
      },
      property: incident.property,
      vehicle: incident.vehicle,
      dispatches: incident.dispatches,
    };
  }

  private emitCreatedAlias(incident: {
    id: string;
    tenantId: string;
    type: IncidentType;
    priority: IncidentPriority;
    status: IncidentStatus;
    isSilent: boolean;
    createdAt: Date;
    lat: Prisma.Decimal;
    lng: Prisma.Decimal;
    address: string | null;
    publicRef: string;
    user: { firstName: string; lastName: string };
  }) {
    this.realtime.emitIncidentCreated(incident.tenantId, {
      id: incident.id,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      name: `${incident.user.firstName} ${incident.user.lastName}`,
      lat: Number(incident.lat),
      lng: Number(incident.lng),
      address: incident.address,
      isSilent: incident.isSilent,
      createdAt: incident.createdAt.toISOString(),
      publicRef: incident.publicRef,
    });
  }
}

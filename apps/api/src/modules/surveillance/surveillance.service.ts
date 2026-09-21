import {
  AlarmEventStatus,
  AlarmEventType,
  AlarmPanelConnectivity,
  AlarmStatus,
  AlarmSystemStatus,
  CameraPlacement,
  CameraStatus,
  CctvConnectivity,
  CctvRecorderType,
  CctvSystemStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  NotificationPriority,
  NotificationType,
  PropertyType,
  SensorStatus,
  SensorType,
  UserRole,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IncidentKernelService } from '../incident-kernel/incident-kernel.service';
import { PlatformEvent, type EventSource } from '../incident-kernel/incident-events';

const DURBAN = { lat: -29.8587, lng: 31.0218 };

export const ARM_MODES = [
  AlarmStatus.ARMED,
  AlarmStatus.STAY,
  AlarmStatus.NIGHT,
  AlarmStatus.DISARMED,
] as const;

export type ArmMode = (typeof ARM_MODES)[number];

/** Who is requesting camera feeds */
export type CameraViewer = 'OWNER' | 'STAFF';

type InteriorUnlock = {
  unlocked: boolean;
  reason: 'OWNER' | 'CLIENT_SHARE' | 'ALARM' | 'EMERGENCY' | 'PRIVACY';
  label: string;
};

const ARMED_STATES: AlarmStatus[] = [
  AlarmStatus.ARMED,
  AlarmStatus.STAY,
  AlarmStatus.NIGHT,
  AlarmStatus.EXIT_DELAY,
  AlarmStatus.ENTRY_DELAY,
];

/** Contact ID style codes commonly used by SA monitoring centres */
const SENSOR_CID: Partial<Record<SensorType, { code: string; event: AlarmEventType; severity: IncidentPriority }>> = {
  PIR: { code: '130', event: AlarmEventType.BURGLARY, severity: IncidentPriority.HIGH },
  DOOR_CONTACT: { code: '134', event: AlarmEventType.PERIMETER, severity: IncidentPriority.HIGH },
  WINDOW_CONTACT: { code: '134', event: AlarmEventType.PERIMETER, severity: IncidentPriority.HIGH },
  GLASS_BREAK: { code: '137', event: AlarmEventType.INTRUSION, severity: IncidentPriority.HIGH },
  SMOKE: { code: '110', event: AlarmEventType.SMOKE, severity: IncidentPriority.CRITICAL },
  HEAT: { code: '114', event: AlarmEventType.FIRE, severity: IncidentPriority.CRITICAL },
  GAS: { code: '151', event: AlarmEventType.GAS_LEAK, severity: IncidentPriority.CRITICAL },
  WATER_LEAK: { code: '154', event: AlarmEventType.WATER, severity: IncidentPriority.MEDIUM },
  PANIC_BUTTON: { code: '120', event: AlarmEventType.PANIC, severity: IncidentPriority.CRITICAL },
  MEDICAL_BUTTON: { code: '100', event: AlarmEventType.MEDICAL, severity: IncidentPriority.CRITICAL },
  FIRE_BUTTON: { code: '110', event: AlarmEventType.FIRE, severity: IncidentPriority.CRITICAL },
  OUTDOOR_BEAM: { code: '130', event: AlarmEventType.BEAM_ALARM, severity: IncidentPriority.HIGH },
  ELECTRIC_FENCE: { code: '137', event: AlarmEventType.FENCE_ALARM, severity: IncidentPriority.HIGH },
  VIBRATION: { code: '136', event: AlarmEventType.INTRUSION, severity: IncidentPriority.HIGH },
  KEYPAD: { code: '121', event: AlarmEventType.DURESS, severity: IncidentPriority.CRITICAL },
  SIREN: { code: '300', event: AlarmEventType.TROUBLE, severity: IncidentPriority.MEDIUM },
  OTHER: { code: '140', event: AlarmEventType.ALARM_TRIGGERED, severity: IncidentPriority.MEDIUM },
};

@Injectable()
export class SurveillanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kernel: IncidentKernelService,
  ) {}

  private async resolveInteriorUnlock(property: {
    id: string;
    userId: string;
    tenantId: string;
    alarmStatus: AlarmStatus;
    shareInteriorCameras: boolean;
  }): Promise<InteriorUnlock> {
    if (property.shareInteriorCameras) {
      return {
        unlocked: true,
        reason: 'CLIENT_SHARE',
        label: 'Client shared interior cameras',
      };
    }
    if (property.alarmStatus === AlarmStatus.TRIGGERED) {
      return {
        unlocked: true,
        reason: 'ALARM',
        label: 'Unlocked — alarm triggered',
      };
    }

    const emergency = await this.prisma.incident.findFirst({
      where: {
        tenantId: property.tenantId,
        userId: property.userId,
        status: { in: [IncidentStatus.ACTIVE, IncidentStatus.DISPATCHED] },
        type: {
          in: [IncidentType.PANIC, IncidentType.ALARM, IncidentType.FIRE],
        },
      },
      select: { id: true, type: true },
    });

    if (emergency) {
      return {
        unlocked: true,
        reason: 'EMERGENCY',
        label: `Unlocked — ${emergency.type.toLowerCase()} emergency`,
      };
    }

    return {
      unlocked: false,
      reason: 'PRIVACY',
      label: 'Interior cameras private',
    };
  }

  private formatCamera(
    c: {
      id: string;
      name: string;
      locationLabel: string;
      channel: number;
      placement?: CameraPlacement;
      status: CameraStatus;
      snapshotUrl: string | null;
      streamUrl: string | null;
      vendor: string | null;
      lastSeenAt: Date | null;
      propertyId: string;
    },
    opts: { viewer: CameraViewer; interiorUnlocked: boolean },
  ) {
    const placement = c.placement ?? CameraPlacement.EXTERIOR;
    const isInterior = placement === CameraPlacement.INTERIOR;
    const privacyLocked =
      opts.viewer === 'STAFF' && isInterior && !opts.interiorUnlocked;

    return {
      id: c.id,
      propertyId: c.propertyId,
      name: privacyLocked ? 'Interior camera' : c.name,
      locationLabel: privacyLocked ? 'Inside home · private' : c.locationLabel,
      channel: c.channel,
      placement,
      isInterior,
      privacyLocked,
      status: privacyLocked ? CameraStatus.OFFLINE : c.status,
      snapshotUrl: privacyLocked ? null : c.snapshotUrl,
      streamUrl: privacyLocked ? null : c.streamUrl,
      vendor: privacyLocked ? null : c.vendor,
      lastSeenAt: privacyLocked ? null : c.lastSeenAt,
      isLiveCapable: privacyLocked
        ? false
        : Boolean(c.streamUrl) || c.status === CameraStatus.ONLINE,
    };
  }

  private privacyMeta(
    unlock: InteriorUnlock,
    cameras: { placement?: CameraPlacement }[],
    shareInteriorCameras: boolean,
  ) {
    const interiorCount = cameras.filter(
      (c) => (c.placement ?? CameraPlacement.EXTERIOR) === CameraPlacement.INTERIOR,
    ).length;
    return {
      shareInteriorCameras,
      interiorUnlocked: unlock.unlocked,
      unlockReason: unlock.reason,
      unlockLabel: unlock.label,
      interiorCameraCount: interiorCount,
      privateInteriorCount: unlock.unlocked ? 0 : interiorCount,
    };
  }

  private formatSensor(s: {
    id: string;
    propertyId: string;
    zoneNumber: number;
    name: string;
    sensorType: SensorType;
    status: SensorStatus;
    locationLabel: string;
    isPerimeter: boolean;
    is24Hour: boolean;
    bypassed: boolean;
    cidCode: string | null;
    vendor: string | null;
    lastTriggeredAt: Date | null;
  }) {
    return {
      id: s.id,
      propertyId: s.propertyId,
      zoneNumber: s.zoneNumber,
      zoneLabel: `Zone ${s.zoneNumber}`,
      name: s.name,
      sensorType: s.sensorType,
      status: s.status,
      locationLabel: s.locationLabel,
      isPerimeter: s.isPerimeter,
      is24Hour: s.is24Hour,
      bypassed: s.bypassed,
      cidCode: s.cidCode,
      vendor: s.vendor,
      lastTriggeredAt: s.lastTriggeredAt,
    };
  }

  private formatEvent(e: {
    id: string;
    type: AlarmEventType;
    severity: IncidentPriority;
    status: AlarmEventStatus;
    title: string;
    description: string | null;
    cidCode?: string | null;
    snapshotUrl: string | null;
    incidentId: string | null;
    triggeredAt: Date;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    propertyId: string;
    cameraId: string | null;
    sensorId?: string | null;
    camera?: { id: string; name: string; locationLabel: string } | null;
    sensor?: {
      id: string;
      name: string;
      zoneNumber: number;
      sensorType: SensorType;
      locationLabel: string;
    } | null;
    property?: { id: string; name: string; address: string } | null;
  }) {
    return {
      id: e.id,
      propertyId: e.propertyId,
      cameraId: e.cameraId,
      sensorId: e.sensorId ?? null,
      type: e.type,
      severity: e.severity,
      status: e.status,
      title: e.title,
      description: e.description,
      cidCode: e.cidCode ?? null,
      snapshotUrl: e.snapshotUrl,
      incidentId: e.incidentId,
      triggeredAt: e.triggeredAt,
      acknowledgedAt: e.acknowledgedAt,
      resolvedAt: e.resolvedAt,
      camera: e.camera
        ? {
            id: e.camera.id,
            name: e.camera.name,
            locationLabel: e.camera.locationLabel,
          }
        : null,
      sensor: e.sensor
        ? {
            id: e.sensor.id,
            name: e.sensor.name,
            zoneNumber: e.sensor.zoneNumber,
            zoneLabel: `Zone ${e.sensor.zoneNumber}`,
            sensorType: e.sensor.sensorType,
            locationLabel: e.sensor.locationLabel,
          }
        : null,
      property: e.property
        ? {
            id: e.property.id,
            name: e.property.name,
            address: e.property.address,
          }
        : null,
    };
  }

  private panelMeta(p: {
    panelVendor: string | null;
    panelModel: string | null;
    communicatorType: string | null;
    monitoringAccount: string | null;
    partitionLabel: string | null;
    alarmLinked: boolean;
  }) {
    return {
      panelVendor: p.panelVendor,
      panelModel: p.panelModel,
      communicatorType: p.communicatorType,
      monitoringAccount: p.monitoringAccount,
      partitionLabel: p.partitionLabel ?? 'Partition 1',
      alarmLinked: p.alarmLinked,
      protocol: 'Contact ID',
      region: 'ZA',
    };
  }

  async listClientSites(userId: string, tenantId: string) {
    const properties = await this.prisma.property.findMany({
      where: { userId, tenantId },
      include: {
        cameras: { orderBy: { channel: 'asc' } },
        sensors: { orderBy: { zoneNumber: 'asc' } },
        _count: {
          select: {
            alarmEvents: { where: { status: { in: ['NEW', 'ACKNOWLEDGED'] } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = await Promise.all(
      properties.map(async (p) => {
        const unlock = await this.resolveInteriorUnlock(p);
        const privacy = this.privacyMeta(unlock, p.cameras, p.shareInteriorCameras);
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          propertyType: p.propertyType,
          alarmStatus: p.alarmStatus,
          alarmLinked: p.alarmLinked,
          camerasLinked: p.camerasLinked,
          monitoringEnabled: p.monitoringEnabled,
          shareInteriorCameras: p.shareInteriorCameras,
          privacy,
          panel: this.panelMeta(p),
          cameraCount: p.cameras.length,
          onlineCameras: p.cameras.filter(
            (c) => c.status === CameraStatus.ONLINE || c.status === CameraStatus.RECORDING,
          ).length,
          sensorCount: p.sensors.length,
          alertSensors: p.sensors.filter((s) =>
            ['ALARM', 'FAULT', 'TAMPER', 'OPEN'].includes(s.status),
          ).length,
          openEvents: p._count.alarmEvents,
          cameras: p.cameras.map((c) =>
            this.formatCamera(c, { viewer: 'OWNER', interiorUnlocked: true }),
          ),
          sensors: p.sensors.map((s) => this.formatSensor(s)),
        };
      }),
    );

    return { success: true, data };
  }

  async getClientSite(userId: string, tenantId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, userId, tenantId },
      include: {
        cameras: { orderBy: { channel: 'asc' } },
        sensors: { orderBy: { zoneNumber: 'asc' } },
        alarmEvents: {
          orderBy: { triggeredAt: 'desc' },
          take: 40,
          include: {
            camera: { select: { id: true, name: true, locationLabel: true } },
            sensor: {
              select: {
                id: true,
                name: true,
                zoneNumber: true,
                sensorType: true,
                locationLabel: true,
              },
            },
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');

    const unlock = await this.resolveInteriorUnlock(property);
    const privacy = this.privacyMeta(unlock, property.cameras, property.shareInteriorCameras);

    return {
      success: true,
      data: {
        id: property.id,
        name: property.name,
        address: property.address,
        propertyType: property.propertyType,
        accessNotes: property.accessNotes,
        gateCode: property.gateCode,
        occupantDetails: property.occupantDetails,
        keyHolder: property.keyHolder,
        alarmStatus: property.alarmStatus,
        alarmLinked: property.alarmLinked,
        camerasLinked: property.camerasLinked,
        monitoringEnabled: property.monitoringEnabled,
        shareInteriorCameras: property.shareInteriorCameras,
        privacy,
        panel: this.panelMeta(property),
        cameras: property.cameras.map((c) =>
          this.formatCamera(c, { viewer: 'OWNER', interiorUnlocked: true }),
        ),
        sensors: property.sensors.map((s) => this.formatSensor(s)),
        events: property.alarmEvents.map((e) => this.formatEvent(e)),
      },
    };
  }

  async setInteriorCameraSharing(
    userId: string,
    tenantId: string,
    propertyId: string,
    shareInteriorCameras: boolean,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, userId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: { shareInteriorCameras: Boolean(shareInteriorCameras) },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        shareInteriorCameras: updated.shareInteriorCameras,
        message: updated.shareInteriorCameras
          ? 'Interior cameras are visible to control room and responders.'
          : 'Interior cameras are private again (still unlock on panic/alarm).',
      },
    };
  }

  async controlRoomSetArmMode(tenantId: string, propertyId: string, mode: ArmMode) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');
    return this.setArmMode(property.userId, tenantId, propertyId, mode);
  }

  async setArmMode(userId: string, tenantId: string, propertyId: string, mode: ArmMode) {
    if (!ARM_MODES.includes(mode)) {
      throw new BadRequestException('Invalid arm mode. Use ARMED, STAY, NIGHT, or DISARMED.');
    }
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, userId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const final = await this.prisma.property.update({
      where: { id: propertyId },
      data: { alarmStatus: mode, alarmLinked: true },
    });

    if (mode === AlarmStatus.DISARMED) {
      await this.prisma.sensor.updateMany({
        where: { propertyId, tenantId, sensorType: SensorType.SIREN },
        data: { status: SensorStatus.NORMAL },
      });
    }

    const title =
      mode === AlarmStatus.DISARMED
        ? 'System disarmed'
        : mode === AlarmStatus.STAY
          ? 'Stay arm (perimeter)'
          : mode === AlarmStatus.NIGHT
            ? 'Night arm'
            : 'Away arm (full)';

    await this.prisma.alarmEvent.create({
      data: {
        tenantId,
        propertyId,
        type: mode === AlarmStatus.DISARMED ? AlarmEventType.DISARM : AlarmEventType.ARM,
        severity: IncidentPriority.LOW,
        status: AlarmEventStatus.RESOLVED,
        title,
        description: `${property.partitionLabel ?? 'Partition 1'} · ${property.panelVendor ?? 'Panel'} · Contact ID (ZA)`,
        cidCode: mode === AlarmStatus.DISARMED ? '401' : '401',
        resolvedAt: new Date(),
      },
    });

    return { success: true, data: final };
  }

  /** Ring the outdoor siren even if the panel is disarmed — CCTV visual confirmation. */
  async soundOnSiteSiren(
    tenantId: string,
    propertyId: string,
    actorUserId: string,
    source: EventSource,
    ownerUserId?: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        tenantId,
        ...(ownerUserId ? { userId: ownerUserId } : {}),
      },
    });
    if (!property) throw new NotFoundException('Property not found');

    await this.prisma.sensor.updateMany({
      where: { propertyId, tenantId, sensorType: SensorType.SIREN },
      data: { status: SensorStatus.ALARM, lastTriggeredAt: new Date() },
    });

    if (property.alarmStatus === AlarmStatus.TRIGGERED) {
      return {
        success: true,
        data: {
          alarmStatus: AlarmStatus.TRIGGERED,
          message: `Siren already sounding at ${property.name}. Disarm to silence.`,
        },
      };
    }

    const visualNote =
      source === 'control-room'
        ? 'Control room sounded the site siren after visual confirmation on CCTV. A beam or zone may have failed to trip.'
        : 'Client sounded the site siren after seeing a break-in on CCTV.';

    const event = await this.prisma.alarmEvent.create({
      data: {
        tenantId,
        propertyId,
        type: AlarmEventType.PANIC,
        severity: IncidentPriority.CRITICAL,
        status: AlarmEventStatus.NEW,
        title: 'On-site siren — CCTV visual',
        description: visualNote,
        cidCode: '120',
      },
    });

    await this.prisma.property.update({
      where: { id: propertyId },
      data: { alarmStatus: AlarmStatus.TRIGGERED, alarmLinked: true },
    });

    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId: property.userId,
      type: IncidentType.PANIC,
      title: `CCTV siren — ${property.name}`,
      description: `${visualNote} · ${property.address}`,
      lat: Number(property.lat ?? DURBAN.lat),
      lng: Number(property.lng ?? DURBAN.lng),
      address: property.address,
      priority: IncidentPriority.CRITICAL,
      propertyId,
      source,
      actorUserId,
      kind: 'home-panic',
      autoDispatch: true,
      alarmEventId: event.id,
    });

    await this.prisma.alarmEvent.update({
      where: { id: event.id },
      data: {
        status: AlarmEventStatus.DISPATCHED,
        incidentId: incident.id,
      },
    });

    return {
      success: true,
      data: {
        alarmStatus: AlarmStatus.TRIGGERED,
        incidentId: incident.id,
        message: `Siren sounding at ${property.name}. Disarm to silence.`,
      },
    };
  }

  async setSensorBypass(
    userId: string,
    tenantId: string,
    propertyId: string,
    sensorId: string,
    bypassed: boolean,
  ) {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, propertyId, tenantId, property: { userId } },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');
    if (sensor.is24Hour && bypassed) {
      throw new BadRequestException('24-hour zones (panic/fire/medical) cannot be bypassed.');
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensorId },
      data: {
        bypassed,
        status: bypassed ? SensorStatus.BYPASSED : SensorStatus.NORMAL,
      },
    });

    await this.prisma.alarmEvent.create({
      data: {
        tenantId,
        propertyId,
        sensorId,
        type: AlarmEventType.ZONE_BYPASS,
        severity: IncidentPriority.LOW,
        status: AlarmEventStatus.RESOLVED,
        title: bypassed
          ? `Zone ${sensor.zoneNumber} bypassed — ${sensor.name}`
          : `Zone ${sensor.zoneNumber} reinstated — ${sensor.name}`,
        description: sensor.locationLabel,
        cidCode: '570',
        resolvedAt: new Date(),
      },
    });

    await this.notifyZoneStakeholders({
      tenantId,
      ownerUserId: userId,
      propertyId,
      propertyName: (await this.prisma.property.findUnique({ where: { id: propertyId } }))?.name ?? 'Property',
      zoneNumber: sensor.zoneNumber,
      sensorName: sensor.name,
      kind: bypassed ? 'disabled' : 'restored',
      priority: NotificationPriority.P2,
    });

    return { success: true, data: this.formatSensor(updated) };
  }

  /**
   * Report FAULT / OFFLINE / TAMPER / NORMAL on a zone.
   * Faults notify the property owner and control-room operators to inspect.
   */
  async setSensorHealth(
    tenantId: string,
    sensorId: string,
    status: SensorStatus,
    opts?: { actorUserId?: string; propertyOwnerOnly?: boolean },
  ) {
    const allowed = new Set<SensorStatus>([
      SensorStatus.NORMAL,
      SensorStatus.FAULT,
      SensorStatus.OFFLINE,
      SensorStatus.TAMPER,
    ]);
    if (!allowed.has(status)) {
      throw new BadRequestException('Unsupported sensor health status');
    }

    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, tenantId },
      include: { property: true },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');
    if (opts?.propertyOwnerOnly && opts.actorUserId && sensor.property.userId !== opts.actorUserId) {
      throw new NotFoundException('Sensor not found');
    }
    if (sensor.bypassed && status !== SensorStatus.NORMAL) {
      throw new BadRequestException('Enable the zone before reporting a fault');
    }

    const previous = sensor.status;
    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        status,
        bypassed: false,
      },
    });

    const isProblem =
      status === SensorStatus.FAULT ||
      status === SensorStatus.OFFLINE ||
      status === SensorStatus.TAMPER;

    await this.prisma.alarmEvent.create({
      data: {
        tenantId,
        propertyId: sensor.propertyId,
        sensorId: sensor.id,
        type: isProblem ? AlarmEventType.TROUBLE : AlarmEventType.ZONE_BYPASS,
        severity: isProblem ? IncidentPriority.HIGH : IncidentPriority.LOW,
        status: isProblem ? AlarmEventStatus.NEW : AlarmEventStatus.RESOLVED,
        title: isProblem
          ? `Zone ${sensor.zoneNumber} ${status.toLowerCase()} — ${sensor.name}`
          : `Zone ${sensor.zoneNumber} restored — ${sensor.name}`,
        description: `${sensor.locationLabel ?? ''} · was ${previous}`.trim(),
        cidCode: isProblem ? '300' : '301',
        resolvedAt: isProblem ? null : new Date(),
      },
    });

    await this.notifyZoneStakeholders({
      tenantId,
      ownerUserId: sensor.property.userId,
      propertyId: sensor.propertyId,
      propertyName: sensor.property.name,
      zoneNumber: sensor.zoneNumber,
      sensorName: sensor.name,
      kind:
        status === SensorStatus.FAULT
          ? 'fault'
          : status === SensorStatus.OFFLINE
            ? 'offline'
            : status === SensorStatus.TAMPER
              ? 'tamper'
              : 'restored',
      priority: isProblem ? NotificationPriority.P1 : NotificationPriority.P2,
    });

    return { success: true, data: this.formatSensor(updated) };
  }

  private async notifyZoneStakeholders(input: {
    tenantId: string;
    ownerUserId: string;
    propertyId: string;
    propertyName: string;
    zoneNumber: number;
    sensorName: string;
    kind: 'fault' | 'offline' | 'tamper' | 'disabled' | 'restored';
    priority: NotificationPriority;
  }) {
    const copy: Record<typeof input.kind, { title: string; body: string }> = {
      fault: {
        title: `Sensor fault · Z${input.zoneNumber}`,
        body: `${input.sensorName} at ${input.propertyName} reported a fault. Please arrange inspection.`,
      },
      offline: {
        title: `Sensor offline · Z${input.zoneNumber}`,
        body: `${input.sensorName} at ${input.propertyName} is offline. Check power/comms.`,
      },
      tamper: {
        title: `Sensor tamper · Z${input.zoneNumber}`,
        body: `${input.sensorName} at ${input.propertyName} reported tamper. Verify the zone.`,
      },
      disabled: {
        title: `Zone disabled · Z${input.zoneNumber}`,
        body: `${input.sensorName} at ${input.propertyName} was disabled / bypassed and will not trip.`,
      },
      restored: {
        title: `Zone restored · Z${input.zoneNumber}`,
        body: `${input.sensorName} at ${input.propertyName} is active again.`,
      },
    };
    const msg = copy[input.kind];
    const deepOwner = `/portal/home/${input.propertyId}`;
    const deepCr = `/control-room/surveillance/${input.propertyId}`;

    await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.ownerUserId,
        type: NotificationType.SYSTEM,
        priority: input.priority,
        title: msg.title,
        body: msg.body,
        deepLink: deepOwner,
      },
    });

    const ops = await this.prisma.user.findMany({
      where: {
        tenantId: input.tenantId,
        role: {
          in: [
            UserRole.DISPATCHER,
            UserRole.SUPERVISOR,
            UserRole.MANAGER,
            UserRole.TENANT_ADMIN,
            UserRole.OWNER,
          ],
        },
        status: 'ACTIVE',
      },
      select: { id: true },
      take: 40,
    });

    if (ops.length) {
      await this.prisma.notification.createMany({
        data: ops.map((u) => ({
          tenantId: input.tenantId,
          userId: u.id,
          type: NotificationType.SYSTEM,
          priority: input.priority,
          title: msg.title,
          body: msg.body,
          deepLink: deepCr,
        })),
      });
    }
  }

  async triggerSensorAlert(
    tenantId: string,
    sensorId: string,
    opts?: { actorUserId?: string; force?: boolean },
  ) {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, tenantId },
      include: { property: true },
    });
    if (!sensor) throw new NotFoundException('Sensor not found');

    const property = sensor.property;
    const mapping = SENSOR_CID[sensor.sensorType] ?? SENSOR_CID.OTHER!;
    const is24 = sensor.is24Hour;
    const armed = ARMED_STATES.includes(property.alarmStatus) || property.alarmStatus === AlarmStatus.TRIGGERED;

    if (sensor.bypassed && !opts?.force) {
      throw new BadRequestException('Zone is bypassed');
    }

    // Stay: only perimeter + 24hr; Night: perimeter + selected; Away: all non-bypassed
    if (!is24 && !opts?.force) {
      if (property.alarmStatus === AlarmStatus.DISARMED || property.alarmStatus === AlarmStatus.OFFLINE) {
        // Open contact while disarmed is supervisory open, not alarm
        const opened = await this.prisma.sensor.update({
          where: { id: sensorId },
          data: { status: SensorStatus.OPEN, lastTriggeredAt: new Date() },
        });
        return {
          success: true,
          data: {
            sensor: this.formatSensor(opened),
            event: null,
            note: 'Zone open while disarmed — no control-room alarm.',
          },
        };
      }
      if (property.alarmStatus === AlarmStatus.STAY && !sensor.isPerimeter) {
        throw new BadRequestException('Interior zone ignored during Stay arm');
      }
      if (!armed && property.alarmStatus !== AlarmStatus.TRIGGERED) {
        throw new BadRequestException('System not armed for this zone');
      }
    }

    const event = await this.prisma.alarmEvent.create({
      data: {
        tenantId,
        propertyId: property.id,
        sensorId: sensor.id,
        type: mapping.event,
        severity: mapping.severity,
        status: AlarmEventStatus.NEW,
        title: `Z${sensor.zoneNumber} ${sensor.name}`,
        description: `${sensor.sensorType.replace(/_/g, ' ')} · ${sensor.locationLabel} · CID ${sensor.cidCode ?? mapping.code}`,
        cidCode: sensor.cidCode ?? mapping.code,
      },
      include: {
        sensor: {
          select: {
            id: true,
            name: true,
            zoneNumber: true,
            sensorType: true,
            locationLabel: true,
          },
        },
        property: { select: { id: true, name: true, address: true } },
        camera: { select: { id: true, name: true, locationLabel: true } },
      },
    });

    const updatedSensor = await this.prisma.sensor.update({
      where: { id: sensorId },
      data: { status: SensorStatus.ALARM, lastTriggeredAt: new Date() },
    });

    if (mapping.severity === IncidentPriority.CRITICAL || mapping.severity === IncidentPriority.HIGH) {
      await this.prisma.property.update({
        where: { id: property.id },
        data: { alarmStatus: AlarmStatus.TRIGGERED },
      });
    }

    return {
      success: true,
      data: {
        sensor: this.formatSensor(updatedSensor),
        event: this.formatEvent(event),
      },
    };
  }

  async controlRoomOverview(tenantId: string) {
    const properties = await this.prisma.property.findMany({
      where: { tenantId, OR: [{ camerasLinked: true }, { alarmLinked: true }, { monitoringEnabled: true }] },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        cameras: { orderBy: { channel: 'asc' } },
        sensors: true,
        alarmEvents: {
          where: { status: { in: ['NEW', 'ACKNOWLEDGED', 'DISPATCHED'] } },
          orderBy: { triggeredAt: 'desc' },
          take: 5,
          include: {
            camera: { select: { id: true, name: true, locationLabel: true } },
            sensor: {
              select: {
                id: true,
                name: true,
                zoneNumber: true,
                sensorType: true,
                locationLabel: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const openEvents = await this.prisma.alarmEvent.count({
      where: { tenantId, status: { in: ['NEW', 'ACKNOWLEDGED'] } },
    });
    const triggered = properties.filter((p) => p.alarmStatus === AlarmStatus.TRIGGERED).length;
    const offlineCams = properties.reduce(
      (n, p) => n + p.cameras.filter((c) => c.status === CameraStatus.OFFLINE || c.status === CameraStatus.FAULT).length,
      0,
    );

    return {
      success: true,
      data: {
        stats: {
          sites: properties.length,
          cameras: properties.reduce((n, p) => n + p.cameras.length, 0),
          sensors: properties.reduce((n, p) => n + p.sensors.length, 0),
          openEvents,
          triggeredSites: triggered,
          offlineCameras: offlineCams,
        },
        sites: properties.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          propertyType: p.propertyType,
          alarmStatus: p.alarmStatus,
          monitoringEnabled: p.monitoringEnabled,
          camerasLinked: p.camerasLinked,
          alarmLinked: p.alarmLinked,
          panel: this.panelMeta(p),
          cameraCount: p.cameras.length,
          onlineCameras: p.cameras.filter((c) => c.status === 'ONLINE' || c.status === 'RECORDING').length,
          sensorCount: p.sensors.length,
          client: {
            id: p.user.id,
            name: `${p.user.firstName} ${p.user.lastName}`.trim(),
            email: p.user.email,
            phone: p.user.phone,
          },
          cameras: p.cameras.slice(0, 6).map((c) =>
            this.formatCamera(c, { viewer: 'STAFF', interiorUnlocked: p.alarmStatus === AlarmStatus.TRIGGERED }),
          ),
          openEvents: p.alarmEvents.map((e) => this.formatEvent(e)),
        })),
      },
    };
  }

  async controlRoomSite(tenantId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        cameras: { orderBy: { channel: 'asc' } },
        sensors: { orderBy: { zoneNumber: 'asc' } },
        alarmEvents: {
          orderBy: { triggeredAt: 'desc' },
          take: 50,
          include: {
            camera: { select: { id: true, name: true, locationLabel: true } },
            sensor: {
              select: {
                id: true,
                name: true,
                zoneNumber: true,
                sensorType: true,
                locationLabel: true,
              },
            },
            property: { select: { id: true, name: true, address: true } },
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Site not found');

    const unlock = await this.resolveInteriorUnlock(property);
    const privacy = this.privacyMeta(unlock, property.cameras, property.shareInteriorCameras);

    return {
      success: true,
      data: {
        id: property.id,
        name: property.name,
        address: property.address,
        propertyType: property.propertyType,
        accessNotes: property.accessNotes,
        gateCode: property.gateCode,
        occupantDetails: property.occupantDetails,
        keyHolder: property.keyHolder,
        alarmStatus: property.alarmStatus,
        alarmLinked: property.alarmLinked,
        camerasLinked: property.camerasLinked,
        monitoringEnabled: property.monitoringEnabled,
        shareInteriorCameras: property.shareInteriorCameras,
        privacy,
        panel: this.panelMeta(property),
        client: {
          id: property.user.id,
          name: `${property.user.firstName} ${property.user.lastName}`.trim(),
          email: property.user.email,
          phone: property.user.phone,
        },
        cameras: property.cameras.map((c) =>
          this.formatCamera(c, {
            viewer: 'STAFF',
            interiorUnlocked: unlock.unlocked,
          }),
        ),
        sensors: property.sensors.map((s) => this.formatSensor(s)),
        events: property.alarmEvents.map((e) => this.formatEvent(e)),
      },
    };
  }

  async acknowledgeEvent(tenantId: string, eventId: string, actorUserId: string) {
    const event = await this.prisma.alarmEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new NotFoundException('Alarm event not found');
    if (event.status === AlarmEventStatus.RESOLVED || event.status === AlarmEventStatus.FALSE_ALARM) {
      throw new BadRequestException('Event already closed');
    }

    const updated = await this.prisma.alarmEvent.update({
      where: { id: eventId },
      data: {
        status: AlarmEventStatus.ACKNOWLEDGED,
        acknowledgedBy: actorUserId,
        acknowledgedAt: new Date(),
      },
      include: {
        camera: { select: { id: true, name: true, locationLabel: true } },
        sensor: {
          select: {
            id: true,
            name: true,
            zoneNumber: true,
            sensorType: true,
            locationLabel: true,
          },
        },
        property: { select: { id: true, name: true, address: true } },
      },
    });

    await this.kernel.recordEvent({
      tenantId,
      incidentId: updated.incidentId,
      type: PlatformEvent.ALARM_ACKNOWLEDGED,
      source: 'control-room',
      actorUserId,
      payload: { alarmEventId: eventId },
    });

    return { success: true, data: this.formatEvent(updated) };
  }

  async resolveEvent(tenantId: string, eventId: string, asFalseAlarm = false) {
    const event = await this.prisma.alarmEvent.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new NotFoundException('Alarm event not found');

    const updated = await this.prisma.alarmEvent.update({
      where: { id: eventId },
      data: {
        status: asFalseAlarm ? AlarmEventStatus.FALSE_ALARM : AlarmEventStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      include: {
        camera: { select: { id: true, name: true, locationLabel: true } },
        sensor: {
          select: {
            id: true,
            name: true,
            zoneNumber: true,
            sensorType: true,
            locationLabel: true,
          },
        },
        property: { select: { id: true, name: true, address: true } },
      },
    });

    if (event.sensorId) {
      await this.prisma.sensor.updateMany({
        where: { id: event.sensorId, status: SensorStatus.ALARM },
        data: { status: SensorStatus.NORMAL },
      });
    }

    if (!asFalseAlarm) {
      await this.prisma.property.updateMany({
        where: { id: event.propertyId, alarmStatus: AlarmStatus.TRIGGERED },
        data: { alarmStatus: AlarmStatus.ARMED },
      });
    }

    return { success: true, data: this.formatEvent(updated) };
  }

  async dispatchFromEvent(tenantId: string, eventId: string, actorUserId: string) {
    const event = await this.prisma.alarmEvent.findFirst({
      where: { id: eventId, tenantId },
      include: { property: true, camera: true, sensor: true },
    });
    if (!event) throw new NotFoundException('Alarm event not found');

    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId: event.property.userId,
      type: IncidentType.ALARM,
      title: event.title,
      description:
        event.description ??
        `Surveillance alarm at ${event.property.name}${event.camera ? ` · ${event.camera.name}` : ''}${
          event.sensor ? ` · Zone ${event.sensor.zoneNumber}` : ''
        }`,
      lat: Number(event.property.lat ?? DURBAN.lat),
      lng: Number(event.property.lng ?? DURBAN.lng),
      address: event.property.address,
      priority: event.severity,
      propertyId: event.propertyId,
      source: 'control-room',
      actorUserId,
      kind: 'alarm',
      autoDispatch: true,
      alarmEventId: eventId,
    });

    const updated = await this.prisma.alarmEvent.update({
      where: { id: eventId },
      data: {
        status: AlarmEventStatus.DISPATCHED,
        incidentId: incident.id,
        acknowledgedBy: actorUserId,
        acknowledgedAt: new Date(),
      },
      include: {
        camera: { select: { id: true, name: true, locationLabel: true } },
        sensor: {
          select: {
            id: true,
            name: true,
            zoneNumber: true,
            sensorType: true,
            locationLabel: true,
          },
        },
        property: { select: { id: true, name: true, address: true } },
      },
    });

    await this.prisma.property.update({
      where: { id: event.propertyId },
      data: { alarmStatus: AlarmStatus.TRIGGERED },
    });

    return {
      success: true,
      data: {
        event: this.formatEvent(updated),
        incidentId: incident.id,
      },
    };
  }

  async officerSiteContext(tenantId: string, officerEmail: string, incidentId?: string) {
    const officer = await this.prisma.officer.findFirst({
      where: { tenantId, email: officerEmail.toLowerCase(), isActive: true },
    });
    if (!officer) {
      return { success: true, data: null };
    }

    const dispatch = await this.prisma.dispatch.findFirst({
      where: {
        tenantId,
        officerId: officer.id,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'] },
        ...(incidentId ? { incidentId } : {}),
      },
      include: {
        incident: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!dispatch?.incident) {
      return { success: true, data: null };
    }

    const property = await this.prisma.property.findFirst({
      where: {
        tenantId,
        userId: dispatch.incident.userId,
      },
      include: {
        cameras: { orderBy: { channel: 'asc' }, take: 8 },
        sensors: { orderBy: { zoneNumber: 'asc' }, take: 16 },
        alarmEvents: {
          orderBy: { triggeredAt: 'desc' },
          take: 10,
          include: {
            camera: { select: { id: true, name: true, locationLabel: true } },
            sensor: {
              select: {
                id: true,
                name: true,
                zoneNumber: true,
                sensorType: true,
                locationLabel: true,
              },
            },
          },
        },
      },
    });

    if (!property) {
      return {
        success: true,
        data: {
          incidentId: dispatch.incident.id,
          property: null,
          cameras: [],
          sensors: [],
          events: [],
        },
      };
    }

    const unlock = await this.resolveInteriorUnlock(property);

    return {
      success: true,
      data: {
        incidentId: dispatch.incident.id,
        property: {
          id: property.id,
          name: property.name,
          address: property.address,
          accessNotes: property.accessNotes,
          gateCode: property.gateCode,
          keyHolder: property.keyHolder,
          alarmStatus: property.alarmStatus,
          panel: this.panelMeta(property),
        },
        privacy: this.privacyMeta(unlock, property.cameras, property.shareInteriorCameras),
        cameras: property.cameras.map((c) =>
          this.formatCamera(c, {
            viewer: 'STAFF',
            interiorUnlocked: unlock.unlocked,
          }),
        ),
        sensors: property.sensors.map((s) => this.formatSensor(s)),
        events: property.alarmEvents.map((e) => this.formatEvent(e)),
      },
    };
  }

  async techCommissionCameras(
    tenantId: string,
    propertyId: string,
    cameras: {
      name: string;
      locationLabel: string;
      channel?: number;
      vendor?: string;
      placement?: 'EXTERIOR' | 'INTERIOR';
      serialNumber?: string;
      model?: string;
      resolution?: string;
      systemId?: string;
    }[],
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (!cameras.length) throw new BadRequestException('Add at least one camera');

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [] as Awaited<ReturnType<typeof tx.camera.create>>[];
      for (let i = 0; i < cameras.length; i += 1) {
        const cam = cameras[i];
        rows.push(
          await tx.camera.create({
            data: {
              tenantId,
              propertyId,
              systemId: cam.systemId?.trim() || null,
              name: cam.name.trim(),
              locationLabel: cam.locationLabel.trim(),
              channel: cam.channel ?? i + 1,
              placement:
                cam.placement === 'INTERIOR'
                  ? CameraPlacement.INTERIOR
                  : CameraPlacement.EXTERIOR,
              vendor: cam.vendor?.trim() || '4DS Nexus',
              model: cam.model?.trim() || null,
              serialNumber: cam.serialNumber?.trim() || null,
              resolution: cam.resolution?.trim() || null,
              status: CameraStatus.ONLINE,
              lastSeenAt: new Date(),
              snapshotUrl: null,
            },
          }),
        );
      }
      await tx.property.update({
        where: { id: propertyId },
        data: { camerasLinked: true, monitoringEnabled: true },
      });
      return rows;
    });

    return {
      success: true,
      data: created.map((c) =>
        this.formatCamera(c, { viewer: 'OWNER', interiorUnlocked: true }),
      ),
    };
  }

  async listTenantPropertiesForTech(tenantId: string) {
    const properties = await this.prisma.property.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        camerasLinked: true,
        alarmLinked: true,
        panelVendor: true,
        user: { select: { firstName: true, lastName: true } },
        _count: { select: { cameras: true, sensors: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return {
      success: true,
      data: properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        camerasLinked: p.camerasLinked,
        alarmLinked: p.alarmLinked,
        panelVendor: p.panelVendor,
        cameraCount: p._count.cameras,
        sensorCount: p._count.sensors,
        clientName: `${p.user.firstName} ${p.user.lastName}`.trim(),
      })),
    };
  }

  private formatCctvSystem(
    system: {
      id: string;
      propertyId: string;
      name: string;
      brand: string | null;
      model: string | null;
      kitSku: string | null;
      supplier: string | null;
      recorderType: CctvRecorderType;
      channelCount: number;
      connectivity: CctvConnectivity;
      recorderSerial: string | null;
      recorderIp: string | null;
      cloudId: string | null;
      hddInstalled: boolean;
      hddSerial: string | null;
      hddCapacityGb: number | null;
      firmware: string | null;
      mobileAppEnabled: boolean;
      techNotes: string | null;
      status: CctvSystemStatus;
      installedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      property?: {
        id: string;
        name: string;
        address: string;
        propertyType: PropertyType;
        user?: { id: string; firstName: string; lastName: string; email: string };
      };
      cameras?: Array<{
        id: string;
        name: string;
        locationLabel: string;
        channel: number;
        placement: CameraPlacement;
        status: CameraStatus;
        vendor: string | null;
        model: string | null;
        serialNumber: string | null;
        resolution: string | null;
        propertyId: string;
        snapshotUrl: string | null;
        streamUrl: string | null;
        lastSeenAt: Date | null;
      }>;
    },
  ) {
    return {
      id: system.id,
      propertyId: system.propertyId,
      name: system.name,
      brand: system.brand,
      model: system.model,
      kitSku: system.kitSku,
      supplier: system.supplier,
      recorderType: system.recorderType,
      channelCount: system.channelCount,
      connectivity: system.connectivity,
      recorderSerial: system.recorderSerial,
      recorderIp: system.recorderIp,
      cloudId: system.cloudId,
      hddInstalled: system.hddInstalled,
      hddSerial: system.hddSerial,
      hddCapacityGb: system.hddCapacityGb,
      firmware: system.firmware,
      mobileAppEnabled: system.mobileAppEnabled,
      techNotes: system.techNotes,
      status: system.status,
      installedAt: system.installedAt,
      createdAt: system.createdAt,
      updatedAt: system.updatedAt,
      property: system.property
        ? {
            id: system.property.id,
            name: system.property.name,
            address: system.property.address,
            propertyType: system.property.propertyType,
            client: system.property.user
              ? {
                  id: system.property.user.id,
                  name: `${system.property.user.firstName} ${system.property.user.lastName}`.trim(),
                  email: system.property.user.email,
                }
              : null,
          }
        : null,
      cameras: (system.cameras ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        locationLabel: c.locationLabel,
        channel: c.channel,
        placement: c.placement,
        status: c.status,
        vendor: c.vendor,
        model: c.model,
        serialNumber: c.serialNumber,
        resolution: c.resolution,
      })),
    };
  }

  async listCctvSystems(tenantId: string) {
    const systems = await this.prisma.cctvSystem.findMany({
      where: { tenantId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyType: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        cameras: { orderBy: { channel: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return {
      success: true,
      data: {
        presets: CCTV_KIT_PRESETS,
        siteTypes: SITE_TYPE_OPTIONS,
        systems: systems.map((s) => this.formatCctvSystem(s)),
      },
    };
  }

  async getCctvSystem(tenantId: string, id: string) {
    const system = await this.prisma.cctvSystem.findFirst({
      where: { id, tenantId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyType: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        cameras: { orderBy: { channel: 'asc' } },
      },
    });
    if (!system) throw new NotFoundException('CCTV system not found');
    return { success: true, data: this.formatCctvSystem(system) };
  }

  async registerCctvSystem(
    tenantId: string,
    body: {
      propertyId?: string;
      clientUserId?: string;
      site?: {
        name: string;
        address: string;
        propertyType?: string;
        accessNotes?: string;
        gateCode?: string;
      };
      system: {
        name: string;
        brand?: string;
        model?: string;
        kitSku?: string;
        supplier?: string;
        recorderType?: string;
        channelCount?: number;
        connectivity?: string;
        recorderSerial?: string;
        recorderIp?: string;
        cloudId?: string;
        hddInstalled?: boolean;
        hddSerial?: string;
        hddCapacityGb?: number;
        firmware?: string;
        mobileAppEnabled?: boolean;
        techNotes?: string;
        status?: string;
      };
      cameras?: Array<{
        name: string;
        locationLabel: string;
        channel?: number;
        serialNumber?: string;
        model?: string;
        resolution?: string;
        placement?: 'EXTERIOR' | 'INTERIOR';
        vendor?: string;
      }>;
    },
  ) {
    if (!body?.system?.name?.trim()) {
      throw new BadRequestException('System name is required');
    }

    const channelCount = Math.min(64, Math.max(1, body.system.channelCount ?? 4));
    const cameras = (body.cameras ?? []).slice(0, channelCount);
    if (!cameras.length) {
      throw new BadRequestException('Add at least one camera channel with a label');
    }

    const propertyType = parsePropertyType(body.site?.propertyType);
    const recorderType = parseRecorderType(body.system.recorderType);
    const connectivity = parseConnectivity(body.system.connectivity);
    const status = parseSystemStatus(body.system.status);

    const created = await this.prisma.$transaction(async (tx) => {
      let propertyId = body.propertyId?.trim() || '';

      if (propertyId) {
        const existing = await tx.property.findFirst({
          where: { id: propertyId, tenantId },
        });
        if (!existing) throw new NotFoundException('Site / property not found');
      } else {
        const clientUserId = body.clientUserId?.trim();
        if (!clientUserId) {
          throw new BadRequestException('Select a customer or an existing site');
        }
        if (!body.site?.name?.trim() || !body.site?.address?.trim()) {
          throw new BadRequestException('Site name and address are required');
        }
        const client = await tx.user.findFirst({
          where: { id: clientUserId, tenantId },
        });
        if (!client) throw new NotFoundException('Customer not found');

        const property = await tx.property.create({
          data: {
            tenantId,
            userId: clientUserId,
            name: body.site.name.trim(),
            address: body.site.address.trim(),
            propertyType,
            accessNotes: body.site.accessNotes?.trim() || null,
            gateCode: body.site.gateCode?.trim() || null,
            camerasLinked: true,
            monitoringEnabled: true,
          },
        });
        propertyId = property.id;
      }

      const system = await tx.cctvSystem.create({
        data: {
          tenantId,
          propertyId,
          name: body.system.name.trim(),
          brand: body.system.brand?.trim() || null,
          model: body.system.model?.trim() || null,
          kitSku: body.system.kitSku?.trim() || null,
          supplier: body.system.supplier?.trim() || null,
          recorderType,
          channelCount,
          connectivity,
          recorderSerial: body.system.recorderSerial?.trim() || null,
          recorderIp: body.system.recorderIp?.trim() || null,
          cloudId: body.system.cloudId?.trim() || null,
          hddInstalled: Boolean(body.system.hddInstalled),
          hddSerial: body.system.hddSerial?.trim() || null,
          hddCapacityGb: body.system.hddCapacityGb ?? null,
          firmware: body.system.firmware?.trim() || null,
          mobileAppEnabled: body.system.mobileAppEnabled !== false,
          techNotes: body.system.techNotes?.trim() || null,
          status,
          installedAt: status === CctvSystemStatus.ONLINE ? new Date() : null,
        },
      });

      for (let i = 0; i < cameras.length; i += 1) {
        const cam = cameras[i];
        await tx.camera.create({
          data: {
            tenantId,
            propertyId,
            systemId: system.id,
            name: cam.name.trim() || `Camera ${i + 1}`,
            locationLabel: cam.locationLabel.trim() || `Channel ${i + 1}`,
            channel: cam.channel ?? i + 1,
            placement:
              cam.placement === 'INTERIOR'
                ? CameraPlacement.INTERIOR
                : CameraPlacement.EXTERIOR,
            vendor: cam.vendor?.trim() || body.system.brand?.trim() || '4DS Nexus',
            model: cam.model?.trim() || null,
            serialNumber: cam.serialNumber?.trim() || null,
            resolution: cam.resolution?.trim() || null,
            status: CameraStatus.ONLINE,
            lastSeenAt: new Date(),
          },
        });
      }

      await tx.property.update({
        where: { id: propertyId },
        data: { camerasLinked: true, monitoringEnabled: true },
      });

      return tx.cctvSystem.findFirstOrThrow({
        where: { id: system.id },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              propertyType: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          cameras: { orderBy: { channel: 'asc' } },
        },
      });
    });

    return { success: true, data: this.formatCctvSystem(created) };
  }

  async updateCctvSystem(
    tenantId: string,
    id: string,
    body: {
      name?: string;
      brand?: string;
      model?: string;
      kitSku?: string;
      supplier?: string;
      recorderType?: string;
      channelCount?: number;
      connectivity?: string;
      recorderSerial?: string;
      recorderIp?: string;
      cloudId?: string;
      hddInstalled?: boolean;
      hddSerial?: string;
      hddCapacityGb?: number | null;
      firmware?: string;
      mobileAppEnabled?: boolean;
      techNotes?: string;
      status?: string;
      cameras?: Array<{
        id?: string;
        name: string;
        locationLabel: string;
        channel?: number;
        serialNumber?: string;
        model?: string;
        resolution?: string;
        placement?: 'EXTERIOR' | 'INTERIOR';
        vendor?: string;
      }>;
    },
  ) {
    const existing = await this.prisma.cctvSystem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('CCTV system not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.cctvSystem.update({
        where: { id },
        data: {
          name: body.name?.trim() || undefined,
          brand: body.brand !== undefined ? body.brand.trim() || null : undefined,
          model: body.model !== undefined ? body.model.trim() || null : undefined,
          kitSku: body.kitSku !== undefined ? body.kitSku.trim() || null : undefined,
          supplier: body.supplier !== undefined ? body.supplier.trim() || null : undefined,
          recorderType: body.recorderType
            ? parseRecorderType(body.recorderType)
            : undefined,
          channelCount:
            body.channelCount !== undefined
              ? Math.min(64, Math.max(1, body.channelCount))
              : undefined,
          connectivity: body.connectivity
            ? parseConnectivity(body.connectivity)
            : undefined,
          recorderSerial:
            body.recorderSerial !== undefined
              ? body.recorderSerial.trim() || null
              : undefined,
          recorderIp:
            body.recorderIp !== undefined ? body.recorderIp.trim() || null : undefined,
          cloudId: body.cloudId !== undefined ? body.cloudId.trim() || null : undefined,
          hddInstalled:
            body.hddInstalled !== undefined ? Boolean(body.hddInstalled) : undefined,
          hddSerial:
            body.hddSerial !== undefined ? body.hddSerial.trim() || null : undefined,
          hddCapacityGb:
            body.hddCapacityGb !== undefined ? body.hddCapacityGb : undefined,
          firmware:
            body.firmware !== undefined ? body.firmware.trim() || null : undefined,
          mobileAppEnabled:
            body.mobileAppEnabled !== undefined
              ? Boolean(body.mobileAppEnabled)
              : undefined,
          techNotes:
            body.techNotes !== undefined ? body.techNotes.trim() || null : undefined,
          status: body.status ? parseSystemStatus(body.status) : undefined,
          installedAt:
            body.status && parseSystemStatus(body.status) === CctvSystemStatus.ONLINE
              ? existing.installedAt ?? new Date()
              : undefined,
        },
      });

      if (body.cameras?.length) {
        for (let i = 0; i < body.cameras.length; i += 1) {
          const cam = body.cameras[i];
          const data = {
            name: cam.name.trim() || `Camera ${i + 1}`,
            locationLabel: cam.locationLabel.trim() || `Channel ${i + 1}`,
            channel: cam.channel ?? i + 1,
            placement:
              cam.placement === 'INTERIOR'
                ? CameraPlacement.INTERIOR
                : CameraPlacement.EXTERIOR,
            vendor: cam.vendor?.trim() || null,
            model: cam.model?.trim() || null,
            serialNumber: cam.serialNumber?.trim() || null,
            resolution: cam.resolution?.trim() || null,
          };
          if (cam.id) {
            await tx.camera.updateMany({
              where: { id: cam.id, tenantId, systemId: id },
              data,
            });
          } else {
            await tx.camera.create({
              data: {
                tenantId,
                propertyId: existing.propertyId,
                systemId: id,
                status: CameraStatus.ONLINE,
                lastSeenAt: new Date(),
                ...data,
              },
            });
          }
        }
      }

      return tx.cctvSystem.findFirstOrThrow({
        where: { id },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              propertyType: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          cameras: { orderBy: { channel: 'asc' } },
        },
      });
    });

    return { success: true, data: this.formatCctvSystem(updated) };
  }

  private formatAlarmSystem(
    system: {
      id: string;
      propertyId: string;
      name: string;
      brand: string | null;
      model: string | null;
      kitSku: string | null;
      supplier: string | null;
      connectivity: AlarmPanelConnectivity;
      panelSerial: string | null;
      imei: string | null;
      simIccid: string | null;
      wifiMac: string | null;
      wifiSsid: string | null;
      cloudId: string | null;
      appAccount: string | null;
      wirelessFrequency: string | null;
      wirelessCoding: string | null;
      gsmBands: string | null;
      wifiStandard: string | null;
      inputVoltage: string | null;
      backupBattery: string | null;
      icasaCert: string | null;
      rfidEnabled: boolean;
      touchKeypad: boolean;
      mobileAppEnabled: boolean;
      zoneCount: number;
      firmware: string | null;
      techNotes: string | null;
      status: AlarmSystemStatus;
      installedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      property?: {
        id: string;
        name: string;
        address: string;
        propertyType: PropertyType;
        user?: { id: string; firstName: string; lastName: string; email: string };
      };
    },
  ) {
    return {
      id: system.id,
      propertyId: system.propertyId,
      name: system.name,
      brand: system.brand,
      model: system.model,
      kitSku: system.kitSku,
      supplier: system.supplier,
      connectivity: system.connectivity,
      panelSerial: system.panelSerial,
      imei: system.imei,
      simIccid: system.simIccid,
      wifiMac: system.wifiMac,
      wifiSsid: system.wifiSsid,
      cloudId: system.cloudId,
      appAccount: system.appAccount,
      wirelessFrequency: system.wirelessFrequency,
      wirelessCoding: system.wirelessCoding,
      gsmBands: system.gsmBands,
      wifiStandard: system.wifiStandard,
      inputVoltage: system.inputVoltage,
      backupBattery: system.backupBattery,
      icasaCert: system.icasaCert,
      rfidEnabled: system.rfidEnabled,
      touchKeypad: system.touchKeypad,
      mobileAppEnabled: system.mobileAppEnabled,
      zoneCount: system.zoneCount,
      firmware: system.firmware,
      techNotes: system.techNotes,
      status: system.status,
      installedAt: system.installedAt,
      createdAt: system.createdAt,
      updatedAt: system.updatedAt,
      property: system.property
        ? {
            id: system.property.id,
            name: system.property.name,
            address: system.property.address,
            propertyType: system.property.propertyType,
            client: system.property.user
              ? {
                  id: system.property.user.id,
                  name: `${system.property.user.firstName} ${system.property.user.lastName}`.trim(),
                  email: system.property.user.email,
                }
              : null,
          }
        : null,
    };
  }

  async listAlarmSystems(tenantId: string) {
    const systems = await this.prisma.alarmSystem.findMany({
      where: { tenantId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyType: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return {
      success: true,
      data: {
        presets: ALARM_PANEL_PRESETS,
        siteTypes: SITE_TYPE_OPTIONS,
        systems: systems.map((s) => this.formatAlarmSystem(s)),
      },
    };
  }

  async getAlarmSystem(tenantId: string, id: string) {
    const system = await this.prisma.alarmSystem.findFirst({
      where: { id, tenantId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyType: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!system) throw new NotFoundException('Alarm system not found');
    return { success: true, data: this.formatAlarmSystem(system) };
  }

  async registerAlarmSystem(
    tenantId: string,
    body: {
      propertyId?: string;
      clientUserId?: string;
      site?: {
        name: string;
        address: string;
        propertyType?: string;
        accessNotes?: string;
        gateCode?: string;
      };
      system: {
        name: string;
        brand?: string;
        model?: string;
        kitSku?: string;
        supplier?: string;
        connectivity?: string;
        panelSerial?: string;
        imei?: string;
        simIccid?: string;
        wifiMac?: string;
        wifiSsid?: string;
        cloudId?: string;
        appAccount?: string;
        wirelessFrequency?: string;
        wirelessCoding?: string;
        gsmBands?: string;
        wifiStandard?: string;
        inputVoltage?: string;
        backupBattery?: string;
        icasaCert?: string;
        rfidEnabled?: boolean;
        touchKeypad?: boolean;
        mobileAppEnabled?: boolean;
        zoneCount?: number;
        firmware?: string;
        techNotes?: string;
        status?: string;
      };
    },
  ) {
    if (!body?.system?.name?.trim()) {
      throw new BadRequestException('Panel name is required');
    }

    const propertyType = parsePropertyType(body.site?.propertyType);
    const connectivity = parseAlarmConnectivity(body.system.connectivity);
    const status = parseAlarmStatus(body.system.status);

    const created = await this.prisma.$transaction(async (tx) => {
      let propertyId = body.propertyId?.trim() || '';

      if (propertyId) {
        const existing = await tx.property.findFirst({
          where: { id: propertyId, tenantId },
        });
        if (!existing) throw new NotFoundException('Site / property not found');
      } else {
        const clientUserId = body.clientUserId?.trim();
        if (!clientUserId) {
          throw new BadRequestException('Select a customer or an existing site');
        }
        if (!body.site?.name?.trim() || !body.site?.address?.trim()) {
          throw new BadRequestException('Site name and address are required');
        }
        const client = await tx.user.findFirst({
          where: { id: clientUserId, tenantId },
        });
        if (!client) throw new NotFoundException('Customer not found');

        const property = await tx.property.create({
          data: {
            tenantId,
            userId: clientUserId,
            name: body.site.name.trim(),
            address: body.site.address.trim(),
            propertyType,
            accessNotes: body.site.accessNotes?.trim() || null,
            gateCode: body.site.gateCode?.trim() || null,
            alarmLinked: true,
            monitoringEnabled: true,
            panelVendor: body.system.brand?.trim() || null,
            panelModel: body.system.model?.trim() || null,
            communicatorType: connectivity,
          },
        });
        propertyId = property.id;
      }

      const system = await tx.alarmSystem.create({
        data: {
          tenantId,
          propertyId,
          name: body.system.name.trim(),
          brand: body.system.brand?.trim() || null,
          model: body.system.model?.trim() || null,
          kitSku: body.system.kitSku?.trim() || null,
          supplier: body.system.supplier?.trim() || null,
          connectivity,
          panelSerial: body.system.panelSerial?.trim() || null,
          imei: body.system.imei?.trim() || null,
          simIccid: body.system.simIccid?.trim() || null,
          wifiMac: body.system.wifiMac?.trim() || null,
          wifiSsid: body.system.wifiSsid?.trim() || null,
          cloudId: body.system.cloudId?.trim() || null,
          appAccount: body.system.appAccount?.trim() || null,
          wirelessFrequency: body.system.wirelessFrequency?.trim() || null,
          wirelessCoding: body.system.wirelessCoding?.trim() || null,
          gsmBands: body.system.gsmBands?.trim() || null,
          wifiStandard: body.system.wifiStandard?.trim() || null,
          inputVoltage: body.system.inputVoltage?.trim() || null,
          backupBattery: body.system.backupBattery?.trim() || null,
          icasaCert: body.system.icasaCert?.trim() || null,
          rfidEnabled: body.system.rfidEnabled !== false,
          touchKeypad: body.system.touchKeypad !== false,
          mobileAppEnabled: body.system.mobileAppEnabled !== false,
          zoneCount: Math.max(0, body.system.zoneCount ?? 0),
          firmware: body.system.firmware?.trim() || null,
          techNotes: body.system.techNotes?.trim() || null,
          status,
          installedAt: status === AlarmSystemStatus.ONLINE ? new Date() : null,
        },
      });

      await tx.property.update({
        where: { id: propertyId },
        data: {
          alarmLinked: true,
          monitoringEnabled: true,
          panelVendor: body.system.brand?.trim() || undefined,
          panelModel: body.system.model?.trim() || undefined,
          communicatorType: connectivity,
        },
      });

      return tx.alarmSystem.findFirstOrThrow({
        where: { id: system.id },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              propertyType: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });
    });

    return { success: true, data: this.formatAlarmSystem(created) };
  }

  async updateAlarmSystem(
    tenantId: string,
    id: string,
    body: {
      name?: string;
      brand?: string;
      model?: string;
      kitSku?: string;
      supplier?: string;
      connectivity?: string;
      panelSerial?: string;
      imei?: string;
      simIccid?: string;
      wifiMac?: string;
      wifiSsid?: string;
      cloudId?: string;
      appAccount?: string;
      wirelessFrequency?: string;
      wirelessCoding?: string;
      gsmBands?: string;
      wifiStandard?: string;
      inputVoltage?: string;
      backupBattery?: string;
      icasaCert?: string;
      rfidEnabled?: boolean;
      touchKeypad?: boolean;
      mobileAppEnabled?: boolean;
      zoneCount?: number;
      firmware?: string;
      techNotes?: string;
      status?: string;
    },
  ) {
    const existing = await this.prisma.alarmSystem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Alarm system not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.alarmSystem.update({
        where: { id },
        data: {
          name: body.name?.trim() || undefined,
          brand: body.brand !== undefined ? body.brand.trim() || null : undefined,
          model: body.model !== undefined ? body.model.trim() || null : undefined,
          kitSku: body.kitSku !== undefined ? body.kitSku.trim() || null : undefined,
          supplier: body.supplier !== undefined ? body.supplier.trim() || null : undefined,
          connectivity: body.connectivity
            ? parseAlarmConnectivity(body.connectivity)
            : undefined,
          panelSerial:
            body.panelSerial !== undefined ? body.panelSerial.trim() || null : undefined,
          imei: body.imei !== undefined ? body.imei.trim() || null : undefined,
          simIccid: body.simIccid !== undefined ? body.simIccid.trim() || null : undefined,
          wifiMac: body.wifiMac !== undefined ? body.wifiMac.trim() || null : undefined,
          wifiSsid: body.wifiSsid !== undefined ? body.wifiSsid.trim() || null : undefined,
          cloudId: body.cloudId !== undefined ? body.cloudId.trim() || null : undefined,
          appAccount:
            body.appAccount !== undefined ? body.appAccount.trim() || null : undefined,
          wirelessFrequency:
            body.wirelessFrequency !== undefined
              ? body.wirelessFrequency.trim() || null
              : undefined,
          wirelessCoding:
            body.wirelessCoding !== undefined
              ? body.wirelessCoding.trim() || null
              : undefined,
          gsmBands: body.gsmBands !== undefined ? body.gsmBands.trim() || null : undefined,
          wifiStandard:
            body.wifiStandard !== undefined ? body.wifiStandard.trim() || null : undefined,
          inputVoltage:
            body.inputVoltage !== undefined ? body.inputVoltage.trim() || null : undefined,
          backupBattery:
            body.backupBattery !== undefined ? body.backupBattery.trim() || null : undefined,
          icasaCert:
            body.icasaCert !== undefined ? body.icasaCert.trim() || null : undefined,
          rfidEnabled:
            body.rfidEnabled !== undefined ? Boolean(body.rfidEnabled) : undefined,
          touchKeypad:
            body.touchKeypad !== undefined ? Boolean(body.touchKeypad) : undefined,
          mobileAppEnabled:
            body.mobileAppEnabled !== undefined
              ? Boolean(body.mobileAppEnabled)
              : undefined,
          zoneCount: body.zoneCount !== undefined ? Math.max(0, body.zoneCount) : undefined,
          firmware: body.firmware !== undefined ? body.firmware.trim() || null : undefined,
          techNotes:
            body.techNotes !== undefined ? body.techNotes.trim() || null : undefined,
          status: body.status ? parseAlarmStatus(body.status) : undefined,
          installedAt:
            body.status && parseAlarmStatus(body.status) === AlarmSystemStatus.ONLINE
              ? existing.installedAt ?? new Date()
              : undefined,
        },
      });

      if (body.brand || body.model || body.connectivity) {
        await tx.property.update({
          where: { id: existing.propertyId },
          data: {
            alarmLinked: true,
            panelVendor: body.brand?.trim() || undefined,
            panelModel: body.model?.trim() || undefined,
            communicatorType: body.connectivity
              ? parseAlarmConnectivity(body.connectivity)
              : undefined,
          },
        });
      }

      return tx.alarmSystem.findFirstOrThrow({
        where: { id },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              propertyType: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });
    });

    return { success: true, data: this.formatAlarmSystem(updated) };
  }
}

export const SITE_TYPE_OPTIONS = [
  { value: 'HOUSE', label: 'House' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
  { value: 'ESTATE', label: 'Estate' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'STORE', label: 'Store' },
  { value: 'MALL', label: 'Mall' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
] as const;

export const CCTV_KIT_PRESETS = [
  {
    id: 'hilook-4ch',
    label: 'HiLook 4-Channel Analog Kit',
    brand: 'HiLook',
    model: '4 Channel CCTV Kit',
    kitSku: 'HILOOK-4CH',
    supplier: 'Makro / Hikvision channel',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'ANALOG',
    resolution: '2MP',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: ['Front entrance', 'Side alley', 'Parking', 'Rear yard'],
  },
  {
    id: 'dahua-8ch',
    label: 'Dahua 2MP Bullet 8-Channel Kit',
    brand: 'Dahua',
    model: '2Mp Bullet 8Ch Full Kit',
    kitSku: 'DAHUA-2MP-8CH',
    supplier: 'Makro',
    recorderType: 'NVR',
    channelCount: 8,
    connectivity: 'LAN',
    resolution: '2MP',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: [
      'Entrance',
      'Parking A',
      'Parking B',
      'Loading bay',
      'Corridor',
      'Till area',
      'Stock room',
      'Perimeter rear',
    ],
  },
  {
    id: 'proview-ahd-4ch',
    label: 'Pro View 4-Channel AHD Kit',
    brand: 'Pro View',
    model: '4 CHANNEL AHD CCTV KIT',
    kitSku: 'PROVIEW-AHD-4',
    supplier: 'Big Brother Security Wholesalers',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'AHD',
    resolution: 'AHD',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: ['Front gate', 'Driveway', 'Backyard', 'Garage'],
  },
] as const;

export const ALARM_PANEL_PRESETS = [
  {
    id: 'mixbox-pg103',
    label: 'mixbox PG-103 WiFi+4G Dual Network',
    brand: 'mixbox',
    model: 'PG-103',
    kitSku: 'MIXBOX-PG103',
    supplier: 'ICASA TA-2021/3152',
    connectivity: 'WIFI_4G',
    wirelessFrequency: '433.92MHz',
    wirelessCoding: 'EV1527',
    gsmBands: '2G/4G',
    wifiStandard: 'IEEE802.11b/g/n',
    inputVoltage: 'DC5V (TYPE-C)',
    backupBattery: '3.7V/1000mAh lithium',
    icasaCert: 'TA-2021/3152',
    rfidEnabled: true,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 0,
  },
  {
    id: 'paradox-mg5050',
    label: 'Paradox MG5050 Dual-Path',
    brand: 'Paradox',
    model: 'MG5050',
    kitSku: 'PARADOX-MG5050',
    supplier: 'Paradox Security',
    connectivity: 'DUAL_PATH',
    wirelessFrequency: null,
    wirelessCoding: null,
    gsmBands: null,
    wifiStandard: null,
    inputVoltage: null,
    backupBattery: null,
    icasaCert: null,
    rfidEnabled: false,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 8,
  },
] as const;

function parsePropertyType(value?: string): PropertyType {
  const allowed = Object.values(PropertyType) as string[];
  if (value && allowed.includes(value)) return value as PropertyType;
  return PropertyType.HOUSE;
}

function parseRecorderType(value?: string): CctvRecorderType {
  const allowed = Object.values(CctvRecorderType) as string[];
  if (value && allowed.includes(value)) return value as CctvRecorderType;
  return CctvRecorderType.DVR;
}

function parseConnectivity(value?: string): CctvConnectivity {
  const allowed = Object.values(CctvConnectivity) as string[];
  if (value && allowed.includes(value)) return value as CctvConnectivity;
  return CctvConnectivity.AHD;
}

function parseSystemStatus(value?: string): CctvSystemStatus {
  const allowed = Object.values(CctvSystemStatus) as string[];
  if (value && allowed.includes(value)) return value as CctvSystemStatus;
  return CctvSystemStatus.COMMISSIONING;
}

function parseAlarmConnectivity(value?: string): AlarmPanelConnectivity {
  const allowed = Object.values(AlarmPanelConnectivity) as string[];
  if (value && allowed.includes(value)) return value as AlarmPanelConnectivity;
  return AlarmPanelConnectivity.WIFI_4G;
}

function parseAlarmStatus(value?: string): AlarmSystemStatus {
  const allowed = Object.values(AlarmSystemStatus) as string[];
  if (value && allowed.includes(value)) return value as AlarmSystemStatus;
  return AlarmSystemStatus.COMMISSIONING;
}

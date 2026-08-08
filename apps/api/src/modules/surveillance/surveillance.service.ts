import {
  AlarmEventStatus,
  AlarmEventType,
  AlarmStatus,
  CameraPlacement,
  CameraStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  SensorStatus,
  SensorType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return { success: true, data: this.formatSensor(updated) };
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
        cameras: true,
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

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId: event.property.userId,
        type: IncidentType.ALARM,
        status: 'ACTIVE',
        priority: event.severity,
        title: event.title,
        description:
          event.description ??
          `Surveillance alarm at ${event.property.name}${event.camera ? ` · ${event.camera.name}` : ''}${
            event.sensor ? ` · Zone ${event.sensor.zoneNumber}` : ''
          }`,
        address: event.property.address,
        lat: event.property.lat ?? DURBAN.lat,
        lng: event.property.lng ?? DURBAN.lng,
      },
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
              name: cam.name.trim(),
              locationLabel: cam.locationLabel.trim(),
              channel: cam.channel ?? i + 1,
              placement:
                cam.placement === 'INTERIOR'
                  ? CameraPlacement.INTERIOR
                  : CameraPlacement.EXTERIOR,
              vendor: cam.vendor?.trim() || '4DS Nexus',
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
}

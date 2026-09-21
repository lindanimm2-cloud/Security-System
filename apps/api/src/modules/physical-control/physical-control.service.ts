import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessCommandPhase,
  AccessCommandType,
  AccessPointHealth,
  AccessPointState,
  IncidentPriority,
  IncidentType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  IncidentKernelService,
} from '../incident-kernel/incident-kernel.service';
import {
  demoAccessAdapter,
  gallagherAccessAdapter,
  genericAccessAdapter,
  hidAccessAdapter,
  onvifProfileCAdapter,
  type AccessControlAdapter,
} from './adapters/generic.adapter';
import { targetStateForCommand, type AccessAdapterId } from './physical-control.types';

const ADAPTERS: Record<AccessAdapterId, AccessControlAdapter> = {
  generic: genericAccessAdapter,
  'onvif-profile-c': onvifProfileCAdapter,
  hid: hidAccessAdapter,
  gallagher: gallagherAccessAdapter,
  demo: demoAccessAdapter,
};

const CR_ROLES = new Set<UserRole>([
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.TENANT_ADMIN,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
]);

const CLIENT_COMMANDS = new Set<AccessCommandType>([
  AccessCommandType.OPEN,
  AccessCommandType.CLOSE,
  AccessCommandType.UNLOCK,
  AccessCommandType.LOCK,
]);

type Actor = { id: string; tenantId: string; role: UserRole; firstName?: string; lastName?: string };

@Injectable()
export class PhysicalControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kernel: IncidentKernelService,
  ) {}

  private adapterFor(id: string): AccessControlAdapter {
    return ADAPTERS[id as AccessAdapterId] ?? genericAccessAdapter;
  }

  private actorName(actor: Actor) {
    const n = `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim();
    return n || actor.id;
  }

  private assertCanCommand(actor: Actor, command: AccessCommandType, source: string) {
    if (CR_ROLES.has(actor.role)) {
      if (command === AccessCommandType.EMERGENCY_RELEASE && actor.role === UserRole.DISPATCHER) {
        throw new ForbiddenException('Emergency gate release requires supervisor or above');
      }
      return;
    }
    if (actor.role === UserRole.OFFICER) {
      if (!CLIENT_COMMANDS.has(command)) {
        throw new ForbiddenException('Officer may only open/close authorized gates');
      }
      return;
    }
    if (actor.role === UserRole.USER || actor.role === UserRole.FAMILY_MEMBER) {
      if (!CLIENT_COMMANDS.has(command)) {
        throw new ForbiddenException('Residents cannot use emergency gate controls');
      }
      if (source === 'control-room') {
        throw new ForbiddenException('Clients use portal property command');
      }
      return;
    }
    throw new ForbiddenException('Not authorized for physical access commands');
  }

  async listForTenant(tenantId: string, propertyId?: string) {
    return this.prisma.accessPoint.findMany({
      where: {
        tenantId,
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        camera: {
          select: {
            id: true,
            name: true,
            locationLabel: true,
            snapshotUrl: true,
            streamUrl: true,
            status: true,
          },
        },
        commands: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async listForProperty(tenantId: string, propertyId: string, userId?: string, role?: UserRole) {
    if (userId && role && (role === UserRole.USER || role === UserRole.FAMILY_MEMBER)) {
      const prop = await this.prisma.property.findFirst({
        where: { id: propertyId, tenantId, userId },
      });
      if (!prop) throw new NotFoundException('Property not found');
    }
    return this.listForTenant(tenantId, propertyId);
  }

  async getPoint(tenantId: string, id: string) {
    const point = await this.prisma.accessPoint.findFirst({
      where: { id, tenantId },
      include: {
        property: { select: { id: true, name: true, address: true, lat: true, lng: true } },
        camera: true,
        commands: { orderBy: { createdAt: 'desc' }, take: 8 },
      },
    });
    if (!point) throw new NotFoundException('Access point not found');
    return point;
  }

  async listLiveAccess(tenantId: string, propertyId?: string, take = 40) {
    return this.prisma.accessCommand.findMany({
      where: {
        tenantId,
        ...(propertyId ? { accessPoint: { propertyId } } : {}),
      },
      include: {
        accessPoint: { select: { id: true, name: true, kind: true, propertyId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async command(
    actor: Actor,
    accessPointId: string,
    input: {
      command: AccessCommandType;
      confirmedClear?: boolean;
      source?: string;
    },
  ) {
    const source = input.source ?? (CR_ROLES.has(actor.role) ? 'control-room' : 'portal');
    this.assertCanCommand(actor, input.command, source);

    const point = await this.prisma.accessPoint.findFirst({
      where: { id: accessPointId, tenantId: actor.tenantId },
      include: { property: true, camera: true },
    });
    if (!point) throw new NotFoundException('Access point not found');

    if (point.health === AccessPointHealth.OFFLINE || point.state === AccessPointState.OFFLINE) {
      throw new BadRequestException('Access point controller is offline');
    }

    if (
      (input.command === AccessCommandType.OPEN ||
        input.command === AccessCommandType.HOLD_OPEN ||
        input.command === AccessCommandType.EMERGENCY_RELEASE) &&
      point.cameraId &&
      !input.confirmedClear &&
      CR_ROLES.has(actor.role)
    ) {
      return {
        needsConfirmation: true as const,
        accessPoint: point,
        camera: point.camera,
        message: 'Confirm the gate approach is clear on CCTV before opening.',
      };
    }

    const adapter = this.adapterFor(point.adapter);
    const send = await adapter.sendCommand({
      accessPointId: point.id,
      kind: point.kind,
      currentState: point.state,
      command: input.command,
      externalRef: point.externalRef,
    });

    const cmd = await this.prisma.accessCommand.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        accessPointId: point.id,
        command: input.command,
        phase: send.accepted ? AccessCommandPhase.SENT : AccessCommandPhase.FAILED,
        actorUserId: actor.id,
        actorName: this.actorName(actor),
        source,
        confirmedClear: Boolean(input.confirmedClear),
        resultMessage: send.message,
        completedAt: send.accepted ? null : new Date(),
      },
    });

    await this.prisma.securityAuditEvent.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        actorUserId: actor.id,
        actorRole: actor.role,
        action: `ACCESS_${input.command}`,
        result: send.accepted ? 'SUCCESS' : 'FAILED',
        reason: send.message,
        source,
        target: point.id,
        previousState: { state: point.state, health: point.health },
        newState: { commandId: cmd.id, phase: cmd.phase },
      },
    });

    if (!send.accepted) {
      return { needsConfirmation: false as const, command: cmd, accessPoint: point, ok: false as const };
    }

    // Advance lifecycle synchronously for generic/demo adapters (SENT → ACK → MOVING → SUCCEEDED).
    const target = targetStateForCommand(input.command, point.kind);
    const now = new Date();
    const updatedCmd = await this.prisma.accessCommand.update({
      where: { id: cmd.id },
      data: {
        phase: AccessCommandPhase.SUCCEEDED,
        acknowledgedAt: now,
        completedAt: now,
        resultMessage: `${send.message} · state ${target}`,
      },
    });

    const updatedPoint = await this.prisma.accessPoint.update({
      where: { id: point.id },
      data: {
        state: target as AccessPointState,
        lastCommandAt: now,
        lastEvent: `${this.actorName(actor)} ${input.command.toLowerCase().replace(/_/g, ' ')}`,
        lastEventAt: now,
        openSince:
          target === AccessPointState.OPEN ||
          target === AccessPointState.UNLOCKED ||
          target === AccessPointState.HELD_OPEN
            ? now
            : null,
      },
      include: {
        property: { select: { id: true, name: true } },
        camera: true,
      },
    });

    return {
      needsConfirmation: false as const,
      ok: true as const,
      command: updatedCmd,
      accessPoint: updatedPoint,
      phases: ['SENT', 'ACKNOWLEDGED', 'MOVING', 'SUCCEEDED'] as const,
    };
  }

  /** Sensor mismatch: commanded closed but sensor reports open → FORCED / incident. */
  async reportStateMismatch(
    tenantId: string,
    accessPointId: string,
    sensorState: 'OPEN' | 'CLOSED',
    opts?: { createIncident?: boolean; userId?: string },
  ) {
    const point = await this.prisma.accessPoint.findFirst({
      where: { id: accessPointId, tenantId },
      include: { property: true },
    });
    if (!point) throw new NotFoundException('Access point not found');

    if (
      (point.state === AccessPointState.CLOSED || point.state === AccessPointState.LOCKED) &&
      sensorState === 'OPEN'
    ) {
      const updated = await this.prisma.accessPoint.update({
        where: { id: point.id },
        data: {
          state: AccessPointState.FORCED,
          health: AccessPointHealth.DEGRADED,
          sensorNormal: false,
          lastEvent: 'GATE STATE MISMATCH — forced / unauthorized open',
          lastEventAt: new Date(),
          openSince: new Date(),
        },
      });

      await this.prisma.securityAuditEvent.create({
        data: {
          id: randomUUID(),
          tenantId,
          action: 'ACCESS_FORCED_OPEN',
          result: 'ALERT',
          reason: 'Commanded closed/locked but sensor reports open',
          source: 'system',
          target: point.id,
          previousState: { state: point.state },
          newState: { state: 'FORCED' },
        },
      });

      if (opts?.createIncident !== false) {
        const ownerId = opts?.userId ?? point.property.userId;
        await this.kernel.createFromEmergency({
          tenantId,
          userId: ownerId,
          type: IncidentType.ALARM,
          title: `UNAUTHORIZED ACCESS — ${point.name}`,
          description: `Forced / state mismatch at ${point.name} (${point.property.name})`,
          lat: Number(point.property.lat ?? -29.8587),
          lng: Number(point.property.lng ?? 31.0218),
          address: point.property.address,
          propertyId: point.propertyId,
          source: 'system',
          kind: 'alarm',
          autoDispatch: true,
          priority: IncidentPriority.HIGH,
        });
      }

      return updated;
    }

    return point;
  }

  async ensureDemoSeed(tenantId: string, propertyId: string) {
    const existing = await this.prisma.accessPoint.count({ where: { tenantId, propertyId } });
    if (existing > 0) return;
    const camera = await this.prisma.camera.findFirst({ where: { tenantId, propertyId } });
    await this.prisma.accessPoint.createMany({
      data: [
        {
          id: randomUUID(),
          tenantId,
          propertyId,
          name: 'Main Vehicle Gate',
          kind: 'VEHICLE_GATE' as const,
          state: 'CLOSED' as const,
          cameraId: camera?.id ?? null,
          adapter: 'demo',
          lastEvent: 'Secured',
          lastEventAt: new Date(),
        },
        {
          id: randomUUID(),
          tenantId,
          propertyId,
          name: 'Pedestrian Gate',
          kind: 'PEDESTRIAN_GATE' as const,
          state: 'LOCKED' as const,
          adapter: 'demo',
          lastEvent: 'Locked',
          lastEventAt: new Date(),
        },
        {
          id: randomUUID(),
          tenantId,
          propertyId,
          name: 'Parking Gate',
          kind: 'PARKING_GATE' as const,
          state: 'CLOSED' as const,
          adapter: 'demo',
          lastEvent: 'Closed',
          lastEventAt: new Date(),
        },
      ],
    });
  }
}

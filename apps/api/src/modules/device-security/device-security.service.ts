import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DeviceLostReason,
  EmergencySessionPurpose,
  IncidentPriority,
  IncidentType,
  NativeSosCapability,
  NotificationPriority,
  NotificationType,
  PanicSource,
  PanicWorkflowStatus,
  Prisma,
  SecurityConsentKind,
  TrustedDeviceStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { PlatformEvent } from '../incident-kernel/incident-events';
import { IncidentKernelService } from '../incident-kernel/incident-kernel.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  APP_VERSION,
  CONSENT_VERSION,
  DEFAULT_EMERGENCY_SESSION_MS,
  POLICY_VERSION,
  canAuthenticateFromDevice,
  detectNativeSosFromUserAgent,
  emergencyReadinessScore,
  fingerprintFromHints,
  generateDevicePublicId,
  generateSessionToken,
  hashToken,
  hitRateLimit,
  isEmergencySessionExpired,
  nextPanicWorkflow,
  parseUserAgent,
  relativeTime,
  shouldReusePanic,
  type RateBucket,
} from './device-security.logic';

type Actor = {
  id: string;
  tenantId: string;
  role: string;
  firstName?: string;
  lastName?: string;
};

type RegisterDeviceInput = {
  publicId?: string;
  name?: string;
  userAgent?: string;
  appVersion?: string;
  makePrimary?: boolean;
  trustBrowser?: boolean;
  fingerprint?: string;
  nativeSos?: NativeSosCapability;
  lat?: number;
  lng?: number;
  accuracy?: number;
};

type PanicInput = {
  source?: PanicSource;
  silent?: boolean;
  emergencySessionToken?: string;
  idempotencyKey?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  locationSource?: string;
  batteryLevel?: number;
  networkStatus?: string;
  pendingTransmission?: boolean;
  devicePublicId?: string;
};

const PANIC_RATE = new Map<string, RateBucket>();
const ACCESS_RATE = new Map<string, RateBucket>();
const LOGIN_FAIL_RATE = new Map<string, RateBucket>();

@Injectable()
export class DeviceSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kernel: IncidentKernelService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listDevices(userId: string, tenantId: string) {
    const devices = await this.prisma.trustedDevice.findMany({
      where: { userId, tenantId },
      orderBy: [{ isPrimary: 'desc' }, { lastActiveAt: 'desc' }],
    });
    return { success: true, data: devices.map((d) => this.serializeDevice(d)) };
  }

  async getDevice(userId: string, tenantId: string, id: string) {
    const device = await this.requireOwnDevice(userId, tenantId, id);
    const [sessions, events, panics] = await Promise.all([
      this.prisma.deviceSession.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.deviceSecurityEvent.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.panicEvent.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return {
      success: true,
      data: {
        ...this.serializeDevice(device, true),
        currentSession: sessions.find((s) => !s.revokedAt) ?? null,
        sessions,
        securityEvents: events,
        emergencySessions: panics.filter((p) => p.sessionId),
        panicHistory: panics,
      },
    };
  }

  async registerDevice(actor: Actor, input: RegisterDeviceInput, ip?: string) {
    const parsed = parseUserAgent(input.userAgent);
    const sos = detectNativeSosFromUserAgent(input.userAgent);
    const publicId = input.publicId?.startsWith('SEC-DEVICE-')
      ? input.publicId
      : generateDevicePublicId();
    const fingerprint = input.fingerprint ?? fingerprintFromHints([input.userAgent, parsed.name, ip]);

    const existing = await this.prisma.trustedDevice.findFirst({
      where: {
        userId: actor.id,
        OR: [{ publicId }, { fingerprintHash: fingerprint }],
      },
    });

    const lockdown = await this.activeLockdown(actor.id);
    if (lockdown && existing && !canAuthenticateFromDevice(existing.status, existing.isLocked, true)) {
      throw new ForbiddenException('Account lockdown is active. Use emergency access.');
    }

    const existingCount = await this.prisma.trustedDevice.count({
      where: { userId: actor.id, status: { in: ['TRUSTED', 'TEMPORARY', 'PENDING_VERIFICATION'] } },
    });
    const makePrimary = Boolean(input.makePrimary) || existingCount === 0;
    const browserTemporary = parsed.isBrowser && parsed.deviceType === 'desktop' && !input.trustBrowser;
    const status: TrustedDeviceStatus = existing
      ? existing.status
      : browserTemporary
        ? TrustedDeviceStatus.TEMPORARY
        : makePrimary
          ? TrustedDeviceStatus.TRUSTED
          : TrustedDeviceStatus.PENDING_VERIFICATION;

    if (existing && isBlocked(existing.status)) {
      throw new ForbiddenException('This device has been revoked or reported lost. It cannot sign in.');
    }

    if (makePrimary) {
      await this.prisma.trustedDevice.updateMany({
        where: { userId: actor.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const device = existing
      ? await this.prisma.trustedDevice.update({
          where: { id: existing.id },
          data: {
            name: input.name ?? existing.name,
            lastActiveAt: new Date(),
            lastAuthAt: new Date(),
            appVersion: input.appVersion ?? APP_VERSION,
            nativeSos: NativeSosCapability.NOT_AVAILABLE,
            nativeSosNote: sos.note,
            isPrimary: makePrimary || existing.isPrimary,
            lastLat: input.lat,
            lastLng: input.lng,
            lastLocationAccuracy: input.accuracy,
          },
        })
      : await this.prisma.trustedDevice.create({
          data: {
            id: randomUUID(),
            tenantId: actor.tenantId,
            userId: actor.id,
            publicId,
            name: input.name ?? parsed.name,
            deviceType: parsed.deviceType,
            osName: parsed.osName,
            osVersion: parsed.osVersion,
            appVersion: input.appVersion ?? APP_VERSION,
            userAgent: input.userAgent,
            fingerprintHash: fingerprint,
            status,
            isPrimary: makePrimary,
            nativeSos: NativeSosCapability.NOT_AVAILABLE,
            nativeSosNote: sos.note,
            lastActiveAt: new Date(),
            lastAuthAt: new Date(),
            lastLat: input.lat,
            lastLng: input.lng,
            lastLocationAccuracy: input.accuracy,
          },
        });

    await this.prisma.deviceSession.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        deviceId: device.id,
        userId: actor.id,
        ipAddress: ip,
        authMethod: 'password',
        lastSeenAt: new Date(),
      },
    });

    if (!existing) {
      await this.audit(actor, {
        action: 'DEVICE_REGISTERED',
        accountUserId: actor.id,
        deviceId: device.id,
        source: 'portal',
        newState: { publicId: device.publicId, status: device.status, isPrimary: device.isPrimary },
        ipAddress: ip,
      });
      await this.deviceEvent(actor, device.id, 'DEVICE_REGISTERED', { publicId: device.publicId });
      await this.notify(actor, {
        title: 'New device registered',
        body: `${device.name} was registered as ${device.isPrimary ? 'your primary security device' : 'a device on your account'}.`,
      });
      this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.DEVICE_REGISTERED, {
        userId: actor.id,
        deviceId: device.id,
        name: device.name,
        status: device.status,
      });
    }

    return { success: true, data: this.serializeDevice(device, true) };
  }

  async heartbeat(userId: string, tenantId: string, publicId?: string, ua?: string) {
    if (!publicId) return { success: true, data: { ok: true } };
    await this.prisma.trustedDevice.updateMany({
      where: { userId, tenantId, publicId },
      data: { lastActiveAt: new Date(), userAgent: ua },
    });
    return { success: true, data: { ok: true } };
  }

  async lockDevice(actor: Actor, id: string, ip?: string) {
    const device = await this.requireOwnDevice(actor.id, actor.tenantId, id);
    const updated = await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { isLocked: true, lockedAt: new Date() },
    });
    await this.revokeSessions(device.id);
    await this.audit(actor, {
      action: 'DEVICE_LOCKED',
      accountUserId: actor.id,
      deviceId: device.id,
      previousState: { isLocked: false },
      newState: { isLocked: true },
      ipAddress: ip,
    });
    return { success: true, data: this.serializeDevice(updated) };
  }

  async revokeDevice(actor: Actor, id: string, ip?: string) {
    const device = await this.requireOwnDevice(actor.id, actor.tenantId, id);
    if (device.isPrimary) {
      throw new BadRequestException('Replace the primary device before revoking it.');
    }
    const updated = await this.markStatus(device.id, TrustedDeviceStatus.REVOKED);
    await this.revokeSessions(device.id);
    await this.audit(actor, {
      action: 'DEVICE_REVOKED',
      accountUserId: actor.id,
      deviceId: device.id,
      previousState: { status: device.status },
      newState: { status: 'REVOKED' },
      ipAddress: ip,
    });
    await this.deviceEvent(actor, device.id, 'DEVICE_REVOKED', {});
    this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.DEVICE_REVOKED, {
      userId: actor.id,
      deviceId: device.id,
    });
    await this.notify(actor, {
      title: 'Device revoked',
      body: `${device.name} can no longer access your security account.`,
    });
    return { success: true, data: this.serializeDevice(updated) };
  }

  async reportLost(
    actor: Actor,
    id: string,
    reason: DeviceLostReason,
    ip?: string,
  ) {
    const device = await this.requireOwnDevice(actor.id, actor.tenantId, id);
    const status =
      reason === DeviceLostReason.STOLEN ? TrustedDeviceStatus.STOLEN : TrustedDeviceStatus.LOST;
    const updated = await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: {
        status,
        lostReason: reason,
        isLocked: true,
        lockedAt: new Date(),
        revokedAt: new Date(),
        isPrimary: false,
      },
    });
    await this.revokeSessions(device.id);
    await this.prisma.refreshToken.updateMany({
      where: { userId: actor.id, deviceId: device.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const action = reason === DeviceLostReason.STOLEN ? 'DEVICE_STOLEN' : 'DEVICE_LOST';
    await this.audit(actor, {
      action,
      accountUserId: actor.id,
      deviceId: device.id,
      reason,
      previousState: { status: device.status, isPrimary: device.isPrimary },
      newState: { status, isPrimary: false },
      ipAddress: ip,
    });
    await this.deviceEvent(actor, device.id, action, { reason });
    this.realtime.emitPlatformEvent(
      actor.tenantId,
      reason === DeviceLostReason.STOLEN ? PlatformEvent.DEVICE_STOLEN : PlatformEvent.DEVICE_LOST,
      { userId: actor.id, deviceId: device.id, reason, name: device.name },
    );
    await this.notify(actor, {
      title: reason === DeviceLostReason.STOLEN ? 'Device marked stolen' : 'Device marked lost',
      body: `${device.name} access has been restricted. Emergency access remains available from the web portal.`,
    });
    return { success: true, data: this.serializeDevice(updated) };
  }

  async makePrimary(actor: Actor, id: string, ip?: string) {
    const device = await this.requireOwnDevice(actor.id, actor.tenantId, id);
    if (device.status !== TrustedDeviceStatus.TRUSTED) {
      throw new BadRequestException('Only a trusted device can become primary.');
    }
    await this.prisma.trustedDevice.updateMany({
      where: { userId: actor.id, isPrimary: true },
      data: { isPrimary: false },
    });
    const updated = await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { isPrimary: true },
    });
    await this.audit(actor, {
      action: 'PRIMARY_DEVICE_CHANGED',
      accountUserId: actor.id,
      deviceId: device.id,
      ipAddress: ip,
    });
    await this.notify(actor, {
      title: 'Primary device changed',
      body: `${device.name} is now your primary security device.`,
    });
    return { success: true, data: this.serializeDevice(updated) };
  }

  async removeDevice(actor: Actor, id: string) {
    const device = await this.requireOwnDevice(actor.id, actor.tenantId, id);
    if (device.isPrimary) throw new BadRequestException('Replace the primary device first.');
    await this.markStatus(device.id, TrustedDeviceStatus.REVOKED);
    await this.revokeSessions(device.id);
    return { success: true, data: { removed: true } };
  }

  async replacePrimary(
    actor: Actor,
    body: { oldDeviceId: string; newPublicId?: string; userAgent?: string; name?: string },
    ip?: string,
  ) {
    const old = await this.requireOwnDevice(actor.id, actor.tenantId, body.oldDeviceId);
    const registered = await this.registerDevice(
      actor,
      {
        publicId: body.newPublicId,
        userAgent: body.userAgent,
        name: body.name,
        makePrimary: true,
        trustBrowser: true,
      },
      ip,
    );
    await this.prisma.trustedDevice.update({
      where: { id: old.id },
      data: {
        status: TrustedDeviceStatus.REVOKED,
        lostReason: DeviceLostReason.REPLACED,
        isPrimary: false,
        revokedAt: new Date(),
      },
    });
    await this.revokeSessions(old.id);
    await this.audit(actor, {
      action: 'DEVICE_REPLACED',
      accountUserId: actor.id,
      deviceId: registered.data.id,
      previousState: { oldDeviceId: old.id },
      newState: { newDeviceId: registered.data.id },
      ipAddress: ip,
    });
    this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.DEVICE_REPLACED, {
      userId: actor.id,
      oldDeviceId: old.id,
      newDeviceId: registered.data.id,
    });
    return {
      success: true,
      data: {
        oldDevice: { id: old.id, status: 'REVOKED' },
        newDevice: registered.data,
      },
    };
  }

  async startEmergencyAccess(
    actor: Actor,
    body: { password?: string; otp?: string; purpose?: EmergencySessionPurpose; userAgent?: string },
    ip?: string,
  ) {
    if (!hitRateLimit(ACCESS_RATE, `ea:${actor.id}`, 8, 10 * 60_000)) {
      throw new HttpException('Too many emergency access attempts. Wait a few minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.prisma.user.findFirst({ where: { id: actor.id, tenantId: actor.tenantId } });
    if (!user?.passwordHash) throw new UnauthorizedException('Reauthentication required.');
    const valid = body.password ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!valid) {
      if (!hitRateLimit(LOGIN_FAIL_RATE, `fail:${actor.id}`, 5, 15 * 60_000)) {
        throw new HttpException('Too many failed attempts.', HttpStatus.TOO_MANY_REQUESTS);
      }
      await this.audit(actor, { action: 'EMERGENCY_ACCESS_FAILED', result: 'FAILURE', ipAddress: ip });
      throw new UnauthorizedException('Verification failed. Emergency access was not opened.');
    }

    const parsed = parseUserAgent(body.userAgent);
    const tempDevice = await this.prisma.trustedDevice.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        publicId: generateDevicePublicId(),
        name: parsed.name,
        deviceType: parsed.deviceType,
        osName: parsed.osName,
        osVersion: parsed.osVersion,
        appVersion: APP_VERSION,
        userAgent: body.userAgent,
        status: TrustedDeviceStatus.TEMPORARY,
        isPrimary: false,
        nativeSos: NativeSosCapability.NOT_AVAILABLE,
        nativeSosNote: detectNativeSosFromUserAgent(body.userAgent).note,
        lastActiveAt: new Date(),
        lastAuthAt: new Date(),
      },
    });

    const settings = await this.settings(actor.id);
    const minutes = settings.emergencySessionMinutes || 10;
    const token = generateSessionToken();
    const session = await this.prisma.emergencySession.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        deviceId: tempDevice.id,
        tokenHash: hashToken(token),
        purpose: body.purpose ?? EmergencySessionPurpose.WEB_RECOVERY,
        authMethod: 'password',
        ipAddress: ip,
        expiresAt: new Date(Date.now() + minutes * 60_000),
      },
    });

    await this.audit(actor, {
      action: 'EMERGENCY_SESSION_CREATED',
      accountUserId: actor.id,
      deviceId: tempDevice.id,
      sessionId: session.id,
      source: 'portal',
      ipAddress: ip,
    });
    this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.EMERGENCY_SESSION_CREATED, {
      userId: actor.id,
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
    });
    await this.notify(actor, {
      title: 'Emergency access activated',
      body: 'A temporary emergency session was created. This device was not added as a trusted device.',
    });

    return {
      success: true,
      data: {
        sessionId: session.id,
        token,
        expiresAt: session.expiresAt.toISOString(),
        status: 'ACTIVE',
        deviceTrusted: false,
        device: this.serializeDevice(tempDevice),
        allowedActions: ['PANIC', 'CALL_CONTROL_ROOM', 'SHARE_LOCATION', 'PROPERTY', 'MEDICAL', 'SECURITY_RESPONSE'],
      },
    };
  }

  async getEmergencySession(actor: Actor, token: string) {
    const session = await this.prisma.emergencySession.findFirst({
      where: { tokenHash: hashToken(token), userId: actor.id },
      include: { device: true },
    });
    if (!session) throw new NotFoundException('Emergency session not found.');
    if (session.status !== 'ACTIVE' || isEmergencySessionExpired(session.expiresAt)) {
      if (session.status === 'ACTIVE') {
        await this.prisma.emergencySession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.EMERGENCY_SESSION_EXPIRED, {
          sessionId: session.id,
          userId: actor.id,
        });
      }
      throw new UnauthorizedException('SESSION EXPIRED. Complete reauthentication is required.');
    }
    return { success: true, data: { ...session, token: undefined } };
  }

  async activatePanic(actor: Actor, input: PanicInput, ip?: string) {
    if (!hitRateLimit(PANIC_RATE, `panic:${actor.id}`, 6, 5 * 60_000)) {
      throw new HttpException('Repeated panic detected. Control room has been notified.', HttpStatus.TOO_MANY_REQUESTS);
    }

    let emergencySessionId: string | undefined;
    if (input.emergencySessionToken) {
      const session = await this.prisma.emergencySession.findFirst({
        where: { tokenHash: hashToken(input.emergencySessionToken), userId: actor.id },
      });
      if (!session || session.status !== 'ACTIVE' || isEmergencySessionExpired(session.expiresAt)) {
        throw new UnauthorizedException('Emergency session expired. Reauthenticate to continue.');
      }
      emergencySessionId = session.id;
      const actions = Array.isArray(session.actionsJson) ? [...(session.actionsJson as Prisma.JsonArray)] : [];
      actions.push({ action: 'PANIC', at: new Date().toISOString() });
      await this.prisma.emergencySession.update({
        where: { id: session.id },
        data: { actionsJson: actions },
      });
    }

    if (input.idempotencyKey) {
      const replay = await this.prisma.panicEvent.findFirst({
        where: { tenantId: actor.tenantId, idempotencyKey: input.idempotencyKey },
      });
      if (replay) return { success: true, data: this.serializePanic(replay), reused: true };
    }

    const open = await this.prisma.panicEvent.findFirst({
      where: {
        userId: actor.id,
        isTest: false,
        workflowStatus: { in: ['NEW', 'ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (open && shouldReusePanic(open)) {
      return { success: true, data: this.serializePanic(open), reused: true };
    }

    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    const device = input.devicePublicId
      ? await this.prisma.trustedDevice.findFirst({
          where: { userId: actor.id, publicId: input.devicePublicId },
        })
      : await this.prisma.trustedDevice.findFirst({
          where: { userId: actor.id, isPrimary: true },
        });

    const source = input.source ?? (emergencySessionId ? PanicSource.WEB_EMERGENCY_ACCESS : PanicSource.APP_PANIC);
    const lat = input.lat ?? Number(user?.lastKnownLat ?? -29.8587);
    const lng = input.lng ?? Number(user?.lastKnownLng ?? 31.0218);
    const transmission = input.pendingTransmission ? 'PENDING_TRANSMISSION' : 'SENT';

    const incident =
      input.source === PanicSource.TEST
        ? null
        : await this.kernel.createFromEmergency({
            tenantId: actor.tenantId,
            userId: actor.id,
            type: IncidentType.PANIC,
            title: input.silent ? 'Silent Alert' : source === PanicSource.TEST ? 'Test emergency' : 'Panic Alert',
            lat,
            lng,
            address: 'Client last known location',
            isSilent: input.silent,
            priority: IncidentPriority.CRITICAL,
            source: emergencySessionId ? 'portal' : 'portal',
            actorUserId: actor.id,
            kind: input.silent ? 'silent' : 'panic',
            autoDispatch: source !== PanicSource.TEST,
          });

    const panic = await this.prisma.panicEvent.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        deviceId: device?.id,
        sessionId: emergencySessionId,
        incidentId: incident?.id,
        source,
        workflowStatus: PanicWorkflowStatus.NEW,
        transmissionStatus: transmission,
        idempotencyKey: input.idempotencyKey ?? randomUUID(),
        lat,
        lng,
        locationAccuracy: input.accuracy,
        locationSource: input.locationSource,
        batteryLevel: input.batteryLevel,
        networkStatus: input.networkStatus,
        isTest: source === PanicSource.TEST,
        isSilent: Boolean(input.silent),
        history: {
          create: {
            id: randomUUID(),
            toStatus: 'NEW',
            actorUserId: actor.id,
            actorRole: actor.role,
            note: source === PanicSource.TEST ? 'TEST_EMERGENCY_EVENT' : 'PANIC_ACTIVATED',
          },
        },
      },
    });

    await this.audit(actor, {
      action: source === PanicSource.TEST ? 'TEST_EMERGENCY_EVENT' : source === PanicSource.DURESS ? 'DURESS' : 'PANIC_ACTIVATED',
      accountUserId: actor.id,
      deviceId: device?.id,
      sessionId: emergencySessionId,
      source: String(source),
      ipAddress: ip,
    });

    if (source === PanicSource.TEST) {
      await this.prisma.clientSecuritySettings.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, panicTestedAt: new Date() },
        update: { panicTestedAt: new Date() },
      });
      await this.notify(actor, {
        title: 'Test successful',
        body: 'Your security company successfully received your test alert.',
      });
    } else {
      await this.notify(actor, {
        title: 'Panic alert',
        body: 'Your security company has received your emergency alert.',
      });
    }

    this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.PANIC_CREATED, {
      panicId: panic.id,
      incidentId: incident?.id,
      userId: actor.id,
      source,
      isTest: panic.isTest,
      priority: 'CRITICAL',
    });

    return { success: true, data: this.serializePanic(panic) };
  }

  async cancelPanic(actor: Actor, id: string, reason?: string) {
    const panic = await this.prisma.panicEvent.findFirst({
      where: { id, userId: actor.id, tenantId: actor.tenantId },
    });
    if (!panic) throw new NotFoundException('Panic event not found.');
    const updated = await this.prisma.panicEvent.update({
      where: { id: panic.id },
      data: {
        cancelRequestedAt: new Date(),
        cancellationReason: reason ?? 'Client requested cancellation',
      },
    });
    await this.prisma.panicEventHistory.create({
      data: {
        id: randomUUID(),
        panicEventId: panic.id,
        fromStatus: panic.workflowStatus,
        toStatus: panic.workflowStatus,
        actorUserId: actor.id,
        actorRole: actor.role,
        note: 'Client attempting to cancel Panic.',
      },
    });
    await this.audit(actor, {
      action: 'PANIC_CANCEL_REQUESTED',
      accountUserId: actor.id,
      reason,
    });
    return { success: true, data: this.serializePanic(updated), pendingOperatorAck: true };
  }

  async lockdown(actor: Actor, reason?: string, ip?: string) {
    await this.prisma.securityLockdown.updateMany({
      where: { userId: actor.id, active: true },
      data: { active: false, cancelledAt: new Date() },
    });
    const row = await this.prisma.securityLockdown.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        reason,
        active: true,
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.deviceSession.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit(actor, { action: 'SECURITY_LOCKDOWN', reason, ipAddress: ip });
    this.realtime.emitPlatformEvent(actor.tenantId, PlatformEvent.SECURITY_LOCKDOWN, {
      userId: actor.id,
      lockdownId: row.id,
    });
    await this.notify(actor, {
      title: 'Security lockdown active',
      body: 'Active sessions were revoked. Emergency recovery access is still available.',
    });
    return { success: true, data: row };
  }

  async cancelLockdown(actor: Actor) {
    await this.prisma.securityLockdown.updateMany({
      where: { userId: actor.id, active: true },
      data: { active: false, cancelledAt: new Date() },
    });
    await this.audit(actor, { action: 'SECURITY_LOCKDOWN_CANCELLED' });
    return { success: true, data: { active: false } };
  }

  async recordConsent(actor: Actor, kind: SecurityConsentKind, accepted: boolean, ip?: string, deviceId?: string) {
    if (!accepted) throw new BadRequestException('Consent is required to enable this emergency capability.');
    const row = await this.prisma.securityConsent.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        kind,
        version: CONSENT_VERSION,
        policyVersion: POLICY_VERSION,
        accepted: true,
        ipAddress: ip,
        deviceId,
      },
    });
    await this.audit(actor, { action: 'CONSENT_RECORDED', newState: { kind, version: CONSENT_VERSION } });
    return { success: true, data: row };
  }

  async getStatus(userId: string, tenantId: string) {
    const [devices, contacts, settings, consents, lockdown, panic] = await Promise.all([
      this.prisma.trustedDevice.findMany({ where: { userId, tenantId } }),
      this.prisma.emergencyContact.count({ where: { userId } }),
      this.settings(userId),
      this.prisma.securityConsent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.activeLockdown(userId),
      this.prisma.panicEvent.findFirst({
        where: { userId, isTest: false, workflowStatus: { in: ['NEW', 'ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'] } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const primary = devices.find((d) => d.isPrimary);
    const sos = detectNativeSosFromUserAgent(primary?.userAgent);
    const readiness = emergencyReadinessScore({
      hasPrimary: Boolean(primary && primary.status === 'TRUSTED'),
      locationConfigured: settings.trackingMode !== 'OFF',
      notificationsConfigured: true,
      nativeSosAvailable: sos.status === 'SUPPORTED',
      contactsConfigured: contacts > 0,
      panicTested: Boolean(settings.panicTestedAt),
      consentRecorded: consents.some((c) => c.kind === 'EMERGENCY_SOS' && c.accepted),
    });
    return {
      success: true,
      data: {
        protected: Boolean(primary && !lockdown && primary.status === 'TRUSTED'),
        lockdownActive: Boolean(lockdown),
        primaryDevice: primary ? this.serializeDevice(primary) : null,
        nativeSos: {
          status: sos.status,
          note: sos.note,
        },
        emergencyAccessAvailable: true,
        contactCount: contacts,
        readiness,
        activePanic: panic ? this.serializePanic(panic) : null,
        trackingMode: settings.trackingMode,
        panicHoldMs: settings.panicHoldMs,
        duressEnabled: settings.duressEnabled,
        consentVersion: CONSENT_VERSION,
        policyVersion: POLICY_VERSION,
        disclaimer:
          'Emergency SOS functionality is dependent on the device manufacturer, operating system, device model, operating-system version, permissions and regional availability. Native Emergency SOS may operate independently of this application.',
      },
    };
  }

  async activity(userId: string, tenantId: string) {
    const rows = await this.prisma.securityAuditEvent.findMany({
      where: { tenantId, accountUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: rows };
  }

  async updateSettings(
    userId: string,
    data: { trackingMode?: 'OFF' | 'EMERGENCY_ONLY' | 'CONTINUOUS'; duressEnabled?: boolean; duressPin?: string },
  ) {
    const duressPinHash = data.duressPin ? await bcrypt.hash(data.duressPin, 10) : undefined;
    const row = await this.prisma.clientSecuritySettings.upsert({
      where: { userId },
      create: {
        userId,
        trackingMode: data.trackingMode,
        duressEnabled: data.duressEnabled,
        duressPinHash,
      },
      update: {
        trackingMode: data.trackingMode,
        duressEnabled: data.duressEnabled,
        ...(duressPinHash ? { duressPinHash } : {}),
      },
    });
    return { success: true, data: { ...row, duressPinHash: undefined } };
  }

  async completeSetup(userId: string) {
    await this.prisma.clientSecuritySettings.upsert({
      where: { userId },
      create: { userId, emergencySetupCompletedAt: new Date() },
      update: { emergencySetupCompletedAt: new Date() },
    });
    return { success: true, data: { completed: true } };
  }

  async controlRoomEvents(tenantId: string, type?: string) {
    const rows = await this.prisma.deviceSecurityEvent.findMany({
      where: { tenantId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: { device: true },
    });
    return { success: true, data: rows };
  }

  async controlRoomPanics(tenantId: string) {
    const rows = await this.prisma.panicEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        device: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    return { success: true, data: rows.map((row) => this.serializePanicOps(row)) };
  }

  async transitionPanic(actor: Actor, id: string, toStatus: PanicWorkflowStatus, note?: string) {
    const panic = await this.prisma.panicEvent.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!panic) throw new NotFoundException('Panic event not found.');
    if (!nextPanicWorkflow(panic.workflowStatus, toStatus)) {
      throw new BadRequestException(`Cannot move panic from ${panic.workflowStatus} to ${toStatus}.`);
    }
    const updated = await this.prisma.panicEvent.update({
      where: { id },
      data: {
        workflowStatus: toStatus,
        acknowledgedAt: toStatus === 'ACKNOWLEDGED' ? new Date() : panic.acknowledgedAt,
        acknowledgedByUserId: toStatus === 'ACKNOWLEDGED' ? actor.id : panic.acknowledgedByUserId,
        dispatcherName:
          toStatus === 'ACKNOWLEDGED'
            ? `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() || 'Control room'
            : panic.dispatcherName,
        resolvedAt: toStatus === 'RESOLVED' || toStatus === 'FALSE_ALARM' || toStatus === 'CANCELLED' ? new Date() : panic.resolvedAt,
      },
    });
    await this.prisma.panicEventHistory.create({
      data: {
        id: randomUUID(),
        panicEventId: id,
        fromStatus: panic.workflowStatus,
        toStatus,
        actorUserId: actor.id,
        actorRole: actor.role,
        note,
      },
    });
    await this.audit(actor, {
      action: `PANIC_${toStatus}`,
      accountUserId: panic.userId,
      reason: note,
    });
    if (toStatus === 'ACKNOWLEDGED') {
      await this.prisma.notification.create({
        data: {
          tenantId: actor.tenantId,
          userId: panic.userId,
          type: NotificationType.DEVICE_SECURITY,
          title: 'Control room acknowledged',
          body: 'A security operator is responding to your emergency.',
        },
      });
    }
    if (toStatus === 'RESOLVED') {
      await this.prisma.notification.create({
        data: {
          tenantId: actor.tenantId,
          userId: panic.userId,
          type: NotificationType.DEVICE_SECURITY,
          title: 'Emergency resolved',
          body: 'Your security event has been closed by the control room.',
        },
      });
    }
    return { success: true, data: this.serializePanic(updated) };
  }

  async analytics(tenantId: string) {
    const panics = await this.prisma.panicEvent.findMany({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) } },
    });
    const ackTimes = panics
      .filter((p) => p.acknowledgedAt)
      .map((p) => p.acknowledgedAt!.getTime() - p.createdAt.getTime());
    const resolved = panics.filter((p) => p.resolvedAt);
    return {
      success: true,
      data: {
        events90d: panics.length,
        tests: panics.filter((p) => p.isTest).length,
        falseAlarms: panics.filter((p) => p.workflowStatus === 'FALSE_ALARM').length,
        avgAckMs: ackTimes.length ? Math.round(ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length) : null,
        avgResolveMs: resolved.length
          ? Math.round(
              resolved.reduce((a, p) => a + (p.resolvedAt!.getTime() - p.createdAt.getTime()), 0) / resolved.length,
            )
          : null,
        lostDeviceReports: await this.prisma.trustedDevice.count({
          where: { tenantId, status: { in: ['LOST', 'STOLEN'] } },
        }),
      },
    };
  }

  private serializePanicOps(row: {
    id: string;
    source: PanicSource;
    workflowStatus: PanicWorkflowStatus;
    isTest: boolean;
    isSilent: boolean;
    createdAt: Date;
    lat: Prisma.Decimal | null;
    lng: Prisma.Decimal | null;
    locationAccuracy: number | null;
    transmissionStatus: string;
    incidentId: string | null;
    user: { firstName: string; lastName: string; email: string; phone: string | null };
    device: { name: string; status: TrustedDeviceStatus; isPrimary: boolean } | null;
    history: unknown[];
  }) {
    return {
      id: row.id,
      priority: row.isTest ? 'TEST' : 'P1',
      headline: row.isTest ? 'TEST ALERT — NOT A REAL EMERGENCY' : 'CRITICAL — CLIENT PANIC',
      client: `${row.user.firstName} ${row.user.lastName}`.trim(),
      email: row.user.email,
      phone: row.user.phone,
      source: row.source,
      workflowStatus: row.workflowStatus,
      device: row.device
        ? {
            name: row.device.name,
            status: row.device.isPrimary ? 'PRIMARY / TRUSTED' : row.device.status,
          }
        : null,
      location: row.lat != null && row.lng != null
        ? { lat: Number(row.lat), lng: Number(row.lng), accuracy: row.locationAccuracy }
        : null,
      createdAt: row.createdAt.toISOString(),
      incidentId: row.incidentId,
      transmissionStatus: row.transmissionStatus,
      history: row.history,
    };
  }

  private serializePanic(row: {
    id: string;
    source: PanicSource;
    workflowStatus: PanicWorkflowStatus;
    transmissionStatus: string;
    isTest: boolean;
    isSilent: boolean;
    createdAt: Date;
    incidentId: string | null;
    lat: Prisma.Decimal | null;
    lng: Prisma.Decimal | null;
    locationAccuracy: number | null;
    cancelRequestedAt: Date | null;
  }) {
    return {
      id: row.id,
      source: row.source,
      workflowStatus: row.workflowStatus,
      transmissionStatus: row.transmissionStatus,
      isTest: row.isTest,
      isSilent: row.isSilent,
      incidentId: row.incidentId,
      createdAt: row.createdAt.toISOString(),
      cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
      location:
        row.lat != null && row.lng != null
          ? {
              lat: Number(row.lat),
              lng: Number(row.lng),
              accuracy: row.locationAccuracy,
              label: row.locationAccuracy != null ? `±${Math.round(row.locationAccuracy)}m` : 'Accuracy unknown',
            }
          : null,
      localOnly: row.transmissionStatus === 'PENDING_TRANSMISSION',
    };
  }

  private serializeDevice(
    device: {
      id: string;
      publicId: string;
      name: string;
      deviceType: string;
      osName: string | null;
      osVersion: string | null;
      appVersion: string | null;
      status: TrustedDeviceStatus;
      isPrimary: boolean;
      isLocked: boolean;
      lostReason: DeviceLostReason | null;
      nativeSos: NativeSosCapability;
      nativeSosNote: string | null;
      lastActiveAt: Date | null;
      lastAuthAt: Date | null;
      lastFailedAuthAt: Date | null;
      registeredAt: Date;
      lastLat: Prisma.Decimal | null;
      lastLng: Prisma.Decimal | null;
      lastLocationAccuracy: number | null;
    },
    detailed = false,
  ) {
    const base = {
      id: device.id,
      publicId: device.publicId,
      name: device.name,
      deviceType: device.deviceType,
      osName: device.osName,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      status: device.status,
      isPrimary: device.isPrimary,
      isLocked: device.isLocked,
      lostReason: device.lostReason,
      nativeSos: device.nativeSos,
      lastActiveAt: device.lastActiveAt?.toISOString() ?? null,
      lastActiveLabel: relativeTime(device.lastActiveAt),
      lastAuthAt: device.lastAuthAt?.toISOString() ?? null,
      registeredAt: device.registeredAt.toISOString(),
    };
    if (!detailed) return base;
    return {
      ...base,
      nativeSosNote: device.nativeSosNote,
      lastFailedAuthAt: device.lastFailedAuthAt?.toISOString() ?? null,
      location:
        device.lastLat != null && device.lastLng != null
          ? {
              lat: Number(device.lastLat),
              lng: Number(device.lastLng),
              accuracy: device.lastLocationAccuracy,
            }
          : null,
    };
  }

  private async requireOwnDevice(userId: string, tenantId: string, id: string) {
    const device = await this.prisma.trustedDevice.findFirst({
      where: { tenantId, OR: [{ id }, { publicId: id }], userId },
    });
    if (!device) throw new NotFoundException('Device not found.');
    return device;
  }

  private async markStatus(id: string, status: TrustedDeviceStatus) {
    return this.prisma.trustedDevice.update({
      where: { id },
      data: { status, revokedAt: status === 'REVOKED' ? new Date() : undefined },
    });
  }

  private async revokeSessions(deviceId: string) {
    await this.prisma.deviceSession.updateMany({
      where: { deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async activeLockdown(userId: string) {
    return this.prisma.securityLockdown.findFirst({ where: { userId, active: true } });
  }

  private async settings(userId: string) {
    return (
      (await this.prisma.clientSecuritySettings.findUnique({ where: { userId } })) ?? {
        userId,
        duressEnabled: false,
        panicHoldMs: 3000,
        emergencySessionMinutes: DEFAULT_EMERGENCY_SESSION_MS / 60000,
        trackingMode: 'EMERGENCY_ONLY' as const,
        panicTestedAt: null,
        emergencySetupCompletedAt: null,
      }
    );
  }

  private async audit(
    actor: Actor,
    data: {
      action: string;
      accountUserId?: string;
      deviceId?: string | null;
      sessionId?: string;
      result?: string;
      reason?: string;
      source?: string;
      previousState?: Prisma.InputJsonValue;
      newState?: Prisma.InputJsonValue;
      ipAddress?: string;
    },
  ) {
    await this.prisma.securityAuditEvent.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        actorUserId: actor.id,
        actorRole: actor.role,
        accountUserId: data.accountUserId ?? actor.id,
        deviceId: data.deviceId ?? undefined,
        sessionId: data.sessionId,
        action: data.action,
        result: data.result ?? 'SUCCESS',
        reason: data.reason,
        source: data.source,
        previousState: data.previousState,
        newState: data.newState,
        ipAddress: data.ipAddress,
      },
    });
  }

  private async deviceEvent(actor: Actor, deviceId: string, type: string, payload: Record<string, unknown>) {
    await this.prisma.deviceSecurityEvent.create({
      data: {
        id: randomUUID(),
        tenantId: actor.tenantId,
        userId: actor.id,
        deviceId,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private async notify(actor: Actor, msg: { title: string; body: string }) {
    await this.prisma.notification.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        type: NotificationType.DEVICE_SECURITY,
        priority:
          /panic|duress|lockdown|stolen|lost/i.test(msg.title) || /panic|emergency/i.test(msg.body)
            ? NotificationPriority.P1
            : NotificationPriority.P2,
        title: msg.title,
        body: msg.body,
      },
    });
  }
}

function isBlocked(status: TrustedDeviceStatus) {
  return (
    status === TrustedDeviceStatus.LOST ||
    status === TrustedDeviceStatus.STOLEN ||
    status === TrustedDeviceStatus.REVOKED ||
    status === TrustedDeviceStatus.BLOCKED
  );
}

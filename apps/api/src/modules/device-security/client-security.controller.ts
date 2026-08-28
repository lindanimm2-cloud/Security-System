import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  DeviceLostReason,
  EmergencySessionPurpose,
  PanicSource,
  SecurityConsentKind,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeviceSecurityService } from './device-security.service';

type AuthUser = { id: string; tenantId: string; role: UserRole; firstName?: string; lastName?: string };

@Controller('client/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
export class ClientSecurityController {
  constructor(private readonly security: DeviceSecurityService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.security.getStatus(user.id, user.tenantId);
  }

  @Get('activity')
  activity(@CurrentUser() user: AuthUser) {
    return this.security.activity(user.id, user.tenantId);
  }

  @Get('devices')
  devices(@CurrentUser() user: AuthUser) {
    return this.security.listDevices(user.id, user.tenantId);
  }

  @Get('devices/:id')
  device(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.getDevice(user.id, user.tenantId, id);
  }

  @Post('devices/register')
  register(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @Headers('user-agent') userAgent: string,
    @Req() req: { ip?: string },
  ) {
    return this.security.registerDevice(
      user,
      {
        publicId: str(body.publicId),
        name: str(body.name),
        userAgent: str(body.userAgent) ?? userAgent,
        appVersion: str(body.appVersion),
        makePrimary: Boolean(body.makePrimary),
        trustBrowser: Boolean(body.trustBrowser),
        fingerprint: str(body.fingerprint),
        lat: num(body.lat),
        lng: num(body.lng),
        accuracy: num(body.accuracy),
      },
      req.ip,
    );
  }

  @Post('devices/heartbeat')
  heartbeat(
    @CurrentUser() user: AuthUser,
    @Body() body: { publicId?: string },
    @Headers('user-agent') userAgent: string,
  ) {
    return this.security.heartbeat(user.id, user.tenantId, body?.publicId, userAgent);
  }

  @Post('devices/:id/lock')
  lock(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: { ip?: string }) {
    return this.security.lockDevice(user, id, req.ip);
  }

  @Post('devices/:id/revoke')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: { ip?: string }) {
    return this.security.revokeDevice(user, id, req.ip);
  }

  @Post('devices/:id/report-lost')
  reportLost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: DeviceLostReason },
    @Req() req: { ip?: string },
  ) {
    return this.security.reportLost(user, id, body?.reason ?? DeviceLostReason.LOST, req.ip);
  }

  @Post('devices/:id/report-stolen')
  reportStolen(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: { ip?: string }) {
    return this.security.reportLost(user, id, DeviceLostReason.STOLEN, req.ip);
  }

  @Post('devices/:id/make-primary')
  makePrimary(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: { ip?: string }) {
    return this.security.makePrimary(user, id, req.ip);
  }

  @Delete('devices/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.removeDevice(user, id);
  }

  @Post('devices/:id/replace-primary')
  replace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { newPublicId?: string; name?: string },
    @Headers('user-agent') userAgent: string,
    @Req() req: { ip?: string },
  ) {
    return this.security.replacePrimary(
      user,
      { oldDeviceId: id, newPublicId: body?.newPublicId, userAgent, name: body?.name },
      req.ip,
    );
  }

  @Post('emergency/access')
  emergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: { password?: string; otp?: string; purpose?: EmergencySessionPurpose },
    @Headers('user-agent') userAgent: string,
    @Req() req: { ip?: string },
  ) {
    return this.security.startEmergencyAccess(user, { ...body, userAgent }, req.ip);
  }

  @Post('emergency/session')
  emergencySession(@CurrentUser() user: AuthUser, @Body() body: { token?: string }) {
    return this.security.getEmergencySession(user, body?.token ?? '');
  }

  @Post('emergency/panic')
  panic(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @Req() req: { ip?: string },
  ) {
    return this.security.activatePanic(user, panicBody(body), req.ip);
  }

  @Post('emergency/panic/:id/cancel')
  cancelPanic(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.security.cancelPanic(user, id, body?.reason);
  }

  @Post('emergency/test')
  testPanic(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>, @Req() req: { ip?: string }) {
    return this.security.activatePanic(user, { ...panicBody(body), source: PanicSource.TEST }, req.ip);
  }

  @Post('lockdown')
  lockdown(@CurrentUser() user: AuthUser, @Body() body: { reason?: string }, @Req() req: { ip?: string }) {
    return this.security.lockdown(user, body?.reason, req.ip);
  }

  @Post('lockdown/cancel')
  cancelLockdown(@CurrentUser() user: AuthUser) {
    return this.security.cancelLockdown(user);
  }

  @Post('consent')
  consent(
    @CurrentUser() user: AuthUser,
    @Body() body: { kind?: SecurityConsentKind; accepted?: boolean },
    @Req() req: { ip?: string },
  ) {
    return this.security.recordConsent(
      user,
      body.kind ?? SecurityConsentKind.EMERGENCY_SOS,
      Boolean(body.accepted),
      req.ip,
    );
  }

  @Post('settings')
  settings(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { trackingMode?: 'OFF' | 'EMERGENCY_ONLY' | 'CONTINUOUS'; duressEnabled?: boolean; duressPin?: string },
  ) {
    return this.security.updateSettings(user.id, body);
  }

  @Post('setup/complete')
  completeSetup(@CurrentUser() user: AuthUser) {
    return this.security.completeSetup(user.id);
  }
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function panicBody(body: Record<string, unknown>) {
  return {
    source: typeof body.source === 'string' ? (body.source as PanicSource) : undefined,
    silent: Boolean(body.silent),
    emergencySessionToken: str(body.emergencySessionToken) ?? str(body.token),
    idempotencyKey: str(body.idempotencyKey),
    lat: num(body.lat),
    lng: num(body.lng),
    accuracy: num(body.accuracy),
    locationSource: str(body.locationSource),
    batteryLevel: num(body.batteryLevel),
    networkStatus: str(body.networkStatus),
    pendingTransmission: Boolean(body.pendingTransmission),
    devicePublicId: str(body.devicePublicId),
  };
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SurveillanceService } from '../surveillance/surveillance.service';
import { DeveloperService } from '../developer/developer.service';
import { AddonCode, TierCode } from './plans.catalog';
import { ClientService } from './client.service';
import { LoyaltyService } from './loyalty.service';
import { SubscriptionService } from './subscription.service';

type AuthUser = { id: string; tenantId: string; role: UserRole };

@Controller('client')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly subscriptionService: SubscriptionService,
    private readonly loyaltyService: LoyaltyService,
    private readonly surveillanceService: SurveillanceService,
    private readonly developerService: DeveloperService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.clientService.getDashboard(user.id, user.tenantId);
  }

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.clientService.getOverview(user.id, user.tenantId);
  }

  @Post('panic')
  panic(@CurrentUser() user: AuthUser, @Body() body: { silent?: boolean }) {
    return this.clientService.triggerPanic(user.id, user.tenantId, body?.silent ?? false);
  }

  @Post('panic/cancel')
  cancelPanic(@CurrentUser() user: AuthUser, @Body() body: { reason?: string }) {
    return this.clientService.cancelOpenPanic(user.id, user.tenantId, body?.reason);
  }

  @Post('theft')
  theft(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      description?: string;
      vehicleMake?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      vehiclePlate?: string;
    },
  ) {
    return this.clientService.reportTheft(user.id, user.tenantId, body);
  }

  @Post('service-requests')
  createServiceRequest(
    @CurrentUser() user: AuthUser,
    @Body() body: { kind?: string; details?: Record<string, string | number | boolean> },
  ) {
    return this.clientService.createServiceRequest(user.id, user.tenantId, body);
  }

  @Get('service-requests')
  listServiceRequests(@CurrentUser() user: AuthUser) {
    return this.clientService.listServiceRequests(user.id);
  }

  @Post('tracking')
  tracking(@CurrentUser() user: AuthUser, @Body() body: { lat: number; lng: number }) {
    return this.clientService.updateLocation(user.id, body.lat, body.lng);
  }

  @Get('contacts')
  contacts(@CurrentUser() user: AuthUser) {
    return this.clientService.listContacts(user.id);
  }

  @Post('contacts')
  createContact(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; phone: string; relationship?: string; priority?: number },
  ) {
    return this.clientService.createContact(user.id, user.tenantId, body);
  }

  @Delete('contacts/:id')
  deleteContact(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.deleteContact(user.id, id);
  }

  @Get('incidents')
  incidents(@CurrentUser() user: AuthUser) {
    return this.clientService.listIncidents(user.id);
  }

  @Get('incidents/evidence')
  incidentEvidence(@CurrentUser() user: AuthUser) {
    return this.clientService.getIncidentEvidence(user.id);
  }

  @Get('family')
  family(@CurrentUser() user: AuthUser) {
    return this.clientService.getFamily(user.id);
  }

  @Get('communication-settings')
  communicationSettings(@CurrentUser() user: AuthUser) {
    return this.clientService.getCommunicationSettings(user.id);
  }

  @Patch('communication-settings')
  updateCommunicationSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: { familyMessagingEnabled: boolean },
  ) {
    return this.clientService.updateCommunicationSettings(user.id, body.familyMessagingEnabled);
  }

  @Get('family/messages')
  familyMessages(@CurrentUser() user: AuthUser) {
    return this.clientService.getFamilyMessages(user.id, user.tenantId);
  }

  @Post('family/messages')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendFamilyMessage(
    @CurrentUser() user: AuthUser,
    @Body('content') content: string,
    @Body('lat') lat?: string,
    @Body('lng') lng?: string,
    @Body('replyToId') replyToId?: string,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    const latN = lat != null && lat !== '' ? Number(lat) : NaN;
    const lngN = lng != null && lng !== '' ? Number(lng) : NaN;
    return this.clientService.sendFamilyMessage(
      user.id,
      user.tenantId,
      content ?? '',
      files ?? [],
      Number.isFinite(latN) && Number.isFinite(lngN) ? { lat: latN, lng: lngN } : null,
      replyToId || null,
    );
  }

  @Get('messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.clientService.getMessages(user.id, user.tenantId);
  }

  @Post('messages')
  sendMessage(@CurrentUser() user: AuthUser, @Body() body: { content: string }) {
    return this.clientService.sendMessage(user.id, user.tenantId, body.content);
  }

  @Post('ai')
  ai(@CurrentUser() user: AuthUser, @Body() body: { message: string }) {
    return this.clientService.aiChat(user.id, body.message);
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.clientService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: { phone?: string; trackingEnabled?: boolean; familyMessagingEnabled?: boolean },
  ) {
    return this.clientService.updateProfile(user.id, body);
  }

  @Get('vehicles')
  vehicles(@CurrentUser() user: AuthUser) {
    return this.clientService.getVehicles(user.id);
  }

  @Get('vehicles/:id')
  vehicle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.getVehicle(user.id, id);
  }

  @Get('vehicles/:id/profile')
  vehicleProfile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.getVehicleProfile(user.id, user.tenantId, id);
  }

  @Post('vehicles/:id/tracking/phone')
  enableVehiclePhoneTracking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.clientService.enableVehiclePhoneTracking(
      user.id,
      user.tenantId,
      id,
      body.lat,
      body.lng,
    );
  }

  @Delete('vehicles/:id/tracking/phone')
  disableVehiclePhoneTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.disableVehiclePhoneTracking(user.id, id);
  }

  @Post('vehicles/:id/location')
  updateVehicleLocation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.clientService.updateVehicleLocation(
      user.id,
      user.tenantId,
      id,
      body.lat,
      body.lng,
    );
  }

  @Post('vehicles/:id/theft-recovery')
  theftRecovery(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.activateTheftRecovery(user.id, user.tenantId, id);
  }

  @Post('vehicles/:id/remote')
  vehicleRemote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { action?: string },
  ) {
    return this.clientService.remoteCommand({
      tenantId: user.tenantId,
      vehicleId: id,
      action: body?.action,
      actorUserId: user.id,
      source: 'portal',
      ownerUserId: user.id,
    });
  }

  @Get('properties')
  properties(@CurrentUser() user: AuthUser) {
    return this.clientService.getProperties(user.id);
  }

  @Get('surveillance/sites')
  surveillanceSites(@CurrentUser() user: AuthUser) {
    return this.surveillanceService.listClientSites(user.id, user.tenantId);
  }

  @Get('surveillance/sites/:id')
  surveillanceSite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.surveillanceService.getClientSite(user.id, user.tenantId, id);
  }

  @Get('properties/:id')
  property(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.getProperty(user.id, id);
  }

  @Patch('properties/:id/privacy')
  setCameraPrivacy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { shareInteriorCameras: boolean },
  ) {
    return this.surveillanceService.setInteriorCameraSharing(
      user.id,
      user.tenantId,
      id,
      body?.shareInteriorCameras ?? false,
    );
  }

  @Patch('properties/:id/alarm')
  setAlarm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: 'ARMED' | 'DISARMED' | 'STAY' | 'NIGHT' },
  ) {
    return this.surveillanceService.setArmMode(user.id, user.tenantId, id, body.status);
  }

  @Patch('properties/:id/sensors/:sensorId/bypass')
  bypassSensor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('sensorId') sensorId: string,
    @Body() body: { bypassed: boolean },
  ) {
    return this.surveillanceService.setSensorBypass(
      user.id,
      user.tenantId,
      id,
      sensorId,
      body?.bypassed ?? true,
    );
  }

  @Post('properties/:id/sensors/:sensorId/alert')
  sensorAlert(
    @CurrentUser() user: AuthUser,
    @Param('sensorId') sensorId: string,
  ) {
    return this.surveillanceService.triggerSensorAlert(user.tenantId, sensorId);
  }

  @Post('properties/:id/panic')
  homePanic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.triggerHomePanic(user.id, user.tenantId, id);
  }

  @Post('properties/:id/siren')
  soundSiren(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.surveillanceService.soundOnSiteSiren(
      user.tenantId,
      id,
      user.id,
      'portal',
      user.id,
    );
  }

  @Get('medical')
  medical(@CurrentUser() user: AuthUser) {
    return this.clientService.getMedicalProfile(user.id);
  }

  @Patch('medical')
  updateMedical(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      bloodType?: string;
      allergies?: string;
      medications?: string;
      chronicConditions?: string;
      emergencyNotes?: string;
    },
  ) {
    return this.clientService.updateMedicalProfile(user.id, body);
  }

  @Post('medical/emergency')
  medicalEmergency(@CurrentUser() user: AuthUser) {
    return this.clientService.requestMedicalEmergency(user.id, user.tenantId);
  }

  @Post('fire/emergency')
  fireEmergency(@CurrentUser() user: AuthUser) {
    return this.clientService.requestFireEmergency(user.id, user.tenantId);
  }

  @Get('plans')
  plans(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getPlans(user.id);
  }

  @Get('subscription')
  subscription(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getSubscription(user.id);
  }

  @Get('subscription/access')
  subscriptionAccess(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getAccess(user.id);
  }

  @Post('subscription/checkout')
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() body: { tierCode?: TierCode; addonCode?: AddonCode },
  ) {
    return this.subscriptionService.createCheckout(user.id, user.tenantId, body);
  }

  @Post('subscription/charge-monthly')
  chargeMonthly(
    @CurrentUser() user: AuthUser,
    @Body() body?: { checkoutBase?: string },
  ) {
    return this.subscriptionService.createMonthlyCharge(
      user.id,
      user.tenantId,
      body?.checkoutBase,
    );
  }

  @Get('subscription/billing')
  billing(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getBillingSummary(user.id);
  }

  @Get('subscription/payments')
  payments(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.listPayments(user.id);
  }

  @Post('subscription/confirm')
  confirmPayment(@CurrentUser() user: AuthUser, @Body() body: { reference: string }) {
    return this.subscriptionService.confirmPayment(user.id, body.reference);
  }

  @Get('subscription/payment/:reference')
  payment(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.subscriptionService.getPayment(reference, user.id);
  }

  @Get('loyalty')
  loyalty(@CurrentUser() user: AuthUser) {
    return this.loyaltyService.getLoyalty(user.id);
  }

  @Post('loyalty/promo')
  applyLoyaltyPromo(@CurrentUser() user: AuthUser, @Body() body: { code: string }) {
    return this.loyaltyService.applyPromo(user.id, body.code);
  }

  @Delete('loyalty/promo')
  clearLoyaltyPromo(@CurrentUser() user: AuthUser) {
    return this.loyaltyService.clearPromo(user.id);
  }

  @Get('safe-zones')
  safeZones(@CurrentUser() user: AuthUser) {
    return this.clientService.getSafeZones(user.id);
  }

  @Post('safe-zones')
  createSafeZone(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; lat: number; lng: number; radiusM?: number },
  ) {
    return this.clientService.createSafeZone(user.id, user.tenantId, body);
  }

  @Post('support/error-report')
  submitErrorReport(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { message: string; path?: string; userAgent?: string; context?: string },
  ) {
    return this.developerService.submitErrorReportByUserId(user.id, user.tenantId, body);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthUser) {
    return this.clientService.getNotifications(user.id);
  }

  @Patch('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: AuthUser) {
    return this.clientService.markAllNotificationsRead(user.id);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientService.markNotificationRead(user.id, id);
  }
}

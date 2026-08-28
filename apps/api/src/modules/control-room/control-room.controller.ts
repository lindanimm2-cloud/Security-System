import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  OfficerStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ADMIN_PORTAL_ROLES, OPS_ROLES } from '../../common/developer-access';
import { SurveillanceService } from '../surveillance/surveillance.service';
import { ClientService } from '../client/client.service';
import { ControlRoomService } from './control-room.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('control-room')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_PORTAL_ROLES)
export class ControlRoomController {
  constructor(
    private readonly controlRoomService: ControlRoomService,
    private readonly surveillanceService: SurveillanceService,
    private readonly clientService: ClientService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.getDashboard(user.tenantId);
  }

  @Get('surveillance')
  @Roles(...OPS_ROLES)
  surveillanceOverview(@CurrentUser() user: AuthUser) {
    return this.surveillanceService.controlRoomOverview(user.tenantId);
  }

  @Get('surveillance/sites/:id')
  @Roles(...OPS_ROLES)
  surveillanceSite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.surveillanceService.controlRoomSite(user.tenantId, id);
  }

  @Post('surveillance/events/:id/ack')
  @Roles(...OPS_ROLES)
  ackSurveillanceEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.surveillanceService.acknowledgeEvent(user.tenantId, id, user.id);
  }

  @Post('surveillance/events/:id/resolve')
  @Roles(...OPS_ROLES)
  resolveSurveillanceEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { falseAlarm?: boolean },
  ) {
    return this.surveillanceService.resolveEvent(user.tenantId, id, body?.falseAlarm ?? false);
  }

  @Post('surveillance/events/:id/dispatch')
  @Roles(...OPS_ROLES)
  dispatchSurveillanceEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.surveillanceService.dispatchFromEvent(user.tenantId, id, user.id);
  }

  @Post('surveillance/sensors/:id/trigger')
  @Roles(...OPS_ROLES)
  triggerSensor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { force?: boolean },
  ) {
    return this.surveillanceService.triggerSensorAlert(user.tenantId, id, {
      actorUserId: user.id,
      force: body?.force ?? true,
    });
  }

  @Get('map')
  map(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.getMapData(user.tenantId);
  }

  @Get('incidents')
  incidents(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listIncidents(user.tenantId);
  }

  @Get('incidents/:id')
  incident(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.controlRoomService.getIncident(user.tenantId, id);
  }

  @Post('incidents')
  createIncident(
    @CurrentUser() user: AuthUser,
    @Body()
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
    return this.controlRoomService.createIncident(user.tenantId, {
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    }, body);
  }

  @Post('incidents/:id/reports')
  addReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.controlRoomService.addIncidentReport(
      user.tenantId,
      id,
      { role: user.role, name: `${user.firstName} ${user.lastName}` },
      body.content,
    );
  }

  @Get('clients')
  clients(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listClients(user.tenantId);
  }

  @Get('client-chats')
  @Roles(...OPS_ROLES)
  clientChats(@CurrentUser() user: AuthUser) {
    return this.clientService.listClientSupportThreads(user.tenantId);
  }

  @Get('client-chats/:userId/messages')
  @Roles(...OPS_ROLES)
  clientChatMessages(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.clientService.getClientSupportMessagesForStaff(user.tenantId, userId);
  }

  @Post('client-chats/:userId/messages')
  @Roles(...OPS_ROLES)
  sendClientChatMessage(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: { content: string },
  ) {
    return this.clientService.sendClientSupportReply(user, userId, body.content ?? '');
  }

  @Get('customers')
  customers(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listCustomers(user.tenantId);
  }

  @Get('customers/:userId/subscription')
  customerSubscription(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.controlRoomService.getCustomerSubscription(user.tenantId, userId);
  }

  @Patch('customers/:userId/subscription')
  updateCustomerSubscription(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body()
    body: {
      tierCode?: 'ESSENTIAL' | 'PREMIUM';
      addons?: string[];
      status?: SubscriptionStatus;
      validUntil?: string;
      memberId?: string;
      note?: string;
    },
  ) {
    return this.controlRoomService.updateCustomerSubscription(
      user.tenantId,
      userId,
      body,
      `${user.firstName} ${user.lastName}`,
    );
  }

  @Get('subscription/plans')
  subscriptionPlans() {
    return this.controlRoomService.getSubscriptionCatalog();
  }

  @Get('billing/overview')
  billingOverview(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.getBillingOverview(user.tenantId);
  }

  @Post('billing/run-overdue-check')
  @Roles(
    UserRole.OWNER,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.SALES,
    UserRole.SUPER_ADMIN,
  )
  runOverdueBillingCheck(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.processOverdueBilling(user.tenantId);
  }

  @Post('customers/:userId/charge-monthly')
  @Roles(
    UserRole.OWNER,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.SALES,
    UserRole.SUPER_ADMIN,
  )
  chargeCustomerMonthly(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.controlRoomService.chargeCustomerMonthly(user.tenantId, userId);
  }

  @Get('customers/:userId/loyalty')
  customerLoyalty(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.controlRoomService.getCustomerLoyalty(user.tenantId, userId);
  }

  @Patch('customers/:userId/loyalty')
  updateCustomerLoyalty(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body()
    body: { manualDiscountPercent?: number; notes?: string | null; adjustPoints?: number },
  ) {
    return this.controlRoomService.updateCustomerLoyalty(user.tenantId, userId, body);
  }

  @Get('discount-codes')
  discountCodes(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listDiscountCodes(user.tenantId);
  }

  @Post('discount-codes')
  upsertDiscountCode(
    @CurrentUser() user: AuthUser,
    @Body()
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
    return this.controlRoomService.upsertDiscountCode(user.tenantId, body);
  }

  @Get('dispatches')
  dispatches(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listDispatches(user.tenantId);
  }

  @Patch('incidents/:id')
  updateIncident(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: IncidentStatus },
  ) {
    return this.controlRoomService.updateIncident(user.tenantId, id, body.status);
  }

  @Get('officers')
  officers(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listOfficers(user.tenantId);
  }

  @Post('officers')
  createOfficer(
    @CurrentUser() user: AuthUser,
    @Body() body: { firstName?: string; lastName?: string; zone?: string; avatarUrl?: string | null },
  ) {
    return this.controlRoomService.createOfficer(user.tenantId, body);
  }

  @Patch('officers/:id')
  updateOfficerProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; zone?: string; avatarUrl?: string | null },
  ) {
    return this.controlRoomService.updateOfficerProfile(user.tenantId, id, body);
  }

  @Get('fleet')
  fleet(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listFleet(user.tenantId);
  }

  @Post('fleet')
  createFleet(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      callSign?: string;
      registration?: string;
      make?: string;
      model?: string;
      color?: string;
      vehicleType?: string;
      teamName?: string;
    },
  ) {
    return this.controlRoomService.createFleetVehicle(user.tenantId, body);
  }

  @Patch('fleet/:id')
  updateFleet(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      callSign?: string;
      registration?: string;
      make?: string;
      model?: string;
      color?: string;
      vehicleType?: string;
      teamName?: string;
    },
  ) {
    return this.controlRoomService.updateFleetVehicle(user.tenantId, id, body);
  }

  @Patch('fleet/:id/crew')
  setFleetCrew(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { crew: { officerId: string; role?: 'DRIVER' | 'PASSENGER' | 'SUPERVISOR' }[] },
  ) {
    return this.controlRoomService.setFleetCrew(user.tenantId, id, body.crew ?? []);
  }

  @Patch('officers/:id/status')
  updateOfficer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: OfficerStatus },
  ) {
    return this.controlRoomService.updateOfficerStatus(user.tenantId, id, body.status);
  }

  @Get('dispatch/options/:incidentId')
  dispatchOptions(@CurrentUser() user: AuthUser, @Param('incidentId') incidentId: string) {
    return this.controlRoomService.getDispatchOptions(user.tenantId, incidentId);
  }

  @Post('dispatch/assign')
  assign(
    @CurrentUser() user: AuthUser,
    @Body() body: { incidentId: string; officerId?: string },
  ) {
    return this.controlRoomService.assignDispatch(
      user.tenantId,
      body.incidentId,
      body.officerId,
    );
  }

  @Post('dispatch/emergency-notify')
  emergencyNotify(
    @CurrentUser() user: AuthUser,
    @Body() body: { incidentId: string; reason?: string },
  ) {
    return this.controlRoomService.emergencyNotify(
      user.tenantId,
      body.incidentId,
      `${user.firstName} ${user.lastName}`,
      body.reason,
    );
  }

  @Get('analytics')
  analytics(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.getAnalytics(user.tenantId);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.getNotifications(user.tenantId, user);
  }

  @Patch('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.markAllNotificationsRead(user.tenantId);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.controlRoomService.markNotificationRead(user.tenantId, id);
  }

  @Get('users')
  users(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listUsers(user.tenantId);
  }

  @Post('users')
  createUser(
    @CurrentUser() user: AuthUser,
    @Body()
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
  ) {
    return this.controlRoomService.createUser(user.tenantId, body, {
      role: user.role,
    });
  }

  @Post('users/:id/invite')
  regenerateClientInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.controlRoomService.regenerateClientInvite(user.tenantId, id);
  }

  @Post('customers/:userId/invite')
  regenerateCustomerInvite(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.controlRoomService.regenerateClientInvite(user.tenantId, userId);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
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
  ) {
    return this.controlRoomService.updateUser(user.tenantId, id, body, {
      id: user.id,
      role: user.role,
    });
  }

  @Get('branches')
  branches(@CurrentUser() user: AuthUser) {
    return this.controlRoomService.listBranches(user.tenantId);
  }

  @Post('branches')
  createBranch(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; code: string },
  ) {
    return this.controlRoomService.createBranch(user.tenantId, body);
  }

  @Patch('branches/:id')
  updateBranch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.controlRoomService.updateBranch(user.tenantId, id, body);
  }

  @Post('teams')
  createTeam(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; branchId: string },
  ) {
    return this.controlRoomService.createTeam(user.tenantId, body);
  }

  @Patch('teams/:id')
  updateTeam(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.controlRoomService.updateTeam(user.tenantId, id, body);
  }

  @Post('teams/:id/members')
  addTeamMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { userId: string; isLead?: boolean },
  ) {
    return this.controlRoomService.addTeamMember(
      user.tenantId,
      id,
      body.userId,
      body.isLead,
    );
  }

  @Post('teams/:id/members/:userId/remove')
  removeTeamMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.controlRoomService.removeTeamMember(user.tenantId, id, userId);
  }
}

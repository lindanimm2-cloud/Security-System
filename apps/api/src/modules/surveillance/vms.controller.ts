import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_PORTAL_ROLES, OPS_ROLES } from '../../common/developer-access';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { VmsService } from './vms.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

type Payload = Record<string, unknown>;

/** Control-panel VMS: live tree, playback, exports, camera config, e-map, alarm-video rules, history, ops audit. */
@Controller('control-room')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(...ADMIN_PORTAL_ROLES)
export class VmsController {
  constructor(private readonly vms: VmsService) {}

  @Get('vms/tree')
  @Roles(...OPS_ROLES)
  tree(@CurrentUser() user: AuthUser) {
    return this.vms.tree(user.tenantId);
  }

  @Get('vms/recordings')
  @Roles(...OPS_ROLES)
  recordings(@Query('cameraIds') cameraIds = '', @Query('date') date?: string) {
    return this.vms.recordings(cameraIds.split(',').filter(Boolean).slice(0, 16), date ?? new Date().toISOString().slice(0, 10));
  }

  @Get('vms/exports')
  @Roles(...OPS_ROLES)
  listExports(@CurrentUser() user: AuthUser) {
    return this.vms.listExports(user.tenantId);
  }

  @Post('vms/exports')
  @Roles(...OPS_ROLES)
  createExports(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.createExports(user, body);
  }

  @Post('vms/exports/clear')
  @Roles(...OPS_ROLES)
  clearExports(@CurrentUser() user: AuthUser) {
    return this.vms.clearExports(user.tenantId);
  }

  @Post('vms/exports/bulk')
  @Roles(...OPS_ROLES)
  bulkExports(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.bulkExports(user, String(body.action ?? ''));
  }

  @Post('vms/exports/:id/:action')
  @Roles(...OPS_ROLES)
  exportAction(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('action') action: string) {
    return this.vms.exportAction(user, id, action);
  }

  @Get('vms/cameras/:id/config')
  @Roles(...OPS_ROLES)
  getConfig(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.getConfig(user.tenantId, id);
  }

  @Patch('vms/cameras/:id/config')
  @Roles(...OPS_ROLES)
  patchConfig(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Payload) {
    return this.vms.patchConfig(user, id, body);
  }

  @Get('vms/cameras/:id/schedule')
  @Roles(...OPS_ROLES)
  getSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.getSchedule(user.tenantId, id);
  }

  @Patch('vms/cameras/:id/schedule')
  @Roles(...OPS_ROLES)
  patchSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Payload) {
    return this.vms.patchSchedule(user, id, body);
  }

  @Get('vms/discovery')
  @Roles(...OPS_ROLES)
  discovery() {
    return this.vms.discovery();
  }

  @Post('vms/discovery/add')
  @Roles(...OPS_ROLES)
  discoveryAdd() {
    return this.vms.discoveryAdd();
  }

  @Post('vms/devices')
  @Roles(...OPS_ROLES)
  addDevice(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.addDevice(user, body);
  }

  @Post('vms/devices/:id/test')
  @Roles(...OPS_ROLES)
  testDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.testDevice(user, id);
  }

  @Post('vms/devices/:id/time-sync')
  @Roles(...OPS_ROLES)
  timeSync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.timeSync(user, id);
  }

  @Get('vms/floorplans')
  @Roles(...OPS_ROLES)
  listFloorplans(@CurrentUser() user: AuthUser, @Query('propertyId') propertyId?: string) {
    return this.vms.listFloorplans(user.tenantId, propertyId);
  }

  @Post('vms/floorplans')
  @Roles(...OPS_ROLES)
  createFloorplan(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.createFloorplan(user, body);
  }

  @Patch('vms/floorplans/:id')
  @Roles(...OPS_ROLES)
  patchFloorplan(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Payload) {
    return this.vms.patchFloorplan(user, id, body);
  }

  @Delete('vms/floorplans/:id')
  @Roles(...OPS_ROLES)
  deleteFloorplan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.deleteFloorplan(user, id);
  }

  @Put('vms/floorplans/:id/placements')
  @Roles(...OPS_ROLES)
  putPlacements(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Payload) {
    return this.vms.putPlacements(user, id, body);
  }

  @Get('vms/alarm-rules')
  @Roles(...OPS_ROLES)
  listRules(@CurrentUser() user: AuthUser, @Query('cameraId') cameraId?: string) {
    return this.vms.listRules(user.tenantId, cameraId);
  }

  @Put('vms/alarm-rules')
  @Roles(...OPS_ROLES)
  putRules(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.putRules(user, body);
  }

  @Post('vms/alarm-rules/:id/test')
  @Roles(...OPS_ROLES)
  testRule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.testRule(user, id);
  }

  @Delete('vms/alarm-rules/:id')
  @Roles(...OPS_ROLES)
  deleteRule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vms.deleteRule(user, id);
  }

  @Get('vms/alarm-feed')
  @Roles(...OPS_ROLES)
  alarmFeed(@CurrentUser() user: AuthUser) {
    return this.vms.alarmFeed(user.tenantId);
  }

  @Get('alarm-history')
  @Roles(...OPS_ROLES)
  history(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    return this.vms.history(user.tenantId, query);
  }

  @Post('alarm-history/ack')
  @Roles(...OPS_ROLES)
  ackHistory(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.ackHistory(user, body);
  }

  @Get('ops-audit')
  @Roles(...OPS_ROLES)
  listAudit(@CurrentUser() user: AuthUser, @Query('category') category?: string, @Query('q') q?: string) {
    return this.vms.listAudit(user.tenantId, category, q);
  }

  @Post('ops-audit')
  @Roles(...OPS_ROLES)
  createAudit(@CurrentUser() user: AuthUser, @Body() body: Payload) {
    return this.vms.createAudit(user, body);
  }
}

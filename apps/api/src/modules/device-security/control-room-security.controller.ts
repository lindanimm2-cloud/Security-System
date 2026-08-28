import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PanicWorkflowStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OPS_ROLES } from '../../common/developer-access';
import { PermissionsGuard } from '../incident-kernel/permissions.guard';
import { RequirePermission } from '../incident-kernel/require-permission.decorator';
import { DeviceSecurityService } from './device-security.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('control-room/security')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(...OPS_ROLES)
export class ControlRoomSecurityController {
  constructor(private readonly security: DeviceSecurityService) {}

  @Get('events')
  @RequirePermission('security.devices.view')
  events(@CurrentUser() user: AuthUser, @Query('type') type?: string) {
    return this.security.controlRoomEvents(user.tenantId, type);
  }

  @Get('panic')
  @RequirePermission('security.emergency.view')
  panics(@CurrentUser() user: AuthUser) {
    return this.security.controlRoomPanics(user.tenantId);
  }

  @Post('panic/:id/transition')
  @RequirePermission('security.emergency.acknowledge')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: PanicWorkflowStatus; note?: string },
  ) {
    return this.security.transitionPanic(user, id, body.status ?? PanicWorkflowStatus.ACKNOWLEDGED, body.note);
  }

  @Get('analytics')
  @RequirePermission('security.emergency.view')
  analytics(@CurrentUser() user: AuthUser) {
    return this.security.analytics(user.tenantId);
  }
}

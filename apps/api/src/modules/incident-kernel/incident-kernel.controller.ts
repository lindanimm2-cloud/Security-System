import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ResponseAgency, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IncidentKernelService } from './incident-kernel.service';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentKernelController {
  constructor(private readonly kernel: IncidentKernelService) {}

  @Get(':id')
  @RequirePermission('incidents.view')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kernel.getHydrated(user.tenantId, id, user);
  }

  @Get(':id/timeline')
  @RequirePermission('incidents.view')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kernel.getTimeline(user.tenantId, id, user);
  }

  @Get(':id/resources')
  @RequirePermission('incidents.view')
  resources(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kernel.getResources(user.tenantId, id, user);
  }

  @Get(':id/chat')
  @RequirePermission('comms.incident')
  chat(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kernel.getIncidentConversation(user.tenantId, id, user);
  }

  @Post(':id/chat')
  @RequirePermission('comms.incident')
  sendChat(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.kernel.sendIncidentMessage(user.tenantId, id, user, body.content ?? '');
  }

  @Post(':id/agencies')
  @RequirePermission('incidents.dispatch')
  attachAgency(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { agency: ResponseAgency },
  ) {
    return this.kernel.attachAgency(user.tenantId, id, body.agency, user.id, 'control-room');
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AlertEscalationService } from './alert-escalation.service';

type AuthUser = { id: string; tenantId: string; role: UserRole };

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly escalation: AlertEscalationService) {}

  @Get('escalation-queue')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  queue() {
    return { success: true, data: this.escalation.listQueued() };
  }

  @Post('escalate')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  escalate(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      incidentId: string;
      level?: 'supervisor' | 'manager';
      title?: string;
      body?: string;
    },
  ) {
    return this.escalation.escalateUnackedCritical({
      tenantId: user.tenantId,
      incidentId: body.incidentId,
      level: body.level ?? 'supervisor',
      title: body.title ?? 'Unacknowledged critical alert',
      body: body.body ?? 'Escalation triggered from control room AlertEngine.',
      channels: ['in_app', 'email', 'sms'],
    });
  }
}

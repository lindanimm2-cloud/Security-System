import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ADMIN_PORTAL_ROLES } from '../../common/developer-access';
import { AssuranceService } from './assurance.service';
import type { AssuranceProfileId } from './assurance-profiles';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
};

@Controller('control-room/assurance')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(...ADMIN_PORTAL_ROLES)
export class AssuranceController {
  constructor(private readonly assurance: AssuranceService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.assurance.getOverview(user.tenantId);
  }

  @Patch('profile')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.DEVELOPER)
  setProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: { profile: AssuranceProfileId },
  ) {
    return this.assurance.setProfile(user.tenantId, body.profile, user.id);
  }

  @Get('vulnerabilities')
  listVulns(@CurrentUser() user: AuthUser) {
    return this.assurance.listVulnerabilities(user.tenantId);
  }

  @Post('vulnerabilities')
  createVuln(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      severity?: string;
      description?: string;
      remediation?: string;
      cveId?: string;
      source?: string;
    },
  ) {
    return this.assurance.createVulnerability(user.tenantId, body, user.id);
  }

  @Patch('vulnerabilities/:id')
  updateVuln(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: string; remediation?: string; severity?: string },
  ) {
    return this.assurance.updateVulnerability(user.tenantId, id, body, user.id);
  }

  @Get('siem-export')
  siemExport(
    @CurrentUser() user: AuthUser,
    @Query('hours') hours?: string,
  ) {
    const n = hours ? Number(hours) : 24;
    return this.assurance.exportSiemEvents(user.tenantId, Number.isFinite(n) ? n : 24);
  }

  @Get('incidents/:id/timeline')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assurance.getIncidentTimeline(user.tenantId, id);
  }

  @Post('offline-sync')
  offlineSync(
    @CurrentUser() user: AuthUser,
    @Body() body: { deviceKey: string; cursor?: Record<string, unknown> },
  ) {
    return this.assurance.upsertOfflineCursor(user.tenantId, user.id, body);
  }
}

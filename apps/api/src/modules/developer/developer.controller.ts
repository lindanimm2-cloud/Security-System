import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ErrorReportStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DEVELOPER_CONTACT_ROLES } from '../../common/developer-access';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeveloperService } from './developer.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('developer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post('error-reports')
  @Roles(...DEVELOPER_CONTACT_ROLES)
  submitReport(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { message: string; path?: string; userAgent?: string; context?: string },
  ) {
    return this.developerService.submitErrorReport(user, body);
  }

  @Get('error-reports')
  @Roles(UserRole.DEVELOPER, UserRole.OWNER, UserRole.SUPER_ADMIN)
  listReports(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ErrorReportStatus,
  ) {
    return this.developerService.listReports(user, status);
  }

  @Patch('error-reports/:id')
  @Roles(UserRole.DEVELOPER, UserRole.OWNER, UserRole.SUPER_ADMIN)
  updateReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: ErrorReportStatus },
  ) {
    return this.developerService.updateReportStatus(user, id, body.status);
  }

  @Get('desk')
  @Roles(UserRole.DEVELOPER)
  desk(@CurrentUser() user: AuthUser) {
    return this.developerService.getDesk(user);
  }

  @Patch('revenue-access')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  setRevenueAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: { enabled: boolean },
  ) {
    return this.developerService.setRevenueAccess(user, Boolean(body?.enabled));
  }
}

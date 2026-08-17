import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_PORTAL_ROLES } from '../../common/developer-access';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MedicalService } from './medical.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
};

@Controller('medical')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_PORTAL_ROLES)
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  @Get('queue')
  queue(@CurrentUser() user: AuthUser) {
    return this.medicalService.getQueue(user.tenantId);
  }

  @Get('units')
  units(@CurrentUser() user: AuthUser) {
    return this.medicalService.getUnits(user.tenantId);
  }

  @Patch('tickets/:id')
  updateTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status?: string },
  ) {
    return this.medicalService.updateTicket(user.tenantId, id, body?.status);
  }
}

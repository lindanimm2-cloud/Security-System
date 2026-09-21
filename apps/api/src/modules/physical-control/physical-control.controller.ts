import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AccessCommandType, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PhysicalControlService } from './physical-control.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
};

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhysicalControlController {
  constructor(private readonly physical: PhysicalControlService) {}

  @Get('control-room/access-points')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
    UserRole.OFFICER,
  )
  async listCr(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    const data = await this.physical.listForTenant(user.tenantId, propertyId);
    return { success: true, data };
  }

  @Get('control-room/access-points/:id')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
    UserRole.OFFICER,
  )
  async getCr(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.physical.getPoint(user.tenantId, id);
    return { success: true, data };
  }

  @Get('control-room/access-history')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  async historyCr(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    const data = await this.physical.listLiveAccess(user.tenantId, propertyId);
    return { success: true, data };
  }

  @Post('control-room/access-points/:id/command')
  @Roles(
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
    UserRole.OFFICER,
  )
  async commandCr(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { command: AccessCommandType; confirmedClear?: boolean },
  ) {
    const data = await this.physical.command(user, id, {
      command: body.command,
      confirmedClear: body.confirmedClear,
      source: 'control-room',
    });
    return { success: true, data };
  }

  @Post('control-room/access-points/:id/force-mismatch')
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  async forceMismatch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.physical.reportStateMismatch(user.tenantId, id, 'OPEN', {
      createIncident: true,
    });
    return { success: true, data };
  }

  @Get('client/properties/:propertyId/access-points')
  @Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
  async listClient(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    await this.physical.ensureDemoSeed(user.tenantId, propertyId);
    const data = await this.physical.listForProperty(
      user.tenantId,
      propertyId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Get('client/properties/:propertyId/access-history')
  @Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
  async historyClient(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    const data = await this.physical.listLiveAccess(user.tenantId, propertyId);
    return { success: true, data };
  }

  @Post('client/properties/:propertyId/access-points/:id/command')
  @Roles(UserRole.USER, UserRole.FAMILY_MEMBER)
  async commandClient(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Body() body: { command: AccessCommandType; confirmedClear?: boolean },
  ) {
    const points = await this.physical.listForProperty(
      user.tenantId,
      propertyId,
      user.id,
      user.role,
    );
    if (!points.some((p) => p.id === id)) {
      return { success: false, data: { error: 'Access point not on this property' } };
    }
    const data = await this.physical.command(user, id, {
      command: body.command,
      confirmedClear: body.confirmedClear ?? true,
      source: 'portal',
    });
    return { success: true, data };
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CrashDetectionManager } from './crash/crash-detection.manager';
import { VoiceIntegrationManager } from './voice/voice-integration.manager';

type AuthUser = { id: string; tenantId: string; role: UserRole };

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly voice: VoiceIntegrationManager,
    private readonly crash: CrashDetectionManager,
  ) {}

  /** Platform webhook (signature verification lives in adapters / gateway). */
  @Post('voice/:provider/webhook')
  async voiceWebhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.voice.handleWebhook(provider, body ?? {});
    return { success: result.ok, data: result };
  }

  @Post('voice/command')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.USER,
    UserRole.FAMILY_MEMBER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  async voiceCommand(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    const result = await this.voice.handleWebhook(String(body.platform ?? 'generic'), {
      ...body,
      tenantId: body.tenantId ?? user.tenantId,
      userId: body.userId ?? user.id,
    });
    return { success: result.ok, data: result };
  }

  @Get('voice/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.USER,
    UserRole.FAMILY_MEMBER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
  )
  voiceConfig(@CurrentUser() user: AuthUser) {
    return { success: true, data: this.voice.getConfig(user.tenantId, user.id) };
  }

  @Post('crash/event')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.USER,
    UserRole.FAMILY_MEMBER,
    UserRole.OFFICER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.DEVELOPER,
  )
  async crashEvent(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    const result = await this.crash.handleEvent(String(body.platform ?? 'telematics'), {
      ...body,
      tenantId: body.tenantId ?? user.tenantId,
      userId: body.userId ?? user.id,
    });
    return { success: result.ok, data: result };
  }

  @Post('crash/:provider/webhook')
  async crashWebhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.crash.handleEvent(provider, body ?? {});
    return { success: result.ok, data: result };
  }

  @Get('crash/readiness')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.USER,
    UserRole.FAMILY_MEMBER,
    UserRole.OFFICER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
  )
  crashReadiness(@CurrentUser() user: AuthUser) {
    return { success: true, data: this.crash.getReadiness(user.tenantId, user.id) };
  }
}

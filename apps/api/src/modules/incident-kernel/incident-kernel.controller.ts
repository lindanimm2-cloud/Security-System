import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendChat(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('to') to: string | undefined,
    @Body('saveTo') saveTo: string | undefined,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.kernel.sendIncidentMessage(user.tenantId, id, user, content ?? '', {
      to: to ?? 'room',
      saveTo: saveTo ?? 'chat',
      files: files ?? [],
    });
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

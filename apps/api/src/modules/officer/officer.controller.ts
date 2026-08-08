import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IncidentPriority, IncidentType, OfficerStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OfficerService } from './officer.service';

type AuthUser = { id: string; tenantId: string; role: UserRole; email: string };

@Controller('officer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OFFICER)
export class OfficerController {
  constructor(private readonly officerService: OfficerService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.officerService.getDashboard(user.tenantId, user.email);
  }

  @Get('queue')
  queue(@CurrentUser() user: AuthUser) {
    return this.officerService.getQueue(user.tenantId, user.email);
  }

  @Get('map')
  map(@CurrentUser() user: AuthUser) {
    return this.officerService.getMapData(user.tenantId, user.email);
  }

  @Patch('status')
  updateStatus(@CurrentUser() user: AuthUser, @Body() body: { status: OfficerStatus }) {
    return this.officerService.updateStatus(user.tenantId, user.email, body.status);
  }

  @Post('location')
  updateLocation(@CurrentUser() user: AuthUser, @Body() body: { lat: number; lng: number }) {
    return this.officerService.updateLocation(user.tenantId, user.email, body.lat, body.lng);
  }

  @Post('dispatch/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.officerService.acceptDispatch(user.tenantId, user.email, id);
  }

  @Post('dispatch/:id/en-route')
  enRoute(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.officerService.markEnRoute(user.tenantId, user.email, id);
  }

  @Post('dispatch/:id/on-scene')
  onScene(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.officerService.markOnScene(user.tenantId, user.email, id);
  }

  @Post('dispatch/:id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.officerService.completeDispatch(user.tenantId, user.email, id);
  }

  @Post('backup')
  backup(@CurrentUser() user: AuthUser, @Body() body: { incidentId?: string }) {
    return this.officerService.requestBackup(user.tenantId, user.email, body.incidentId);
  }

  @Post('incidents/:id/volunteer')
  volunteerForIncident(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.officerService.volunteerForIncident(user.tenantId, user.email, id);
  }

  @Get('active-incident')
  activeIncident(@CurrentUser() user: AuthUser) {
    return this.officerService.getActiveIncident(user.tenantId, user.email);
  }

  @Post('evidence')
  saveEvidence(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      fileName: string;
      fileType: string;
      title?: string;
      incidentId?: string;
      dataUrl?: string;
      fileSizeKb?: number;
    },
  ) {
    return this.officerService.saveQuickEvidence(user.tenantId, user.email, body);
  }

  @Get('incidents/assignments')
  reportableIncidents(@CurrentUser() user: AuthUser) {
    return this.officerService.getAssignedIncidentsForReport(user.tenantId, user.email);
  }

  @Post('incidents/:id/report')
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  reportOnIncident(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('content') content: string,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.officerService.reportOnIncident(
      user.tenantId,
      user.email,
      id,
      content ?? '',
      files ?? [],
    );
  }

  @Post('incidents/report')
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  reportFieldIncident(
    @CurrentUser() user: AuthUser,
    @Body('type') type: IncidentType | undefined,
    @Body('priority') priority: IncidentPriority | undefined,
    @Body('title') title: string | undefined,
    @Body('description') description: string,
    @Body('address') address: string | undefined,
    @Body('lat') lat: string | undefined,
    @Body('lng') lng: string | undefined,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.officerService.reportFieldIncident(
      user.tenantId,
      user.email,
      {
        type,
        priority,
        title,
        description: description ?? '',
        address,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      },
      files ?? [],
    );
  }

  @Get('messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.officerService.getMessages(user.id, user.tenantId);
  }

  @Post('messages')
  sendMessage(@CurrentUser() user: AuthUser, @Body() body: { content: string }) {
    return this.officerService.sendMessage(user.id, user.tenantId, body.content);
  }
}

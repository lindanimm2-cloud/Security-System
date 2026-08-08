import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CallChannel, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CallsService } from './calls.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('directory')
  directory(@CurrentUser() user: AuthUser) {
    return this.callsService.getDirectory(user.tenantId, user.role);
  }

  @Get('active')
  active(@CurrentUser() user: AuthUser) {
    return this.callsService.getActiveCall(user);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.callsService.getHistory(user.tenantId);
  }

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      channel: CallChannel;
      targetUserId?: string;
      targetPhone?: string;
      targetName: string;
      targetRole?: string;
      incidentId?: string;
    },
  ) {
    return this.callsService.startCall(user, body);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callsService.acceptCall(user, id);
  }

  @Patch(':id/decline')
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callsService.declineCall(user, id);
  }

  @Patch(':id/end')
  end(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callsService.endCall(user, id);
  }

  @Patch(':id/hold')
  hold(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callsService.toggleHold(user, id);
  }

  @Patch(':id/mute')
  mute(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callsService.toggleMute(user, id);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { content: string; noteType?: 'NOTE' | 'REPORT' },
  ) {
    return this.callsService.addNote(user, id, body.content, body.noteType ?? 'NOTE');
  }
}

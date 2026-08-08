import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChatService } from './chat.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('internal')
  @Roles(
    UserRole.OFFICER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.SALES,
    UserRole.DEVELOPER,
  )
  getInternal(@CurrentUser() user: AuthUser) {
    return this.chatService.getInternalMessages(user.tenantId);
  }

  @Post('internal')
  @Roles(
    UserRole.OFFICER,
    UserRole.DISPATCHER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
    UserRole.TENANT_ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.SALES,
    UserRole.DEVELOPER,
  )
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendInternal(
    @CurrentUser() user: AuthUser,
    @Body('content') content: string,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.chatService.sendInternalMessage(user, content ?? '', files ?? []);
  }

  @Get('dev-support')
  @Roles(
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.SUPERVISOR,
    UserRole.DISPATCHER,
    UserRole.SALES,
    UserRole.TECHNICIAN,
    UserRole.DEVELOPER,
  )
  getDevSupport(@CurrentUser() user: AuthUser) {
    return this.chatService.getDevSupportMessages(user.tenantId);
  }

  @Post('dev-support')
  @Roles(
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.SUPERVISOR,
    UserRole.DISPATCHER,
    UserRole.SALES,
    UserRole.TECHNICIAN,
    UserRole.DEVELOPER,
  )
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendDevSupport(
    @CurrentUser() user: AuthUser,
    @Body('content') content: string,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.chatService.sendDevSupportMessage(user, content ?? '', files ?? []);
  }

  @Get('tech-team')
  @Roles(UserRole.TECHNICIAN)
  getTechTeam(@CurrentUser() user: AuthUser) {
    return this.chatService.getTechTeamMessages(user.id, user.tenantId);
  }

  @Post('tech-team')
  @Roles(UserRole.TECHNICIAN)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendTechTeam(
    @CurrentUser() user: AuthUser,
    @Body('content') content: string,
    @UploadedFiles()
    files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[],
  ) {
    return this.chatService.sendTechTeamMessage(user, content ?? '', files ?? []);
  }
}

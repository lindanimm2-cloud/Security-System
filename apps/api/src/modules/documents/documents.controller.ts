import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentCategory, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsService } from './documents.service';

type AuthUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@Controller('control-room/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.TENANT_ADMIN,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('library')
  library(@CurrentUser() user: AuthUser) {
    return this.documentsService.getLibrary(user.tenantId);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('folderId') folderId?: string,
    @Query('category') category?: DocumentCategory,
    @Query('incidentId') incidentId?: string,
    @Query('search') search?: string,
    @Query('pinned') pinned?: string,
  ) {
    return this.documentsService.listDocuments(user.tenantId, {
      folderId,
      category,
      incidentId,
      search,
      pinnedOnly: pinned === 'true',
    });
  }

  @Get('incidents')
  incidentsForLink(@CurrentUser() user: AuthUser) {
    return this.documentsService.listIncidentsForLink(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getDocument(user.tenantId, id);
  }

  @Post('folders')
  createFolder(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; description?: string; parentId?: string; icon?: string },
  ) {
    return this.documentsService.createFolder(user.tenantId, body);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description?: string;
      category?: DocumentCategory;
      folderId?: string;
      incidentId?: string;
      fileName: string;
      fileType: string;
      fileUrl?: string;
      fileSizeKb?: number;
      tags?: string[];
      isPinned?: boolean;
    },
  ) {
    return this.documentsService.createDocument(
      user.tenantId,
      `${user.firstName} ${user.lastName}`,
      body,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      folderId?: string | null;
      incidentId?: string | null;
      tags?: string[];
      isPinned?: boolean;
    },
  ) {
    return this.documentsService.updateDocument(user.tenantId, id, body);
  }

  @Patch(':id/link-incident')
  linkIncident(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { incidentId: string | null },
  ) {
    return this.documentsService.linkToIncident(user.tenantId, id, body.incidentId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.deleteDocument(user.tenantId, id);
  }
}

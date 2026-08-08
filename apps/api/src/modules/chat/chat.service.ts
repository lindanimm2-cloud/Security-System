import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConversationType, MessageAttachmentKind, UserRole } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type ChatUser = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'chat');

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async getOrCreateDevSupportConversation(tenantId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, type: ConversationType.DEV_SUPPORT },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          subject: 'Developer Support',
          type: ConversationType.DEV_SUPPORT,
        },
      });
    }
    return conversation;
  }

  private async getOrCreateInternalConversation(tenantId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, type: ConversationType.INTERNAL },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          subject: 'Internal Chat',
          type: ConversationType.INTERNAL,
        },
      });
    }
    return conversation;
  }

  private async resolveTechTeam(userId: string, tenantId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId, team: { tenantId, isActive: true } },
      include: { team: true },
    });
    if (!membership) {
      throw new ForbiddenException('You are not assigned to a tech team');
    }
    return membership.team;
  }

  private async getOrCreateTechTeamConversation(
    tenantId: string,
    teamId: string,
    teamName: string,
  ) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, type: ConversationType.TECH_TEAM, teamId },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          teamId,
          subject: `${teamName} — Team Chat`,
          type: ConversationType.TECH_TEAM,
        },
      });
    }
    return conversation;
  }

  private resolveAttachmentKind(mime: string): MessageAttachmentKind {
    if (mime.startsWith('image/')) return MessageAttachmentKind.IMAGE;
    if (mime.startsWith('video/')) return MessageAttachmentKind.VIDEO;
    return MessageAttachmentKind.FILE;
  }

  private formatMessage(message: Awaited<ReturnType<typeof this.loadMessage>>) {
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
      attachments: message.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        kind: a.kind,
      })),
    };
  }

  private async loadMessage(id: string) {
    return this.prisma.message.findUniqueOrThrow({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private async listConversationMessages(
    conversationId: string,
    participantsWhere: {
      tenantId: string;
      role?: UserRole | { in: UserRole[] };
      id?: { in: string[] };
    },
  ) {
    const [messages, participants] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 200,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              phone: true,
              branch: { select: { id: true, name: true, code: true } },
            },
          },
          attachments: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.user.findMany({
        where: { ...participantsWhere, status: 'ACTIVE' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      }),
    ]);

    return {
      conversationId,
      messages: messages.map((m) => this.formatMessage(m)),
      participants,
    };
  }

  async getInternalMessages(tenantId: string) {
    const conversation = await this.getOrCreateInternalConversation(tenantId);
    const data = await this.listConversationMessages(conversation.id, { tenantId });
    return { success: true, data };
  }

  async getTechTeamMessages(userId: string, tenantId: string) {
    const team = await this.resolveTechTeam(userId, tenantId);
    const conversation = await this.getOrCreateTechTeamConversation(
      tenantId,
      team.id,
      team.name,
    );
    const memberIds = (
      await this.prisma.teamMember.findMany({
        where: { teamId: team.id },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const data = await this.listConversationMessages(conversation.id, {
      tenantId,
      id: { in: memberIds },
    });

    return {
      success: true,
      data: {
        ...data,
        team: { id: team.id, name: team.name },
      },
    };
  }

  async getDevSupportMessages(tenantId: string) {
    const conversation = await this.getOrCreateDevSupportConversation(tenantId);
    const data = await this.listConversationMessages(conversation.id, {
      tenantId,
      role: {
        in: [
          UserRole.OWNER,
          UserRole.SUPER_ADMIN,
          UserRole.TENANT_ADMIN,
          UserRole.MANAGER,
          UserRole.SUPERVISOR,
          UserRole.DISPATCHER,
          UserRole.SALES,
          UserRole.TECHNICIAN,
          UserRole.DEVELOPER,
        ],
      },
    });
    return { success: true, data };
  }

  private async persistMessage(
    user: ChatUser,
    conversationId: string,
    content: string,
    files: UploadedFile[],
  ) {
    const trimmed = content?.trim() ?? '';
    if (!trimmed && files.length === 0) {
      throw new BadRequestException('Message must include text or an attachment');
    }

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        throw new BadRequestException(`File "${file.originalname}" exceeds 25 MB limit`);
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderUserId: user.id,
        content:
          trimmed ||
          (files.length === 1
            ? `Sent ${files[0].originalname}`
            : `Sent ${files.length} attachments`),
      },
    });

    if (files.length) {
      const tenantDir = join(UPLOAD_ROOT, user.tenantId);
      await mkdir(tenantDir, { recursive: true });
      const apiBase = process.env.API_PUBLIC_URL ?? 'http://localhost:4010';

      await this.prisma.messageAttachment.createMany({
        data: await Promise.all(
          files.map(async (file) => {
            const safeName = file.originalname.replace(/[^\w.\-()+ ]/g, '_');
            const storedName = `${message.id}-${crypto.randomUUID()}${extname(safeName)}`;
            const diskPath = join(tenantDir, storedName);
            await writeFile(diskPath, file.buffer);
            return {
              messageId: message.id,
              fileName: safeName,
              fileType: file.mimetype,
              fileUrl: `${apiBase}/uploads/chat/${user.tenantId}/${storedName}`,
              fileSize: file.size,
              kind: this.resolveAttachmentKind(file.mimetype),
            };
          }),
        ),
      });
    }

    const full = await this.loadMessage(message.id);
    const payload = this.formatMessage(full);

    this.realtime.emitChatMessage(user.tenantId, {
      ...payload,
      conversationId,
    });

    return { success: true, data: payload };
  }

  async sendInternalMessage(user: ChatUser, content: string, files: UploadedFile[] = []) {
    const conversation = await this.getOrCreateInternalConversation(user.tenantId);
    return this.persistMessage(user, conversation.id, content, files);
  }

  async sendTechTeamMessage(user: ChatUser, content: string, files: UploadedFile[] = []) {
    const team = await this.resolveTechTeam(user.id, user.tenantId);
    const conversation = await this.getOrCreateTechTeamConversation(
      user.tenantId,
      team.id,
      team.name,
    );
    return this.persistMessage(user, conversation.id, content, files);
  }

  async sendDevSupportMessage(user: ChatUser, content: string, files: UploadedFile[] = []) {
    const conversation = await this.getOrCreateDevSupportConversation(user.tenantId);
    return this.persistMessage(user, conversation.id, content, files);
  }
}

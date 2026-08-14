import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CallChannel, CallStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { canContactDeveloper, isDeveloper } from '../../common/developer-access';

type CallUser = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

const CONTROL_ROOM_ROLES: UserRole[] = [
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.TENANT_ADMIN,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
];

function isControlRoomRole(role: UserRole) {
  return CONTROL_ROOM_ROLES.includes(role);
}

type StartCallInput = {
  channel: CallChannel;
  targetUserId?: string;
  targetPhone?: string;
  targetName: string;
  targetRole?: string;
  incidentId?: string;
};

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private formatCall(session: Awaited<ReturnType<typeof this.loadCall>>) {
    return {
      id: session.id,
      channel: session.channel,
      status: session.status,
      targetName: session.targetName,
      targetPhone: session.targetPhone,
      targetRole: session.targetRole,
      targetUserId: session.targetUserId,
      incidentId: session.incidentId,
      isMuted: session.isMuted,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      durationSec: session.durationSec,
      createdAt: session.createdAt.toISOString(),
      initiator: {
        id: session.initiator.id,
        firstName: session.initiator.firstName,
        lastName: session.initiator.lastName,
        role: session.initiator.role,
      },
      target: session.target
        ? {
            id: session.target.id,
            firstName: session.target.firstName,
            lastName: session.target.lastName,
            role: session.target.role,
          }
        : null,
      notes: session.notes.map((n) => ({
        id: n.id,
        content: n.content,
        noteType: n.noteType,
        authorName: n.authorName,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  private async loadCall(id: string, tenantId: string) {
    const session = await this.prisma.callSession.findFirst({
      where: { id, tenantId },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Call not found');
    return session;
  }

  private emitCallEvent(tenantId: string, event: string, payload: Record<string, unknown>) {
    this.realtime.emitCallEvent(tenantId, event, payload);
  }

  async getDirectory(tenantId: string, viewerRole?: UserRole) {
    const [tenant, officers, dispatchers, developers, clients] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { contactPhone: true, name: true },
      }),
      this.prisma.officer.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true, status: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: {
          tenantId,
          role: {
            in: [
              UserRole.DISPATCHER,
              UserRole.SUPERVISOR,
              UserRole.MANAGER,
              UserRole.TENANT_ADMIN,
              UserRole.OWNER,
              UserRole.SUPER_ADMIN,
              UserRole.SALES,
              UserRole.TECHNICIAN,
            ],
          },
          status: 'ACTIVE',
        },
        select: { id: true, firstName: true, lastName: true, role: true, phone: true },
      }),
      this.prisma.user.findMany({
        where: { tenantId, role: UserRole.DEVELOPER, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, phone: true },
      }),
      this.prisma.user.findMany({
        where: { tenantId, role: { in: [UserRole.USER, UserRole.FAMILY_MEMBER] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, phone: true, role: true },
        take: 50,
        orderBy: { firstName: 'asc' },
      }),
    ]);

    const officerUsers = await this.prisma.user.findMany({
      where: { tenantId, email: { in: officers.map((o) => o.email) } },
      select: { id: true, email: true, phone: true },
    });
    const phoneByEmail = new Map(officerUsers.map((u) => [u.email, u]));

    const showDevelopers = !viewerRole || canContactDeveloper(viewerRole);

    return {
      success: true,
      data: {
        dispatchLine: tenant?.contactPhone
          ? { name: `${tenant.name} Dispatch`, phone: tenant.contactPhone }
          : { name: '4DS Dispatch', phone: '+27860000000' },
        officers: officers.map((o) => ({
          officerId: o.id,
          userId: phoneByEmail.get(o.email)?.id ?? null,
          name: `${o.firstName} ${o.lastName}`,
          status: o.status,
          phone: phoneByEmail.get(o.email)?.phone ?? '+27820000000',
        })),
        dispatchers: [
          ...dispatchers,
          ...(showDevelopers ? developers : []),
        ],
        developers: showDevelopers ? developers : [],
        clients,
      },
    };
  }

  async getActiveCall(user: CallUser) {
    const include = {
      initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
      target: { select: { id: true, firstName: true, lastName: true, role: true } },
      notes: { orderBy: { createdAt: 'asc' as const } },
    };

    const own = await this.prisma.callSession.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: [CallStatus.RINGING, CallStatus.CONNECTED, CallStatus.ON_HOLD] },
        OR: [{ initiatorUserId: user.id }, { targetUserId: user.id }],
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
    if (own) {
      return { success: true, data: this.formatCall(own) };
    }

    if (isControlRoomRole(user.role)) {
      const incoming = await this.prisma.callSession.findFirst({
        where: {
          tenantId: user.tenantId,
          channel: CallChannel.DISPATCH_LINE,
          status: CallStatus.RINGING,
        },
        include,
        orderBy: { createdAt: 'desc' },
      });
      if (incoming) {
        return { success: true, data: this.formatCall(incoming) };
      }
    }

    return { success: true, data: null };
  }

  async getHistory(tenantId: string, limit = 30) {
    const sessions = await this.prisma.callSession.findMany({
      where: { tenantId },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, data: sessions.map((s) => this.formatCall(s)) };
  }

  async startCall(user: CallUser, input: StartCallInput) {
    const existing = await this.prisma.callSession.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: [CallStatus.RINGING, CallStatus.CONNECTED, CallStatus.ON_HOLD] },
        OR: [{ initiatorUserId: user.id }, { targetUserId: user.id }],
      },
    });
    if (existing) {
      throw new BadRequestException('You already have an active call');
    }

    if (input.targetUserId || input.targetRole === UserRole.DEVELOPER) {
      let targetRole = input.targetRole as UserRole | undefined;
      if (input.targetUserId) {
        const target = await this.prisma.user.findFirst({
          where: { id: input.targetUserId, tenantId: user.tenantId },
          select: { role: true },
        });
        targetRole = target?.role;
      }
      if (targetRole && isDeveloper(targetRole) && !canContactDeveloper(user.role)) {
        throw new ForbiddenException('Only ops, store, and leadership can call the developer');
      }
      if (isDeveloper(user.role) && targetRole === UserRole.OFFICER) {
        throw new ForbiddenException('Developer calls are limited to ops and store staff');
      }
    }

    const isInternal = input.channel === CallChannel.INTERNAL;
    const isDispatchLine = input.channel === CallChannel.DISPATCH_LINE;
    const isClientCaller =
      user.role === UserRole.USER || user.role === UserRole.FAMILY_MEMBER;

    let targetUserId = input.targetUserId ?? null;
    let targetName = input.targetName;
    let targetRole = input.targetRole ?? null;
    let targetPhone = input.targetPhone ?? null;

    if (isDispatchLine && isClientCaller && !targetUserId) {
      const dispatcher = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          status: 'ACTIVE',
          role: {
            in: [
              UserRole.DISPATCHER,
              UserRole.SUPERVISOR,
              UserRole.MANAGER,
              UserRole.TENANT_ADMIN,
              UserRole.OWNER,
            ],
          },
        },
        select: { id: true, firstName: true, lastName: true, role: true, phone: true },
        orderBy: { role: 'asc' },
      });
      if (dispatcher) {
        targetUserId = dispatcher.id;
        targetName = `${dispatcher.firstName} ${dispatcher.lastName}`;
        targetRole = dispatcher.role;
        targetPhone = dispatcher.phone ?? targetPhone;
      } else {
        targetName = targetName || 'Control room';
        targetRole = targetRole || 'DISPATCH';
      }
    }

    const ringsControlRoom =
      isInternal || (isDispatchLine && (Boolean(targetUserId) || isClientCaller));
    const isExternalApp = input.channel === CallChannel.WHATSAPP;
    const status = ringsControlRoom ? CallStatus.RINGING : CallStatus.CONNECTED;

    const session = await this.prisma.callSession.create({
      data: {
        tenantId: user.tenantId,
        channel: input.channel,
        status,
        initiatorUserId: user.id,
        targetUserId,
        targetPhone,
        targetName,
        targetRole,
        incidentId: input.incidentId ?? null,
        startedAt: ringsControlRoom || isExternalApp ? null : new Date(),
      },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: true,
      },
    });

    const formatted = this.formatCall(session);
    this.emitCallEvent(user.tenantId, 'call:started', formatted);

    if (ringsControlRoom && (targetUserId || isDispatchLine)) {
      this.emitCallEvent(user.tenantId, 'call:incoming', {
        ...formatted,
        recipientUserId: targetUserId,
      });
    }

    return { success: true, data: formatted };
  }

  async acceptCall(user: CallUser, callId: string) {
    const session = await this.loadCall(callId, user.tenantId);
    const opsPickup =
      session.channel === CallChannel.DISPATCH_LINE && isControlRoomRole(user.role);
    if (session.targetUserId !== user.id && !opsPickup) {
      throw new BadRequestException('Only the callee can accept this call');
    }
    if (session.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not ringing');
    }

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: CallStatus.CONNECTED,
        startedAt: new Date(),
        ...(opsPickup && session.targetUserId !== user.id
          ? {
              targetUserId: user.id,
              targetName: `${user.firstName} ${user.lastName}`,
              targetRole: user.role,
            }
          : {}),
      },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });

    const formatted = this.formatCall(updated);
    this.emitCallEvent(user.tenantId, 'call:accepted', formatted);
    return { success: true, data: formatted };
  }

  async declineCall(user: CallUser, callId: string) {
    const session = await this.loadCall(callId, user.tenantId);
    if (session.targetUserId !== user.id && session.initiatorUserId !== user.id) {
      throw new BadRequestException('Not a participant in this call');
    }

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: { status: CallStatus.DECLINED, endedAt: new Date() },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: true,
      },
    });

    const formatted = this.formatCall(updated);
    this.emitCallEvent(user.tenantId, 'call:ended', formatted);
    return { success: true, data: formatted };
  }

  async endCall(user: CallUser, callId: string) {
    const session = await this.loadCall(callId, user.tenantId);
    if (session.initiatorUserId !== user.id && session.targetUserId !== user.id) {
      throw new BadRequestException('Not a participant in this call');
    }
    const terminalStatuses: CallStatus[] = [CallStatus.ENDED, CallStatus.DECLINED, CallStatus.MISSED];
    if (terminalStatuses.includes(session.status)) {
      return { success: true, data: this.formatCall(session) };
    }

    const endedAt = new Date();
    const startedAt = session.startedAt ?? session.createdAt;
    const durationSec = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: { status: CallStatus.ENDED, endedAt, durationSec },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });

    const formatted = this.formatCall(updated);
    this.emitCallEvent(user.tenantId, 'call:ended', formatted);
    return { success: true, data: formatted };
  }

  async toggleHold(user: CallUser, callId: string) {
    const session = await this.loadCall(callId, user.tenantId);
    if (session.initiatorUserId !== user.id && session.targetUserId !== user.id) {
      throw new BadRequestException('Not a participant in this call');
    }

    const newStatus =
      session.status === CallStatus.ON_HOLD ? CallStatus.CONNECTED : CallStatus.ON_HOLD;

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: { status: newStatus },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });

    const formatted = this.formatCall(updated);
    this.emitCallEvent(user.tenantId, 'call:updated', formatted);
    return { success: true, data: formatted };
  }

  async toggleMute(user: CallUser, callId: string) {
    const session = await this.loadCall(callId, user.tenantId);
    if (session.initiatorUserId !== user.id && session.targetUserId !== user.id) {
      throw new BadRequestException('Not a participant in this call');
    }

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: { isMuted: !session.isMuted },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
        target: { select: { id: true, firstName: true, lastName: true, role: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });

    const formatted = this.formatCall(updated);
    this.emitCallEvent(user.tenantId, 'call:updated', formatted);
    return { success: true, data: formatted };
  }

  async addNote(
    user: CallUser,
    callId: string,
    content: string,
    noteType: 'NOTE' | 'REPORT' = 'NOTE',
  ) {
    const session = await this.loadCall(callId, user.tenantId);
    if (session.initiatorUserId !== user.id && session.targetUserId !== user.id) {
      throw new BadRequestException('Not a participant in this call');
    }

    const note = await this.prisma.callNote.create({
      data: {
        callId,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        content,
        noteType,
      },
    });

    if (noteType === 'REPORT' && session.incidentId) {
      await this.prisma.incidentNote.create({
        data: {
          tenantId: user.tenantId,
          incidentId: session.incidentId,
          authorRole: user.role,
          authorName: `${user.firstName} ${user.lastName}`,
          content: `[Call report] ${content}`,
        },
      });
    }

    const payload = {
      callId,
      note: {
        id: note.id,
        content: note.content,
        noteType: note.noteType,
        authorName: note.authorName,
        createdAt: note.createdAt.toISOString(),
      },
    };
    this.emitCallEvent(user.tenantId, 'call:note', payload);

    return { success: true, data: payload };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AlarmStatus,
  ConversationType,
  IncidentPriority,
  IncidentType,
  MessageAttachmentKind,
  NotificationPriority,
  NotificationType,
  CompanyVehicleType,
  PanicSource,
  SensorStatus,
  SensorType,
  UserRole,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { IncidentKernelService } from '../incident-kernel/incident-kernel.service';
import { DeviceSecurityService } from '../device-security/device-security.service';
import { hasCategoryAccess } from './plans.catalog';
import { PlatformEvent } from '../incident-kernel/incident-events';
import {
  clientVehicleDashCams,
  isVehicleRemoteAction,
  type VehicleRemoteAction,
} from './vehicle-remote';

type FamilyUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const FAMILY_CHAT_MAX_FILE_BYTES = 25 * 1024 * 1024;
const FAMILY_CHAT_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'chat');

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly kernel: IncidentKernelService,
    private readonly deviceSecurity: DeviceSecurityService,
  ) {}

  async getDashboard(userId: string, tenantId: string) {
    const [user, contacts, incidents, family, notifications, conversation] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.emergencyContact.count({ where: { userId } }),
        this.prisma.incident.count({
          where: { userId, status: { notIn: ['CLOSED', 'CANCELLED', 'RESOLVED'] } },
        }),
        this.prisma.familyMember.findFirst({
          where: { userId },
          include: {
            family: { include: { members: { include: { user: true } } } },
          },
        }),
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.getOrCreateClientSupportConversation(userId, tenantId),
      ]);

    const familyCount = family?.family.members.length ?? 0;
    const recentIncidents = await this.prisma.incident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      success: true,
      data: {
        user: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          trackingEnabled: user?.trackingEnabled,
          lastLocationAt: user?.lastLocationAt,
          address: user?.lastKnownLat ? 'Morningside, Durban' : null,
        },
        stats: {
          contactCount: contacts,
          familyCount,
          activeIncidents: incidents,
          unreadNotifications: notifications.filter((n) => !n.isRead).length,
        },
        recentActivity: this.buildActivity(user, recentIncidents, notifications),
        contacts: await this.prisma.emergencyContact.findMany({
          where: { userId },
          orderBy: { priority: 'asc' },
        }),
        family: family?.family.members.map((m) => ({
          id: m.user.id,
          name: `${m.user.firstName} ${m.user.lastName}`,
          nickname: m.nickname,
          trackingEnabled: m.user.trackingEnabled,
          lastLocationAt: m.user.lastLocationAt,
        })) ?? [],
        conversationId: conversation.id,
      },
    };
  }

  async getOverview(userId: string, tenantId: string) {
    const dashboard = await this.getDashboard(userId, tenantId);
    const [vehicles, properties, subscription, medical, safeZones, recentIncidents] =
      await Promise.all([
        this.prisma.vehicle.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.property.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.subscription.findUnique({ where: { userId } }),
        this.prisma.medicalProfile.findUnique({ where: { userId } }),
        this.prisma.safeZone.findMany({ where: { userId } }),
        this.prisma.incident.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, type: true, status: true, title: true, createdAt: true, isSilent: true },
        }),
      ]);

    const d = dashboard.data;
    return {
      success: true,
      data: {
        ...d,
        services: {
          personal: d.user.trackingEnabled ? 'active' : 'inactive',
          family: subscription && hasCategoryAccess(subscription.tierCode, subscription.addons, 'family')
            ? (d.stats.familyCount > 0 ? 'protected' : 'setup')
            : 'upgrade',
          vehicle: subscription && hasCategoryAccess(subscription.tierCode, subscription.addons, 'vehicle')
            ? (vehicles.length > 0 ? 'active' : 'setup')
            : 'upgrade',
          home: subscription && hasCategoryAccess(subscription.tierCode, subscription.addons, 'home')
            ? (properties.length > 0 ? 'monitoring' : 'setup')
            : 'upgrade',
          medical: medical ? 'complete' : 'incomplete',
          communications: 'control_only',
        },
        subscription: subscription
          ? {
              planName: subscription.planName,
              tierCode: subscription.tierCode,
              addons: subscription.addons,
              status: subscription.status,
              memberId: subscription.memberId,
              priceMonthly: subscription.priceMonthly,
              validUntil: subscription.validUntil,
            }
          : null,
        vehicles: vehicles.map((v) => ({
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          color: v.color,
          theftRecovery: v.theftRecovery,
          trackerLinked: v.trackerLinked,
          immobiliserOn: v.immobiliserOn,
          doorsLocked: v.doorsLocked,
        })),
        properties: properties.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          alarmStatus: p.alarmStatus,
          alarmLinked: p.alarmLinked,
          camerasLinked: p.camerasLinked,
        })),
        medicalComplete: !!medical?.bloodType,
        safeZoneCount: safeZones.length,
        recentIncidents: recentIncidents.map((i) => ({
          id: i.id,
          type: i.type,
          status: i.status,
          title: i.title,
          isSilent: i.isSilent,
          time: this.timeAgo(i.createdAt),
        })),
        liveResponse: await this.compactLiveResponse(userId, tenantId),
      },
    };
  }

  async triggerPanic(userId: string, tenantId: string, silent = false) {
    return this.deviceSecurity.activatePanic(
      { id: userId, tenantId, role: UserRole.USER },
      { source: PanicSource.APP_PANIC, silent },
    );
  }

  async cancelOpenPanic(userId: string, tenantId: string, reason?: string) {
    const open = await this.prisma.panicEvent.findFirst({
      where: {
        userId,
        tenantId,
        isTest: false,
        workflowStatus: { in: ['NEW', 'ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!open) return { success: true, data: { cancelled: false } };
    return this.deviceSecurity.cancelPanic({ id: userId, tenantId, role: UserRole.USER }, open.id, reason);
  }

  async reportTheft(
    userId: string,
    tenantId: string,
    body: {
      description?: string;
      vehicleMake?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      vehiclePlate?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const vehicle = body.vehiclePlate
      ? await this.prisma.vehicle.findFirst({
          where: { userId, registration: { equals: body.vehiclePlate, mode: 'insensitive' } },
        })
      : await this.prisma.vehicle.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId,
      type: IncidentType.THEFT,
      title: 'Theft Report',
      description: body.description,
      lat: Number(user?.lastKnownLat ?? -29.8587),
      lng: Number(user?.lastKnownLng ?? 28.0567),
      address: 'Berea, Durban',
      priority: IncidentPriority.HIGH,
      vehicleId: vehicle?.id,
      vehicleMake: body.vehicleMake,
      vehicleModel: body.vehicleModel,
      vehicleColor: body.vehicleColor,
      vehiclePlate: body.vehiclePlate,
      source: 'portal',
      actorUserId: userId,
      kind: 'theft',
      autoDispatch: false,
    });
    return { success: true, data: incident };
  }

  async createServiceRequest(
    userId: string,
    tenantId: string,
    body: { kind?: string; details?: Record<string, string | number | boolean> },
  ) {
    const kind = String(body.kind ?? 'escort');
    const details = body.details ?? {};
    const titles: Record<string, string> = {
      'check-in': 'Check-in timer',
      journey: 'Journey monitoring',
      escort: 'Escort request',
      wellness: 'Wellness check',
      roadside: 'Roadside assistance',
      'share-location': 'Live location sharing',
    };
    const title = titles[kind] ?? 'Service request';
    const from = String(details.fromLocation ?? details.location ?? '');
    const to = String(details.toLocation ?? '');
    const address = to ? `${from} → ${to}` : from || 'Client requested location';
    const lines = Object.entries(details)
      .filter(([, value]) => value !== '' && value !== false)
      .map(([key, value]) => `${key}: ${String(value)}`);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId,
      type: IncidentType.OTHER,
      title,
      description: lines.join('\n'),
      lat: Number(user?.lastKnownLat ?? -29.8587),
      lng: Number(user?.lastKnownLng ?? 31.0218),
      address,
      priority: kind === 'escort' || kind === 'roadside' ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
      vehiclePlate: typeof details.vehiclePlate === 'string' ? details.vehiclePlate : undefined,
      source: 'portal',
      actorUserId: userId,
      kind: 'service-request',
      autoDispatch: false,
    });
    return { success: true, data: { id: incident.id, publicRef: incident.publicRef, title } };
  }

  async listServiceRequests(userId: string) {
    const rows = await this.prisma.incident.findMany({
      where: {
        userId,
        type: IncidentType.OTHER,
        title: {
          in: [
            'Check-in timer',
            'Journey monitoring',
            'Escort request',
            'Wellness check',
            'Roadside assistance',
            'Live location sharing',
            'Service request',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        publicRef: row.publicRef,
        kind: row.title ?? 'request',
        title: row.title ?? 'Service request',
        status: row.status,
        whenLabel: this.timeAgo(row.createdAt),
        summary: (row.description ?? row.address ?? '').split('\n')[0] || row.publicRef,
      })),
    };
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastKnownLat: lat,
        lastKnownLng: lng,
        lastLocationAt: new Date(),
      },
    });
    return { success: true, data: { lat, lng, updatedAt: new Date() } };
  }

  private normalizePhoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private phonesMatch(a: string, b: string): boolean {
    const da = this.normalizePhoneDigits(a);
    const db = this.normalizePhoneDigits(b);
    if (!da || !db) return false;
    if (da === db) return true;
    return da.endsWith(db.slice(-9)) || db.endsWith(da.slice(-9));
  }

  async listContacts(userId: string) {
    const [contacts, membership, tenant] = await Promise.all([
      this.prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: { priority: 'asc' },
      }),
      this.prisma.familyMember.findFirst({
        where: { userId },
        include: {
          family: {
            include: {
              members: {
                include: { user: { select: { id: true, phone: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenant: { select: { contactPhone: true, name: true } } },
      }),
    ]);

    const familyUsers =
      membership?.family.members.map((m) => m.user).filter((u) => u.id !== userId) ?? [];

    return {
      success: true,
      data: contacts.map((c) => {
        const linked = familyUsers.find(
          (u) => u.phone && this.phonesMatch(u.phone, c.phone),
        );
        const isDispatch =
          c.relationship?.toLowerCase() === 'security' ||
          c.name.toLowerCase().includes('dispatch') ||
          c.name.toLowerCase().includes('4ds') ||
          (tenant?.tenant.contactPhone
            ? this.phonesMatch(c.phone, tenant.tenant.contactPhone)
            : false);

        return {
          ...c,
          linkedUserId: linked?.id ?? null,
          linkedUserName: linked ? `${linked.firstName} ${linked.lastName}` : null,
          isDispatch,
          canInAppCall: isDispatch || !!linked,
        };
      }),
      meta: {
        dispatchLine: {
          name: `${tenant?.tenant.name ?? '4DS'} Control Room`,
          phone: tenant?.tenant.contactPhone ?? '+27860000000',
        },
      },
    };
  }

  async createContact(
    userId: string,
    tenantId: string,
    data: { name: string; phone: string; relationship?: string; priority?: number },
  ) {
    const contact = await this.prisma.emergencyContact.create({
      data: { userId, tenantId, ...data },
    });
    return { success: true, data: contact };
  }

  async deleteContact(userId: string, id: string) {
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    await this.prisma.emergencyContact.delete({ where: { id } });
    return { success: true, data: null };
  }

  async listIncidents(userId: string) {
    const incidents = await this.prisma.incident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        dispatches: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true },
          take: 1,
        },
        media: true,
      },
    });
    return {
      success: true,
      data: incidents.map(({ dispatches, ...incident }) => ({
        ...incident,
        hasResponse: dispatches.length > 0,
      })),
    };
  }

  async getFamily(userId: string) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        user: { select: { familyMessagingEnabled: true } },
        family: {
          include: {
            members: { include: { user: true } },
            owner: true,
          },
        },
      },
    });
    if (!membership) return { success: true, data: null };
    return {
      success: true,
      data: {
        id: membership.family.id,
        name: membership.family.name,
        owner: `${membership.family.owner.firstName} ${membership.family.owner.lastName}`,
        members: membership.family.members.map((m) => ({
          id: m.user.id,
          name: `${m.user.firstName} ${m.user.lastName}`,
          nickname: m.nickname,
          trackingEnabled: m.user.trackingEnabled,
          familyMessagingEnabled: m.user.familyMessagingEnabled,
          lastLocationAt: m.user.lastLocationAt,
          lat: m.user.lastKnownLat,
          lng: m.user.lastKnownLng,
        })),
        familyMessagingEnabled: membership.user.familyMessagingEnabled,
      },
    };
  }

  async getCommunicationSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyMessagingEnabled: true },
    });
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    familyMessagingEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        familyMessagingEnabled: user?.familyMessagingEnabled ?? false,
        familyId: membership?.family.id ?? null,
        controlRoomAlwaysOn: true,
        eligibleMembers: membership
          ? membership.family.members
              .filter((m) => m.user.familyMessagingEnabled)
              .map((m) => ({
                id: m.user.id,
                name: `${m.user.firstName} ${m.user.lastName}`,
                phone: m.user.phone,
              }))
          : [],
      },
    };
  }

  async updateCommunicationSettings(userId: string, familyMessagingEnabled: boolean) {
    if (familyMessagingEnabled) {
      const membership = await this.prisma.familyMember.findFirst({ where: { userId } });
      if (!membership) {
        throw new BadRequestException(
          'You must be linked to a family group before enabling family messaging.',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { familyMessagingEnabled },
      select: { familyMessagingEnabled: true },
    });

    return { success: true, data: user };
  }

  async getFamilyMessages(userId: string, tenantId: string) {
    const ctx = await this.requireFamilyMessaging(userId);
    const conversation = await this.getOrCreateFamilyConversation(tenantId, ctx.familyId);
    const allowedSenderIds = new Set(ctx.eligibleMemberIds);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        senderUserId: { in: [...allowedSenderIds] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    return {
      success: true,
      data: {
        familyId: ctx.familyId,
        familyMessagingEnabled: true,
        messages: messages.map((message) => this.formatFamilyMessage(message)),
        eligibleMembers: ctx.eligibleMembers,
      },
    };
  }

  async sendFamilyMessage(
    userId: string,
    tenantId: string,
    content: string,
    files: FamilyUpload[] = [],
    location?: { lat: number; lng: number } | null,
    replyToId?: string | null,
  ) {
    const hasLocation =
      location != null && Number.isFinite(location.lat) && Number.isFinite(location.lng);
    let trimmed = content?.trim() ?? '';
    if (hasLocation) {
      trimmed = `📍 Live location\n${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      await this.updateLocation(userId, location.lat, location.lng);
    }
    if (!trimmed && files.length === 0) {
      throw new BadRequestException('Message must include text, an attachment, or a location');
    }

    for (const file of files) {
      if (file.size > FAMILY_CHAT_MAX_FILE_BYTES) {
        throw new BadRequestException(`File "${file.originalname}" exceeds 25 MB limit`);
      }
    }

    const ctx = await this.requireFamilyMessaging(userId);
    const conversation = await this.getOrCreateFamilyConversation(tenantId, ctx.familyId);

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: userId,
        content:
          trimmed ||
          (files.length === 1
            ? `Sent ${files[0].originalname}`
            : `Sent ${files.length} attachments`),
      },
    });

    if (replyToId) {
      const quoted = await this.prisma.message.findFirst({
        where: { id: replyToId, conversationId: conversation.id },
        include: {
          sender: { select: { firstName: true, lastName: true } },
          attachments: { take: 1, orderBy: { createdAt: 'asc' } },
        },
      });
      if (quoted) {
        const wrapped = this.wrapFamilyReplyContent(message.content, {
          id: quoted.id,
          name: `${quoted.sender.firstName} ${quoted.sender.lastName}`.trim(),
          text: this.previewFamilyMessage(quoted.content, quoted.attachments[0]?.kind, quoted.attachments[0]?.fileName),
        });
        await this.prisma.message.update({
          where: { id: message.id },
          data: { content: wrapped },
        });
      }
    }

    if (files.length) {
      const tenantDir = join(FAMILY_CHAT_UPLOAD_ROOT, tenantId);
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
              fileUrl: `${apiBase}/uploads/chat/${tenantId}/${storedName}`,
              fileSize: file.size,
              kind: this.resolveFamilyAttachmentKind(file.mimetype),
            };
          }),
        ),
      });
    }

    const full = await this.prisma.message.findUniqueOrThrow({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    const payload = this.formatFamilyMessage(full);

    this.realtime.emitFamilyChatMessage(tenantId, ctx.familyId, {
      ...payload,
      familyId: ctx.familyId,
    });

    return { success: true, data: payload };
  }

  async getMessages(userId: string, tenantId: string) {
    return this.getClientSupportMessages(userId, tenantId);
  }

  async sendMessage(userId: string, tenantId: string, content: string) {
    return this.sendClientSupportMessage(userId, tenantId, content);
  }

  async getClientSupportMessages(userId: string, tenantId: string) {
    const conversation = await this.getOrCreateClientSupportConversation(userId, tenantId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return {
      success: true,
      data: {
        conversationId: conversation.id,
        clientUserId: userId,
        messages: messages.map((m) => this.formatSupportMessage(m)),
      },
    };
  }

  async sendClientSupportMessage(userId: string, tenantId: string, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('Message cannot be empty');

    const conversation = await this.getOrCreateClientSupportConversation(userId, tenantId);
    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderUserId: userId, content: trimmed },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    const payload = this.formatSupportMessage(message);
    this.realtime.emitClientSupportMessage(tenantId, userId, {
      conversationId: conversation.id,
      ...payload,
    });

    return { success: true, data: payload };
  }

  async listClientSupportThreads(tenantId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenantId, type: ConversationType.SUPPORT, subject: { not: null } },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    const clientIds = conversations
      .map((c) => c.subject)
      .filter((id): id is string => Boolean(id));
    const clients = clientIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: clientIds }, tenantId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        })
      : [];

    const threads = conversations
      .map((conv) => {
        const client = clients.find((c) => c.id === conv.subject) ?? null;
        const last = conv.messages[0] ?? null;
        return {
          clientUserId: conv.subject,
          conversationId: conv.id,
          client,
          lastMessage: last ? this.formatSupportMessage(last) : null,
          updatedAt: (last?.createdAt ?? conv.createdAt).toISOString(),
        };
      })
      .filter((t) => t.client)
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    return { success: true, data: threads };
  }

  async getClientSupportMessagesForStaff(tenantId: string, clientUserId: string) {
    const client = await this.prisma.user.findFirst({
      where: { id: clientUserId, tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] } },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const conversation = await this.getOrCreateClientSupportConversation(
      clientUserId,
      tenantId,
    );
    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return {
      success: true,
      data: {
        conversationId: conversation.id,
        client,
        messages: messages.map((m) => this.formatSupportMessage(m)),
      },
    };
  }

  async sendClientSupportReply(
    staff: { id: string; tenantId: string; firstName: string; lastName: string; role: string },
    clientUserId: string,
    content: string,
  ) {
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('Message cannot be empty');

    const client = await this.prisma.user.findFirst({
      where: {
        id: clientUserId,
        tenantId: staff.tenantId,
        role: { in: ['USER', 'FAMILY_MEMBER'] },
      },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const conversation = await this.getOrCreateClientSupportConversation(
      clientUserId,
      staff.tenantId,
    );
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: staff.id,
        content: trimmed,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    const payload = this.formatSupportMessage(message);
    this.realtime.emitClientSupportMessage(staff.tenantId, clientUserId, {
      conversationId: conversation.id,
      ...payload,
    });

    return { success: true, data: payload };
  }

  async aiChat(_userId: string, _message: string) {
    throw new ForbiddenException('AI assistant is not available for client accounts.');
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        trackingEnabled: true,
        familyMessagingEnabled: true,
        lastLocationAt: true,
        createdAt: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    return {
      success: true,
      data: user
        ? {
            ...user,
            roleLabel: user.role === 'FAMILY_MEMBER' ? 'Family member' : 'Primary subscriber',
          }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    data: { phone?: string; trackingEnabled?: boolean; familyMessagingEnabled?: boolean },
  ) {
    if (data.familyMessagingEnabled === true) {
      const membership = await this.prisma.familyMember.findFirst({ where: { userId } });
      if (!membership) {
        throw new BadRequestException(
          'You must be linked to a family group before enabling family messaging.',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        trackingEnabled: true,
        familyMessagingEnabled: true,
      },
    });
    return { success: true, data: user };
  }

  async getVehicles(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: vehicles };
  }

  async getVehicle(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return { success: true, data: vehicle };
  }

  private vehicleTrackingState(vehicle: {
    trackerLinked: boolean;
    phoneTrackingEnabled: boolean;
    theftRecovery: boolean;
    lastKnownLat: unknown;
    lastKnownLng: unknown;
  }) {
    const hasPosition = vehicle.lastKnownLat != null && vehicle.lastKnownLng != null;
    const mode = vehicle.theftRecovery
      ? 'THEFT_RECOVERY'
      : vehicle.trackerLinked
        ? 'TRACKER'
        : vehicle.phoneTrackingEnabled
          ? 'PHONE'
          : 'OFF';
    const trackingActive =
      hasPosition && (vehicle.theftRecovery || vehicle.trackerLinked || vehicle.phoneTrackingEnabled);
    return { trackingActive, mode, hasPosition };
  }

  private buildVehicleTrail(lat: number, lng: number, seed: string) {
    const points: { lat: number; lng: number; at: string }[] = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
    for (let i = 8; i >= 0; i--) {
      const t = i / 8;
      points.push({
        lat: lat - Math.sin(h + i) * 0.008 * t,
        lng: lng - Math.cos(h * 1.3 + i) * 0.008 * t,
        at: new Date(Date.now() - i * 120_000).toISOString(),
      });
    }
    return points;
  }

  private emitVehiclePosition(tenantId: string, vehicleId: string, lat: number, lng: number) {
    this.realtime.emitPositionUpdates(tenantId, [
      { entityType: 'vehicle', id: vehicleId, lat, lng },
    ]);
  }

  async getVehicleProfile(userId: string, tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const { trackingActive, mode, hasPosition } = this.vehicleTrackingState(vehicle);
    const lat = vehicle.lastKnownLat ? Number(vehicle.lastKnownLat) : null;
    const lng = vehicle.lastKnownLng ? Number(vehicle.lastKnownLng) : null;

    const [alerts, incidents] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          type: { in: [NotificationType.THEFT_ALERT, NotificationType.INCIDENT_UPDATE, NotificationType.PANIC_ALERT] },
          OR: [
            { title: { contains: vehicle.registration, mode: 'insensitive' } },
            { body: { contains: vehicle.registration, mode: 'insensitive' } },
            { type: NotificationType.THEFT_ALERT },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.prisma.incident.findMany({
        where: {
          userId,
          OR: [
            { vehiclePlate: vehicle.registration },
            { title: { contains: vehicle.registration, mode: 'insensitive' } },
            { type: IncidentType.THEFT },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          address: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        vehicle: {
          id: vehicle.id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant,
          year: vehicle.year,
          color: vehicle.color,
          vin: vehicle.vin,
          trackerLinked: vehicle.trackerLinked,
          phoneTrackingEnabled: vehicle.phoneTrackingEnabled,
          theftRecovery: vehicle.theftRecovery,
          immobiliserOn: vehicle.immobiliserOn,
          doorsLocked: vehicle.doorsLocked,
          insuranceInfo: vehicle.insuranceInfo,
          updatedAt: vehicle.updatedAt,
        },
        tracking: {
          active: trackingActive,
          mode,
          hasPosition,
          lat,
          lng,
          lastUpdate: vehicle.updatedAt.toISOString(),
          trail: trackingActive && lat != null && lng != null
            ? this.buildVehicleTrail(lat, lng, vehicle.id)
            : [],
        },
        responseTeam: {
          synced: trackingActive,
        },
        cameras: clientVehicleDashCams(vehicle),
        alerts: alerts.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          body: a.body,
          isRead: a.isRead,
          createdAt: a.createdAt.toISOString(),
        })),
        incidents,
      },
    };
  }

  async enableVehiclePhoneTracking(
    userId: string,
    tenantId: string,
    vehicleId: string,
    lat: number,
    lng: number,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        phoneTrackingEnabled: true,
        lastKnownLat: lat,
        lastKnownLng: lng,
      },
    });

    this.emitVehiclePosition(tenantId, vehicleId, lat, lng);
    return {
      success: true,
      data: {
        ...updated,
        tracking: this.vehicleTrackingState(updated),
      },
    };
  }

  async disableVehiclePhoneTracking(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.theftRecovery) {
      throw new BadRequestException('Cannot stop phone tracking while theft recovery is active');
    }

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { phoneTrackingEnabled: false },
    });
    return { success: true, data: updated };
  }

  async updateVehicleLocation(
    userId: string,
    tenantId: string,
    vehicleId: string,
    lat: number,
    lng: number,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const { trackingActive } = this.vehicleTrackingState(vehicle);
    if (!trackingActive && !vehicle.phoneTrackingEnabled && !vehicle.trackerLinked) {
      throw new BadRequestException('Enable tracking before sharing vehicle location');
    }
    if (!vehicle.phoneTrackingEnabled && !vehicle.trackerLinked && !vehicle.theftRecovery) {
      throw new BadRequestException('Enable tracker or phone tracking first');
    }

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { lastKnownLat: lat, lastKnownLng: lng },
    });

    this.emitVehiclePosition(tenantId, vehicleId, lat, lng);
    return { success: true, data: { lat, lng, updatedAt: updated.updatedAt } };
  }

  async activateTheftRecovery(userId: string, tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { theftRecovery: true, trackerLinked: true },
    });

    if (updated.lastKnownLat != null && updated.lastKnownLng != null) {
      this.emitVehiclePosition(
        tenantId,
        vehicleId,
        Number(updated.lastKnownLat),
        Number(updated.lastKnownLng),
      );
    }

    const result = await this.reportTheft(userId, tenantId, {
      description: `Theft recovery activated for ${vehicle.registration}`,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleColor: vehicle.color ?? undefined,
      vehiclePlate: vehicle.registration,
    });
    return result;
  }

  async remoteCommand(opts: {
    tenantId: string;
    vehicleId: string;
    action: unknown;
    actorUserId: string;
    source: 'portal' | 'control-room';
    ownerUserId?: string;
  }) {
    if (!isVehicleRemoteAction(opts.action)) {
      throw new BadRequestException('Unknown vehicle remote action');
    }
    const action = opts.action;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: opts.vehicleId,
        tenantId: opts.tenantId,
        ...(opts.ownerUserId ? { userId: opts.ownerUserId } : {}),
      },
      include: { user: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const data: {
      doorsLocked?: boolean;
      immobiliserOn?: boolean;
      theftRecovery?: boolean;
      trackerLinked?: boolean;
    } = {};

    if (action === 'lock') data.doorsLocked = true;
    if (action === 'unlock') data.doorsLocked = false;
    if (action === 'immobilise') data.immobiliserOn = true;
    if (action === 'release') data.immobiliserOn = false;
    if (action === 'panic') {
      data.doorsLocked = true;
      data.immobiliserOn = true;
      data.theftRecovery = true;
      data.trackerLinked = true;
    }

    const updated =
      Object.keys(data).length > 0
        ? await this.prisma.vehicle.update({ where: { id: vehicle.id }, data })
        : vehicle;

    let incidentId: string | null = null;
    if (action === 'panic') {
      const lat = Number(updated.lastKnownLat ?? vehicle.user.lastKnownLat ?? -29.8587);
      const lng = Number(updated.lastKnownLng ?? vehicle.user.lastKnownLng ?? 31.0218);
      const incident = await this.kernel.createFromEmergency({
        tenantId: opts.tenantId,
        userId: vehicle.userId,
        type: IncidentType.PANIC,
        title: `Vehicle panic — ${vehicle.registration}`,
        description: `${vehicle.make} ${vehicle.model} · remote panic`,
        lat,
        lng,
        address: `${vehicle.registration} last known`,
        priority: IncidentPriority.CRITICAL,
        vehicleId: vehicle.id,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        vehiclePlate: vehicle.registration,
        source: opts.source,
        actorUserId: opts.actorUserId,
        kind: 'vehicle-panic',
        autoDispatch: true,
      });
      incidentId = incident.id;

      await this.prisma.notification.create({
        data: {
          tenantId: opts.tenantId,
          userId: vehicle.userId,
          incidentId,
          type: NotificationType.PANIC_ALERT,
          priority: NotificationPriority.P0,
          title: `Vehicle panic — ${vehicle.registration}`,
          body: 'Dash cameras switched to this vehicle. Central locking and immobiliser engaged.',
        },
      });
    }

    const snapshot = {
      id: updated.id,
      registration: updated.registration,
      make: updated.make,
      model: updated.model,
      doorsLocked: updated.doorsLocked,
      immobiliserOn: updated.immobiliserOn,
      theftRecovery: updated.theftRecovery,
      trackerLinked: updated.trackerLinked,
      cameras: clientVehicleDashCams(updated),
    };

    this.realtime.emitPlatformEvent(
      opts.tenantId,
      action === 'panic' ? PlatformEvent.VEHICLE_PANIC : PlatformEvent.VEHICLE_REMOTE,
      {
        vehicleId: updated.id,
        registration: updated.registration,
        action,
        source: opts.source,
        incidentId,
        doorsLocked: snapshot.doorsLocked,
        immobiliserOn: snapshot.immobiliserOn,
        theftRecovery: snapshot.theftRecovery,
        owner: `${vehicle.user.firstName} ${vehicle.user.lastName}`,
        cameras: snapshot.cameras,
      },
      { incidentId, userId: vehicle.userId },
    );

    return {
      success: true,
      data: {
        ...snapshot,
        action,
        incidentId,
        hornActive: action === 'horn',
        message: this.remoteActionMessage(action, updated.registration),
      },
    };
  }

  private remoteActionMessage(action: VehicleRemoteAction, registration: string) {
    switch (action) {
      case 'lock':
        return `${registration} doors locked.`;
      case 'unlock':
        return `${registration} doors unlocked.`;
      case 'immobilise':
        return `${registration} immobiliser engaged — starter interrupt when stationary.`;
      case 'release':
        return `${registration} immobiliser released.`;
      case 'horn':
        return `${registration} horn and lights pulsing.`;
      case 'panic':
        return `${registration} vehicle panic sent — control room viewing dash cameras.`;
    }
  }

  async getProperties(userId: string) {
    const properties = await this.prisma.property.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: properties };
  }

  async getProperty(userId: string, id: string) {
    const property = await this.prisma.property.findFirst({ where: { id, userId } });
    if (!property) throw new NotFoundException('Property not found');
    return { success: true, data: property };
  }

  async setAlarmStatus(userId: string, propertyId: string, status: 'ARMED' | 'DISARMED') {
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, userId } });
    if (!property) throw new NotFoundException('Property not found');
    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: { alarmStatus: status },
    });
    return { success: true, data: updated };
  }

  async triggerHomePanic(userId: string, tenantId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, userId } });
    if (!property) throw new NotFoundException('Property not found');

    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId,
      type: IncidentType.PANIC,
      title: `Home Panic — ${property.name}`,
      description: property.address,
      lat: Number(property.lat ?? -29.8587),
      lng: Number(property.lng ?? 31.0218),
      address: property.address,
      priority: IncidentPriority.CRITICAL,
      propertyId,
      source: 'portal',
      actorUserId: userId,
      kind: 'home-panic',
      autoDispatch: true,
    });

    await this.prisma.property.update({
      where: { id: propertyId },
      data: { alarmStatus: AlarmStatus.TRIGGERED },
    });
    await this.prisma.sensor.updateMany({
      where: { propertyId, sensorType: SensorType.SIREN },
      data: { status: SensorStatus.ALARM, lastTriggeredAt: new Date() },
    });

    return { success: true, data: incident };
  }

  async getMedicalProfile(userId: string) {
    let profile = await this.prisma.medicalProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.medicalProfile.create({ data: { userId } });
    }
    const isComplete = this.isMedicalProfileComplete(profile);
    return { success: true, data: { ...profile, isComplete } };
  }

  private isMedicalProfileComplete(profile: {
    bloodType: string | null;
    allergies: string | null;
    medications: string | null;
    chronicConditions: string | null;
    emergencyNotes: string | null;
  }) {
    return Boolean(
      profile.bloodType?.trim() ||
        profile.allergies?.trim() ||
        profile.medications?.trim() ||
        profile.chronicConditions?.trim() ||
        profile.emergencyNotes?.trim(),
    );
  }

  async updateMedicalProfile(
    userId: string,
    data: {
      bloodType?: string;
      allergies?: string;
      medications?: string;
      chronicConditions?: string;
      emergencyNotes?: string;
      doctorContact?: string;
      ambulancePreference?: string;
    },
  ) {
    const profile = await this.prisma.medicalProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return {
      success: true,
      data: { ...profile, isComplete: this.isMedicalProfileComplete(profile) },
    };
  }

  async requestMedicalEmergency(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const medical = await this.prisma.medicalProfile.findUnique({ where: { userId } });
    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId,
      type: IncidentType.MEDICAL,
      title: 'Medical Emergency — Ambulance Requested',
      description: medical
        ? `Ambulance requested. Blood type: ${medical.bloodType ?? 'Unknown'}. Allergies: ${medical.allergies ?? 'None recorded'}. Medications: ${medical.medications ?? 'None recorded'}.`
        : 'Ambulance assistance requested. Medical profile not yet on file.',
      lat: Number(user?.lastKnownLat ?? -29.8587),
      lng: Number(user?.lastKnownLng ?? 31.0218),
      address: user?.lastKnownLat ? 'Last known location' : 'Morningside, Durban',
      priority: IncidentPriority.CRITICAL,
      source: 'portal',
      actorUserId: userId,
      kind: 'medical',
      autoDispatch: true,
      preferredVehicleType: CompanyVehicleType.MEDICAL,
    });
    return { success: true, data: incident };
  }

  async requestFireEmergency(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const incident = await this.kernel.createFromEmergency({
      tenantId,
      userId,
      type: IncidentType.FIRE,
      title: 'Fire Emergency — Fire Response Requested',
      description:
        'Client-reported fire. Dispatch fire response unit and nearest armed response for perimeter support.',
      lat: Number(user?.lastKnownLat ?? -29.8587),
      lng: Number(user?.lastKnownLng ?? 31.0218),
      address: user?.lastKnownLat ? 'Last known location' : 'Morningside, Durban',
      priority: IncidentPriority.CRITICAL,
      source: 'portal',
      actorUserId: userId,
      kind: 'fire',
      autoDispatch: true,
      preferredVehicleType: CompanyVehicleType.FIRE_TRUCK,
    });
    return { success: true, data: incident };
  }

  async getSafeZones(userId: string) {
    const zones = await this.prisma.safeZone.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: zones };
  }

  async createSafeZone(
    userId: string,
    tenantId: string,
    data: { name: string; lat: number; lng: number; radiusM?: number },
  ) {
    const zone = await this.prisma.safeZone.create({
      data: {
        tenantId,
        userId,
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        radiusM: data.radiusM ?? 500,
      },
    });
    return { success: true, data: zone };
  }

  private readonly clientPortalNotificationTypes: NotificationType[] = [
    NotificationType.PANIC_ALERT,
    NotificationType.THEFT_ALERT,
    NotificationType.INCIDENT_UPDATE,
    NotificationType.DISPATCH_ASSIGNED,
    NotificationType.FAMILY_ALERT,
    NotificationType.SYSTEM,
    NotificationType.MESSAGE,
    NotificationType.BILLING,
    NotificationType.DEVICE_SECURITY,
  ];

  private dedupeClientNotifications<
    T extends { type: NotificationType; title: string },
  >(rows: T[]): T[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.type}:${row.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private clientNotificationHref(type: NotificationType, title: string): string {
    switch (type) {
      case NotificationType.PANIC_ALERT:
      case NotificationType.INCIDENT_UPDATE:
      case NotificationType.DISPATCH_ASSIGNED:
        return '/portal/incidents';
      case NotificationType.THEFT_ALERT:
        return '/portal/theft';
      case NotificationType.FAMILY_ALERT:
      case NotificationType.MESSAGE:
        return '/portal/family';
      case NotificationType.BILLING:
        return '/portal/subscription';
      case NotificationType.SYSTEM:
        if (/subscription|plan|billing|payment/i.test(title)) return '/portal/subscription';
        return '/portal/updates';
      case NotificationType.DEVICE_SECURITY:
        return '/portal/security/activity';
      default:
        return '/portal/updates';
    }
  }

  async getNotifications(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyMessagingEnabled: true },
    });

    const allowedTypes = this.clientPortalNotificationTypes.filter((type) => {
      if (type === NotificationType.MESSAGE) return user?.familyMessagingEnabled === true;
      return true;
    });

    const rows = await this.prisma.notification.findMany({
      where: { userId, type: { in: allowedTypes } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const notifications = this.dedupeClientNotifications(rows).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt,
      href: this.clientNotificationHref(n.type, n.title),
    }));

    return {
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      },
    };
  }

  async markNotificationRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true, data: updated };
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, data: { marked: true } };
  }

  async getIncidentEvidence(userId: string) {
    const incidents = await this.prisma.incident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { media: true },
    });
    return {
      success: true,
      data: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        status: i.status,
        createdAt: i.createdAt,
        media: i.media,
      })),
    };
  }

  private formatSupportMessage(message: {
    id: string;
    content: string;
    createdAt: Date;
    sender: { id: string; firstName: string; lastName: string; role: string };
  }) {
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    };
  }

  private async getOrCreateClientSupportConversation(userId: string, tenantId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, type: ConversationType.SUPPORT, subject: userId },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          subject: userId,
          type: ConversationType.SUPPORT,
        },
      });
    }
    return conversation;
  }

  private async getOrCreateFamilyConversation(tenantId: string, familyId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, type: ConversationType.FAMILY, subject: familyId },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          type: ConversationType.FAMILY,
          subject: familyId,
        },
      });
    }
    return conversation;
  }

  private wrapFamilyReplyContent(
    content: string,
    quote: { id: string; name: string; text: string },
  ) {
    const id = quote.id.replace(/[|«»]/g, '');
    const name = quote.name.replace(/[|«»\n]/g, ' ').trim().slice(0, 40);
    const text = quote.text.replace(/[«»]/g, ' ').replace(/\n/g, ' ').trim().slice(0, 80);
    return `«reply:${id}|${name}|${text}»\n${content}`;
  }

  private previewFamilyMessage(
    content: string,
    attachmentKind?: MessageAttachmentKind,
    fileName?: string,
  ) {
    const body = content.replace(/^«reply:[^»]*»\n?/, '').trim();
    if (body.startsWith('📍 Live location')) return 'Live location';
    if (attachmentKind === MessageAttachmentKind.IMAGE) return 'Photo';
    if (attachmentKind === MessageAttachmentKind.VIDEO) return 'Video';
    if (fileName) return fileName;
    if (body.startsWith('Sent ')) return 'Attachment';
    return body.replace(/\s+/g, ' ').slice(0, 80) || 'Message';
  }

  private resolveFamilyAttachmentKind(mime: string): MessageAttachmentKind {
    if (mime.startsWith('image/')) return MessageAttachmentKind.IMAGE;
    if (mime.startsWith('video/')) return MessageAttachmentKind.VIDEO;
    return MessageAttachmentKind.FILE;
  }

  private formatFamilyMessage(message: {
    id: string;
    content: string;
    createdAt: Date;
    sender: { id: string; firstName: string; lastName: string; role: string; phone?: string | null };
    attachments: {
      id: string;
      fileName: string;
      fileType: string;
      fileUrl: string;
      fileSize: number;
      kind: MessageAttachmentKind;
    }[];
  }) {
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

  private async requireFamilyMessaging(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyMessagingEnabled: true },
    });
    if (!user?.familyMessagingEnabled) {
      throw new ForbiddenException(
        'Family messaging is off. Enable it in Family settings to chat with linked family members.',
      );
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    familyMessagingEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!membership) {
      throw new BadRequestException('You are not linked to a family group.');
    }

    const eligibleMembers = membership.family.members
      .filter((m) => m.user.familyMessagingEnabled)
      .map((m) => ({
        id: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        phone: m.user.phone,
      }));

    return {
      familyId: membership.family.id,
      eligibleMemberIds: eligibleMembers.map((m) => m.id),
      eligibleMembers,
    };
  }

  private buildActivity(
    user: { trackingEnabled?: boolean; lastLocationAt?: Date | null } | null,
    incidents: { type: string; status: string; createdAt: Date }[],
    notifications: { title: string; body: string; createdAt: Date }[],
  ) {
    const items: { title: string; detail: string; time: string }[] = [];

    if (user?.lastLocationAt) {
      items.push({
        title: 'Location updated',
        detail: 'GPS tracking active — Morningside',
        time: 'Just now',
      });
    }

    notifications.slice(0, 2).forEach((n) => {
      items.push({ title: n.title, detail: n.body, time: this.timeAgo(n.createdAt) });
    });

    if (incidents.length === 0) {
      items.push({
        title: 'No incidents',
        detail: "You're safe — no recent alerts",
        time: '—',
      });
    } else {
      const latest = incidents[0];
      items.push({
        title: `${latest.type} incident`,
        detail: `Status: ${latest.status}`,
        time: this.timeAgo(latest.createdAt),
      });
    }

    return items.slice(0, 4);
  }

  private async compactLiveResponse(userId: string, tenantId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { userId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!incident) return null;
    const timeline = await this.kernel.getTimeline(tenantId, incident.id, {
      id: userId,
      role: UserRole.USER,
    });
    return {
      id: incident.id,
      publicRef: incident.publicRef,
      type: incident.type,
      status: incident.status,
      events: timeline.data.slice(-3),
    };
  }

  private emitMapIncident(
    tenantId: string,
    incident: {
      id: string;
      type: string;
      priority: string;
      status: string;
      isSilent?: boolean;
      createdAt?: Date;
      lat: { toString(): string };
      lng: { toString(): string };
      address: string | null;
      user: { firstName: string; lastName: string };
    },
  ) {
    this.realtime.emitIncidentCreated(tenantId, {
      id: incident.id,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      name: `${incident.user.firstName} ${incident.user.lastName}`,
      lat: Number(incident.lat),
      lng: Number(incident.lng),
      address: incident.address,
      isSilent: incident.isSilent ?? false,
      createdAt: incident.createdAt?.toISOString(),
    });
  }

  private timeAgo(date: Date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return 'Today';
  }
}

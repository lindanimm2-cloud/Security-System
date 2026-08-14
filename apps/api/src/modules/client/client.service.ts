import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AlarmStatus,
  ConversationType,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  NotificationType,
  CompanyVehicleType,
  CompanyVehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { hasCategoryAccess } from './plans.catalog';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
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
      },
    };
  }

  async triggerPanic(userId: string, tenantId: string, silent = false) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const lat = user?.lastKnownLat ?? -29.8587;
    const lng = user?.lastKnownLng ?? 31.0218;

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId,
        type: IncidentType.PANIC,
        status: IncidentStatus.ACTIVE,
        priority: IncidentPriority.CRITICAL,
        title: silent ? 'Silent Alert' : 'Panic Alert',
        isSilent: silent,
        lat,
        lng,
        address: 'Morningside, Durban',
      },
      include: { user: true },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: NotificationType.PANIC_ALERT,
        title: silent ? 'Silent alert sent' : 'Panic alert sent',
        body: silent
          ? 'Control room notified discreetly. No visible alert on device.'
          : 'Dispatch has been notified. Help is on the way.',
      },
    });

    const officer = await this.prisma.officer.findFirst({
      where: { tenantId, status: 'AVAILABLE', isActive: true },
    });

    if (officer) {
      await this.prisma.dispatch.create({
        data: {
          tenantId,
          incidentId: incident.id,
          officerId: officer.id,
          status: 'ASSIGNED',
        },
      });
      await this.prisma.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.DISPATCHED },
      });
      await this.prisma.officer.update({
        where: { id: officer.id },
        data: { status: 'EN_ROUTE' },
      });
    }

    this.emitMapIncident(tenantId, incident);

    return { success: true, data: incident };
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
    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId,
        type: IncidentType.THEFT,
        status: IncidentStatus.ACTIVE,
        priority: IncidentPriority.HIGH,
        title: 'Theft Report',
        description: body.description,
        lat: user?.lastKnownLat ?? -29.8587,
        lng: user?.lastKnownLng ?? 28.0567,
        address: 'Berea, Durban',
        vehicleMake: body.vehicleMake,
        vehicleModel: body.vehicleModel,
        vehicleColor: body.vehicleColor,
        vehiclePlate: body.vehiclePlate,
      },
      include: { user: true },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: NotificationType.THEFT_ALERT,
        title: 'Theft reported',
        body: 'Your theft report has been logged. Recovery mode activated.',
      },
    });

    this.emitMapIncident(tenantId, incident);

    return { success: true, data: incident };
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
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return {
      success: true,
      data: {
        familyId: ctx.familyId,
        familyMessagingEnabled: true,
        messages,
        eligibleMembers: ctx.eligibleMembers,
      },
    };
  }

  async sendFamilyMessage(userId: string, tenantId: string, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('Message cannot be empty');

    const ctx = await this.requireFamilyMessaging(userId);
    const conversation = await this.getOrCreateFamilyConversation(tenantId, ctx.familyId);

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderUserId: userId, content: trimmed },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    this.realtime.emitFamilyChatMessage(tenantId, ctx.familyId, {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    });

    return { success: true, data: message };
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

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId,
        type: IncidentType.PANIC,
        status: IncidentStatus.ACTIVE,
        priority: IncidentPriority.CRITICAL,
        title: `Home Panic — ${property.name}`,
        description: property.address,
        lat: -29.8587,
        lng: 31.0218,
        address: property.address,
      },
      include: { user: true },
    });

    await this.prisma.property.update({
      where: { id: propertyId },
      data: { alarmStatus: AlarmStatus.TRIGGERED },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: NotificationType.PANIC_ALERT,
        title: 'Home panic activated',
        body: `Emergency response dispatched for ${property.name}. Interior cameras unlocked for responders.`,
      },
    });

    this.emitMapIncident(tenantId, incident);
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
    const lat = user?.lastKnownLat ?? -29.8587;
    const lng = user?.lastKnownLng ?? 31.0218;

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId,
        type: IncidentType.MEDICAL,
        status: IncidentStatus.ACTIVE,
        priority: IncidentPriority.CRITICAL,
        title: 'Medical Emergency — Ambulance Requested',
        description: medical
          ? `Ambulance requested. Blood type: ${medical.bloodType ?? 'Unknown'}. Allergies: ${medical.allergies ?? 'None recorded'}. Medications: ${medical.medications ?? 'None recorded'}.`
          : 'Ambulance assistance requested. Medical profile not yet on file.',
        lat,
        lng,
        address: user?.lastKnownLat ? 'Last known location' : 'Morningside, Durban',
      },
      include: { user: true },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: NotificationType.INCIDENT_UPDATE,
        title: 'Ambulance requested',
        body: 'Medical emergency dispatched. Ambulance and nearest response unit notified.',
      },
    });

    const ambulance = await this.prisma.companyVehicle.findFirst({
      where: {
        tenantId,
        vehicleType: CompanyVehicleType.MEDICAL,
        status: { in: [CompanyVehicleStatus.AVAILABLE, CompanyVehicleStatus.DEPLOYED] },
      },
      include: { crew: true },
      orderBy: { status: 'asc' },
    });

    const officer =
      ambulance?.crew[0]?.officerId
        ? await this.prisma.officer.findFirst({
            where: { id: ambulance.crew[0].officerId, tenantId, isActive: true },
          })
        : await this.prisma.officer.findFirst({
            where: { tenantId, status: 'AVAILABLE', isActive: true },
            orderBy: { avgResponseSec: 'asc' },
          });

    if (officer) {
      await this.prisma.dispatch.create({
        data: {
          tenantId,
          incidentId: incident.id,
          officerId: officer.id,
          status: 'ASSIGNED',
        },
      });
      await this.prisma.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.DISPATCHED },
      });
      await this.prisma.officer.update({
        where: { id: officer.id },
        data: { status: 'EN_ROUTE' },
      });
      if (ambulance) {
        await this.prisma.companyVehicle.update({
          where: { id: ambulance.id },
          data: { status: CompanyVehicleStatus.EN_ROUTE },
        });
      }
    }

    this.emitMapIncident(tenantId, incident);
    return { success: true, data: incident };
  }

  async requestFireEmergency(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const lat = user?.lastKnownLat ?? -29.8587;
    const lng = user?.lastKnownLng ?? 31.0218;

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId,
        type: IncidentType.FIRE,
        status: IncidentStatus.ACTIVE,
        priority: IncidentPriority.CRITICAL,
        title: 'Fire Emergency — Fire Response Requested',
        description:
          'Client-reported fire. Dispatch fire response unit and nearest armed response for perimeter support.',
        lat,
        lng,
        address: user?.lastKnownLat ? 'Last known location' : 'Morningside, Durban',
      },
      include: { user: true },
    });

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: NotificationType.INCIDENT_UPDATE,
        title: 'Fire response requested',
        body: 'Fire emergency dispatched. Fire unit and nearest response team notified.',
      },
    });

    const fireUnit = await this.prisma.companyVehicle.findFirst({
      where: {
        tenantId,
        vehicleType: CompanyVehicleType.FIRE_TRUCK,
        status: { in: [CompanyVehicleStatus.AVAILABLE, CompanyVehicleStatus.DEPLOYED] },
      },
      include: { crew: true },
    });

    const officer =
      fireUnit?.crew[0]?.officerId
        ? await this.prisma.officer.findFirst({
            where: { id: fireUnit.crew[0].officerId, tenantId, isActive: true },
          })
        : await this.prisma.officer.findFirst({
            where: { tenantId, status: 'AVAILABLE', isActive: true },
            orderBy: { avgResponseSec: 'asc' },
          });

    if (officer) {
      await this.prisma.dispatch.create({
        data: {
          tenantId,
          incidentId: incident.id,
          officerId: officer.id,
          status: 'ASSIGNED',
        },
      });
      await this.prisma.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.DISPATCHED },
      });
      await this.prisma.officer.update({
        where: { id: officer.id },
        data: { status: 'EN_ROUTE' },
      });
      if (fireUnit) {
        await this.prisma.companyVehicle.update({
          where: { id: fireUnit.id },
          data: { status: CompanyVehicleStatus.EN_ROUTE },
        });
      }
    }

    this.emitMapIncident(tenantId, incident);
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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  saveIncidentMedia,
  type UploadedFile,
} from '../../common/upload/incident-media.util';
import {
  DispatchStatus,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  NotificationType,
  OfficerStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  haversineKm,
  officerAvailableMarker,
  volunteerNoteCutoff,
} from '../../common/officer-volunteer.util';

@Injectable()
export class OfficerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async resolveOfficer(tenantId: string, email: string) {
    const officer = await this.prisma.officer.findFirst({
      where: { tenantId, email: email.toLowerCase(), isActive: true },
    });
    if (!officer) throw new NotFoundException('Officer record not found');
    return officer;
  }

  async getDashboard(tenantId: string, email: string) {
    const officer = await this.resolveOfficer(tenantId, email);

    const [activeDispatches, completedToday] = await Promise.all([
      this.prisma.dispatch.findMany({
        where: {
          officerId: officer.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          incident: {
            include: { user: { select: { firstName: true, lastName: true, phone: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispatch.count({
        where: {
          officerId: officer.id,
          status: 'COMPLETED',
          updatedAt: { gte: startOfToday() },
        },
      }),
    ]);

    const active = activeDispatches[0] ?? null;

    return {
      success: true,
      data: {
        officer: {
          id: officer.id,
          firstName: officer.firstName,
          lastName: officer.lastName,
          email: officer.email,
          status: officer.status,
          zone: officer.zone,
          avgResponseSec: officer.avgResponseSec,
          lat: officer.currentLat ? Number(officer.currentLat) : null,
          lng: officer.currentLng ? Number(officer.currentLng) : null,
        },
        stats: {
          activeAssignments: activeDispatches.length,
          completedToday,
          avgResponseFormatted: formatResponse(officer.avgResponseSec),
        },
        activeDispatch: active
          ? this.formatDispatch(active)
          : null,
        queue: activeDispatches.map((d) => this.formatDispatch(d)),
      },
    };
  }

  async getQueue(tenantId: string, email: string) {
    const officer = await this.resolveOfficer(tenantId, email);

    const [assigned, available, volunteerNotes] = await Promise.all([
      this.prisma.dispatch.findMany({
        where: {
          officerId: officer.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          incident: {
            include: { user: { select: { firstName: true, lastName: true, phone: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.incident.findMany({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'DISPATCHED'] },
          dispatches: { none: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
        },
        include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.incidentNote.findMany({
        where: {
          tenantId,
          content: { startsWith: officerAvailableMarker(officer.id) },
          createdAt: { gte: volunteerNoteCutoff() },
        },
        select: { incidentId: true },
      }),
    ]);

    const volunteeredIds = new Set(volunteerNotes.map((n) => n.incidentId));

    return {
      success: true,
      data: {
        assigned: assigned.map((d) => this.formatDispatch(d)),
        unassigned: available.map((i) => ({
          id: i.id,
          type: i.type,
          priority: i.priority,
          status: i.status,
          title: i.title,
          address: i.address,
          lat: Number(i.lat),
          lng: Number(i.lng),
          client: `${i.user.firstName} ${i.user.lastName}`,
          phone: i.user.phone,
          createdAt: i.createdAt,
          volunteered: volunteeredIds.has(i.id),
        })),
      },
    };
  }

  async volunteerForIncident(tenantId: string, email: string, incidentId: string) {
    const officer = await this.resolveOfficer(tenantId, email);

    const activeDispatch = await this.prisma.dispatch.findFirst({
      where: {
        officerId: officer.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });
    if (activeDispatch) {
      throw new BadRequestException(
        'Finish your current assignment before volunteering for another incident.',
      );
    }

    const incident = await this.prisma.incident.findFirst({
      where: {
        id: incidentId,
        tenantId,
        status: { in: ['ACTIVE', 'DISPATCHED'] },
      },
      include: {
        user: true,
        dispatches: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          take: 1,
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.dispatches.length > 0) {
      throw new BadRequestException('This incident already has an assigned officer.');
    }

    const marker = officerAvailableMarker(officer.id);
    const recent = await this.prisma.incidentNote.findFirst({
      where: {
        incidentId,
        content: { startsWith: marker },
        createdAt: { gte: volunteerNoteCutoff() },
      },
    });
    if (recent) {
      return {
        success: true,
        data: {
          volunteered: true,
          alreadyVolunteered: true,
          message: 'Control room already notified.',
        },
      };
    }

    const ilat = Number(incident.lat);
    const ilng = Number(incident.lng);
    const hasPosition = officer.currentLat != null && officer.currentLng != null;
    const distanceKm = hasPosition
      ? haversineKm(ilat, ilng, Number(officer.currentLat), Number(officer.currentLng))
      : null;
    const distanceText =
      distanceKm != null ? ` Approx. ${distanceKm.toFixed(1)} km away.` : '';
    const officerName = `${officer.firstName} ${officer.lastName}`;
    const location = incident.address ?? 'incident location';

    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: 'OFFICER',
        authorName: officerName,
        content: `${marker} ${officerName} signalled availability — ready to respond.${distanceText}`,
      },
    });

    const dispatchers = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: {
          in: [
            UserRole.DISPATCHER,
            UserRole.SUPERVISOR,
            UserRole.MANAGER,
            UserRole.TENANT_ADMIN,
            UserRole.OWNER,
            UserRole.SUPER_ADMIN,
          ],
        },
      },
      select: { id: true },
    });

    const notifyBody = `${officerName} is available for ${incident.type.replace(/_/g, ' ')} at ${location}.${distanceText}`;

    for (const d of dispatchers) {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId: d.id,
          type: NotificationType.INCIDENT_UPDATE,
          title: 'Officer available for incident',
          body: notifyBody,
        },
      });
      this.realtime.emitNotification(tenantId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        incidentId,
        officerId: officer.id,
        officerName,
      });
    }

    return {
      success: true,
      data: {
        volunteered: true,
        message: 'Control room notified — dispatch can assign you to this incident.',
      },
    };
  }

  async updateStatus(tenantId: string, email: string, status: OfficerStatus) {
    const officer = await this.resolveOfficer(tenantId, email);
    const updated = await this.prisma.officer.update({
      where: { id: officer.id },
      data: { status },
    });
    return { success: true, data: updated };
  }

  async updateLocation(tenantId: string, email: string, lat: number, lng: number) {
    const officer = await this.resolveOfficer(tenantId, email);
    const updated = await this.prisma.officer.update({
      where: { id: officer.id },
      data: { currentLat: lat, currentLng: lng },
    });
    return { success: true, data: updated };
  }

  async acceptDispatch(tenantId: string, email: string, dispatchId: string) {
    return this.advanceDispatch(tenantId, email, dispatchId, 'ACCEPTED', 'DISPATCHED', 'EN_ROUTE');
  }

  async markEnRoute(tenantId: string, email: string, dispatchId: string) {
    return this.advanceDispatch(tenantId, email, dispatchId, 'EN_ROUTE', 'EN_ROUTE', 'EN_ROUTE');
  }

  async markOnScene(tenantId: string, email: string, dispatchId: string) {
    return this.advanceDispatch(tenantId, email, dispatchId, 'ON_SCENE', 'ON_SCENE', 'BUSY');
  }

  async completeDispatch(tenantId: string, email: string, dispatchId: string) {
    const officer = await this.resolveOfficer(tenantId, email);
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id: dispatchId, officerId: officer.id, tenantId },
      include: { incident: true },
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.dispatch.update({
        where: { id: dispatchId },
        data: { status: 'COMPLETED' },
        include: { incident: { include: { user: true } } },
      }),
      this.prisma.incident.update({
        where: { id: dispatch.incidentId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      }),
      this.prisma.officer.update({
        where: { id: officer.id },
        data: { status: 'AVAILABLE' },
      }),
    ]);

    return { success: true, data: this.formatDispatch(updated) };
  }

  async reportOnIncident(
    tenantId: string,
    email: string,
    incidentId: string,
    content: string,
    files: UploadedFile[] = [],
  ) {
    const trimmed = content?.trim() ?? '';
    if (!trimmed && files.length === 0) {
      throw new BadRequestException('Report must include details or at least one attachment');
    }

    const officer = await this.resolveOfficer(tenantId, email);
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const noteBody =
      trimmed ||
      (files.length === 1
        ? `Attached evidence: ${files[0].originalname}`
        : `Attached ${files.length} evidence files`);

    const note = await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: 'OFFICER',
        authorName: `${officer.firstName} ${officer.lastName}`,
        content: noteBody,
      },
    });

    const media = await saveIncidentMedia(this.prisma, tenantId, incidentId, files);

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: incident.userId,
        type: NotificationType.INCIDENT_UPDATE,
        title: 'Officer field report',
        body: `${officer.firstName} ${officer.lastName}: ${noteBody.slice(0, 120)}${media.length ? ` (+${media.length} file${media.length > 1 ? 's' : ''})` : ''}`,
      },
    });

    const dispatchers = await this.prisma.user.findMany({
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
            ],
          },
        },
      take: 3,
    });
    for (const d of dispatchers) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: d.id,
          type: NotificationType.INCIDENT_UPDATE,
          title: 'Officer incident report',
          body: `${officer.firstName} ${officer.lastName} reported on ${incident.type}`,
        },
      });
    }

    return {
      success: true,
      data: {
        id: note.id,
        incidentId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        media,
      },
    };
  }

  async reportFieldIncident(
    tenantId: string,
    email: string,
    body: {
      type?: IncidentType;
      priority?: IncidentPriority;
      title?: string;
      description: string;
      address?: string;
      lat?: number;
      lng?: number;
    },
    files: UploadedFile[] = [],
  ) {
    const trimmed = body.description?.trim() ?? '';
    if (!trimmed && files.length === 0) {
      throw new BadRequestException('Report must include details or at least one attachment');
    }
    const officer = await this.resolveOfficer(tenantId, email);
    const client = await this.prisma.user.findFirst({
      where: { tenantId, role: 'USER', status: 'ACTIVE' },
    });
    if (!client) throw new NotFoundException('No client record for incident linkage');

    const lat =
      body.lat ??
      (officer.currentLat ? Number(officer.currentLat) : -29.8587);
    const lng =
      body.lng ??
      (officer.currentLng ? Number(officer.currentLng) : 31.0218);

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        userId: client.id,
        type: body.type ?? IncidentType.OTHER,
        status: IncidentStatus.ACTIVE,
        priority: body.priority ?? IncidentPriority.MEDIUM,
        title: body.title ?? 'Officer field report',
        description:
          trimmed ||
          (files.length === 1
            ? `Field evidence: ${files[0].originalname}`
            : `Field evidence: ${files.length} attachments`),
        lat,
        lng,
        address: body.address ?? officer.zone ?? 'Field location',
      },
      include: { user: true },
    });

    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId: incident.id,
        authorRole: 'OFFICER',
        authorName: `${officer.firstName} ${officer.lastName}`,
        content:
          trimmed ||
          (files.length === 1
            ? `Attached: ${files[0].originalname}`
            : `Attached ${files.length} files`),
      },
    });

    const media = await saveIncidentMedia(this.prisma, tenantId, incident.id, files);

    this.realtime.emitIncidentCreated(tenantId, {
      id: incident.id,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      name: `${incident.user.firstName} ${incident.user.lastName}`,
      lat: Number(incident.lat),
      lng: Number(incident.lng),
      address: incident.address,
      isSilent: false,
      createdAt: incident.createdAt.toISOString(),
    });

    return {
      success: true,
      data: {
        id: incident.id,
        type: incident.type,
        status: incident.status,
        address: incident.address,
        media,
      },
    };
  }

  async getActiveIncident(tenantId: string, email: string) {
    const officer = await this.resolveOfficer(tenantId, email);
    const dispatch = await this.prisma.dispatch.findFirst({
      where: {
        officerId: officer.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        incident: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!dispatch) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        incidentId: dispatch.incident.id,
        type: dispatch.incident.type,
        status: dispatch.incident.status,
        client: `${dispatch.incident.user.firstName} ${dispatch.incident.user.lastName}`,
        address: dispatch.incident.address,
      },
    };
  }

  async saveQuickEvidence(
    tenantId: string,
    email: string,
    body: {
      fileName: string;
      fileType: string;
      title?: string;
      incidentId?: string;
      dataUrl?: string;
      fileSizeKb?: number;
    },
  ) {
    const officer = await this.resolveOfficer(tenantId, email);
    let incidentId = body.incidentId;

    if (!incidentId) {
      const dispatch = await this.prisma.dispatch.findFirst({
        where: {
          officerId: officer.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      incidentId = dispatch?.incidentId;
    }

    const isVideo = body.fileType.startsWith('video/');
    const fileUrl =
      body.dataUrl && !isVideo
        ? body.dataUrl
        : `/uploads/evidence/${tenantId}/${body.fileName}`;

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        incidentId: incidentId ?? null,
        category: 'INCIDENT_EVIDENCE',
        title: body.title ?? `Quick capture — ${body.fileName}`,
        description: `Field evidence recorded by ${officer.firstName} ${officer.lastName}`,
        fileName: body.fileName,
        fileType: body.fileType,
        fileUrl,
        fileSizeKb: body.fileSizeKb,
        tags: ['quick-record', 'officer', isVideo ? 'video' : 'photo'],
        uploadedBy: `${officer.firstName} ${officer.lastName}`,
        isPinned: !!incidentId,
      },
    });

    if (incidentId) {
      await this.prisma.incidentMedia.create({
        data: {
          incidentId,
          fileName: body.fileName,
          fileType: body.fileType,
          fileUrl,
        },
      });

      await this.prisma.incidentNote.create({
        data: {
          tenantId,
          incidentId,
          authorRole: 'OFFICER',
          authorName: `${officer.firstName} ${officer.lastName}`,
          content: `Quick evidence captured: ${body.fileName}`,
        },
      });
    }

    const dispatchers = await this.prisma.user.findMany({
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
            ],
          },
        },
      take: 3,
    });
    for (const d of dispatchers) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: d.id,
          type: NotificationType.INCIDENT_UPDATE,
          title: 'Officer evidence uploaded',
          body: `${officer.firstName} ${officer.lastName} saved ${body.fileName}`,
        },
      });
    }

    return {
      success: true,
      data: {
        documentId: doc.id,
        incidentId,
        fileUrl: doc.fileUrl,
      },
    };
  }

  async getAssignedIncidentsForReport(tenantId: string, email: string) {
    const officer = await this.resolveOfficer(tenantId, email);
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        officerId: officer.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: { incident: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: dispatches.map((d) => ({
        dispatchId: d.id,
        incidentId: d.incident.id,
        type: d.incident.type,
        status: d.incident.status,
        title: d.incident.title,
        address: d.incident.address,
      })),
    };
  }

  async requestBackup(tenantId: string, email: string, incidentId?: string) {
    const officer = await this.resolveOfficer(tenantId, email);
    const dispatchers = await this.prisma.user.findMany({
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
            ],
          },
        },
      take: 1,
    });

    if (dispatchers[0]) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: dispatchers[0].id,
          type: 'SYSTEM',
          title: 'Backup requested',
          body: `${officer.firstName} ${officer.lastName} requested additional units${incidentId ? ` for incident ${incidentId.slice(0, 8)}` : ''}.`,
        },
      });
    }

    return {
      success: true,
      data: { message: 'Backup request sent to control room.' },
    };
  }

  async getMessages(userId: string, tenantId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, subject: 'Officer Dispatch' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { tenantId, subject: 'Officer Dispatch' },
      });
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    return { success: true, data: { conversationId: conversation.id, messages } };
  }

  async sendMessage(userId: string, tenantId: string, content: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, subject: 'Officer Dispatch' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { tenantId, subject: 'Officer Dispatch' },
      });
    }

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderUserId: userId, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    return { success: true, data: message };
  }

  async getMapData(tenantId: string, email: string) {
    const officer = await this.resolveOfficer(tenantId, email);
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
      select: { avatarUrl: true },
    });
    const dispatches = await this.prisma.dispatch.findMany({
      where: { officerId: officer.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { incident: { include: { user: true } } },
    });

    return {
      success: true,
      data: {
        center: {
          lat: officer.currentLat ? Number(officer.currentLat) : -29.8587,
          lng: officer.currentLng ? Number(officer.currentLng) : 31.0218,
        },
        officer: {
          id: officer.id,
          name: `${officer.firstName} ${officer.lastName}`,
          lat: officer.currentLat ? Number(officer.currentLat) : -29.8587,
          lng: officer.currentLng ? Number(officer.currentLng) : 31.0218,
          status: officer.status,
          avatarUrl: user?.avatarUrl ?? null,
        },
        assignments: dispatches.map((d) => ({
          dispatchId: d.id,
          status: d.status,
          incident: {
            id: d.incident.id,
            type: d.incident.type,
            lat: Number(d.incident.lat),
            lng: Number(d.incident.lng),
            address: d.incident.address,
            client: `${d.incident.user.firstName} ${d.incident.user.lastName}`,
          },
        })),
      },
    };
  }

  private async advanceDispatch(
    tenantId: string,
    email: string,
    dispatchId: string,
    dispatchStatus: DispatchStatus,
    incidentStatus: IncidentStatus,
    officerStatus: OfficerStatus,
  ) {
    const officer = await this.resolveOfficer(tenantId, email);
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id: dispatchId, officerId: officer.id, tenantId },
      include: { incident: { include: { user: true } } },
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');

    await this.prisma.$transaction([
      this.prisma.dispatch.update({ where: { id: dispatchId }, data: { status: dispatchStatus } }),
      this.prisma.incident.update({
        where: { id: dispatch.incidentId },
        data: { status: incidentStatus },
      }),
      this.prisma.officer.update({ where: { id: officer.id }, data: { status: officerStatus } }),
    ]);

    const updated = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { incident: { include: { user: true } } },
    });

    return { success: true, data: this.formatDispatch(updated!) };
  }

  private formatDispatch(dispatch: {
    id: string;
    status: string;
    createdAt: Date;
    incident: {
      id: string;
      type: string;
      status: string;
      priority: string;
      title: string | null;
      address: string | null;
      lat: unknown;
      lng: unknown;
      user: { firstName: string; lastName: string; phone: string | null };
    };
  }) {
    return {
      id: dispatch.id,
      status: dispatch.status,
      createdAt: dispatch.createdAt,
      incident: {
        id: dispatch.incident.id,
        type: dispatch.incident.type,
        status: dispatch.incident.status,
        priority: dispatch.incident.priority,
        title: dispatch.incident.title,
        address: dispatch.incident.address,
        lat: Number(dispatch.incident.lat),
        lng: Number(dispatch.incident.lng),
        client: `${dispatch.incident.user.firstName} ${dispatch.incident.user.lastName}`,
        phone: dispatch.incident.user.phone,
      },
    };
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatResponse(sec: number) {
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

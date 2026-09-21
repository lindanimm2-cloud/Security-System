import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type EscalationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';

export type EscalationJob = {
  tenantId: string;
  incidentId: string;
  level: 'supervisor' | 'manager';
  title: string;
  body: string;
  channels: EscalationChannel[];
};

/**
 * Control-room / client escalation fan-out.
 * In-app + realtime are live; email/SMS/WhatsApp are queued stubs ready for providers.
 */
@Injectable()
export class AlertEscalationService {
  private readonly logger = new Logger(AlertEscalationService.name);
  private readonly queue: EscalationJob[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  listQueued() {
    return [...this.queue].slice(-50);
  }

  async escalateUnackedCritical(job: EscalationJob) {
    this.queue.push(job);
    if (this.queue.length > 200) this.queue.splice(0, this.queue.length - 200);

    const roles =
      job.level === 'manager'
        ? [UserRole.MANAGER, UserRole.TENANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN]
        : [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.DISPATCHER];

    const users = await this.prisma.user.findMany({
      where: { tenantId: job.tenantId, status: 'ACTIVE', role: { in: roles } },
      select: { id: true, email: true, phone: true, role: true },
    });

    for (const user of users) {
      if (job.channels.includes('in_app')) {
        const row = await this.prisma.notification.create({
          data: {
            tenantId: job.tenantId,
            userId: user.id,
            incidentId: job.incidentId,
            type: 'INCIDENT_UPDATE',
            priority: 'P0',
            title: job.title,
            body: job.body,
            deepLink: `/control-room/incidents?id=${job.incidentId}`,
          },
        });
        this.realtime.emitNotification(job.tenantId, {
          id: row.id,
          userId: row.userId,
          type: row.type,
          priority: row.priority,
          title: row.title,
          body: row.body,
          incidentId: row.incidentId,
          deepLink: row.deepLink,
          escalation: job.level,
        });
      }

      // Provider stubs — wire Africa's Talking / Twilio / WhatsApp Business here
      if (job.channels.includes('email') && user.email) {
        this.logger.log(`[email:stub] → ${user.email} · ${job.title}`);
      }
      if (job.channels.includes('sms') && user.phone) {
        this.logger.log(`[sms:stub] → ${user.phone} · ${job.title}`);
      }
      if (job.channels.includes('whatsapp') && user.phone) {
        this.logger.log(`[whatsapp:stub] → ${user.phone} · ${job.title}`);
      }
    }

    this.realtime.emitPlatformEvent(job.tenantId, 'alert.escalated', {
      incidentId: job.incidentId,
      level: job.level,
      recipientCount: users.length,
    });

    return { success: true, recipients: users.length, queued: this.queue.length };
  }

  /** Client high-priority status push companion (in-app + future FCM/APNs). */
  async notifyClientResponseUpdate(opts: {
    tenantId: string;
    userId: string;
    incidentId: string;
    title: string;
    body: string;
    status?: string;
    dispatchStatus?: string;
    etaSeconds?: number | null;
    unitLabel?: string | null;
    publicRef?: string | null;
  }) {
    const deepLink = `/portal/response/${opts.incidentId}`;
    const row = await this.prisma.notification.create({
      data: {
        tenantId: opts.tenantId,
        userId: opts.userId,
        incidentId: opts.incidentId,
        type: 'DISPATCH_ASSIGNED',
        priority: 'P1',
        title: opts.title,
        body: opts.body,
        deepLink,
      },
    });
    this.realtime.emitNotification(opts.tenantId, {
      id: row.id,
      userId: row.userId,
      type: row.type,
      priority: row.priority,
      title: row.title,
      body: row.body,
      incidentId: row.incidentId,
      deepLink: row.deepLink,
      status: opts.status,
      dispatchStatus: opts.dispatchStatus,
      etaSeconds: opts.etaSeconds,
      unitLabel: opts.unitLabel,
      publicRef: opts.publicRef,
      urgency: 'critical',
      template: 'response_status',
    });
    this.logger.log(`[push:stub] client ${opts.userId} · ${opts.title}`);
    return row;
  }
}

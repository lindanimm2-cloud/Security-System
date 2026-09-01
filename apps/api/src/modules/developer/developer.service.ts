import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorReportStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  canContactDeveloper,
  developerCanViewRevenue,
  isDeveloper,
  REVENUE_HIDDEN_LABEL,
} from '../../common/developer-access';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type StaffUser = {
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

function ticketCode(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const tail = (compact.slice(-4) || '0000').padStart(4, '0');
  return `DEV-${tail}`;
}

@Injectable()
export class DeveloperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async submitErrorReport(
    user: StaffUser,
    input: {
      message: string;
      path?: string;
      userAgent?: string;
      context?: string;
    },
  ) {
    if (!canContactDeveloper(user.role)) {
      throw new ForbiddenException('Your role cannot notify the developer');
    }
    return this.createErrorReportAndNotify(user, input);
  }

  async submitErrorReportByUserId(
    userId: string,
    tenantId: string,
    input: {
      message: string;
      path?: string;
      userAgent?: string;
      context?: string;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) throw new NotFoundException('Account not found');
    return this.createErrorReportAndNotify(user, input);
  }

  private async createErrorReportAndNotify(
    user: StaffUser,
    input: {
      message: string;
      path?: string;
      userAgent?: string;
      context?: string;
    },
  ) {
    const message = (input.message ?? '').trim().slice(0, 2000);
    if (!message) throw new BadRequestException('Error message is required');

    const report = await this.prisma.errorReport.create({
      data: {
        tenantId: user.tenantId,
        reporterId: user.id,
        message,
        path: input.path?.slice(0, 500) || null,
        userAgent: input.userAgent?.slice(0, 500) || null,
        context: input.context?.slice(0, 2000) || null,
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    const developers = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: UserRole.DEVELOPER,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const code = ticketCode(report.id);
    const title = `Issue ticket ${code}`;
    const body = `${user.firstName} ${user.lastName} (${user.role}): ${message}`;
    const link = `/control-room/developer?ticket=${report.id}`;

    if (developers.length) {
      await this.prisma.notification.createMany({
        data: developers.map((d) => ({
          tenantId: user.tenantId,
          userId: d.id,
          type: NotificationType.ERROR_REPORT,
          title,
          body: body.slice(0, 500),
        })),
      });
    }

    this.realtime.emitNotification(user.tenantId, {
      type: NotificationType.ERROR_REPORT,
      category: 'DEVELOPER',
      title,
      body: body.slice(0, 500),
      priority: 'high',
      isRead: false,
      createdAt: report.createdAt.toISOString(),
      link,
      reportId: report.id,
      forRoles: [UserRole.DEVELOPER, UserRole.OWNER, UserRole.SUPER_ADMIN],
    });

    this.realtime.emitCallEvent(user.tenantId, 'developer:error-report', {
      reportId: report.id,
      title,
      body,
      link,
    });

    return {
      success: true,
      data: {
        id: report.id,
        status: report.status,
        message: report.message,
        ticketCode: code,
        createdAt: report.createdAt.toISOString(),
      },
    };
  }

  async listReports(user: StaffUser, status?: ErrorReportStatus) {
    if (!isDeveloper(user.role) && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Developer inbox only');
    }

    const reports = await this.prisma.errorReport.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const openCount = await this.prisma.errorReport.count({
      where: { tenantId: user.tenantId, status: ErrorReportStatus.OPEN },
    });

    return {
      success: true,
      data: {
        openCount,
        reports: reports.map((r) => ({
          id: r.id,
          message: r.message,
          path: r.path,
          context: r.context,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          resolvedAt: r.resolvedAt?.toISOString() ?? null,
          ticketCode: ticketCode(r.id),
          reporter: {
            id: r.reporter.id,
            name: `${r.reporter.firstName} ${r.reporter.lastName}`.trim(),
            role: r.reporter.role,
            email: r.reporter.email,
          },
        })),
      },
    };
  }

  async updateReport(
    user: StaffUser,
    reportId: string,
    body: {
      status?: ErrorReportStatus;
      workflowStatus?: string;
      context?: string;
      mergeDuplicates?: boolean;
    },
  ) {
    if (!isDeveloper(user.role) && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Developer inbox only');
    }

    const existing = await this.prisma.errorReport.findFirst({
      where: { id: reportId, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Report not found');

    const status = body.status ?? existing.status;
    const updated = await this.prisma.errorReport.update({
      where: { id: reportId },
      data: {
        status,
        context: body.context?.slice(0, 8000) ?? existing.context,
        resolvedAt:
          status === ErrorReportStatus.RESOLVED ? new Date() : existing.resolvedAt,
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      },
    };
  }

  async updateReportStatus(
    user: StaffUser,
    reportId: string,
    status: ErrorReportStatus,
  ) {
    if (!isDeveloper(user.role) && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Developer inbox only');
    }

    const existing = await this.prisma.errorReport.findFirst({
      where: { id: reportId, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Report not found');

    const updated = await this.prisma.errorReport.update({
      where: { id: reportId },
      data: {
        status,
        resolvedAt:
          status === ErrorReportStatus.RESOLVED ? new Date() : existing.resolvedAt,
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      },
    };
  }

  async getDesk(user: StaffUser) {
    if (!isDeveloper(user.role)) {
      throw new ForbiddenException('Developer desk only');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true, name: true },
    });

    const [openCount, recent, developers] = await Promise.all([
      this.prisma.errorReport.count({
        where: { tenantId: user.tenantId, status: ErrorReportStatus.OPEN },
      }),
      this.prisma.errorReport.findMany({
        where: { tenantId: user.tenantId },
        include: {
          reporter: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.user.findMany({
        where: {
          tenantId: user.tenantId,
          role: UserRole.DEVELOPER,
          status: 'ACTIVE',
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      }),
    ]);

    return {
      success: true,
      data: {
        tenantName: tenant?.name ?? 'Tenant',
        canViewRevenue: developerCanViewRevenue(user.role, tenant?.settings),
        revenueNote: developerCanViewRevenue(user.role, tenant?.settings)
          ? 'Owner has enabled revenue visibility for developers.'
          : REVENUE_HIDDEN_LABEL,
        openErrorReports: openCount,
        systemStatus: openCount > 0 ? 'degraded' : 'operational',
        systemMessage: 'Production monitoring active',
        production: {
          version: process.env.APP_VERSION ?? '2.4.18',
          build: process.env.BUILD_NUMBER ?? '8421',
          deployedAt: new Date().toISOString(),
          status: 'healthy',
          environment: 'production',
        },
        recentDeployments: [],
        platformHealth: [
          { id: 'api', label: 'API', status: 'operational', href: '/control-room' },
          { id: 'database', label: 'Database', status: 'operational' },
          { id: 'auth', label: 'Authentication', status: 'operational' },
          { id: 'map', label: 'Live map', status: 'operational', href: '/control-room/map' },
          { id: 'cctv', label: 'CCTV', status: 'operational', href: '/control-room/surveillance' },
          { id: 'dispatch', label: 'Dispatch', status: 'operational', href: '/control-room/dispatch' },
          { id: 'notifications', label: 'Notifications', status: 'operational' },
          { id: 'payments', label: 'Payments', status: 'operational' },
        ],
        analytics: {
          total24h: recent.length,
          unique24h: new Set(recent.map((r) => r.message)).size,
          affectedUsers24h: new Set(recent.map((r) => r.reporterId)).size,
          critical24h: 0,
          resolved24h: recent.filter((r) => r.status === ErrorReportStatus.RESOLVED).length,
          topErrors: [],
        },
        duplicateGroups: [],
        recentReports: recent.map((r) => ({
          id: r.id,
          message: r.message,
          path: r.path,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          reporter: `${r.reporter.firstName} ${r.reporter.lastName} · ${r.reporter.role}`,
          ticketCode: ticketCode(r.id),
        })),
        developers,
        developerAccess: {
          production: true,
          staging: true,
          database: false,
          serverLogs: true,
          deployments: true,
          monitoring: true,
        },
      },
    };
  }

  async setRevenueAccess(owner: StaffUser, enabled: boolean) {
    if (owner.role !== UserRole.OWNER && owner.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only the owner can grant revenue access');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: owner.tenantId },
      select: { settings: true },
    });
    const current = (tenant?.settings ?? {}) as Record<string, unknown>;
    const settings: Prisma.InputJsonValue = {
      ...current,
      developerCanViewRevenue: Boolean(enabled),
    };

    await this.prisma.tenant.update({
      where: { id: owner.tenantId },
      data: { settings },
    });

    return {
      success: true,
      data: {
        developerCanViewRevenue: Boolean(enabled),
        message: enabled
          ? 'Developers can now see revenue figures.'
          : 'Developer revenue figures are hidden again.',
      },
    };
  }
}

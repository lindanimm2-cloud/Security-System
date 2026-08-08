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

    const title = 'App error reported';
    const body = `${user.firstName} ${user.lastName} (${user.role}): ${message}`;

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

      this.realtime.emitNotification(user.tenantId, {
        type: NotificationType.ERROR_REPORT,
        title,
        body: body.slice(0, 500),
        reportId: report.id,
        forRoles: [UserRole.DEVELOPER],
      });
    }

    this.realtime.emitCallEvent(user.tenantId, 'developer:error-report', {
      reportId: report.id,
      title,
      body,
    });

    return {
      success: true,
      data: {
        id: report.id,
        status: report.status,
        message: report.message,
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
        recentReports: recent.map((r) => ({
          id: r.id,
          message: r.message,
          path: r.path,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          reporter: `${r.reporter.firstName} ${r.reporter.lastName} · ${r.reporter.role}`,
        })),
        developers,
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

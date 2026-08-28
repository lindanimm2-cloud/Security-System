import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyVehicleType, IncidentStatus, IncidentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IncidentKernelService } from '../incident-kernel/incident-kernel.service';

const CREW_FROM_INCIDENT: Record<string, string> = {
  ACTIVE: 'ACCEPTED',
  DISPATCHED: 'ACCEPTED',
  EN_ROUTE: 'EN_ROUTE',
  ON_SCENE: 'ARRIVED',
  RESOLVED: 'HANDOVER',
  CLOSED: 'COMPLETED',
  CANCELLED: 'COMPLETED',
};

const INCIDENT_FROM_CREW: Record<string, IncidentStatus> = {
  ACCEPTED: IncidentStatus.DISPATCHED,
  EN_ROUTE: IncidentStatus.EN_ROUTE,
  ARRIVED: IncidentStatus.ON_SCENE,
  TRANSPORT: IncidentStatus.ON_SCENE,
  HOSPITAL: IncidentStatus.ON_SCENE,
  HANDOVER: IncidentStatus.RESOLVED,
  COMPLETED: IncidentStatus.CLOSED,
};

@Injectable()
export class MedicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kernel: IncidentKernelService,
  ) {}

  async getQueue(tenantId: string) {
    const incidents = await this.prisma.incident.findMany({
      where: {
        tenantId,
        type: IncidentType.MEDICAL,
        status: { notIn: [IncidentStatus.CANCELLED] },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return {
      success: true,
      data: incidents.map((i) => ({
        id: i.id,
        incidentId: i.id,
        client: `${i.user.firstName} ${i.user.lastName}`.trim(),
        location: i.address ?? 'Location pending',
        priority: i.priority,
        status: CREW_FROM_INCIDENT[i.status] ?? 'ACCEPTED',
        level: i.priority === 'CRITICAL' ? 'ALS' : 'BLS',
        distanceKm: 1.8,
        patientSummary: i.title ?? 'Medical assistance requested',
        securityTicketId: i.id,
      })),
    };
  }

  async getUnits(tenantId: string) {
    const vehicles = await this.prisma.companyVehicle.findMany({
      where: { tenantId, vehicleType: CompanyVehicleType.MEDICAL, isActive: true },
      orderBy: { callSign: 'asc' },
    });

    return {
      success: true,
      data: vehicles.map((v) => ({
        id: v.id,
        callSign: v.callSign,
        level: v.callSign.toLowerCase().includes('2') ? 'BLS' : 'ALS',
        status: v.status,
        distanceKm: 1.8,
        eta: v.status === 'AVAILABLE' ? '5 min' : '9 min',
      })),
    };
  }

  async updateTicket(tenantId: string, id: string, status?: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, tenantId, type: IncidentType.MEDICAL },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!incident) throw new NotFoundException('Medical ticket not found');

    const nextStatus = status ? INCIDENT_FROM_CREW[status] : undefined;
    const updated = nextStatus
      ? await this.prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: nextStatus,
            resolvedAt:
              nextStatus === IncidentStatus.RESOLVED || nextStatus === IncidentStatus.CLOSED
                ? incident.resolvedAt ?? new Date()
                : incident.resolvedAt,
          },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : incident;

    if (nextStatus) {
      await this.kernel.recordStatusChange(tenantId, updated.id, nextStatus, 'medical');
    }

    return {
      success: true,
      data: {
        id: updated.id,
        incidentId: updated.id,
        client: `${updated.user.firstName} ${updated.user.lastName}`.trim(),
        location: updated.address ?? 'Location pending',
        priority: updated.priority,
        status: status ?? CREW_FROM_INCIDENT[updated.status] ?? 'ACCEPTED',
        level: updated.priority === 'CRITICAL' ? 'ALS' : 'BLS',
        distanceKm: 1.8,
        patientSummary: updated.title ?? 'Medical assistance requested',
        securityTicketId: updated.id,
      },
    };
  }
}

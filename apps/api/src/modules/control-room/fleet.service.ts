import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VehicleCrewRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type CrewInput = {
  officerId: string;
  role?: VehicleCrewRole;
}[];

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  private formatCrew(
    crew: {
      role: VehicleCrewRole;
      sortOrder: number;
      officer: { id: string; firstName: string; lastName: string; status: string; zone: string | null };
    }[],
  ) {
    return crew
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        officerId: c.officer.id,
        name: `${c.officer.firstName} ${c.officer.lastName}`,
        role: c.role,
        status: c.officer.status,
        zone: c.officer.zone,
      }));
  }

  private formatVehicle(
    v: Awaited<ReturnType<typeof this.loadVehicle>>,
  ) {
    return {
      id: v.id,
      registration: v.registration,
      callSign: v.callSign,
      make: v.make,
      model: v.model,
      color: v.color,
      year: v.year,
      vehicleType: v.vehicleType,
      status: v.status,
      lat: v.currentLat ? Number(v.currentLat) : null,
      lng: v.currentLng ? Number(v.currentLng) : null,
      trackerLinked: v.trackerLinked,
      isActive: v.isActive,
      crew: this.formatCrew(v.crew),
      crewCount: v.crew.length,
    };
  }

  private async loadVehicle(id: string, tenantId: string) {
    const vehicle = await this.prisma.companyVehicle.findFirst({
      where: { id, tenantId },
      include: {
        crew: {
          include: {
            officer: {
              select: { id: true, firstName: true, lastName: true, status: true, zone: true },
            },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Company vehicle not found');
    return vehicle;
  }

  async listFleet(tenantId: string) {
    const vehicles = await this.prisma.companyVehicle.findMany({
      where: { tenantId, isActive: true },
      include: {
        crew: {
          include: {
            officer: {
              select: { id: true, firstName: true, lastName: true, status: true, zone: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { callSign: 'asc' },
    });

    return {
      success: true,
      data: vehicles.map((v) => this.formatVehicle(v)),
    };
  }

  async getFleetMapData(tenantId: string) {
    const vehicles = await this.prisma.companyVehicle.findMany({
      where: { tenantId, isActive: true, currentLat: { not: null }, currentLng: { not: null } },
      include: {
        crew: {
          include: {
            officer: {
              select: { id: true, firstName: true, lastName: true, status: true, zone: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return vehicles.map((v) => this.formatVehicle(v));
  }

  async getOfficerVehicle(tenantId: string, officerId: string) {
    const assignment = await this.prisma.companyVehicleCrew.findFirst({
      where: { officerId, companyVehicle: { tenantId } },
      include: {
        companyVehicle: {
          include: {
            crew: {
              include: {
                officer: {
                  select: { id: true, firstName: true, lastName: true, status: true, zone: true },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!assignment) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        ...this.formatVehicle(assignment.companyVehicle),
        myRole: assignment.role,
      },
    };
  }

  async getCrewIndex(tenantId: string) {
    const crew = await this.prisma.companyVehicleCrew.findMany({
      where: { companyVehicle: { tenantId } },
      include: {
        officer: { select: { id: true, firstName: true, lastName: true, status: true } },
        companyVehicle: { select: { id: true, callSign: true, registration: true, vehicleType: true } },
      },
    });

    return new Map(
      crew.map((c) => [
        c.officerId,
        {
          vehicleId: c.companyVehicle.id,
          callSign: c.companyVehicle.callSign,
          registration: c.companyVehicle.registration,
          vehicleType: c.companyVehicle.vehicleType,
          role: c.role,
          crewMates: crew
            .filter((x) => x.companyVehicleId === c.companyVehicleId && x.officerId !== c.officerId)
            .map((x) => ({
              officerId: x.officer.id,
              name: `${x.officer.firstName} ${x.officer.lastName}`,
              role: x.role,
              status: x.officer.status,
            })),
        },
      ]),
    );
  }

  async setVehicleCrew(tenantId: string, vehicleId: string, crew: CrewInput) {
    const vehicle = await this.loadVehicle(vehicleId, tenantId);

    if (crew.length > 4) {
      throw new BadRequestException('Maximum 4 officers per vehicle');
    }

    const officerIds = crew.map((c) => c.officerId);
    if (new Set(officerIds).size !== officerIds.length) {
      throw new BadRequestException('Duplicate officers in crew');
    }

    const drivers = crew.filter((c) => (c.role ?? 'PASSENGER') === 'DRIVER');
    if (crew.length > 0 && drivers.length !== 1) {
      throw new BadRequestException('Crew must include exactly one driver');
    }

    const officers = await this.prisma.officer.findMany({
      where: { tenantId, id: { in: officerIds }, isActive: true },
    });
    if (officers.length !== officerIds.length) {
      throw new BadRequestException('One or more officers not found');
    }

    const existingElsewhere = await this.prisma.companyVehicleCrew.findMany({
      where: {
        officerId: { in: officerIds },
        companyVehicleId: { not: vehicleId },
      },
    });
    if (existingElsewhere.length) {
      throw new BadRequestException('An officer is already assigned to another company vehicle');
    }

    await this.prisma.$transaction([
      this.prisma.companyVehicleCrew.deleteMany({ where: { companyVehicleId: vehicleId } }),
      ...crew.map((c, idx) =>
        this.prisma.companyVehicleCrew.create({
          data: {
            companyVehicleId: vehicleId,
            officerId: c.officerId,
            role: c.role ?? (idx === 0 ? 'DRIVER' : 'PASSENGER'),
            sortOrder: idx,
          },
        }),
      ),
    ]);

    const updated = await this.loadVehicle(vehicleId, tenantId);
    return { success: true, data: this.formatVehicle(updated) };
  }
}

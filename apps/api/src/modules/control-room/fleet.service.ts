import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyVehicleType, VehicleCrewRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type CrewInput = {
  officerId: string;
  role?: VehicleCrewRole;
}[];

type VehicleWriteInput = {
  callSign?: string;
  registration?: string;
  make?: string;
  model?: string;
  color?: string | null;
  vehicleType?: string;
  teamName?: string;
};

const VEHICLE_TYPES = new Set<string>(Object.values(CompanyVehicleType));

const TEAM_LABELS: Record<string, string> = {
  ARMED_RESPONSE: 'Armed response',
  MEDICAL: 'Medical',
  PATROL: 'Patrol',
  FIRE_TRUCK: 'Fire',
  TACTICAL: 'Tactical',
  MOTORCYCLE: 'Rapid response',
  UNMARKED: 'Unmarked',
};

function dashCamsForVehicle(v: { id: string; callSign: string; status: string }) {
  const live = v.status !== 'MAINTENANCE' && v.status !== 'OFFLINE';
  const frontStatus = !live ? 'OFFLINE' : v.status === 'EN_ROUTE' || v.status === 'DEPLOYED' || v.status === 'ON_DUTY' ? 'RECORDING' : 'ONLINE';
  return [
    {
      id: `${v.id}-cam-front`,
      name: 'Dash forward',
      locationLabel: `${v.callSign} · windscreen`,
      channel: 1,
      status: frontStatus,
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
    {
      id: `${v.id}-cam-cabin`,
      name: 'Cabin',
      locationLabel: `${v.callSign} · cabin`,
      channel: 2,
      status: live ? 'ONLINE' : 'OFFLINE',
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: true,
    },
    {
      id: `${v.id}-cam-rear`,
      name: 'Rear view',
      locationLabel: `${v.callSign} · rear`,
      channel: 3,
      status: live ? 'ONLINE' : 'OFFLINE',
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
  ];
}

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
      teamName: TEAM_LABELS[v.vehicleType] ?? String(v.vehicleType).replace(/_/g, ' '),
      status: v.status,
      lat: v.currentLat ? Number(v.currentLat) : null,
      lng: v.currentLng ? Number(v.currentLng) : null,
      trackerLinked: v.trackerLinked,
      isActive: v.isActive,
      crew: this.formatCrew(v.crew),
      crewCount: v.crew.length,
      cameras: dashCamsForVehicle(v),
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
      include: {
        officer: { select: { firstName: true, lastName: true } },
        companyVehicle: { select: { callSign: true } },
      },
    });
    if (existingElsewhere.length) {
      const clash = existingElsewhere[0];
      throw new BadRequestException(
        `${clash.officer.firstName} ${clash.officer.lastName} is already assigned to ${clash.companyVehicle.callSign}. Unassign them there first.`,
      );
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

  async createVehicle(tenantId: string, input: VehicleWriteInput) {
    const callSign = String(input.callSign ?? '').trim();
    const registration = String(input.registration ?? '').trim();
    const make = String(input.make ?? '').trim();
    const model = String(input.model ?? '').trim();
    if (!callSign || !registration || !make || !model) {
      throw new BadRequestException('Call sign, registration, make, and model are required');
    }
    const vehicleType = VEHICLE_TYPES.has(String(input.vehicleType))
      ? (input.vehicleType as CompanyVehicleType)
      : CompanyVehicleType.PATROL;

    const clash = await this.prisma.companyVehicle.findFirst({
      where: {
        tenantId,
        OR: [{ callSign }, { registration }],
      },
    });
    if (clash) {
      throw new BadRequestException('That call sign or registration is already on the fleet');
    }

    const created = await this.prisma.companyVehicle.create({
      data: {
        tenantId,
        callSign,
        registration,
        make,
        model,
        color: String(input.color ?? '').trim() || null,
        vehicleType,
        status: 'AVAILABLE',
        currentLat: -29.8587,
        currentLng: 31.0218,
      },
    });

    return { success: true, data: this.formatVehicle(await this.loadVehicle(created.id, tenantId)) };
  }

  async updateVehicle(tenantId: string, vehicleId: string, input: VehicleWriteInput) {
    await this.loadVehicle(vehicleId, tenantId);
    const data: {
      callSign?: string;
      registration?: string;
      make?: string;
      model?: string;
      color?: string | null;
      vehicleType?: CompanyVehicleType;
    } = {};
    if (typeof input.callSign === 'string' && input.callSign.trim()) data.callSign = input.callSign.trim();
    if (typeof input.registration === 'string' && input.registration.trim()) {
      data.registration = input.registration.trim();
    }
    if (typeof input.make === 'string' && input.make.trim()) data.make = input.make.trim();
    if (typeof input.model === 'string' && input.model.trim()) data.model = input.model.trim();
    if (typeof input.color === 'string') data.color = input.color.trim() || null;
    if (typeof input.vehicleType === 'string' && VEHICLE_TYPES.has(input.vehicleType)) {
      data.vehicleType = input.vehicleType as CompanyVehicleType;
    }
    if (Object.keys(data).length === 0) {
      return { success: true, data: this.formatVehicle(await this.loadVehicle(vehicleId, tenantId)) };
    }
    await this.prisma.companyVehicle.update({ where: { id: vehicleId }, data });
    return { success: true, data: this.formatVehicle(await this.loadVehicle(vehicleId, tenantId)) };
  }
}

import {
  CompanyVehicleStatus,
  CompanyVehicleType,
  ConversationType,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  InstallJobStatus,
  OfficerStatus,
  PrismaClient,
  ProductCategory,
  SalesLeadStatus,
  StoreOrderStatus,
  UserRole,
  UserStatus,
  VehicleCrewRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Durban metro reference points for demo map data */
const DURBAN = {
  center: { lat: -29.8587, lng: 31.0218 },
  umhlanga: { lat: -29.7267, lng: 31.0857, label: 'Umhlanga' },
  morningside: { lat: -29.8328, lng: 31.0036, label: 'Morningside' },
  berea: { lat: -29.8488, lng: 31.0099, label: 'Berea' },
  glenwood: { lat: -29.8533, lng: 31.0069, label: 'Glenwood' },
  westville: { lat: -29.8374, lng: 30.9313, label: 'Westville' },
  floridaRd: { lat: -29.8289, lng: 31.0167, label: 'Florida Road' },
  pinetown: { lat: -29.8136, lng: 30.8493, label: 'Pinetown' },
} as const;

async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: { name: '4DS Solutions', contactEmail: 'admin@demo.4ds.local' },
    create: {
      name: '4DS Solutions',
      slug: 'demo',
      contactEmail: 'admin@demo.4ds.local',
      primaryColor: '#DC2626',
      settings: { features: { panic: true, tracking: true } },
    },
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.local' } },
    update: { passwordHash, status: UserStatus.ACTIVE, jobTitle: 'Tenant Administrator' },
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.local',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: UserRole.TENANT_ADMIN,
      jobTitle: 'Tenant Administrator',
      status: UserStatus.ACTIVE,
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'dispatch@demo.local' } },
    update: { passwordHash, status: UserStatus.ACTIVE, jobTitle: 'Dispatcher' },
    create: {
      tenantId: tenant.id,
      email: 'dispatch@demo.local',
      passwordHash,
      firstName: 'Lerato',
      lastName: 'Mokoena',
      role: UserRole.DISPATCHER,
      jobTitle: 'Dispatcher',
      status: UserStatus.ACTIVE,
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.OWNER,
      jobTitle: 'Owner',
      firstName: 'Alex',
      lastName: 'Fourie',
      phone: '+27 82 100 0001',
    },
    create: {
      tenantId: tenant.id,
      email: 'owner@4ds.local',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Fourie',
      role: UserRole.OWNER,
      jobTitle: 'Owner',
      phone: '+27 82 100 0001',
      status: UserStatus.ACTIVE,
    },
  });

  const developer = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'developer@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.DEVELOPER,
      jobTitle: 'Platform Developer',
      firstName: 'Toxic',
      lastName: 'Dev',
      phone: '+27 82 100 0099',
    },
    create: {
      tenantId: tenant.id,
      email: 'developer@4ds.local',
      passwordHash,
      firstName: 'Toxic',
      lastName: 'Dev',
      role: UserRole.DEVELOPER,
      jobTitle: 'Platform Developer',
      phone: '+27 82 100 0099',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'medical@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.MEDICAL_DISPATCHER,
      jobTitle: 'Medical Dispatcher',
      firstName: 'Priya',
      lastName: 'Medics',
      phone: '+27 82 100 0088',
    },
    create: {
      tenantId: tenant.id,
      email: 'medical@4ds.local',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Medics',
      role: UserRole.MEDICAL_DISPATCHER,
      jobTitle: 'Medical Dispatcher',
      phone: '+27 82 100 0088',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'crew@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.MEDICAL_CREW,
      jobTitle: 'Paramedic',
      firstName: 'Andile',
      lastName: 'Paramedic',
      phone: '+27 82 100 0089',
    },
    create: {
      tenantId: tenant.id,
      email: 'crew@4ds.local',
      passwordHash,
      firstName: 'Andile',
      lastName: 'Paramedic',
      role: UserRole.MEDICAL_CREW,
      jobTitle: 'Paramedic',
      phone: '+27 82 100 0089',
      status: UserStatus.ACTIVE,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'superadmin@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN,
      jobTitle: 'Super Admin',
      firstName: 'Sam',
      lastName: 'Admin',
      phone: '+27 82 100 0000',
    },
    create: {
      tenantId: tenant.id,
      email: 'superadmin@4ds.local',
      passwordHash,
      firstName: 'Sam',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      jobTitle: 'Super Admin',
      phone: '+27 82 100 0000',
      status: UserStatus.ACTIVE,
    },
  });

  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.MANAGER,
      jobTitle: 'Manager',
      firstName: 'Thandi',
      lastName: 'Nkosi',
      phone: '+27 82 100 0002',
    },
    create: {
      tenantId: tenant.id,
      email: 'manager@4ds.local',
      passwordHash,
      firstName: 'Thandi',
      lastName: 'Nkosi',
      role: UserRole.MANAGER,
      jobTitle: 'Manager',
      phone: '+27 82 100 0002',
      status: UserStatus.ACTIVE,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'supervisor@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.SUPERVISOR,
      jobTitle: 'Supervisor',
      firstName: 'Pieter',
      lastName: 'van Wyk',
      phone: '+27 82 100 0003',
    },
    create: {
      tenantId: tenant.id,
      email: 'supervisor@4ds.local',
      passwordHash,
      firstName: 'Pieter',
      lastName: 'van Wyk',
      role: UserRole.SUPERVISOR,
      jobTitle: 'Supervisor',
      phone: '+27 82 100 0003',
      status: UserStatus.ACTIVE,
    },
  });

  const durbanBranch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DBN' } },
    update: { name: 'Durban Metro' },
    create: { tenantId: tenant.id, name: 'Durban Metro', code: 'DBN' },
  });

  const pinetownBranch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PTN' } },
    update: { name: 'Pinetown' },
    create: { tenantId: tenant.id, name: 'Pinetown', code: 'PTN' },
  });

  const alphaTeam = await prisma.team.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { name: 'Alpha Response', branchId: durbanBranch.id },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: tenant.id,
      branchId: durbanBranch.id,
      name: 'Alpha Response',
    },
  });

  const bravoTeam = await prisma.team.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: { name: 'Bravo Patrol', branchId: durbanBranch.id },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      tenantId: tenant.id,
      branchId: durbanBranch.id,
      name: 'Bravo Patrol',
    },
  });

  const client = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'client@demo.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      lastKnownLat: DURBAN.morningside.lat,
      lastKnownLng: DURBAN.morningside.lng,
      lastLocationAt: new Date(),
      trackingEnabled: true,
      familyMessagingEnabled: true,
      phone: '+27 82 555 1234',
      jobTitle: 'Client',
      isProtectionClient: true,
      inviteToken: null,
      inviteExpiresAt: null,
      registrationCompletedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      email: 'client@demo.local',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.USER,
      jobTitle: 'Client',
      status: UserStatus.ACTIVE,
      phone: '+27 82 555 1234',
      lastKnownLat: DURBAN.morningside.lat,
      lastKnownLng: DURBAN.morningside.lng,
      lastLocationAt: new Date(),
      trackingEnabled: true,
      familyMessagingEnabled: true,
      isProtectionClient: true,
      registrationCompletedAt: new Date(),
    },
  });

  const familyUser2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'james@demo.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      familyMessagingEnabled: true,
      isProtectionClient: true,
      inviteToken: null,
      inviteExpiresAt: null,
      registrationCompletedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      email: 'james@demo.local',
      passwordHash,
      firstName: 'James',
      lastName: 'Johnson',
      role: UserRole.FAMILY_MEMBER,
      status: UserStatus.ACTIVE,
      lastKnownLat: DURBAN.berea.lat,
      lastKnownLng: DURBAN.berea.lng,
      lastLocationAt: new Date(),
      trackingEnabled: true,
      isProtectionClient: true,
      familyMessagingEnabled: true,
      registrationCompletedAt: new Date(),
    },
  });

  const pendingInviteUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'newclient@demo.local' } },
    update: {
      passwordHash,
      status: UserStatus.PENDING_VERIFICATION,
      isProtectionClient: true,
      inviteToken: 'NX-DEMO01',
      inviteExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      registrationCompletedAt: null,
      firstName: 'Alex',
      lastName: 'Pending',
      phone: null,
    },
    create: {
      tenantId: tenant.id,
      email: 'newclient@demo.local',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Pending',
      role: UserRole.USER,
      status: UserStatus.PENDING_VERIFICATION,
      isProtectionClient: true,
      inviteToken: 'NX-DEMO01',
      inviteExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  const pendingSubUntil = new Date();
  pendingSubUntil.setMonth(pendingSubUntil.getMonth() + 1);
  await prisma.subscription.upsert({
    where: { userId: pendingInviteUser.id },
    update: {
      planName: '4DS Essential',
      tierCode: 'ESSENTIAL',
      status: 'ACTIVE',
      validUntil: pendingSubUntil,
    },
    create: {
      tenantId: tenant.id,
      userId: pendingInviteUser.id,
      planName: '4DS Essential',
      tierCode: 'ESSENTIAL',
      addons: [],
      priceMonthly: 19900,
      memberId: `4DS-INVITE`,
      validUntil: pendingSubUntil,
      status: 'ACTIVE',
    },
  });

  await prisma.emergencyContact.deleteMany({ where: { userId: client.id } });
  await prisma.emergencyContact.createMany({
    data: [
      { tenantId: tenant.id, userId: client.id, name: 'James Johnson', phone: '+27 82 555 5678', relationship: 'Spouse', priority: 1 },
      { tenantId: tenant.id, userId: client.id, name: 'Mary Johnson', phone: '+27 83 555 9012', relationship: 'Mother', priority: 2 },
      { tenantId: tenant.id, userId: client.id, name: '4DS Dispatch', phone: '0860 4DS HELP', relationship: 'Security', priority: 3 },
    ],
  });

  let family = await prisma.family.findFirst({ where: { ownerUserId: client.id } });
  if (!family) {
    family = await prisma.family.create({
      data: { tenantId: tenant.id, name: 'Johnson Family', ownerUserId: client.id },
    });
  }
  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: client.id } },
    update: {},
    create: { familyId: family.id, userId: client.id, nickname: 'Sarah' },
  });
  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: familyUser2.id } },
    update: {},
    create: { familyId: family.id, userId: familyUser2.id, nickname: 'James' },
  });

  await prisma.dispatch.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incident.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.companyVehicleCrew.deleteMany({ where: { companyVehicle: { tenantId: tenant.id } } });
  await prisma.companyVehicle.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.officer.deleteMany({ where: { tenantId: tenant.id } });
  const officers = await Promise.all([
    prisma.officer.create({
      data: { tenantId: tenant.id, email: 'ndlovu@4ds.local', firstName: 'Sipho', lastName: 'Ndlovu', status: OfficerStatus.EN_ROUTE, zone: 'Zone A', currentLat: -29.835, currentLng: 31.002, avgResponseSec: 280 },
    }),
    prisma.officer.create({
      data: { tenantId: tenant.id, email: 'patel@4ds.local', firstName: 'Raj', lastName: 'Patel', status: OfficerStatus.BUSY, zone: 'Zone B', currentLat: DURBAN.floridaRd.lat, currentLng: DURBAN.floridaRd.lng, avgResponseSec: 310 },
    }),
    prisma.officer.create({
      data: { tenantId: tenant.id, email: 'smith@4ds.local', firstName: 'John', lastName: 'Smith', status: OfficerStatus.AVAILABLE, zone: 'Zone C', currentLat: DURBAN.westville.lat, currentLng: DURBAN.westville.lng, avgResponseSec: 295 },
    }),
    prisma.officer.create({
      data: { tenantId: tenant.id, email: 'khumalo@4ds.local', firstName: 'Zanele', lastName: 'Khumalo', status: OfficerStatus.AVAILABLE, zone: 'Zone A', currentLat: DURBAN.glenwood.lat, currentLng: DURBAN.glenwood.lng, avgResponseSec: 260 },
    }),
  ]);

  for (const o of officers) {
    const officerUser = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: o.email } },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.OFFICER,
        jobTitle: 'Field Officer',
        branchId: durbanBranch.id,
      },
      create: {
        tenantId: tenant.id,
        email: o.email,
        passwordHash,
        firstName: o.firstName,
        lastName: o.lastName,
        role: UserRole.OFFICER,
        jobTitle: 'Field Officer',
        status: UserStatus.ACTIVE,
        branchId: durbanBranch.id,
        trackingEnabled: true,
        lastKnownLat: o.currentLat,
        lastKnownLng: o.currentLng,
        lastLocationAt: new Date(),
      },
    });

    await prisma.officer.update({
      where: { id: o.id },
      data: { branchId: durbanBranch.id },
    });

    if (o.email === 'ndlovu@4ds.local') {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: alphaTeam.id, userId: officerUser.id } },
        update: { isLead: true },
        create: { teamId: alphaTeam.id, userId: officerUser.id, isLead: true },
      });
    }
    if (o.email === 'patel@4ds.local') {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: bravoTeam.id, userId: officerUser.id } },
        update: {},
        create: { teamId: bravoTeam.id, userId: officerUser.id },
      });
    }
  }

  const [ndlovu, patel, smith, khumalo] = officers;

  const unit101 = await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 101 GP',
      callSign: 'UNIT-101',
      make: 'Toyota',
      model: 'Hilux GR-S',
      color: 'White',
      year: 2023,
      vehicleType: CompanyVehicleType.ARMED_RESPONSE,
      status: CompanyVehicleStatus.EN_ROUTE,
      currentLat: ndlovu.currentLat,
      currentLng: ndlovu.currentLng,
      trackerLinked: true,
    },
  });
  const unit102 = await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 202 GP',
      callSign: 'UNIT-102',
      make: 'Ford',
      model: 'Ranger XL',
      color: 'Silver',
      year: 2022,
      vehicleType: CompanyVehicleType.PATROL,
      status: CompanyVehicleStatus.AVAILABLE,
      currentLat: smith.currentLat,
      currentLng: smith.currentLng,
      trackerLinked: true,
    },
  });
  const unit103 = await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 303 GP',
      callSign: 'AMB-01',
      make: 'Mercedes-Benz',
      model: 'Sprinter Ambulance',
      color: 'White',
      year: 2021,
      vehicleType: CompanyVehicleType.MEDICAL,
      status: CompanyVehicleStatus.DEPLOYED,
      currentLat: patel.currentLat,
      currentLng: patel.currentLng,
      trackerLinked: true,
    },
  });
  const unit104 = await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 404 GP',
      callSign: 'UNIT-104',
      make: 'BMW',
      model: 'R1250 GS',
      color: 'Black',
      year: 2024,
      vehicleType: CompanyVehicleType.MOTORCYCLE,
      status: CompanyVehicleStatus.MAINTENANCE,
      currentLat: DURBAN.berea.lat,
      currentLng: DURBAN.berea.lng,
      trackerLinked: false,
    },
  });
  const unit105 = await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 505 GP',
      callSign: 'UNIT-105',
      make: 'Mercedes-Benz',
      model: 'Atego Fire',
      color: 'Red',
      year: 2022,
      vehicleType: CompanyVehicleType.FIRE_TRUCK,
      status: CompanyVehicleStatus.AVAILABLE,
      currentLat: DURBAN.umhlanga.lat,
      currentLng: DURBAN.umhlanga.lng,
      trackerLinked: true,
    },
  });
  await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 606 GP',
      callSign: 'AMB-02',
      make: 'Volkswagen',
      model: 'Crafter Ambulance',
      color: 'White',
      year: 2023,
      vehicleType: CompanyVehicleType.MEDICAL,
      status: CompanyVehicleStatus.AVAILABLE,
      currentLat: DURBAN.westville.lat,
      currentLng: DURBAN.westville.lng,
      trackerLinked: true,
    },
  });
  await prisma.companyVehicle.create({
    data: {
      tenantId: tenant.id,
      registration: 'ND 707 GP',
      callSign: 'AMB-03',
      make: 'Ford',
      model: 'Transit Ambulance',
      color: 'White',
      year: 2022,
      vehicleType: CompanyVehicleType.MEDICAL,
      status: CompanyVehicleStatus.AVAILABLE,
      currentLat: DURBAN.pinetown.lat,
      currentLng: DURBAN.pinetown.lng,
      trackerLinked: true,
    },
  });

  await prisma.companyVehicleCrew.createMany({
    data: [
      { companyVehicleId: unit101.id, officerId: ndlovu.id, role: VehicleCrewRole.DRIVER, sortOrder: 0 },
      { companyVehicleId: unit101.id, officerId: khumalo.id, role: VehicleCrewRole.PASSENGER, sortOrder: 1 },
      { companyVehicleId: unit102.id, officerId: smith.id, role: VehicleCrewRole.DRIVER, sortOrder: 0 },
      { companyVehicleId: unit103.id, officerId: patel.id, role: VehicleCrewRole.DRIVER, sortOrder: 0 },
    ],
  });

  await prisma.officer.update({
    where: { id: khumalo.id },
    data: {
      status: OfficerStatus.EN_ROUTE,
      currentLat: ndlovu.currentLat,
      currentLng: ndlovu.currentLng,
      zone: 'Zone A',
    },
  });

  await prisma.user.update({
    where: { id: dispatcher.id },
    data: { branchId: durbanBranch.id },
  });
  await prisma.user.update({
    where: { id: owner.id },
    data: { branchId: durbanBranch.id },
  });
  await prisma.user.update({
    where: { id: manager.id },
    data: { branchId: durbanBranch.id },
  });
  await prisma.user.update({
    where: { id: supervisor.id },
    data: { branchId: durbanBranch.id },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: alphaTeam.id, userId: dispatcher.id } },
    update: {},
    create: { teamId: alphaTeam.id, userId: dispatcher.id },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: alphaTeam.id, userId: supervisor.id } },
    update: { isLead: true },
    create: { teamId: alphaTeam.id, userId: supervisor.id, isLead: true },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: bravoTeam.id, userId: manager.id } },
    update: {},
    create: { teamId: bravoTeam.id, userId: manager.id },
  });

  const panic = await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      publicRef: 'NX-0001',
      type: IncidentType.PANIC,
      status: IncidentStatus.RESOLVED,
      priority: IncidentPriority.CRITICAL,
      title: 'Panic Alert (resolved drill)',
      lat: DURBAN.morningside.lat,
      lng: DURBAN.morningside.lng,
      address: `${DURBAN.morningside.label}, Durban`,
    },
  });
  await prisma.dispatch.create({
    data: {
      tenantId: tenant.id,
      incidentId: panic.id,
      officerId: officers[0].id,
      status: 'COMPLETED',
    },
  });

  await prisma.incidentNote.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.alarmEvent.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.sensor.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.camera.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incidentNote.createMany({
    data: [
      {
        tenantId: tenant.id,
        incidentId: panic.id,
        authorRole: 'DISPATCHER',
        authorName: 'Demo Admin',
        content: 'Caller confirmed audible panic. Client at Morningside residence. Armed response dispatched.',
      },
      {
        tenantId: tenant.id,
        incidentId: panic.id,
        authorRole: 'OFFICER',
        authorName: 'Sipho Ndlovu',
        content: 'En route — ETA 4 minutes. No visual contact yet. Approaching from Florida Road.',
      },
    ],
  });

  await prisma.incident.createMany({
    data: [
      { tenantId: tenant.id, userId: client.id, publicRef: 'NX-0002', type: IncidentType.THEFT, status: IncidentStatus.ACTIVE, priority: IncidentPriority.HIGH, title: 'Vehicle Theft', lat: DURBAN.berea.lat, lng: DURBAN.berea.lng, address: `${DURBAN.berea.label}, Durban`, vehicleMake: 'Toyota', vehicleModel: 'Hilux', vehicleColor: 'White', vehiclePlate: 'ND 458 DB' },
      { tenantId: tenant.id, userId: client.id, publicRef: 'NX-0003', type: IncidentType.MEDICAL, status: IncidentStatus.ACTIVE, priority: IncidentPriority.MEDIUM, title: 'Medical Assistance', lat: DURBAN.westville.lat, lng: DURBAN.westville.lng, address: `${DURBAN.westville.label}, Durban` },
      { tenantId: tenant.id, userId: client.id, publicRef: 'NX-0004', type: IncidentType.THEFT, status: IncidentStatus.ACTIVE, priority: IncidentPriority.HIGH, title: 'Vehicle Recovery', lat: DURBAN.pinetown.lat, lng: DURBAN.pinetown.lng, address: `${DURBAN.pinetown.label}, Durban`, vehicleMake: 'VW', vehicleModel: 'Polo', vehicleColor: 'Silver', vehiclePlate: 'ND 902 DB' },
      { tenantId: tenant.id, userId: client.id, publicRef: 'NX-0005', type: IncidentType.ASSAULT, status: IncidentStatus.ACTIVE, priority: IncidentPriority.CRITICAL, title: 'Assault Report', lat: DURBAN.floridaRd.lat, lng: DURBAN.floridaRd.lng, address: `${DURBAN.floridaRd.label}, Durban` },
      { tenantId: tenant.id, userId: client.id, publicRef: 'NX-0006', type: IncidentType.OTHER, status: IncidentStatus.EN_ROUTE, priority: IncidentPriority.LOW, title: 'Suspicious Activity', lat: DURBAN.umhlanga.lat, lng: DURBAN.umhlanga.lng, address: `${DURBAN.umhlanga.label}, Durban` },
    ],
  });

  await prisma.incidentMedia.deleteMany({});
  await prisma.safeZone.deleteMany({ where: { userId: client.id } });
  await prisma.subscription.deleteMany({ where: { userId: client.id } });
  await prisma.property.deleteMany({ where: { userId: client.id } });
  await prisma.vehicle.deleteMany({ where: { userId: client.id } });
  await prisma.medicalProfile.deleteMany({ where: { userId: client.id } });

  await prisma.medicalProfile.create({
    data: {
      userId: client.id,
      bloodType: 'O+',
      allergies: 'Penicillin',
      medications: 'Metformin 500mg daily',
      chronicConditions: 'Type 2 Diabetes',
      emergencyNotes: 'Insulin stored in fridge. Contact James if unresponsive.',
      doctorContact: 'Dr Naidoo · +27 31 555 0199',
      ambulancePreference: 'Netcare 911',
    },
  });

  await prisma.trustedDevice.deleteMany({ where: { userId: client.id } });
  await prisma.clientSecuritySettings.deleteMany({ where: { userId: client.id } });
  await prisma.securityConsent.deleteMany({ where: { userId: client.id } });
  await prisma.trustedDevice.createMany({
    data: [
      {
        id: '00000000-0000-4000-8000-00000000d001',
        tenantId: tenant.id,
        userId: client.id,
        publicId: 'SEC-DEVICE-S24ULTRA01',
        name: 'Samsung Galaxy S24 Ultra',
        deviceType: 'mobile',
        osName: 'Android',
        osVersion: '15',
        appVersion: '4.2.1',
        status: 'TRUSTED',
        isPrimary: true,
        nativeSos: 'NOT_AVAILABLE',
        nativeSosNote:
          "Your device's native Emergency SOS operates independently from this application. This web application cannot intercept protected OS-level Emergency SOS events.",
        lastActiveAt: new Date(),
        lastAuthAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-4000-8000-00000000d002',
        tenantId: tenant.id,
        userId: client.id,
        publicId: 'SEC-DEVICE-IPHONE1501',
        name: 'iPhone 15',
        deviceType: 'mobile',
        osName: 'iOS',
        osVersion: '17.5',
        appVersion: '4.2.1',
        status: 'TRUSTED',
        isPrimary: false,
        nativeSos: 'NOT_AVAILABLE',
        nativeSosNote:
          "Apple's Emergency SOS is controlled by iOS. Some Emergency SOS actions may operate independently from this application.",
        lastActiveAt: new Date(Date.now() - 36e5),
        lastAuthAt: new Date(Date.now() - 36e5),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-4000-8000-00000000d003',
        tenantId: tenant.id,
        userId: client.id,
        publicId: 'SEC-DEVICE-CHROMEWIN1',
        name: 'Chrome / Windows',
        deviceType: 'desktop',
        osName: 'Windows',
        osVersion: '11',
        appVersion: '4.2.1',
        status: 'TEMPORARY',
        isPrimary: false,
        nativeSos: 'NOT_AVAILABLE',
        lastActiveAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-4000-8000-00000000d004',
        tenantId: tenant.id,
        userId: client.id,
        publicId: 'SEC-DEVICE-UNKNOWN01',
        name: 'Unknown device',
        deviceType: 'unknown',
        osName: 'Unknown',
        status: 'BLOCKED',
        isPrimary: false,
        nativeSos: 'NOT_AVAILABLE',
        revokedAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
      },
    ],
  });
  await prisma.clientSecuritySettings.create({
    data: {
      userId: client.id,
      trackingMode: 'EMERGENCY_ONLY',
      panicHoldMs: 3000,
      emergencySessionMinutes: 10,
      panicTestedAt: new Date(),
      emergencySetupCompletedAt: new Date(),
    },
  });
  await prisma.securityConsent.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      kind: 'EMERGENCY_SOS',
      version: '2026-08-18',
      policyVersion: '1.0',
      accepted: true,
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      registration: 'ND 458 DB',
      make: 'Toyota',
      model: 'Hilux',
      variant: '2.8 GD-6 Raider',
      year: 2022,
      color: 'White',
      vin: 'JTFRM22E504123456',
      licenceExpiry: new Date('2026-12-31'),
      insuranceInfo: 'Santam Comprehensive — Policy #SA-88421',
      financeProvider: 'WesBank',
      trackerLinked: true,
      theftRecovery: true,
      lastKnownLat: DURBAN.berea.lat,
      lastKnownLng: DURBAN.berea.lng,
    },
  });

  await prisma.vehicle.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      registration: 'ND 902 DB',
      make: 'VW',
      model: 'Polo',
      color: 'Silver',
      trackerLinked: true,
      theftRecovery: true,
      lastKnownLat: DURBAN.pinetown.lat,
      lastKnownLng: DURBAN.pinetown.lng,
    },
  });

  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      name: 'Morningside Residence',
      address: '42 Musgrave Road, Morningside, Durban',
      propertyType: 'HOUSE',
      accessNotes: 'Guard house at main gate. Visitor parking left of entrance.',
      gateCode: '4521#',
      occupantDetails: 'Sarah & James Johnson',
      keyHolder: 'James Johnson — +27 82 555 5678',
      alarmStatus: 'ARMED',
      alarmLinked: true,
      camerasLinked: true,
      monitoringEnabled: true,
      shareInteriorCameras: false,
      panelVendor: 'Paradox',
      panelModel: 'MG5050',
      communicatorType: 'DUAL_PATH',
      monitoringAccount: '4DS-DUR-0142',
      partitionLabel: 'Partition 1',
      lat: DURBAN.morningside.lat,
      lng: DURBAN.morningside.lng,
    },
  });

  await prisma.sensor.createMany({
    data: [
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 1,
        name: 'Front door',
        sensorType: 'DOOR_CONTACT',
        status: 'NORMAL',
        locationLabel: 'Main entrance',
        isPerimeter: true,
        cidCode: '134',
        vendor: 'Paradox',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 2,
        name: 'Lounge PIR',
        sensorType: 'PIR',
        status: 'NORMAL',
        locationLabel: 'Living room',
        isPerimeter: false,
        cidCode: '130',
        vendor: 'Paradox',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 3,
        name: 'Driveway beams',
        sensorType: 'OUTDOOR_BEAM',
        status: 'NORMAL',
        locationLabel: 'Front driveway',
        isPerimeter: true,
        cidCode: '130',
        vendor: 'Optex',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 4,
        name: 'Boundary fence',
        sensorType: 'ELECTRIC_FENCE',
        status: 'ALARM',
        locationLabel: 'Side fence · Zone A',
        isPerimeter: true,
        cidCode: '137',
        vendor: 'Nemtek',
        lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 8),
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 5,
        name: 'Kitchen smoke',
        sensorType: 'SMOKE',
        status: 'NORMAL',
        locationLabel: 'Kitchen ceiling',
        is24Hour: true,
        cidCode: '110',
        vendor: 'DSC',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 6,
        name: 'Bedroom panic',
        sensorType: 'PANIC_BUTTON',
        status: 'NORMAL',
        locationLabel: 'Master bedroom',
        is24Hour: true,
        cidCode: '120',
        vendor: 'Paradox',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 7,
        name: 'Garage door',
        sensorType: 'DOOR_CONTACT',
        status: 'BYPASSED',
        locationLabel: 'Side garage',
        isPerimeter: true,
        bypassed: true,
        cidCode: '134',
        vendor: 'Paradox',
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        zoneNumber: 8,
        name: 'Medical pendant',
        sensorType: 'MEDICAL_BUTTON',
        status: 'NORMAL',
        locationLabel: 'Hall charger',
        is24Hour: true,
        cidCode: '100',
        vendor: 'Ajax',
      },
    ],
  });

  const fenceSensor = await prisma.sensor.findFirst({
    where: { propertyId: property.id, zoneNumber: 4 },
  });

  const camFront = await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      name: 'Front gate',
      locationLabel: 'Driveway entrance',
      channel: 1,
      placement: 'EXTERIOR',
      status: 'ONLINE',
      vendor: '4DS Nexus',
      lastSeenAt: new Date(),
    },
  });
  const camYard = await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      name: 'Backyard',
      locationLabel: 'Rear patio',
      channel: 2,
      placement: 'EXTERIOR',
      status: 'RECORDING',
      vendor: '4DS Nexus',
      lastSeenAt: new Date(),
    },
  });
  await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      name: 'Garage',
      locationLabel: 'Side garage',
      channel: 3,
      placement: 'EXTERIOR',
      status: 'ONLINE',
      vendor: '4DS Nexus',
      lastSeenAt: new Date(),
    },
  });
  await prisma.camera.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      name: 'Lounge',
      locationLabel: 'Living room',
      channel: 4,
      placement: 'INTERIOR',
      status: 'ONLINE',
      vendor: '4DS Nexus',
      lastSeenAt: new Date(),
    },
  });

  await prisma.alarmEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        propertyId: property.id,
        sensorId: fenceSensor?.id,
        cameraId: camFront.id,
        type: 'FENCE_ALARM',
        severity: 'HIGH',
        status: 'NEW',
        title: 'Z4 Boundary fence',
        description: 'Electric fence · Side fence · Zone A · CID 137 · Nemtek',
        cidCode: '137',
        triggeredAt: new Date(Date.now() - 1000 * 60 * 8),
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        cameraId: camFront.id,
        type: 'MOTION',
        severity: 'MEDIUM',
        status: 'NEW',
        title: 'Motion at front gate',
        description: 'Person detected near driveway after hours',
        cidCode: '130',
        triggeredAt: new Date(Date.now() - 1000 * 60 * 12),
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        cameraId: camYard.id,
        type: 'BEAM_ALARM',
        severity: 'HIGH',
        status: 'ACKNOWLEDGED',
        title: 'Z3 Driveway beams',
        description: 'Outdoor beam trip · Front driveway · CID 130',
        cidCode: '130',
        acknowledgedAt: new Date(Date.now() - 1000 * 60 * 5),
        triggeredAt: new Date(Date.now() - 1000 * 60 * 18),
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        cameraId: null,
        type: 'ALARM_TRIGGERED',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        title: 'Panel zone 3 triggered',
        description: 'Kitchen PIR — resolved false trip',
        cidCode: '130',
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 7),
      },
      {
        tenantId: tenant.id,
        propertyId: property.id,
        type: 'ARM',
        severity: 'LOW',
        status: 'RESOLVED',
        title: 'Away arm (full)',
        description: 'Partition 1 · Paradox · Contact ID (ZA)',
        cidCode: '401',
        resolvedAt: new Date(Date.now() - 1000 * 60 * 90),
        triggeredAt: new Date(Date.now() - 1000 * 60 * 90),
      },
    ],
  });

  // Keep panel ARMED so interior cams stay private until client shares or panic/alarm unlocks
  await prisma.property.update({
    where: { id: property.id },
    data: { alarmStatus: 'ARMED', shareInteriorCameras: false },
  });

  await prisma.paymentTransaction.deleteMany({ where: { userId: client.id } });
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      planName: '4DS Premium Protection',
      tierCode: 'PREMIUM',
      addons: ['HOME_SECURITY', 'VEHICLE_RESPONSE', 'FAMILY', 'MEDICAL_PLUS'],
      status: 'ACTIVE',
      priceMonthly: 89900,
      memberId: '4DS-2026-SJ-00142',
      validUntil: new Date('2027-06-09'),
      lastPaidAt: new Date('2026-06-09'),
      nextBillingAt: new Date('2027-06-09'),
      billingFailedCount: 0,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      tenantId: tenant.id,
      userId: client.id,
      reference: 'PF-DEMO-SJ-PREMIUM',
      provider: 'PayFast',
      amountCents: 89900,
      tierCode: 'PREMIUM',
      status: 'COMPLETE',
      kind: 'CHECKOUT',
    },
  });

  await prisma.subscription.upsert({
    where: { userId: familyUser2.id },
    update: {
      planName: '4DS Essential',
      tierCode: 'ESSENTIAL',
      addons: ['FAMILY'],
      status: 'PAST_DUE',
      priceMonthly: 34900,
      memberId: '4DS-2026-JJ-00088',
      validUntil: new Date('2026-05-01'),
      nextBillingAt: new Date('2026-05-01'),
      billingFailedCount: 2,
      lastBillingNoticeAt: null,
    },
    create: {
      tenantId: tenant.id,
      userId: familyUser2.id,
      planName: '4DS Essential',
      tierCode: 'ESSENTIAL',
      addons: ['FAMILY'],
      status: 'PAST_DUE',
      priceMonthly: 34900,
      memberId: '4DS-2026-JJ-00088',
      validUntil: new Date('2026-05-01'),
      nextBillingAt: new Date('2026-05-01'),
      billingFailedCount: 2,
    },
  });

  await prisma.safeZone.createMany({
    data: [
      { tenantId: tenant.id, userId: client.id, name: 'Home', lat: DURBAN.morningside.lat, lng: DURBAN.morningside.lng, radiusM: 300 },
      { tenantId: tenant.id, userId: client.id, name: 'School', lat: DURBAN.berea.lat, lng: DURBAN.berea.lng, radiusM: 500 },
    ],
  });

  await prisma.incidentMedia.createMany({
    data: [
      { incidentId: panic.id, fileName: 'dashcam-front.jpg', fileType: 'image/jpeg', fileUrl: '/evidence/dashcam-front.jpg' },
      { incidentId: panic.id, fileName: 'incident-notes.pdf', fileType: 'application/pdf', fileUrl: '/evidence/incident-notes.pdf' },
    ],
  });

  const theftIncident = await prisma.incident.findFirst({
    where: { tenantId: tenant.id, type: IncidentType.THEFT },
  });

  await prisma.document.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.documentFolder.deleteMany({ where: { tenantId: tenant.id } });

  const folderOps = await prisma.documentFolder.create({
    data: {
      tenantId: tenant.id,
      name: 'Operations',
      description: 'Incident files, dispatch records, and field evidence',
      sortOrder: 1,
    },
  });
  const folderEvidence = await prisma.documentFolder.create({
    data: {
      tenantId: tenant.id,
      parentId: folderOps.id,
      name: 'Incident Evidence',
      sortOrder: 1,
    },
  });
  await prisma.documentFolder.create({
    data: {
      tenantId: tenant.id,
      name: 'Policies & Compliance',
      description: 'SOPs, legal, and training material',
      sortOrder: 2,
    },
  });
  const folderClients = await prisma.documentFolder.create({
    data: {
      tenantId: tenant.id,
      name: 'Client Records',
      description: 'Membership and client documentation',
      sortOrder: 3,
    },
  });

  await prisma.document.createMany({
    data: [
      {
        tenantId: tenant.id,
        folderId: folderEvidence.id,
        incidentId: panic.id,
        category: 'INCIDENT_EVIDENCE',
        title: 'Morningside Panic — CCTV Still',
        description: 'Front gate camera capture at time of panic alert',
        fileName: 'morningside-cctv-still.jpg',
        fileType: 'image/jpeg',
        fileUrl: '/evidence/dashcam-front.jpg',
        fileSizeKb: 842,
        tags: ['cctv', 'panic', 'morningside'],
        uploadedBy: 'Demo Admin',
        isPinned: true,
      },
      {
        tenantId: tenant.id,
        folderId: folderEvidence.id,
        incidentId: panic.id,
        category: 'DISPATCH_REPORT',
        title: 'Panic Dispatch Log',
        description: 'Auto-assign and officer acknowledgement timeline',
        fileName: 'panic-dispatch-log.pdf',
        fileType: 'application/pdf',
        fileUrl: '/evidence/incident-notes.pdf',
        fileSizeKb: 156,
        tags: ['dispatch', 'panic'],
        uploadedBy: 'Control Room',
      },
      {
        tenantId: tenant.id,
        folderId: folderEvidence.id,
        incidentId: theftIncident?.id,
        category: 'INCIDENT_EVIDENCE',
        title: 'Stolen Hilux — Tracker Route Export',
        description: 'GPS trail from Berea to Pinetown corridor',
        fileName: 'hilux-tracker-export.pdf',
        fileType: 'application/pdf',
        fileUrl: '/evidence/tracker-export.pdf',
        fileSizeKb: 420,
        tags: ['theft', 'vehicle', 'tracker'],
        uploadedBy: 'Sipho Ndlovu',
        isPinned: true,
      },
      {
        tenantId: tenant.id,
        folderId: folderClients.id,
        category: 'CLIENT_RECORD',
        title: 'Sarah Johnson — Membership Agreement',
        description: 'Signed 4DS Essential plan agreement',
        fileName: 'johnson-membership.pdf',
        fileType: 'application/pdf',
        fileUrl: '/documents/johnson-membership.pdf',
        fileSizeKb: 280,
        tags: ['client', 'membership'],
        uploadedBy: 'Demo Admin',
      },
      {
        tenantId: tenant.id,
        category: 'POLICY_SOP',
        title: 'Armed Response SOP v3.2',
        description: 'Standard operating procedures for panic and theft recovery',
        fileName: 'armed-response-sop.pdf',
        fileType: 'application/pdf',
        fileUrl: '/documents/sop-armed-response.pdf',
        fileSizeKb: 1240,
        tags: ['sop', 'policy'],
        uploadedBy: 'Demo Admin',
        isPinned: true,
      },
      {
        tenantId: tenant.id,
        category: 'OFFICER_REPORT',
        title: 'Ndlovu — Field Report Template',
        description: 'Blank officer incident report form',
        fileName: 'officer-field-report.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileUrl: '/documents/officer-report-template.docx',
        fileSizeKb: 95,
        tags: ['officer', 'template'],
        uploadedBy: 'Demo Admin',
      },
    ],
  });

  await prisma.notification.deleteMany({ where: { userId: client.id } });
  await prisma.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: client.id, type: 'SYSTEM', title: 'Essential plan active', body: 'Upgrade home or vehicle add-ons from Subscription', isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'PANIC_ALERT', title: 'Panic drill completed', body: 'System test successful', isRead: true },
      { tenantId: tenant.id, userId: client.id, type: 'FAMILY_ALERT', title: 'James entered Safe Zone', body: 'School zone — arrived 07:42', isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'THEFT_ALERT', title: 'Vehicle geofence alert', body: `${vehicle.registration} left designated zone`, isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'SYSTEM', title: 'Community alert', body: 'Increased patrols in Morningside tonight', isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'INCIDENT_UPDATE', title: 'Officer Ndlovu en route', body: 'Unit-001 responding to Morningside panic', isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'SYSTEM', title: 'Subscription renewal', body: 'Essential plan billing reminder — payment due 15 Jun', isRead: false },
      { tenantId: tenant.id, userId: client.id, type: 'PANIC_ALERT', title: 'Silent panic test', body: 'Covert distress signal — no audible alarm', isRead: false },
    ],
  });

  const conversation = await prisma.conversation.create({
    data: { tenantId: tenant.id, subject: 'Support', type: ConversationType.SUPPORT },
  });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderUserId: admin.id,
      content: 'Welcome to 4DS Solutions. Dispatch is available 24/7. How can we help?',
    },
  });

  const internalChat = await prisma.conversation.upsert({
    where: { id: '00000000-0000-4000-8000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000010',
      tenantId: tenant.id,
      subject: 'Internal Chat',
      type: ConversationType.INTERNAL,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: internalChat.id,
        senderUserId: dispatcher.id,
        content: 'Welcome to the internal team channel. All staff and clients can communicate here.',
      },
      {
        conversationId: internalChat.id,
        senderUserId: admin.id,
        content: 'Durban Alpha and Bravo teams are now active. Check Teams & Users to manage assignments.',
      },
    ],
  });

  const sales = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'sales@4ds.local' } },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.SALES,
      jobTitle: 'Sales Consultant',
      firstName: 'Nadia',
      lastName: 'Botha',
      phone: '+27 82 100 0040',
      branchId: durbanBranch.id,
    },
    create: {
      tenantId: tenant.id,
      email: 'sales@4ds.local',
      passwordHash,
      firstName: 'Nadia',
      lastName: 'Botha',
      role: UserRole.SALES,
      jobTitle: 'Sales Consultant',
      phone: '+27 82 100 0040',
      status: UserStatus.ACTIVE,
      branchId: durbanBranch.id,
    },
  });

  const installTeam = await prisma.team.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: { name: 'Install Tech Unit', branchId: durbanBranch.id },
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      tenantId: tenant.id,
      branchId: durbanBranch.id,
      name: 'Install Tech Unit',
    },
  });

  const technicianDefs = [
    {
      email: 'tech.cameras@4ds.local',
      firstName: 'Marcus',
      lastName: 'Dlamini',
      jobTitle: 'CCTV Install Technician',
      phone: '+27 82 200 0001',
      isLead: true,
    },
    {
      email: 'tech.alarms@4ds.local',
      firstName: 'Priya',
      lastName: 'Naidoo',
      jobTitle: 'Alarm Systems Technician',
      phone: '+27 82 200 0002',
      isLead: false,
    },
    {
      email: 'tech.access@4ds.local',
      firstName: 'Johan',
      lastName: 'Steyn',
      jobTitle: 'Access Control Technician',
      phone: '+27 82 200 0003',
      isLead: false,
    },
  ] as const;

  const technicians = [];
  for (const t of technicianDefs) {
    const techUser = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: t.email } },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.TECHNICIAN,
        jobTitle: t.jobTitle,
        firstName: t.firstName,
        lastName: t.lastName,
        phone: t.phone,
        branchId: durbanBranch.id,
      },
      create: {
        tenantId: tenant.id,
        email: t.email,
        passwordHash,
        firstName: t.firstName,
        lastName: t.lastName,
        role: UserRole.TECHNICIAN,
        jobTitle: t.jobTitle,
        phone: t.phone,
        status: UserStatus.ACTIVE,
        branchId: durbanBranch.id,
      },
    });
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: installTeam.id, userId: techUser.id } },
      update: { isLead: t.isLead },
      create: { teamId: installTeam.id, userId: techUser.id, isLead: t.isLead },
    });
    technicians.push(techUser);
  }

  await prisma.storeOrderItem.deleteMany({
    where: { order: { tenantId: tenant.id } },
  });
  await prisma.storeOrder.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.stockRequest.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.salesLead.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.installJob.deleteMany({ where: { tenantId: tenant.id } });

  const productDefs = [
    // FIREARMS
    {
      sku: 'GUN-9MM',
      name: '9mm Duty Sidearm Package',
      description: 'Licensed security firearm package with holster, 3 magazines, and SAPS compliance docs. Firearm licence required.',
      category: ProductCategory.FIREARMS,
      priceCents: 1250000,
      stock: 8,
      imageEmoji: '🔫',
      featured: true,
      requiresLicense: true,
    },
    {
      sku: 'GUN-12GA',
      name: '12ga Pump-Action Shotgun',
      description: 'Security shotgun for site armoury issue — sling, ammo pouch, and licence paperwork included.',
      category: ProductCategory.FIREARMS,
      priceCents: 980000,
      stock: 5,
      imageEmoji: '🔫',
      featured: false,
      requiresLicense: true,
    },
    // BODY_ARMOUR
    {
      sku: 'VEST-LVL3',
      name: 'Level IIIA Tactical Vest',
      description: 'Lightweight soft armor vest with MOLLE panels for patrol and response teams.',
      category: ProductCategory.BODY_ARMOUR,
      priceCents: 459900,
      stock: 24,
      imageEmoji: '🦺',
      featured: true,
    },
    {
      sku: 'VEST-PLT',
      name: 'Plate Carrier + Ceramic Plates',
      description: 'Modular plate carrier with Level IV ceramic inserts for high-threat deployments.',
      category: ProductCategory.BODY_ARMOUR,
      priceCents: 789900,
      stock: 12,
      imageEmoji: '🛡️',
      featured: true,
    },
    // PERSONAL_SECURITY
    {
      sku: 'BATON-26',
      name: 'Expandable Baton 26"',
      description: 'Steel expandable baton with textured grip and duty belt holster.',
      category: ProductCategory.PERSONAL_SECURITY,
      priceCents: 89900,
      stock: 40,
      imageEmoji: '🪄',
      featured: false,
    },
    {
      sku: 'CED-X2',
      name: 'Conducted Energy Device (CED)',
      description: 'Dual-shot CED with duty holster, spare cartridges, and training documentation. Licence required.',
      category: ProductCategory.PERSONAL_SECURITY,
      priceCents: 689900,
      stock: 15,
      imageEmoji: '⚡',
      featured: false,
      requiresLicense: true,
    },
    {
      sku: 'PEPPER-MK3',
      name: 'Pepper Spray MK-3 Duty',
      description: 'PSIRA-approved OC spray with flip-top safety and belt clip for guards.',
      category: ProductCategory.PERSONAL_SECURITY,
      priceCents: 24900,
      stock: 80,
      imageEmoji: '🧯',
      featured: false,
    },
    // CCTV
    {
      sku: 'CCTV-4K8',
      name: '4K 8-Channel CCTV Kit',
      description: '8x 4K bullet cameras, NVR, 2TB storage, night vision, and remote app access.',
      category: ProductCategory.CCTV,
      priceCents: 1499900,
      stock: 18,
      imageEmoji: '📷',
      featured: true,
    },
    {
      sku: 'CCTV-DOME',
      name: 'PTZ Dome Camera Pro',
      description: 'Weatherproof PTZ dome with 30x optical zoom for perimeter monitoring.',
      category: ProductCategory.CCTV,
      priceCents: 899900,
      stock: 10,
      imageEmoji: '🎥',
      featured: false,
    },
    // NVR_STORAGE
    {
      sku: 'NVR-16CH',
      name: '16-Channel NVR 4K',
      description: '16-channel PoE NVR with 4K recording, RAID-ready bays, and mobile push alerts.',
      category: ProductCategory.NVR_STORAGE,
      priceCents: 699900,
      stock: 14,
      imageEmoji: '💾',
      featured: false,
    },
    {
      sku: 'HDD-4TB',
      name: '4TB Surveillance HDD',
      description: 'Purpose-built CCTV hard drive rated for 24/7 write-heavy NVR workloads.',
      category: ProductCategory.NVR_STORAGE,
      priceCents: 189900,
      stock: 35,
      imageEmoji: '🗄️',
      featured: false,
    },
    // SMART_HOME
    {
      sku: 'SMART-HUB',
      name: 'Smart Home Security Hub',
      description: 'Wi-Fi hub linking cameras, door sensors, and sirens with app and Alexa/Google support.',
      category: ProductCategory.SMART_HOME,
      priceCents: 249900,
      stock: 22,
      imageEmoji: '🏠',
      featured: false,
    },
    {
      sku: 'SMART-LOCK',
      name: 'Smart Deadbolt Lock',
      description: 'Keypad + app deadbolt with temporary guest codes — ideal for Airbnb and offices.',
      category: ProductCategory.SMART_HOME,
      priceCents: 329900,
      stock: 16,
      imageEmoji: '🔐',
      featured: false,
    },
    // ALARMS
    {
      sku: 'ALRM-PX8',
      name: 'Paradox MG5050 8-Zone Kit',
      description: 'Paradox-compatible 8-zone wireless kit with keypad, PIR, door contact, and siren.',
      category: ProductCategory.ALARMS,
      priceCents: 549900,
      stock: 20,
      imageEmoji: '🚨',
      featured: true,
    },
    {
      sku: 'ALRM-DSC',
      name: 'DSC PowerSeries Neo Panel',
      description: 'DSC-compatible hybrid panel with cellular communicator and LCD keypad.',
      category: ProductCategory.ALARMS,
      priceCents: 429900,
      stock: 12,
      imageEmoji: '🔔',
      featured: false,
    },
    // SENSORS
    {
      sku: 'SENS-PIR',
      name: 'Pet-Immune PIR Detector',
      description: 'Dual-tech PIR for residential and commercial zones — Paradox/DSC compatible.',
      category: ProductCategory.SENSORS,
      priceCents: 45900,
      stock: 75,
      imageEmoji: '👁️',
      featured: false,
    },
    {
      sku: 'SENS-DOOR',
      name: 'Magnetic Door Contact Pair',
      description: 'Surface-mount reed switch contacts for windows and doors — wired or wireless ready.',
      category: ProductCategory.SENSORS,
      priceCents: 8900,
      stock: 120,
      imageEmoji: '🧲',
      featured: false,
    },
    // ELECTRIC_FENCING
    {
      sku: 'EF-ENERG',
      name: '8 Joule Fence Energiser',
      description: 'Nemtek-style 8J energiser with LCD monitoring and earth spike kit for suburban plots.',
      category: ProductCategory.ELECTRIC_FENCING,
      priceCents: 389900,
      stock: 18,
      imageEmoji: '⚡',
      featured: true,
    },
    {
      sku: 'EF-WIRE',
      name: 'HT Fence Wire 500m Coil',
      description: 'High-tensile galvanised fencing wire coil for multi-line electric fence installs.',
      category: ProductCategory.ELECTRIC_FENCING,
      priceCents: 129900,
      stock: 40,
      imageEmoji: '🧵',
      featured: false,
    },
    // PERIMETER
    {
      sku: 'PER-BEAM',
      name: '100m Dual Photo Beam',
      description: 'Outdoor IR photo beams for driveway and boundary intrusion detection.',
      category: ProductCategory.PERIMETER,
      priceCents: 219900,
      stock: 25,
      imageEmoji: '📡',
      featured: false,
    },
    {
      sku: 'PER-SPIKE',
      name: 'Wall Spike Strip 1.5m',
      description: 'Galvanised wall-top spikes for residential and industrial boundary hardening.',
      category: ProductCategory.PERIMETER,
      priceCents: 34900,
      stock: 90,
      imageEmoji: '🔺',
      featured: false,
    },
    // ACCESS_CONTROL
    {
      sku: 'ACC-BIO',
      name: 'Biometric Fingerprint Reader',
      description: 'IP65 fingerprint + RFID reader with Wiegand and TCP/IP for offices and sites.',
      category: ProductCategory.ACCESS_CONTROL,
      priceCents: 459900,
      stock: 15,
      imageEmoji: '👆',
      featured: true,
    },
    {
      sku: 'ACC-CTRL',
      name: '2-Door Access Controller',
      description: 'Networked two-door controller with free software and backup battery support.',
      category: ProductCategory.ACCESS_CONTROL,
      priceCents: 379900,
      stock: 10,
      imageEmoji: '🗝️',
      featured: false,
    },
    // GATES
    {
      sku: 'GATE-BOOM',
      name: 'Boom Gate Barrier 4m',
      description: 'Automatic boom barrier with loop detectors and remote — estate & parking ready.',
      category: ProductCategory.GATES,
      priceCents: 1899900,
      stock: 6,
      imageEmoji: '🚧',
      featured: true,
    },
    {
      sku: 'GATE-SLIDE',
      name: 'Sliding Gate Motor Kit',
      description: 'Heavy-duty sliding gate operator with remotes, IR beams, and battery backup.',
      category: ProductCategory.GATES,
      priceCents: 899900,
      stock: 11,
      imageEmoji: '🚪',
      featured: false,
    },
    // INTERCOMS
    {
      sku: 'INT-VIDEO',
      name: 'Video Door Intercom Kit',
      description: 'Colour video intercom with outdoor station, indoor monitor, and unlock relay.',
      category: ProductCategory.INTERCOMS,
      priceCents: 349900,
      stock: 18,
      imageEmoji: '📞',
      featured: false,
    },
    {
      sku: 'ACC-RADIO',
      name: 'Digital Two-Way Radio',
      description: 'Encrypted digital radio with earpiece — control room and guard compatible.',
      category: ProductCategory.GUARD_EQUIPMENT,
      priceCents: 249900,
      stock: 30,
      imageEmoji: '📻',
      featured: false,
    },
    // GUARD_EQUIPMENT
    {
      sku: 'GEAR-HELMET',
      name: 'Ballistic Helmet',
      description: 'PASGT-style ballistic helmet with rail mounts and NVG shroud.',
      category: ProductCategory.GUARD_EQUIPMENT,
      priceCents: 329900,
      stock: 20,
      imageEmoji: '⛑️',
      featured: false,
    },
    {
      sku: 'GEAR-CUFFS',
      name: 'Duty Handcuff Set',
      description: 'Double-lock steel handcuffs with key and pouch.',
      category: ProductCategory.GUARD_EQUIPMENT,
      priceCents: 34900,
      stock: 60,
      imageEmoji: '🔗',
      featured: false,
    },
    // GUARD_TOUR
    {
      sku: 'TOUR-NFC',
      name: 'NFC Guard Tour System',
      description: 'Handheld NFC reader with wall tags and cloud reports for patrol verification.',
      category: ProductCategory.GUARD_TOUR,
      priceCents: 599900,
      stock: 9,
      imageEmoji: '📍',
      featured: false,
    },
    {
      sku: 'TOUR-TAG',
      name: 'Guard Tour Tag Pack (20)',
      description: 'Weatherproof NFC checkpoint tags for fences, gates, and plant rooms.',
      category: ProductCategory.GUARD_TOUR,
      priceCents: 89900,
      stock: 30,
      imageEmoji: '🏷️',
      featured: false,
    },
    // VEHICLE_SECURITY
    {
      sku: 'VEH-TRACK',
      name: 'GPS Fleet Tracker OBD',
      description: 'OBD-II GPS tracker with geofencing, immobiliser relay, and SA SIM support.',
      category: ProductCategory.VEHICLE_SECURITY,
      priceCents: 199900,
      stock: 28,
      imageEmoji: '🚗',
      featured: false,
    },
    {
      sku: 'VEH-DASH',
      name: 'Dual Dash Cam Full HD',
      description: 'Front/rear dash cam with night vision, parking mode, and 128GB card.',
      category: ProductCategory.VEHICLE_SECURITY,
      priceCents: 279900,
      stock: 20,
      imageEmoji: '📹',
      featured: false,
    },
    // LIGHTING
    {
      sku: 'LIGHT-FL',
      name: '50W LED Floodlight PIR',
      description: 'IP65 LED flood with motion sensor for driveway and yard lighting.',
      category: ProductCategory.LIGHTING,
      priceCents: 89900,
      stock: 45,
      imageEmoji: '💡',
      featured: false,
    },
    {
      sku: 'LIGHT-SOL',
      name: 'Solar Security Flood Pair',
      description: 'Wireless solar LED floods with remote — no trenching for remote boundaries.',
      category: ProductCategory.LIGHTING,
      priceCents: 149900,
      stock: 32,
      imageEmoji: '☀️',
      featured: false,
    },
    // NETWORKING
    {
      sku: 'NET-POE8',
      name: '8-Port PoE+ Switch',
      description: 'Gigabit PoE+ switch for IP cameras and access readers — fanless metal case.',
      category: ProductCategory.NETWORKING,
      priceCents: 229900,
      stock: 22,
      imageEmoji: '🔌',
      featured: false,
    },
    {
      sku: 'NET-CABLE',
      name: 'Cat6 UTP Cable 305m',
      description: 'Outdoor-rated Cat6 box for CCTV and access control backbone runs.',
      category: ProductCategory.NETWORKING,
      priceCents: 189900,
      stock: 15,
      imageEmoji: '🧶',
      featured: false,
    },
    // POWER
    {
      sku: 'PWR-UPS',
      name: '1.5kVA Line-Interactive UPS',
      description: 'UPS for NVR, alarm panel, and gate motors during load shedding.',
      category: ProductCategory.POWER,
      priceCents: 349900,
      stock: 14,
      imageEmoji: '🔋',
      featured: false,
    },
    {
      sku: 'PWR-BAT12',
      name: '12V 7Ah Alarm Battery',
      description: 'Sealed lead-acid battery for Paradox/DSC panels and fence energisers.',
      category: ProductCategory.POWER,
      priceCents: 29900,
      stock: 100,
      imageEmoji: '⚡',
      featured: false,
    },
    // INSTALL_MATERIALS
    {
      sku: 'MAT-CONDUIT',
      name: '20mm PVC Conduit Bundle',
      description: '50x 3m conduit lengths with couplings for clean CCTV cable runs.',
      category: ProductCategory.INSTALL_MATERIALS,
      priceCents: 79900,
      stock: 40,
      imageEmoji: '📦',
      featured: false,
    },
    {
      sku: 'MAT-JUNCT',
      name: 'IP65 Junction Box Pack (10)',
      description: 'Weatherproof junction boxes for outdoor camera and beam terminations.',
      category: ProductCategory.INSTALL_MATERIALS,
      priceCents: 45900,
      stock: 55,
      imageEmoji: '🧰',
      featured: false,
    },
    // TOOLS
    {
      sku: 'TOOL-CRIMP',
      name: 'RJ45 Crimp Tool Kit',
      description: 'Professional crimper with tester, stripper, and 100 Cat6 plugs.',
      category: ProductCategory.TOOLS,
      priceCents: 69900,
      stock: 25,
      imageEmoji: '🔧',
      featured: false,
    },
    {
      sku: 'TOOL-DRILL',
      name: 'Cordless Hammer Drill 18V',
      description: 'Brushless hammer drill kit for masonry anchors and camera brackets.',
      category: ProductCategory.TOOLS,
      priceCents: 329900,
      stock: 12,
      imageEmoji: '🛠️',
      featured: false,
    },
    // TECH_EQUIPMENT
    {
      sku: 'TECH-LAPTOP',
      name: 'Field Tech Laptop Rugged',
      description: 'Ruggedised laptop for site commissioning, NVR setup, and diagnostics.',
      category: ProductCategory.TECH_EQUIPMENT,
      priceCents: 1899900,
      stock: 6,
      imageEmoji: '💻',
      featured: false,
    },
    {
      sku: 'TECH-TEST',
      name: 'CCTV Cable Tester Pro',
      description: 'Multifunction tester for BNC, RJ45, PoE voltage, and PTZ control.',
      category: ProductCategory.TECH_EQUIPMENT,
      priceCents: 159900,
      stock: 14,
      imageEmoji: '📟',
      featured: false,
    },
    // SAFES
    {
      sku: 'SAFE-GUN',
      name: 'SABS Gun Safe 5-Rifle',
      description: 'SABS-rated firearm safe with dual-key lock and interior ammo shelf.',
      category: ProductCategory.SAFES,
      priceCents: 899900,
      stock: 7,
      imageEmoji: '🗄️',
      featured: false,
    },
    {
      sku: 'SAFE-WALL',
      name: 'Wall Safe Digital Lock',
      description: 'Concealed wall safe with electronic keypad for keys, cash, and docs.',
      category: ProductCategory.SAFES,
      priceCents: 249900,
      stock: 15,
      imageEmoji: '🔒',
      featured: false,
    },
    // LOCKS
    {
      sku: 'LOCK-CYL',
      name: 'High-Security Cylinder Set',
      description: 'Anti-bump euro cylinders with 5 keyed-alike keys for office suites.',
      category: ProductCategory.LOCKS,
      priceCents: 89900,
      stock: 40,
      imageEmoji: '🔑',
      featured: false,
    },
    {
      sku: 'LOCK-PAD',
      name: 'Shutter Padlock Heavy Duty',
      description: 'Closed-shackle padlock for roller shutters and container yards.',
      category: ProductCategory.LOCKS,
      priceCents: 45900,
      stock: 50,
      imageEmoji: '🔐',
      featured: false,
    },
    // PHYSICAL_PERIMETER
    {
      sku: 'PHYS-MESH',
      name: 'Clearvu Mesh Panel 2.4m',
      description: 'Anti-climb clearvu mesh panel for estates and commercial yards.',
      category: ProductCategory.PHYSICAL_PERIMETER,
      priceCents: 189900,
      stock: 60,
      imageEmoji: '🧱',
      featured: false,
    },
    {
      sku: 'PHYS-RAZOR',
      name: 'Razor Coil Concertina 10m',
      description: 'Galvanised razor coil for wall-top and fence topping deterrence.',
      category: ProductCategory.PHYSICAL_PERIMETER,
      priceCents: 79900,
      stock: 35,
      imageEmoji: '⛓️',
      featured: false,
    },
    // FIRE_SAFETY
    {
      sku: 'FIRE-EXT',
      name: '4.5kg Dry Powder Extinguisher',
      description: 'SABS-approved ABC extinguisher with wall bracket for offices and control rooms.',
      category: ProductCategory.FIRE_SAFETY,
      priceCents: 54900,
      stock: 40,
      imageEmoji: '🧯',
      featured: false,
    },
    {
      sku: 'FIRE-ALARM',
      name: 'Addressable Fire Panel Kit',
      description: '4-zone fire panel with smoke detectors, call points, and sounders.',
      category: ProductCategory.FIRE_SAFETY,
      priceCents: 1299900,
      stock: 5,
      imageEmoji: '🔥',
      featured: false,
    },
    // PACKAGES
    {
      sku: 'PKG-HOME',
      name: 'Home Security Starter Package',
      description: 'Alarm kit + 4 cameras + electric fence energiser — turnkey residential bundle.',
      category: ProductCategory.PACKAGES,
      priceCents: 2499900,
      stock: 8,
      imageEmoji: '🎁',
      featured: true,
    },
    {
      sku: 'PKG-ESTATE',
      name: 'Estate Perimeter Package',
      description: 'Boom gate, biometric access, 16-ch CCTV, and photo beams for complex entrances.',
      category: ProductCategory.PACKAGES,
      priceCents: 8999900,
      stock: 3,
      imageEmoji: '🏘️',
      featured: true,
    },
    // CONTROL_ROOM
    {
      sku: 'CR-MONITOR',
      name: '55" 4K Video Wall Display',
      description: 'Commercial 4K monitor for control room mosaics and NVR live views.',
      category: ProductCategory.CONTROL_ROOM,
      priceCents: 1299900,
      stock: 8,
      imageEmoji: '🖥️',
      featured: false,
    },
    {
      sku: 'CR-CONSOLE',
      name: 'Control Room Console Desk',
      description: 'Ergonomic dual-operator desk with cable management and monitor arms.',
      category: ProductCategory.CONTROL_ROOM,
      priceCents: 2499900,
      stock: 4,
      imageEmoji: '🪑',
      featured: false,
    },
    // SIGNS
    {
      sku: 'SIGN-CCTV',
      name: 'CCTV Warning Sign Pack (10)',
      description: 'UV-printed aluminium CCTV warning signs for gates and walls.',
      category: ProductCategory.SIGNS,
      priceCents: 24900,
      stock: 70,
      imageEmoji: '🪧',
      featured: false,
    },
    {
      sku: 'SIGN-ARMED',
      name: 'Armed Response Decal Kit',
      description: 'Reflective armed response stickers for vehicles, panels, and street poles.',
      category: ProductCategory.SIGNS,
      priceCents: 14900,
      stock: 100,
      imageEmoji: '⚠️',
      featured: false,
    },
    // INSPECTION
    {
      sku: 'INSP-DRONE',
      name: 'Inspection Drone Kit',
      description: 'Quadcopter with 4K camera for roof, fence-line, and site survey inspections.',
      category: ProductCategory.INSPECTION,
      priceCents: 1599900,
      stock: 5,
      imageEmoji: '🚁',
      featured: false,
    },
    {
      sku: 'INSP-ENDO',
      name: 'Borescope Inspection Camera',
      description: 'Flexible endoscope for wall cavities, conduits, and vehicle searches.',
      category: ProductCategory.INSPECTION,
      priceCents: 189900,
      stock: 12,
      imageEmoji: '🔍',
      featured: false,
    },
    // CYBER
    {
      sku: 'CYB-FW',
      name: 'Business Firewall Appliance',
      description: 'UTM firewall with VPN, IDS, and content filter for site networks.',
      category: ProductCategory.CYBER,
      priceCents: 899900,
      stock: 7,
      imageEmoji: '🛡️',
      featured: false,
    },
    {
      sku: 'CYB-CAMSEC',
      name: 'CCTV Network Hardening Pack',
      description: 'VLAN switch config, camera firmware audit, and password vault for IP systems.',
      category: ProductCategory.CYBER,
      priceCents: 349900,
      stock: 15,
      imageEmoji: '🔐',
      featured: false,
    },
    // SPARE_PARTS
    {
      sku: 'SPR-SIREN',
      name: 'Outdoor Piezo Siren 120dB',
      description: 'Weatherproof backup siren for Paradox/DSC and fence systems.',
      category: ProductCategory.SPARE_PARTS,
      priceCents: 39900,
      stock: 55,
      imageEmoji: '📢',
      featured: false,
    },
    {
      sku: 'SPR-REMOTE',
      name: '4-Button Alarm Remote Pair',
      description: 'Compatible remotes for Paradox Magellan and DSC wireless systems.',
      category: ProductCategory.SPARE_PARTS,
      priceCents: 29900,
      stock: 80,
      imageEmoji: '🎮',
      featured: false,
    },
  ];

  const products = [];
  for (const p of productDefs) {
    products.push(
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          category: p.category,
          priceCents: p.priceCents,
          stock: p.stock,
          imageEmoji: p.imageEmoji,
          featured: p.featured,
          requiresLicense: 'requiresLicense' in p ? Boolean(p.requiresLicense) : false,
          isActive: true,
        },
      }),
    );
  }

  const cctvKit = products.find((p) => p.sku === 'CCTV-4K8')!;
  const vest = products.find((p) => p.sku === 'VEST-LVL3')!;

  await prisma.storeOrder.create({
    data: {
      tenantId: tenant.id,
      orderNumber: 'GEAR-DEMO001',
      customerName: 'Umhlanga Estate Security',
      customerEmail: 'ops@umhlanga-estate.demo',
      customerPhone: '+27 31 555 0100',
      shippingAddress: '12 Lagoon Drive, Umhlanga Rocks',
      status: StoreOrderStatus.PROCESSING,
      subtotalCents: cctvKit.priceCents + vest.priceCents,
      totalCents: cctvKit.priceCents + vest.priceCents,
      salesUserId: sales.id,
      notes: 'Includes install booking request',
      items: {
        create: [
          {
            productId: cctvKit.id,
            productName: cctvKit.name,
            unitPriceCents: cctvKit.priceCents,
            quantity: 1,
            lineTotalCents: cctvKit.priceCents,
          },
          {
            productId: vest.id,
            productName: vest.name,
            unitPriceCents: vest.priceCents,
            quantity: 1,
            lineTotalCents: vest.priceCents,
          },
        ],
      },
    },
  });

  await prisma.salesLead.createMany({
    data: [
      {
        tenantId: tenant.id,
        ownerUserId: sales.id,
        companyName: 'Pinetown Logistics Hub',
        contactName: 'Derek Pillay',
        contactEmail: 'derek@pinetown-logistics.demo',
        contactPhone: '+27 31 555 2200',
        source: 'Website',
        status: SalesLeadStatus.QUALIFIED,
        interest: 'CCTV + access control for warehouse',
        estimatedCents: 2850000,
        notes: 'Site survey booked for Friday',
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: tenant.id,
        ownerUserId: sales.id,
        companyName: 'Berea Medical Centre',
        contactName: 'Dr. Anne Kruger',
        contactEmail: 'admin@berea-med.demo',
        contactPhone: '+27 31 555 3300',
        source: 'Referral',
        status: SalesLeadStatus.QUOTED,
        interest: 'Panic buttons + CCTV kit',
        estimatedCents: 1899900,
        notes: 'Quote sent — waiting on board approval',
        nextFollowUp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: tenant.id,
        ownerUserId: sales.id,
        companyName: null,
        contactName: 'Thabo Molefe',
        contactEmail: 'thabo.molefe@demo.local',
        contactPhone: '+27 82 555 4411',
        source: 'Store Order',
        status: SalesLeadStatus.NEW,
        interest: 'Tactical vest + baton',
        estimatedCents: 549800,
        notes: 'Walk-in interest from gear store',
      },
    ],
  });

  const [camTech, alarmTech, accessTech] = technicians;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const domeCam = products.find((p) => p.sku === 'CCTV-DOME')!;
  const radio = products.find((p) => p.sku === 'ACC-RADIO')!;

  await prisma.stockRequest.createMany({
    data: [
      {
        tenantId: tenant.id,
        requesterId: camTech.id,
        productId: cctvKit.id,
        quantity: 1,
        status: 'PENDING',
        notes: 'Umhlanga Estate 8-cam install — need spare NVR kit',
      },
      {
        tenantId: tenant.id,
        requesterId: alarmTech.id,
        productId: domeCam.id,
        quantity: 2,
        status: 'APPROVED',
        notes: 'Morningside panel upgrade — exterior coverage',
      },
      {
        tenantId: tenant.id,
        requesterId: accessTech.id,
        productId: radio.id,
        quantity: 1,
        status: 'FULFILLED',
        notes: 'Pinetown warehouse site radio',
        fulfilledAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
  });

  const techChat = await prisma.conversation.upsert({
    where: { id: '00000000-0000-4000-8000-0000000000c1' },
    update: {
      subject: 'Install Tech Unit — Team Chat',
      type: 'TECH_TEAM',
      teamId: installTeam.id,
    },
    create: {
      id: '00000000-0000-4000-8000-0000000000c1',
      tenantId: tenant.id,
      teamId: installTeam.id,
      subject: 'Install Tech Unit — Team Chat',
      type: 'TECH_TEAM',
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: techChat.id } });
  await prisma.message.createMany({
    data: [
      {
        conversationId: techChat.id,
        senderUserId: camTech.id,
        content: 'Morning team — Umhlanga CCTV kit is staged. Priya, can you bring 2 spare PIRs tomorrow?',
        createdAt: new Date(Date.now() - 1000 * 60 * 55),
      },
      {
        conversationId: techChat.id,
        senderUserId: alarmTech.id,
        content: 'Copy. Morningside panel walk-test done — fence zone still noisy. Requested PTZ dome from inventory.',
        createdAt: new Date(Date.now() - 1000 * 60 * 40),
      },
      {
        conversationId: techChat.id,
        senderUserId: accessTech.id,
        content: 'Pinetown readers arrive day after tomorrow. Radio request already fulfilled.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
      },
    ],
  });

  await prisma.installJob.createMany({
    data: [
      {
        tenantId: tenant.id,
        technicianId: camTech.id,
        title: '8-camera CCTV install — Umhlanga Estate',
        description: 'Mount bullet cameras, configure NVR, train site manager on app.',
        jobType: 'CCTV Installation',
        status: InstallJobStatus.SCHEDULED,
        clientName: 'Umhlanga Estate Security',
        clientPhone: '+27 31 555 0100',
        address: '12 Lagoon Drive, Umhlanga Rocks',
        scheduledAt: tomorrow,
        equipmentNotes: '4K 8-Channel Kit + 2 spare mounts',
        lat: DURBAN.umhlanga.lat,
        lng: DURBAN.umhlanga.lng,
      },
      {
        tenantId: tenant.id,
        technicianId: alarmTech.id,
        title: 'Alarm panel upgrade — Morningside residence',
        description: 'Replace legacy panel, zone walk-test, link to 4DS monitoring.',
        jobType: 'Alarm Systems',
        status: InstallJobStatus.EN_ROUTE,
        clientName: 'Sarah Johnson',
        clientPhone: '+27 82 555 1234',
        address: '45 Essenwood Road, Morningside',
        scheduledAt: new Date(),
        equipmentNotes: 'Hybrid panel + 4 PIRs + panic button',
        lat: DURBAN.morningside.lat,
        lng: DURBAN.morningside.lng,
      },
      {
        tenantId: tenant.id,
        technicianId: accessTech.id,
        title: 'Biometric access control — Pinetown warehouse',
        description: 'Install readers on 3 gates, enroll staff, sync to access software.',
        jobType: 'Access Control',
        status: InstallJobStatus.SCHEDULED,
        clientName: 'Pinetown Logistics Hub',
        clientPhone: '+27 31 555 2200',
        address: '88 Old Main Road, Pinetown',
        scheduledAt: dayAfter,
        equipmentNotes: '3 fingerprint readers + controller + backup battery',
        lat: DURBAN.pinetown.lat,
        lng: DURBAN.pinetown.lng,
      },
    ],
  });

  await prisma.clientLoyalty.upsert({
    where: { userId: client.id },
    update: {
      points: 800,
      lifetimePoints: 800,
      lifetimeSpendCents: 80000,
      tier: 'SILVER',
      manualDiscountPercent: 0,
    },
    create: {
      tenantId: tenant.id,
      userId: client.id,
      points: 800,
      lifetimePoints: 800,
      lifetimeSpendCents: 80000,
      tier: 'SILVER',
      manualDiscountPercent: 0,
    },
  });

  await prisma.clientLoyalty.upsert({
    where: { userId: familyUser2.id },
    update: {
      points: 220,
      lifetimePoints: 220,
      lifetimeSpendCents: 22000,
      tier: 'BRONZE',
    },
    create: {
      tenantId: tenant.id,
      userId: familyUser2.id,
      points: 220,
      lifetimePoints: 220,
      lifetimeSpendCents: 22000,
      tier: 'BRONZE',
    },
  });

  await prisma.discountCode.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'NEXUS10' } },
    update: {
      percentOff: 10,
      appliesTo: 'BOTH',
      isActive: true,
      description: '10% off subscriptions and store — demo promo',
    },
    create: {
      tenantId: tenant.id,
      code: 'NEXUS10',
      percentOff: 10,
      appliesTo: 'BOTH',
      isActive: true,
      description: '10% off subscriptions and store — demo promo',
    },
  });

  await prisma.discountCode.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'GEAR15' } },
    update: {
      percentOff: 15,
      appliesTo: 'STORE',
      isActive: true,
      description: '15% off Nexus store gear — demo promo',
    },
    create: {
      tenantId: tenant.id,
      code: 'GEAR15',
      percentOff: 15,
      appliesTo: 'STORE',
      isActive: true,
      description: '15% off Nexus store gear — demo promo',
    },
  });

  console.log('Seed complete:', {
    tenant: tenant.slug,
    password: 'Demo123!',
    superAdmin: 'superadmin@4ds.local',
    owner: 'owner@4ds.local',
    developer: developer.email,
    medical: 'medical@4ds.local',
    crew: 'crew@4ds.local',
    manager: 'manager@4ds.local',
    supervisor: 'supervisor@4ds.local',
    admin: 'admin@demo.local',
    dispatcher: 'dispatch@demo.local',
    sales: 'sales@4ds.local',
    technicians: technicianDefs.map((t) => t.email),
    client: 'client@demo.local',
    family: 'james@demo.local',
    pendingInvite: 'newclient@demo.local',
    inviteUrl: 'http://localhost:3010/portal/register?token=NX-DEMO01',
    inviteCode: 'NX-DEMO01',
    officer: 'ndlovu@4ds.local',
    officers: officers.length,
    products: products.length,
    branches: 2,
    teams: 3,
  });
  void superAdmin;
  void sales;
  void technicians;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

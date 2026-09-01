import type { AuthPortal, AuthSession } from '../auth';
import {
  DEMO_DEV_TICKET_EVENT,
  DEMO_ERROR_REPORTS_KEY,
  developerTicketCode,
} from '../developer-tickets';
import { dispatchVehicleFocus, type VehicleRemoteAction } from '../vehicle-remote';
import { FLEET_TEAMS, fleetTeamLabel } from '../fleet-teams';
import { getDemoCategories, getDemoProducts } from './catalog';
import { handleDeviceSecurityDemo } from './device-security';
import {
  demoAccessDoors,
  demoAlarmFeed,
  demoCompliance,
  demoPatrolRoutes,
  demoSecurityEvents,
  demoWatchlists,
  integrationsCatalog,
  psimOverviewStats,
} from './demo-psim';
import { DEMO_DISPATCH_RULES } from '../psim/integration-catalog';
import { DEMO_TENANT, demoRegisterSession, setDemoAccountPassword } from './users';
import { canManageUserPasswords } from '../password-access';
import {
  demoClientProfiles,
  demoClientVehicles,
  demoClients,
  demoMapClients,
  demoMapProperties,
  demoMapVehicles,
  demoProperties,
  demoSiteOpenEvents,
  demoSurveillanceSites,
  demoVehicleCameraFeeds,
  syncDemoPropertyAlarm,
  type DemoSurveillanceSite,
} from './demo-sites';

type DemoRequest = {
  portal?: AuthPortal;
  path: string;
  method: string;
  body?: unknown;
  session?: AuthSession | null;
};

const DURBAN = { lat: -29.8587, lng: 31.0218 };

type TechJob = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  address: string;
  jobType: string;
  serial?: string;
  tests?: { id: string; label: string; done: boolean }[];
  overrideReason?: string;
  description?: string;
  clientName?: string;
  clientPhone?: string | null;
  equipmentNotes?: string | null;
};

const techJobs: TechJob[] = [
  {
    id: 'demo-job-1',
    title: 'CCTV install — Berea residence',
    status: 'INSTALL',
    scheduledAt: new Date().toISOString(),
    address: '42 Musgrave Rd, Berea, Durban',
    jobType: 'CCTV',
    serial: 'NX-CAM-4412',
    tests: [
      { id: 'equipment', label: 'Confirm equipment', done: true },
      { id: 'access', label: 'Confirm site access', done: true },
      { id: 'mount', label: 'Mount cameras', done: true },
      { id: 'nvr', label: 'Connect NVR', done: true },
      { id: 'network', label: 'Configure network', done: false },
      { id: 'cameras', label: 'Configure cameras', done: false },
      { id: 'recording', label: 'Test recording', done: false },
      { id: 'remote', label: 'Test remote access', done: false },
      { id: 'demo', label: 'Client demonstration', done: false },
      { id: 'signoff', label: 'Client sign-off', done: false },
    ],
    clientName: 'Nomsa Client',
    clientPhone: '+27821234567',
    equipmentNotes: '4× Turret Cameras + NVR',
  },
  {
    id: 'demo-job-2',
    title: 'Alarm panel upgrade — Westville',
    status: 'EN_ROUTE',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    address: '8 Dawncliffe Rd, Westville',
    jobType: 'ALARM',
    clientName: 'James Demo',
    clientPhone: '+27829876543',
    equipmentNotes: 'Paradox Magellan panel',
  },
  {
    id: 'demo-job-3',
    title: 'Access control — Florida Rd retail',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    address: '215 Florida Rd, Morningside',
    jobType: 'ACCESS',
    clientName: 'Florida Retail CC',
    clientPhone: '+27831112233',
    equipmentNotes: '2× readers + door controller',
  },
];

type OfficerDispatch = {
  id: string;
  status: string;
  incident: {
    id: string;
    type: string;
    priority: string;
    address: string;
    client: string;
    phone: string;
    lat: number;
    lng: number;
  };
};

const officerDispatches: OfficerDispatch[] = [
  {
    id: 'demo-dispatch-1',
    status: 'EN_ROUTE',
    incident: {
      id: 'demo-inc-1',
      type: 'PANIC',
      priority: 'CRITICAL',
      address: 'Umhlanga Rocks Dr',
      client: 'Nomsa Client',
      phone: '+27821234567',
      lat: -29.728,
      lng: 31.085,
    },
  },
  {
    id: 'demo-dispatch-2',
    status: 'ASSIGNED',
    incident: {
      id: 'demo-inc-2',
      type: 'INTRUSION',
      priority: 'HIGH',
      address: 'Glenwood, Durban',
      client: 'James Demo',
      phone: '+27829876543',
      lat: -29.86,
      lng: 30.99,
    },
  },
];

function isActiveDemoIncident(status: string): boolean {
  return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(status.toUpperCase());
}

function activeDemoIncidents() {
  return demoIncidents.filter((i) => isActiveDemoIncident(i.status));
}

let orderSeq = 1001;
const demoServiceRequests: {
  id: string;
  publicRef: string;
  kind: string;
  title: string;
  status: string;
  whenLabel: string;
  summary: string;
}[] = [];
const demoIncidents: {
  id: string;
  type: string;
  status: string;
  title: string;
  isSilent: boolean;
  time: string;
  priority: string;
  user: string;
  location: string;
}[] = [
  {
    id: 'demo-inc-1',
    type: 'PANIC',
    status: 'DISPATCHED',
    title: 'Panic — Nomsa Client',
    isSilent: false,
    time: '2 min ago',
    priority: 'CRITICAL',
    user: 'Nomsa Client',
    location: 'Umhlanga Rocks Dr',
  },
  {
    id: 'demo-inc-2',
    type: 'INTRUSION',
    status: 'DISPATCHED',
    title: 'Alarm trip — Glenwood',
    isSilent: false,
    time: '18 min ago',
    priority: 'HIGH',
    user: 'James Demo',
    location: 'Glenwood, Durban',
  },
  {
    id: 'demo-inc-3',
    type: 'MEDICAL',
    status: 'IN_PROGRESS',
    title: 'Medical assist — Prospecton',
    isSilent: false,
    time: '12 min ago',
    priority: 'CRITICAL',
    user: 'Priya Naidoo',
    location: 'Prospecton industrial',
  },
  {
    id: 'demo-inc-4',
    type: 'ALARM',
    status: 'DISPATCHED',
    title: 'Perimeter alarm — Gateway',
    isSilent: false,
    time: '8 min ago',
    priority: 'MEDIUM',
    user: 'Thabo Retail',
    location: 'Gateway Theatre of Shopping',
  },
  {
    id: 'demo-inc-5',
    type: 'THEFT',
    status: 'DISPATCHED',
    title: 'Theft report — Hillcrest',
    isSilent: false,
    time: '22 min ago',
    priority: 'HIGH',
    user: 'Lerato Mokoena',
    location: 'Hillcrest farm gate',
  },
  {
    id: 'demo-inc-6',
    type: 'FIRE',
    status: 'OPEN',
    title: 'Smoke alarm — Ridge clinic',
    isSilent: false,
    time: '4 min ago',
    priority: 'CRITICAL',
    user: 'Asha Patel',
    location: 'Ridge clinic loading bay',
  },
  {
    id: 'demo-inc-7',
    type: 'OTHER',
    status: 'OPEN',
    title: 'Camera offline — rear yard',
    isSilent: false,
    time: '62 min ago',
    priority: 'LOW',
    user: 'Sarah Guest',
    location: 'Morningside',
  },
];

const demoIncidentAssignments: Record<string, string> = {
  'demo-inc-1': 'Sipho Ndlovu',
  'demo-inc-2': 'Zanele Khumalo',
  'demo-inc-3': 'Thabo Mokoena',
  'demo-inc-4': 'Lebo Dlamini',
  'demo-inc-5': 'Ruan van der Berg',
  'demo-inc-6': 'Bongani Nkosi',
};

const demoOfficerRoster = [
  {
    id: 'demo-off-1',
    firstName: 'Sipho',
    lastName: 'Ndlovu',
    status: 'EN_ROUTE',
    zone: 'Zone A',
    avgResponseSec: 241,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-1',
      callSign: 'Unit 101',
      registration: 'ND 4DS-101',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-2',
    firstName: 'Raj',
    lastName: 'Patel',
    status: 'BUSY',
    zone: 'Zone B',
    avgResponseSec: 310,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-2',
      callSign: 'Medic 1',
      registration: 'ND 4DS-ALS',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-3',
    firstName: 'John',
    lastName: 'Smith',
    status: 'AVAILABLE',
    zone: 'Zone C',
    avgResponseSec: 198,
    avatarUrl: null as string | null,
    vehicle: null as {
      id: string;
      callSign: string;
      registration: string;
      role: string;
      crewMates: { officerId: string; name: string; role: string }[];
    } | null,
  },
  {
    id: 'demo-off-4',
    firstName: 'Zanele',
    lastName: 'Khumalo',
    status: 'EN_ROUTE',
    zone: 'Zone A',
    avgResponseSec: 165,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-5',
      callSign: 'TAC 1',
      registration: 'ND 4DS-TAC',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-5',
    firstName: 'Thabo',
    lastName: 'Mokoena',
    status: 'EN_ROUTE',
    zone: 'Zone B',
    avgResponseSec: 188,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-4',
      callSign: 'Engine 1',
      registration: 'ND 4DS-FIRE',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-6',
    firstName: 'Aisha',
    lastName: 'Khan',
    status: 'AVAILABLE',
    zone: 'Zone A',
    avgResponseSec: 142,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-6',
      callSign: 'Bike 1',
      registration: 'ND 4DS-RR1',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-7',
    firstName: 'Pieter',
    lastName: 'Botha',
    status: 'AVAILABLE',
    zone: 'Zone C',
    avgResponseSec: 226,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-7',
      callSign: 'Ghost 1',
      registration: 'ND 4DS-UM1',
      role: 'DRIVER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  // Additional crew members — passengers/support roles
  {
    id: 'demo-off-8',
    firstName: 'Lebo',
    lastName: 'Dlamini',
    status: 'EN_ROUTE',
    zone: 'Zone A',
    avgResponseSec: 255,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-1',
      callSign: 'Unit 101',
      registration: 'ND 4DS-101',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-9',
    firstName: 'Naledi',
    lastName: 'Sithole',
    status: 'BUSY',
    zone: 'Zone B',
    avgResponseSec: 318,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-2',
      callSign: 'Medic 1',
      registration: 'ND 4DS-ALS',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-10',
    firstName: 'Ruan',
    lastName: 'van der Berg',
    status: 'EN_ROUTE',
    zone: 'Zone B',
    avgResponseSec: 204,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-4',
      callSign: 'Engine 1',
      registration: 'ND 4DS-FIRE',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-11',
    firstName: 'Bongani',
    lastName: 'Nkosi',
    status: 'EN_ROUTE',
    zone: 'Zone B',
    avgResponseSec: 232,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-4',
      callSign: 'Engine 1',
      registration: 'ND 4DS-FIRE',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-12',
    firstName: 'Fatima',
    lastName: 'Essop',
    status: 'AVAILABLE',
    zone: 'Zone A',
    avgResponseSec: 178,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-5',
      callSign: 'TAC 1',
      registration: 'ND 4DS-TAC',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-13',
    firstName: 'Kgosi',
    lastName: 'Motsepe',
    status: 'AVAILABLE',
    zone: 'Zone A',
    avgResponseSec: 190,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-5',
      callSign: 'TAC 1',
      registration: 'ND 4DS-TAC',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-14',
    firstName: 'Yusuf',
    lastName: 'Adams',
    status: 'AVAILABLE',
    zone: 'Zone C',
    avgResponseSec: 214,
    avatarUrl: null as string | null,
    vehicle: {
      id: 'demo-fleet-7',
      callSign: 'Ghost 1',
      registration: 'ND 4DS-UM1',
      role: 'PASSENGER',
      crewMates: [] as { officerId: string; name: string; role: string }[],
    },
  },
  {
    id: 'demo-off-15',
    firstName: 'Chantelle',
    lastName: 'Fourie',
    status: 'AVAILABLE',
    zone: 'Zone C',
    avgResponseSec: 267,
    avatarUrl: null as string | null,
    vehicle: null as {
      id: string; callSign: string; registration: string;
      role: string; crewMates: { officerId: string; name: string; role: string }[];
    } | null,
  },
  {
    id: 'demo-off-16',
    firstName: 'Siphamandla',
    lastName: 'Cele',
    status: 'AVAILABLE',
    zone: 'Zone B',
    avgResponseSec: 243,
    avatarUrl: null as string | null,
    vehicle: null as {
      id: string; callSign: string; registration: string;
      role: string; crewMates: { officerId: string; name: string; role: string }[];
    } | null,
  },
];

const OFFICER_PROFILE_KEY = '4ds-demo-officer-profiles';
let officerProfilesHydrated = false;

function persistOfficerProfiles() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      OFFICER_PROFILE_KEY,
      JSON.stringify(
        demoOfficerRoster.map((o) => ({
          id: o.id,
          firstName: o.firstName,
          lastName: o.lastName,
          zone: o.zone,
          avatarUrl: o.avatarUrl ?? null,
          status: o.status,
          avgResponseSec: o.avgResponseSec,
        })),
      ),
    );
  } catch {
    /* ignore quota */
  }
}

function hydrateOfficerProfiles() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(OFFICER_PROFILE_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw) as {
      id: string;
      firstName?: string;
      lastName?: string;
      zone?: string | null;
      avatarUrl?: string | null;
      status?: string;
      avgResponseSec?: number;
    }[];
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const existing = demoOfficerRoster.find((o) => o.id === row.id);
      if (existing) {
        if (row.firstName) existing.firstName = row.firstName;
        if (row.lastName) existing.lastName = row.lastName;
        if (row.zone !== undefined) existing.zone = row.zone ?? 'Zone A';
        if (row.avatarUrl !== undefined) existing.avatarUrl = row.avatarUrl;
        if (row.status) existing.status = row.status;
      } else if (row.firstName && row.lastName) {
        demoOfficerRoster.push({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          status: row.status ?? 'AVAILABLE',
          zone: row.zone ?? 'Zone A',
          avgResponseSec: row.avgResponseSec ?? 240,
          avatarUrl: row.avatarUrl ?? null,
          vehicle: null,
        });
      }
    }
  } catch {
    /* ignore */
  }
}

function ensureOfficerProfiles() {
  if (officerProfilesHydrated) return;
  officerProfilesHydrated = true;
  hydrateOfficerProfiles();
}

const demoDispatches: {
  id: string;
  status: string;
  officer: { id: string; name: string; status: string };
  incident: {
    id: string;
    type: string;
    status: string;
    priority?: string;
    client: string;
    address: string | null;
    latestReport: string | null;
  };
}[] = [
  {
    id: 'demo-disp-1',
    status: 'EN_ROUTE',
    officer: { id: 'demo-off-1', name: 'Sipho Ndlovu', status: 'EN_ROUTE' },
    incident: {
      id: 'demo-inc-1',
      type: 'PANIC',
      status: 'DISPATCHED',
      priority: 'CRITICAL',
      client: 'Nomsa Client',
      address: 'Umhlanga Rocks Dr',
      latestReport: 'Unit 101 en route — ETA 4 min.',
    },
  },
  {
    id: 'demo-disp-2',
    status: 'EN_ROUTE',
    officer: { id: 'demo-off-4', name: 'Zanele Khumalo', status: 'EN_ROUTE' },
    incident: {
      id: 'demo-inc-2',
      type: 'INTRUSION',
      status: 'DISPATCHED',
      priority: 'HIGH',
      client: 'James Demo',
      address: 'Glenwood, Durban',
      latestReport: 'Zanele Khumalo assigned and en route.',
    },
  },
  {
    id: 'demo-disp-3',
    status: 'ON_SCENE',
    officer: { id: 'demo-off-5', name: 'Thabo Mokoena', status: 'ON_SCENE' },
    incident: {
      id: 'demo-inc-3',
      type: 'MEDICAL',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      client: 'Priya Naidoo',
      address: 'Prospecton industrial',
      latestReport: 'On scene — paramedic assist requested.',
    },
  },
  {
    id: 'demo-disp-4',
    status: 'ACCEPTED',
    officer: { id: 'demo-off-8', name: 'Lebo Dlamini', status: 'ASSIGNED' },
    incident: {
      id: 'demo-inc-4',
      type: 'ALARM',
      status: 'DISPATCHED',
      priority: 'MEDIUM',
      client: 'Thabo Retail',
      address: 'Gateway Theatre of Shopping',
      latestReport: 'Accepted — rolling from Ballito staging.',
    },
  },
  {
    id: 'demo-disp-5',
    status: 'EN_ROUTE',
    officer: { id: 'demo-off-10', name: 'Ruan van der Berg', status: 'EN_ROUTE' },
    incident: {
      id: 'demo-inc-5',
      type: 'THEFT',
      status: 'DISPATCHED',
      priority: 'HIGH',
      client: 'Lerato Mokoena',
      address: 'Hillcrest farm gate',
      latestReport: 'Suspect vehicle description logged.',
    },
  },
  {
    id: 'demo-disp-6',
    status: 'ASSIGNED',
    officer: { id: 'demo-off-11', name: 'Bongani Nkosi', status: 'ASSIGNED' },
    incident: {
      id: 'demo-inc-6',
      type: 'FIRE',
      status: 'OPEN',
      priority: 'CRITICAL',
      client: 'Asha Patel',
      address: 'Ridge clinic loading bay',
      latestReport: 'Assigned — awaiting accept.',
    },
  },
];

function officerFullName(id: string) {
  const o = demoOfficerRoster.find((x) => x.id === id);
  return o ? `${o.firstName} ${o.lastName}` : 'Officer';
}

function mapTrail(lat: number, lng: number) {
  return Array.from({ length: 8 }, (_, i) => ({
    lat: lat - (7 - i) * 0.0022,
    lng: lng - (7 - i) * 0.0014,
  }));
}

function demoDashCams(id: string, callSign: string, live: boolean) {
  const frontStatus = !live ? 'OFFLINE' : 'ONLINE';
  return [
    {
      id: `${id}-cam-front`,
      name: 'Dash forward',
      locationLabel: `${callSign} · windscreen`,
      channel: 1,
      status: live ? 'RECORDING' : 'OFFLINE',
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
    {
      id: `${id}-cam-cabin`,
      name: 'Cabin',
      locationLabel: `${callSign} · cabin`,
      channel: 2,
      status: frontStatus,
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: true,
    },
    {
      id: `${id}-cam-rear`,
      name: 'Rear view',
      locationLabel: `${callSign} · rear`,
      channel: 3,
      status: frontStatus,
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
  ];
}

const FLEET_TEAM_VALUES = new Set(FLEET_TEAMS.map((t) => t.value));

const REVENUE_KEY = '4ds-demo-dev-revenue';

function readRevenueFlag() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(REVENUE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeRevenueFlag(enabled: boolean) {
  try {
    localStorage.setItem(REVENUE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

let demoClientLocation = { lat: -29.7267, lng: 31.0857 };

let demoFamilyMessagingEnabled = true;
function demoFamilyEligible() {
  return [
    { id: 'demo-fam-1', name: 'Thandi Client', phone: '+27821234568' },
    { id: 'demo-fam-2', name: 'Lerato Client', phone: '+27821234569' },
  ];
}
const demoFamilyMessages: {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
    kind: 'IMAGE' | 'VIDEO' | 'FILE';
  }[];
}[] = [
  {
    id: 'demo-fam-msg-1',
    content: 'At school pickup — all good.',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    sender: { id: 'demo-fam-1', firstName: 'Thandi', lastName: 'Client' },
    attachments: [],
  },
  {
    id: 'demo-fam-msg-2',
    content: 'On my way. Share live location if you leave early.',
    createdAt: new Date(Date.now() - 420000).toISOString(),
    sender: { id: 'demo-user-client-demo-local', firstName: 'Nomsa', lastName: 'Client' },
    attachments: [],
  },
];

let demoVehicleState = {
  phoneTrackingEnabled: false,
  theftRecovery: true,
  immobiliserOn: false,
  doorsLocked: true,
  trackingMode: 'THEFT_RECOVERY' as 'OFF' | 'TRACKER' | 'PHONE' | 'THEFT_RECOVERY',
  lat: -29.81,
  lng: 31.04,
};

let demoVehiclePanicId: string | null = null;
const demoHornUntil = new Map<string, number>();

function liveDemoClientVehicle(id: string) {
  const base = demoClientVehicles.find((v) => v.id === id) ?? demoClientVehicles[0];
  if (!base) return null;
  if (base.id === 'demo-veh-1') {
    return {
      ...base,
      theftRecovery: demoVehicleState.theftRecovery,
      immobiliserOn: demoVehicleState.immobiliserOn,
      doorsLocked: demoVehicleState.doorsLocked,
      lat: demoVehicleState.lat,
      lng: demoVehicleState.lng,
    };
  }
  return { ...base, doorsLocked: base.doorsLocked ?? true };
}

function demoClientDashCams(vehicleId: string, registration: string) {
  const feed = demoVehicleCameraFeeds.find((f) => f.vehicleId === vehicleId);
  if (feed) {
    return feed.cameras.map((c) => ({
      id: c.id,
      name: c.name,
      locationLabel: c.locationLabel,
      channel: c.channel,
      status: c.status,
      snapshotUrl: c.snapshotUrl,
      isLiveCapable: c.isLiveCapable,
      isInterior: c.isInterior,
    }));
  }
  return demoDashCams(vehicleId, registration, true);
}

function formatCrClientVehicle(id: string) {
  const live = liveDemoClientVehicle(id);
  if (!live) return null;
  return {
    id: live.id,
    registration: live.registration,
    make: live.make,
    model: live.model,
    color: live.color,
    owner: live.ownerName,
    ownerId: live.ownerId,
    trackerLinked: live.trackerLinked,
    theftRecovery: live.theftRecovery,
    immobiliserOn: live.immobiliserOn,
    doorsLocked: live.doorsLocked ?? true,
    lat: live.lat,
    lng: live.lng,
    updatedAt: new Date().toISOString(),
    status: live.theftRecovery
      ? 'RECOVERY'
      : live.immobiliserOn
        ? 'IMMOBILISED'
        : live.doorsLocked
          ? 'LOCKED'
          : 'UNLOCKED',
    callSign: live.registration,
    cameras: demoClientDashCams(live.id, live.registration),
    panicFocus: demoVehiclePanicId === live.id,
    hornActive: (demoHornUntil.get(live.id) ?? 0) > Date.now(),
  };
}

function applyDemoVehicleRemote(
  vehicleId: string,
  action: string,
  actorName: string,
): {
  action: VehicleRemoteAction;
  message: string;
  incidentId: string | null;
  hornActive: boolean;
  id: string;
  registration: string;
  make: string;
  model: string;
  doorsLocked: boolean;
  immobiliserOn: boolean;
  theftRecovery: boolean;
  trackerLinked: boolean;
  cameras: ReturnType<typeof demoClientDashCams>;
} | null {
  const allowed: VehicleRemoteAction[] = ['lock', 'unlock', 'immobilise', 'release', 'horn', 'panic'];
  if (!(allowed as string[]).includes(action)) return null;
  const typed = action as VehicleRemoteAction;
  const target = demoClientVehicles.find((v) => v.id === vehicleId) ?? demoClientVehicles.find((v) => v.id === 'demo-veh-1');
  if (!target) return null;

  const isPrimary = target.id === 'demo-veh-1';
  let doorsLocked = isPrimary ? demoVehicleState.doorsLocked : (target.doorsLocked ?? true);
  let immobiliserOn = isPrimary ? demoVehicleState.immobiliserOn : target.immobiliserOn;
  let theftRecovery = isPrimary ? demoVehicleState.theftRecovery : target.theftRecovery;

  if (typed === 'lock') doorsLocked = true;
  if (typed === 'unlock') doorsLocked = false;
  if (typed === 'immobilise') immobiliserOn = true;
  if (typed === 'release') immobiliserOn = false;
  if (typed === 'panic') {
    doorsLocked = true;
    immobiliserOn = true;
    theftRecovery = true;
  }

  target.doorsLocked = doorsLocked;
  target.immobiliserOn = immobiliserOn;
  target.theftRecovery = theftRecovery;
  if (isPrimary) {
    demoVehicleState.doorsLocked = doorsLocked;
    demoVehicleState.immobiliserOn = immobiliserOn;
    demoVehicleState.theftRecovery = theftRecovery;
    if (typed === 'panic') demoVehicleState.trackingMode = 'THEFT_RECOVERY';
  }

  if (typed === 'horn') demoHornUntil.set(target.id, Date.now() + 20_000);
  let incidentId: string | null = null;
  if (typed === 'panic') {
    demoVehiclePanicId = target.id;
    const existing = demoIncidents.find(
      (i) => i.type === 'PANIC' && i.title.includes(target.registration) && isActiveDemoIncident(i.status),
    );
    if (!existing) {
      const id = `demo-inc-${Date.now()}`;
      demoIncidents.unshift({
        id,
        type: 'PANIC',
        status: 'OPEN',
        title: `Vehicle panic — ${target.registration}`,
        isSilent: false,
        time: 'Just now',
        priority: 'CRITICAL',
        user: actorName,
        location: `${target.make} ${target.model} · live track`,
      });
      incidentId = id;
    } else {
      incidentId = existing.id;
    }
    demoControlRoomNotifications.unshift({
      id: `demo-n-veh-${Date.now()}`,
      category: 'PANIC',
      title: `Vehicle panic — ${target.registration}`,
      body: `${actorName} · dash cameras switched to this vehicle`,
      priority: 'critical',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/control-room',
    });
    dispatchVehicleFocus({
      vehicleId: target.id,
      registration: target.registration,
      make: target.make,
      model: target.model,
      owner: target.ownerName,
      action: typed,
      incidentId,
      doorsLocked,
      immobiliserOn,
      theftRecovery,
      cameras: demoClientDashCams(target.id, target.registration),
    });
  } else {
    dispatchVehicleFocus({
      vehicleId: target.id,
      registration: target.registration,
      make: target.make,
      model: target.model,
      owner: target.ownerName,
      action: typed,
      incidentId: null,
      doorsLocked,
      immobiliserOn,
      theftRecovery,
      cameras: demoClientDashCams(target.id, target.registration),
    });
  }

  const messages: Record<VehicleRemoteAction, string> = {
    lock: `${target.registration} doors locked.`,
    unlock: `${target.registration} doors unlocked.`,
    immobilise: `${target.registration} immobiliser engaged — starter interrupt when stationary.`,
    release: `${target.registration} immobiliser released.`,
    horn: `${target.registration} horn and lights pulsing.`,
    panic: `${target.registration} vehicle panic sent — control room viewing dash cameras.`,
  };

  return {
    action: typed,
    message: messages[typed],
    incidentId,
    hornActive: typed === 'horn' || (demoHornUntil.get(target.id) ?? 0) > Date.now(),
    id: target.id,
    registration: target.registration,
    make: target.make,
    model: target.model,
    doorsLocked,
    immobiliserOn,
    theftRecovery,
    trackerLinked: target.trackerLinked,
    cameras: demoClientDashCams(target.id, target.registration),
  };
}

const demoContacts = [
  {
    id: 'demo-c-1',
    name: 'Thandi Client',
    phone: '+27820001111',
    relationship: 'Spouse',
    priority: 1,
    verifiedAt: '2026-08-18T08:00:00.000Z',
  },
  {
    id: 'demo-c-3',
    name: 'John Client',
    phone: '+27820002222',
    relationship: 'Brother',
    priority: 2,
    verifiedAt: '2026-08-18T08:00:00.000Z',
  },
];

let demoMedical = {
  bloodType: 'O+',
  allergies: 'Penicillin',
  medications: 'Metformin 500mg daily',
  chronicConditions: 'Type 2 Diabetes',
  emergencyNotes: 'Insulin stored in fridge. Contact James if unresponsive.',
  doctorContact: 'Dr Naidoo · +27 31 555 0199',
  ambulancePreference: 'Netcare 911',
  isComplete: true,
};

const demoSafeZones = [
  { id: 'demo-zone-1', name: 'Home — Umhlanga', lat: '-29.7267', lng: '31.0857', radiusM: 400 },
  { id: 'demo-zone-2', name: 'School drop-off', lat: '-29.8488', lng: '31.0099', radiusM: 250 },
  { id: 'demo-zone-3', name: 'Warehouse — Prospecton', lat: '-29.978', lng: '30.955', radiusM: 600 },
  { id: 'demo-zone-4', name: 'Gateway retail', lat: '-29.726', lng: '31.067', radiusM: 350 },
  { id: 'demo-zone-5', name: 'Hillcrest farmstead', lat: '-29.78', lng: '30.762', radiusM: 800 },
];

type DemoStoreOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerUserId?: string;
  status: string;
  totalCents: number;
  totalFormatted: string;
  createdAt: string;
  itemCount: number;
  items: { productName: string; quantity: number }[];
};

const demoStoreOrders: DemoStoreOrder[] = [
  {
    id: 'demo-ord-seed',
    orderNumber: 'NX-DEMO-1000',
    customerName: 'Nomsa Client',
    customerEmail: 'client@demo.local',
    customerUserId: 'demo-user-client-demo-local',
    status: 'PAID',
    totalCents: 249900,
    totalFormatted: 'R 2499.00',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    itemCount: 2,
    items: [
      { productName: '4K turret camera', quantity: 1 },
      { productName: 'Body armour vest', quantity: 1 },
    ],
  },
  {
    id: 'demo-ord-1001',
    orderNumber: 'NX-DEMO-1001',
    customerName: 'Priya Naidoo',
    customerEmail: 'priya@warehouse.local',
    customerUserId: 'demo-user-priya-warehouse-local',
    status: 'PROCESSING',
    totalCents: 899000,
    totalFormatted: 'R 8990.00',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    itemCount: 3,
    items: [
      { productName: '8-channel NVR kit', quantity: 1 },
      { productName: 'PTZ dome camera', quantity: 2 },
    ],
  },
  {
    id: 'demo-ord-1002',
    orderNumber: 'NX-DEMO-1002',
    customerName: 'Thabo Retail',
    customerEmail: 'thabo@gateway.local',
    customerUserId: 'demo-user-thabo-retail-local',
    status: 'DELIVERED',
    totalCents: 459900,
    totalFormatted: 'R 4599.00',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    itemCount: 1,
    items: [{ productName: 'Retail alarm panel', quantity: 1 }],
  },
];

type DemoSalesLead = {
  id: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  status: string;
  interest: string | null;
  estimatedCents: number | null;
  notes: string | null;
  nextFollowUp: string | null;
  ownerUserId: string | null;
  createdAt: string;
};

let demoSalesLeads: DemoSalesLead[] = [
  {
    id: 'demo-lead-1',
    companyName: 'Gateway Retail Park',
    contactName: 'Thabo Retail',
    contactEmail: 'thabo@gateway.local',
    contactPhone: '+27832223302',
    source: 'Referral',
    status: 'QUOTED',
    interest: 'CCTV + patrol bundle',
    estimatedCents: 1850000,
    notes: 'Wants 12-camera NVR kit with monthly patrol add-on.',
    nextFollowUp: new Date(Date.now() + 2 * 86400000).toISOString(),
    ownerUserId: 'demo-user-sales-4ds-local',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-lead-2',
    companyName: 'Hillcrest Farmstead',
    contactName: 'Lerato Mokoena',
    contactEmail: 'lerato@hillcrest.local',
    contactPhone: '+27834445503',
    source: 'Website',
    status: 'QUALIFIED',
    interest: 'Perimeter beams + armed response',
    estimatedCents: 720000,
    notes: 'Site walk scheduled; needs generator backup option.',
    nextFollowUp: new Date(Date.now() + 86400000).toISOString(),
    ownerUserId: 'demo-user-sales-4ds-local',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'demo-lead-3',
    companyName: null,
    contactName: 'David Nkosi',
    contactEmail: 'david.nkosi@example.com',
    contactPhone: '+27831234567',
    source: 'Manual',
    status: 'NEW',
    interest: 'Body armour + holster',
    estimatedCents: 89000,
    notes: 'Private security contractor — bulk quote for 6 vests.',
    nextFollowUp: null,
    ownerUserId: 'demo-user-sales-4ds-local',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-lead-4',
    companyName: 'Ridge Clinic',
    contactName: 'Asha Patel',
    contactEmail: 'asha@ridgeclinic.local',
    contactPhone: '+27835556604',
    source: 'Store walk-in',
    status: 'CONTACTED',
    interest: 'Panic buttons + CCTV',
    estimatedCents: 540000,
    notes: 'Trial tier client — upsell to business package.',
    nextFollowUp: new Date(Date.now() + 3 * 86400000).toISOString(),
    ownerUserId: 'demo-user-manager-4ds-local',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'demo-lead-5',
    companyName: 'Prospecton Warehouse',
    contactName: 'Priya Naidoo',
    contactEmail: 'priya@warehouse.local',
    contactPhone: '+27831112201',
    source: 'Referral',
    status: 'WON',
    interest: 'Warehouse CCTV upgrade',
    estimatedCents: 899000,
    notes: 'Closed — order NX-DEMO-1001 linked.',
    nextFollowUp: null,
    ownerUserId: 'demo-user-sales-4ds-local',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

let demoAdminProducts = getDemoProducts().map((p) => ({ ...p, isActive: true }));

type DemoClientChatMessage = {
  id: string;
  clientUserId: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
};

const demoClientChatByClient = new Map<string, DemoClientChatMessage[]>();

function ensureDemoClientChat(clientUserId: string): DemoClientChatMessage[] {
  if (!demoClientChatByClient.has(clientUserId)) {
    demoClientChatByClient.set(clientUserId, [
      {
        id: `demo-cr-welcome-${clientUserId}`,
        clientUserId,
        content: 'Welcome to 4DS Protection. Dispatch is here if you need help — reply anytime.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        sender: {
          id: 'demo-dispatch',
          firstName: 'Control',
          lastName: 'Room',
          role: 'DISPATCHER',
        },
      },
    ]);
  }
  return demoClientChatByClient.get(clientUserId)!;
}

function demoClientChatThreads() {
  const clientIds = Object.keys(demoClientProfiles);
  for (const id of clientIds) ensureDemoClientChat(id);
  return clientIds
    .map((clientUserId) => {
      const msgs = ensureDemoClientChat(clientUserId);
      const last = msgs[msgs.length - 1];
      const profile = demoClientProfiles[clientUserId];
      return {
        clientUserId,
        conversationId: `demo-conv-${clientUserId}`,
        client: { id: clientUserId, ...profile },
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              createdAt: last.createdAt,
              sender: last.sender,
            }
          : null,
        updatedAt: last?.createdAt ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function setDemoAlarmStatus(id: string, status: string) {
  syncDemoPropertyAlarm(id, status);
}

type DemoVerification = {
  id: string;
  type: 'PROPERTY' | 'DEBIT_ORDER';
  clientName: string;
  clientEmail: string;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

type DemoErrorReport = {
  id: string;
  message: string;
  path: string | null;
  context: string | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  reporter: { id: string; name: string; role: string; email: string };
};

function readDemoErrorReports(): DemoErrorReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_ERROR_REPORTS_KEY);
    if (!raw) {
      const seeded = seedDemoErrorReports();
      writeDemoErrorReports(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as DemoErrorReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function seedDemoErrorReports(): DemoErrorReport[] {
  const checklistContext = JSON.stringify({
    workflowStatus: 'REPORTED',
    severity: 'P1',
    errorFingerprint: 'fp_test_check_required',
    snapshot: {
      error: {
        errorCode: 'TEST_CHECK_REQUIRED',
        requestId: 'req_8F29K2M1',
        apiEndpoint: '/api/camera-tests/complete',
        httpStatus: 422,
        reportedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        stack: 'ValidationError: Complete the test checklist, or enter an override reason.\n  at completeTest (camera-test.ts:142)',
      },
      environment: {
        appVersion: '2.4.18',
        buildNumber: '8421',
        browser: 'Chrome 140',
        os: 'Windows 11',
        screenSize: '1920×1080',
        online: true,
      },
      user: { role: 'TECHNICIAN', feature: 'Camera testing', sessionId: 'sess_camtech' },
      system: { deploymentVersion: '2.4.18', serviceHealth: 'operational' },
    },
    reproduction: {
      steps: [
        'Login as Technician',
        'Open Camera Installation',
        'Select Camera Tech',
        'Complete test',
        'Submit without checklist',
        'Error appears',
      ],
    },
    affected: { totalUsers: 5, byRole: { TECHNICIAN: 4, SUPERVISOR: 1 }, feature: 'Camera testing' },
    deployment: {
      firstDetectedAfter: '2.4.18',
      minutesAfterDeploy: 14,
      relatedFiles: ['camera-test.ts', 'TestChecklist.tsx', '/api/tests/complete'],
    },
    audit: [
      { at: new Date(Date.now() - 2 * 3600000).toISOString(), action: 'Error reported by Technician' },
      { at: new Date(Date.now() - 1.9 * 3600000).toISOString(), action: 'Ticket automatically created' },
    ],
  });

  return [
    {
      id: 'err-demo-checklist-1014',
      message: 'Complete the test checklist, or enter an override reason.',
      path: '/technician/camera-test',
      context: checklistContext,
      status: 'OPEN',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      reporter: {
        id: 'demo-tech-1',
        name: 'Camera Tech',
        role: 'TECHNICIAN',
        email: 'tech@4ds.local',
      },
    },
    {
      id: 'err-demo-gps-timeout',
      message: 'GPS timeout while updating vehicle position',
      path: '/control-room/map',
      context: JSON.stringify({
        workflowStatus: 'IN_PROGRESS',
        severity: 'P2',
        errorFingerprint: 'fp_gps_timeout',
        snapshot: {
          error: { errorCode: 'GPS_TIMEOUT', httpStatus: 504, apiEndpoint: '/control-room/map/vehicles' },
          environment: { appVersion: '2.4.18', buildNumber: '8421', browser: 'Chrome 139', os: 'Windows 10' },
        },
        audit: [{ at: new Date(Date.now() - 86400000).toISOString(), action: 'Developer assigned' }],
      }),
      status: 'ACKNOWLEDGED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      reporter: {
        id: 'demo-dispatch-1',
        name: 'Dispatch Operator',
        role: 'DISPATCHER',
        email: 'dispatch@4ds.local',
      },
    },
  ];
}

function writeDemoErrorReports(reports: DemoErrorReport[], created?: DemoErrorReport) {
  try {
    localStorage.setItem(DEMO_ERROR_REPORTS_KEY, JSON.stringify(reports.slice(0, 80)));
    window.dispatchEvent(
      new CustomEvent(DEMO_DEV_TICKET_EVENT, {
        detail: created ? { action: 'created', report: created } : { action: 'updated' },
      }),
    );
  } catch {
    /* ignore */
  }
}

function pushDemoErrorReport(report: DemoErrorReport) {
  const next = [report, ...readDemoErrorReports().filter((r) => r.id !== report.id)];
  writeDemoErrorReports(next, report);
  return report;
}

function demoTicketNotifications(role?: string) {
  if (role !== 'DEVELOPER') return [];
  return readDemoErrorReports()
    .filter((r) => r.status !== 'RESOLVED')
    .map((r) => ({
      id: `ticket-${r.id}`,
      category: 'DEVELOPER' as const,
      title: `Issue ticket ${developerTicketCode(r.id)}`,
      body: `${r.reporter.name} · ${r.message}`,
      priority: r.status === 'OPEN' ? ('high' as const) : ('medium' as const),
      isRead: r.status !== 'OPEN',
      createdAt: r.createdAt,
      link: `/control-room/developer?ticket=${encodeURIComponent(r.id)}`,
    }));
}

const demoPendingVerifications: DemoVerification[] = [];

let demoDebitOrder: {
  status: 'NONE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED';
  bankName?: string;
  accountLast4?: string;
  debitDay?: number;
  verifiedAt?: string | null;
  message?: string;
} = { status: 'NONE' };

const demoBillingDocuments = [
  {
    id: 'doc-inv-1',
    title: 'Tax invoice — July 2026',
    type: 'INVOICE' as const,
    reference: 'INV-2026-0714',
    amountFormatted: 'R499.00',
    periodLabel: 'Jul 2026',
    issuedAt: new Date(Date.now() - 46 * 86400000).toISOString(),
    downloadUrl: '/portal/documents/invoice/INV-2026-0714',
  },
  {
    id: 'doc-rcp-1',
    title: 'Payment receipt',
    type: 'RECEIPT' as const,
    reference: 'PF-DEMO-1001',
    amountFormatted: 'R499.00',
    issuedAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    downloadUrl: '/portal/documents/receipt/PF-DEMO-1001',
  },
  {
    id: 'doc-stm-1',
    title: 'Monthly statement',
    type: 'STATEMENT' as const,
    reference: 'STM-2026-07',
    amountFormatted: 'R499.00',
    periodLabel: 'Jul 2026',
    issuedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    downloadUrl: '/portal/documents/statement/STM-2026-07',
  },
];

const demoCheckoutPayments: Record<
  string,
  {
    reference: string;
    provider: string;
    amountFormatted: string;
    status: string;
    description: string;
    kind?: string;
  }
> = {};

function demoApproveVerification(id: string) {
  const v = demoPendingVerifications.find((item) => item.id === id);
  if (!v) return null;
  const idx = demoPendingVerifications.indexOf(v);
  demoPendingVerifications.splice(idx, 1);

  if (v.type === 'PROPERTY') {
    const siteId = String(v.detail.siteId ?? '');
    const site = demoSurveillanceSites.find((s) => s.id === siteId);
    if (site) {
      site.camerasLinked = true;
      site.monitoringEnabled = true;
      site.cameraCount = 4;
      site.onlineCameras = 4;
      if (site.cameras.length === 0) {
        site.cameras.push(
          {
            id: `${siteId}-cam-1`,
            name: 'Front gate',
            locationLabel: 'Driveway',
            channel: 1,
            status: 'ONLINE',
            snapshotUrl: null,
            streamUrl: 'demo',
            isLiveCapable: true,
            isInterior: false,
            placement: 'EXTERIOR',
          },
          {
            id: `${siteId}-cam-2`,
            name: 'Garage',
            locationLabel: 'Side entrance',
            channel: 2,
            status: 'ONLINE',
            snapshotUrl: null,
            streamUrl: 'demo',
            isLiveCapable: true,
            isInterior: false,
            placement: 'EXTERIOR',
          },
        );
      }
    }
  }

  if (v.type === 'DEBIT_ORDER') {
    demoDebitOrder = {
      status: 'ACTIVE',
      bankName: String(v.detail.bankName ?? demoDebitOrder.bankName ?? 'Bank'),
      accountLast4: String(v.detail.accountLast4 ?? demoDebitOrder.accountLast4 ?? '0000'),
      debitDay: Number(v.detail.debitDay ?? demoDebitOrder.debitDay ?? 1),
      verifiedAt: new Date().toISOString(),
      message: undefined,
    };
  }

  return v;
}

type DemoClientNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  href?: string;
};

const demoClientNotifications: DemoClientNotification[] = [
  {
    id: 'demo-cn-1',
    type: 'DISPATCH_ASSIGNED',
    title: 'Dispatch update',
    body: 'Confirm your protection status when ready.',
    isRead: false,
    createdAt: new Date().toISOString(),
    href: '/portal/incidents',
  },
  {
    id: 'demo-cn-2',
    type: 'SYSTEM',
    title: 'Account notice',
    body: 'Your protection plan is active. Open Updates anytime for dispatch notes.',
    isRead: false,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    href: '/portal/updates',
  },
];

function demoUnreadCount() {
  return demoClientNotifications.filter((n) => !n.isRead).length;
}

type DemoCrNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isRead: boolean;
  createdAt: string;
  link: string;
};

const demoControlRoomNotifications: DemoCrNotification[] = [
  {
    id: 'demo-n-1',
    category: 'PANIC',
    title: 'Panic alert',
    body: 'Nomsa Client — Umhlanga',
    priority: 'critical',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    link: '/control-room/incidents',
  },
];

const demoCrReadIds = new Set<string>();

function markDemoCrRead(id: string) {
  demoCrReadIds.add(id);
  const n = demoControlRoomNotifications.find((item) => item.id === id);
  if (n) n.isRead = true;
}

let demoDeveloperCanViewRevenue = false;

function developerRevenueVisible() {
  const stored = readRevenueFlag();
  if (stored) demoDeveloperCanViewRevenue = true;
  return demoDeveloperCanViewRevenue;
}

const medicalTickets: {
  id: string;
  incidentId: string;
  client: string;
  location: string;
  priority: string;
  status: string;
  level: 'ALS' | 'BLS';
  distanceKm: number;
  patientSummary: string;
  securityTicketId: string;
}[] = [
  {
    id: 'demo-med-1',
    incidentId: 'demo-inc-1',
    client: 'Nomsa Client',
    location: 'Umhlanga Rocks Dr',
    priority: 'CRITICAL',
    status: 'EN_ROUTE',
    level: 'ALS',
    distanceKm: 1.8,
    patientSummary: 'Adult · known profile on file · officers see “medical requested” only',
    securityTicketId: 'demo-inc-1',
  },
];

const demoFleet = [
  {
    id: 'demo-fleet-1',
    registration: 'ND 4DS-101',
    callSign: 'Unit 101',
    make: 'Toyota',
    model: 'Hilux',
    color: 'White',
    vehicleType: 'ARMED_RESPONSE',
    teamName: 'Armed response',
    status: 'ON_DUTY',
    crew: [
      { officerId: 'demo-off-1', name: 'Sipho Ndlovu', role: 'DRIVER', status: 'EN_ROUTE', zone: 'Zone A' },
      { officerId: 'demo-off-8', name: 'Lebo Dlamini', role: 'PASSENGER', status: 'EN_ROUTE', zone: 'Zone A' },
    ],
    crewCount: 2,
    cameras: [
      {
        id: 'demo-fleet-1-cam-front',
        name: 'Dash forward',
        locationLabel: 'Unit 101 · windscreen',
        channel: 1,
        status: 'RECORDING',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: false,
      },
      {
        id: 'demo-fleet-1-cam-cabin',
        name: 'Cabin',
        locationLabel: 'Unit 101 · cabin',
        channel: 2,
        status: 'ONLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: true,
      },
      {
        id: 'demo-fleet-1-cam-rear',
        name: 'Rear view',
        locationLabel: 'Unit 101 · rear',
        channel: 3,
        status: 'ONLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: false,
      },
    ],
  },
  {
    id: 'demo-fleet-2',
    registration: 'ND 4DS-ALS',
    callSign: 'Medic 1',
    make: 'Mercedes',
    model: 'Sprinter',
    color: 'White',
    vehicleType: 'MEDICAL',
    teamName: 'Medical',
    status: 'ON_DUTY',
    crew: [
      { officerId: 'demo-off-2', name: 'Raj Patel', role: 'DRIVER', status: 'BUSY', zone: 'Zone B' },
      { officerId: 'demo-off-9', name: 'Naledi Sithole', role: 'MEDIC', status: 'BUSY', zone: 'Zone B' },
    ],
    crewCount: 2,
    cameras: [
      {
        id: 'demo-fleet-2-cam-front',
        name: 'Dash forward',
        locationLabel: 'Medic 1 · windscreen',
        channel: 1,
        status: 'ONLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: false,
      },
      {
        id: 'demo-fleet-2-cam-cabin',
        name: 'Cabin',
        locationLabel: 'Medic 1 · cabin',
        channel: 2,
        status: 'ONLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: true,
      },
      {
        id: 'demo-fleet-2-cam-rear',
        name: 'Rear view',
        locationLabel: 'Medic 1 · rear',
        channel: 3,
        status: 'ONLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: true,
        isInterior: false,
      },
    ],
  },
  {
    id: 'demo-fleet-3',
    registration: 'ND 4DS-204',
    callSign: 'Unit 204',
    make: 'Ford',
    model: 'Ranger',
    color: 'Silver',
    vehicleType: 'PATROL',
    teamName: 'Patrol',
    status: 'MAINTENANCE',
    crew: [],
    crewCount: 0,
    cameras: [
      {
        id: 'demo-fleet-3-cam-front',
        name: 'Dash forward',
        locationLabel: 'Unit 204 · windscreen',
        channel: 1,
        status: 'OFFLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: false,
        isInterior: false,
      },
      {
        id: 'demo-fleet-3-cam-cabin',
        name: 'Cabin',
        locationLabel: 'Unit 204 · cabin',
        channel: 2,
        status: 'OFFLINE',
        snapshotUrl: null as string | null,
        isLiveCapable: false,
        isInterior: true,
      },
    ],
  },
  {
    id: 'demo-fleet-4',
    registration: 'ND 4DS-FIRE',
    callSign: 'Engine 1',
    make: 'Scania',
    model: 'P320',
    color: 'Red',
    vehicleType: 'FIRE_TRUCK',
    teamName: 'Fire',
    status: 'ON_DUTY',
    crew: [
      { officerId: 'demo-off-5', name: 'Thabo Mokoena', role: 'DRIVER', status: 'EN_ROUTE', zone: 'Zone B' },
      { officerId: 'demo-off-10', name: 'Ruan van der Berg', role: 'PASSENGER', status: 'EN_ROUTE', zone: 'Zone B' },
      { officerId: 'demo-off-11', name: 'Bongani Nkosi', role: 'PASSENGER', status: 'EN_ROUTE', zone: 'Zone B' },
    ],
    crewCount: 3,
    cameras: demoDashCams('demo-fleet-4', 'Engine 1', true),
  },
  {
    id: 'demo-fleet-5',
    registration: 'ND 4DS-TAC',
    callSign: 'TAC 1',
    make: 'Toyota',
    model: 'Land Cruiser',
    color: 'Black',
    vehicleType: 'TACTICAL',
    teamName: 'Tactical',
    status: 'ON_DUTY',
    crew: [
      { officerId: 'demo-off-4', name: 'Zanele Khumalo', role: 'DRIVER', status: 'AVAILABLE', zone: 'Zone A' },
      { officerId: 'demo-off-12', name: 'Fatima Essop', role: 'PASSENGER', status: 'AVAILABLE', zone: 'Zone A' },
      { officerId: 'demo-off-13', name: 'Kgosi Motsepe', role: 'PASSENGER', status: 'AVAILABLE', zone: 'Zone A' },
    ],
    crewCount: 3,
    cameras: demoDashCams('demo-fleet-5', 'TAC 1', true),
  },
  {
    id: 'demo-fleet-6',
    registration: 'ND 4DS-RR1',
    callSign: 'Bike 1',
    make: 'BMW',
    model: 'R 1250 GS',
    color: 'Yellow',
    vehicleType: 'MOTORCYCLE',
    teamName: 'Rapid response',
    status: 'AVAILABLE',
    crew: [{ officerId: 'demo-off-6', name: 'Aisha Khan', role: 'DRIVER', status: 'AVAILABLE', zone: 'Zone A' }],
    crewCount: 1,
    cameras: demoDashCams('demo-fleet-6', 'Bike 1', true),
  },
  {
    id: 'demo-fleet-7',
    registration: 'ND 4DS-UM1',
    callSign: 'Ghost 1',
    make: 'Volkswagen',
    model: 'Polo',
    color: 'Grey',
    vehicleType: 'UNMARKED',
    teamName: 'Unmarked',
    status: 'AVAILABLE',
    crew: [
      { officerId: 'demo-off-7', name: 'Pieter Botha', role: 'DRIVER', status: 'AVAILABLE', zone: 'Zone C' },
      { officerId: 'demo-off-14', name: 'Yusuf Adams', role: 'PASSENGER', status: 'AVAILABLE', zone: 'Zone C' },
    ],
    crewCount: 2,
    cameras: demoDashCams('demo-fleet-7', 'Ghost 1', true),
  },
];

function syncOfficerCrewNames(officer: (typeof demoOfficerRoster)[number]) {
  const name = `${officer.firstName} ${officer.lastName}`;
  for (const vehicle of demoFleet) {
    for (const seat of vehicle.crew) {
      if (seat.officerId === officer.id) seat.name = name;
    }
  }
}

function ok<T>(data: T) {
  return { success: true as const, data };
}

type DemoManagedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  role: string;
  status: string;
  branch: { id: string; name: string; code: string } | null;
  teams: { id: string; name: string; branchId: string; isLead: boolean }[];
};

function demoStaff(
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  extra?: Partial<Pick<DemoManagedUser, 'phone' | 'jobTitle' | 'status'>>,
): DemoManagedUser {
  return {
    id: `demo-user-${email.replace(/[^a-z0-9]/gi, '-')}`,
    email,
    firstName,
    lastName,
    phone: extra?.phone ?? null,
    avatarUrl: null,
    jobTitle: extra?.jobTitle ?? null,
    role,
    status: extra?.status ?? 'ACTIVE',
    branch: { id: 'demo-branch-1', name: 'Durban North', code: 'DBN' },
    teams: [],
  };
}

const demoManagedUsers: DemoManagedUser[] = [
  demoStaff('owner@4ds.local', 'Thabo', 'Owner', 'OWNER', { jobTitle: 'Owner' }),
  demoStaff('admin@demo.local', 'Demo', 'Admin', 'OWNER', { jobTitle: 'Control Room Admin' }),
  demoStaff('developer@4ds.local', 'Toxic', 'Dev', 'DEVELOPER', {
    jobTitle: 'Platform Developer',
    phone: '+27821000099',
  }),
  demoStaff('manager@4ds.local', 'Ayesha', 'Manager', 'MANAGER', { jobTitle: 'Operations Manager' }),
  demoStaff('supervisor@4ds.local', 'Mandla', 'Supervisor', 'SUPERVISOR', { jobTitle: 'Field Supervisor' }),
  demoStaff('dispatch@demo.local', 'Lerato', 'Dispatch', 'DISPATCHER', { jobTitle: 'Control Room Operator' }),
  demoStaff('sales@4ds.local', 'Sihle', 'Sales', 'SALES', { jobTitle: 'Sales Consultant' }),
  demoStaff('client@demo.local', 'Nomsa', 'Client', 'USER', { phone: '+27821234567', jobTitle: 'Protected client' }),
  demoStaff('james@demo.local', 'James', 'Demo', 'USER', { phone: '+27829876543', jobTitle: 'Protected client' }),
  demoStaff('priya@warehouse.local', 'Priya', 'Naidoo', 'USER', { phone: '+27831112201', jobTitle: 'Warehouse client' }),
  demoStaff('thabo@gateway.local', 'Thabo', 'Retail', 'USER', { phone: '+27832223302', jobTitle: 'Retail client' }),
  demoStaff('lerato@hillcrest.local', 'Lerato', 'Mokoena', 'USER', { phone: '+27834445503', jobTitle: 'Farmstead client' }),
  demoStaff('asha@ridgeclinic.local', 'Asha', 'Patel', 'USER', { phone: '+27835556604', jobTitle: 'Clinic client' }),
  demoStaff('sarah@morningside.local', 'Sarah', 'Guest', 'USER', { phone: '+27836667705', jobTitle: 'Guest house client' }),
  demoStaff('ndlovu@4ds.local', 'Sipho', 'Ndlovu', 'OFFICER', { phone: '+27831110001', jobTitle: 'Field Officer' }),
  demoStaff('patel@4ds.local', 'Raj', 'Patel', 'OFFICER', { phone: '+27831110002', jobTitle: 'Senior Officer' }),
  demoStaff('smith@4ds.local', 'John', 'Smith', 'OFFICER', { phone: '+27831110003', jobTitle: 'Field Officer' }),
  demoStaff('tech.cameras@4ds.local', 'Camera', 'Tech', 'TECHNICIAN', { jobTitle: 'CCTV Installer' }),
  demoStaff('tech.alarms@4ds.local', 'Alarm', 'Tech', 'TECHNICIAN', { jobTitle: 'Alarm Technician' }),
];

const DEMO_SUBSCRIPTION_MRR_CENTS: Record<string, number> = {
  BUSINESS: 310000,
  FAMILY: 125000,
  HOME: 69000,
  PERSONAL: 69000,
};

const SALES_OPEN_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED'] as const;
const SALES_PIPELINE_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'] as const;

function formatDemoZar(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function salesLeadToApi(lead: DemoSalesLead) {
  const owner = demoManagedUsers.find((u) => u.id === lead.ownerUserId);
  return {
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone,
    source: lead.source,
    status: lead.status,
    interest: lead.interest,
    estimatedCents: lead.estimatedCents,
    estimatedFormatted: lead.estimatedCents != null ? formatDemoZar(lead.estimatedCents) : null,
    notes: lead.notes,
    nextFollowUp: lead.nextFollowUp,
    ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unassigned',
    ownerUserId: lead.ownerUserId,
  };
}

function buildSalesDashboard() {
  const leads = demoSalesLeads.map(salesLeadToApi);
  const openLeads = demoSalesLeads.filter((l) => SALES_OPEN_STATUSES.includes(l.status as (typeof SALES_OPEN_STATUSES)[number])).length;
  const wonDeals = demoSalesLeads.filter((l) => l.status === 'WON').length;
  const pipelineCents = demoSalesLeads
    .filter((l) => SALES_OPEN_STATUSES.includes(l.status as (typeof SALES_OPEN_STATUSES)[number]))
    .reduce((n, l) => n + (l.estimatedCents ?? 0), 0);
  const wonCents = demoSalesLeads
    .filter((l) => l.status === 'WON')
    .reduce((n, l) => n + (l.estimatedCents ?? 0), 0);
  const pipeline = Object.fromEntries(
    SALES_PIPELINE_STATUSES.map((status) => [
      status,
      demoSalesLeads.filter((l) => l.status === status).length,
    ]),
  );
  return {
    stats: {
      openLeads,
      wonDeals,
      pipelineFormatted: formatDemoZar(pipelineCents),
      wonFormatted: formatDemoZar(wonCents),
      orders: demoStoreOrders.length,
      catalogSize: demoAdminProducts.filter((p) => p.isActive).length,
      pipeline,
    },
    leads,
    recentOrders: demoStoreOrders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      status: o.status,
      totalFormatted: o.totalFormatted,
    })),
  };
}

function buildBillingOverview() {
  const activeStatuses = new Set(['ACTIVE', 'TRIALING']);
  const pastDueRows = demoClients.filter((c) => c.subscription.status === 'PAST_DUE');
  const activeRows = demoClients.filter((c) => activeStatuses.has(c.subscription.status));
  const mrrCents = activeRows.reduce(
    (n, c) => n + (DEMO_SUBSCRIPTION_MRR_CENTS[c.subscription.tierCode] ?? 69000),
    0,
  );
  const revenueAtRiskCents = pastDueRows.reduce(
    (n, c) => n + (DEMO_SUBSCRIPTION_MRR_CENTS[c.subscription.tierCode] ?? 69000),
    0,
  );
  return {
    totalSubscriptions: demoClients.length,
    active: activeRows.length,
    pastDueCount: pastDueRows.length,
    revenueAtRiskFormatted: formatDemoZar(revenueAtRiskCents),
    mrrFormatted: formatDemoZar(mrrCents),
  };
}

const DEMO_CONTROL_PLANS_CATALOG = {
  tiers: [
    { code: 'PERSONAL', name: 'Personal Protect', priceFormatted: 'R690.00/mo', description: 'Panic, tracking, and personal response.' },
    { code: 'FAMILY', name: 'Family Protect', priceFormatted: 'R1,250.00/mo', description: 'Family tracking, home, and vehicle add-ons.' },
    { code: 'HOME', name: 'Home Protect', priceFormatted: 'R690.00/mo', description: 'Property monitoring and alarm integration.' },
    { code: 'BUSINESS', name: 'Business Protect', priceFormatted: 'R3,100.00/mo', description: 'Multi-site cover and priority dispatch.' },
    { code: 'ESSENTIAL', name: '4DS Essential', priceFormatted: 'R199/mo', description: 'Personal protection and emergency contacts.' },
    { code: 'PREMIUM', name: '4DS Premium Protection', priceFormatted: 'R899/mo', description: 'All services included.' },
  ],
  addons: [
    { code: 'HOME_SECURITY', name: 'Home Security', priceFormatted: 'R300/mo', description: 'Property monitoring and CCTV.', category: 'home' },
    { code: 'VEHICLE_RESPONSE', name: 'Vehicle Response', priceFormatted: 'R500/mo', description: 'Theft recovery and live vehicle trails.', category: 'vehicle' },
    { code: 'FAMILY', name: 'Family Safety Pack', priceFormatted: 'R150/mo', description: 'Family tracking and safe zones.', category: 'family' },
    { code: 'MEDICAL_PLUS', name: 'Medical Plus', priceFormatted: 'R120/mo', description: 'Extended medical profile for responders.', category: 'medical' },
  ],
};

const demoCustomerAddons = new Map<string, string[]>();
const demoCustomerLoyalty = new Map<
  string,
  {
    tier: string;
    tierName: string;
    points: number;
    tierDiscountPercent: number;
    manualDiscountPercent: number;
    effectiveDiscountPercent: number;
    activePromoCode: string | null;
    benefits: string;
    notes: string | null;
    nextTierName: string | null;
    pointsToNext: number;
  }
>();

const demoDiscountCodes: {
  id: string;
  code: string;
  percentOff: number;
  appliesTo: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  description: string | null;
}[] = [
  {
    id: 'demo-disc-1',
    code: 'GEAR15',
    percentOff: 15,
    appliesTo: 'STORE',
    maxUses: 500,
    usedCount: 42,
    isActive: true,
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    description: 'Gear store launch promo',
  },
  {
    id: 'demo-disc-2',
    code: 'NEXUS10',
    percentOff: 10,
    appliesTo: 'BOTH',
    maxUses: null,
    usedCount: 8,
    isActive: true,
    expiresAt: null,
    description: 'New member subscription discount',
  },
];

function findDemoCustomer(userId: string) {
  return demoClients.find((c) => c.id === userId) ?? null;
}

function demoSubscriptionPriceFormatted(tierCode: string) {
  return formatDemoZar(DEMO_SUBSCRIPTION_MRR_CENTS[tierCode] ?? 69000);
}

function demoCustomerAccess(tierCode: string, userId: string) {
  const vehicleCount = demoClientVehicles.filter((v) => v.ownerId === userId).length;
  const isPremium = tierCode === 'PREMIUM';
  const addons = demoCustomerAddons.get(userId) ?? [];
  return {
    home:
      isPremium ||
      tierCode === 'HOME' ||
      tierCode === 'FAMILY' ||
      tierCode === 'BUSINESS' ||
      addons.includes('HOME_SECURITY'),
    vehicle:
      isPremium || vehicleCount > 0 || tierCode === 'FAMILY' || addons.includes('VEHICLE_RESPONSE'),
    family: isPremium || tierCode === 'FAMILY' || addons.includes('FAMILY'),
    medical: true,
    personal: true,
    emergency: true,
  };
}

function demoFormatSubscription(client: (typeof demoClients)[number], userId: string) {
  const tierCode = client.subscription.tierCode;
  const addons = demoCustomerAddons.get(userId) ?? [];
  const overdue = client.subscription.status === 'PAST_DUE';
  const activeAddonDetails = DEMO_CONTROL_PLANS_CATALOG.addons
    .filter((a) => tierCode === 'PREMIUM' || addons.includes(a.code))
    .map((a) => ({ code: a.code, name: a.name, priceFormatted: a.priceFormatted }));
  return {
    planName: client.subscription.planName,
    tierCode,
    tierLabel: tierCode,
    addons: tierCode === 'PREMIUM' ? DEMO_CONTROL_PLANS_CATALOG.addons.map((a) => a.code) : addons,
    activeAddonDetails,
    status: client.subscription.status,
    priceFormatted: demoSubscriptionPriceFormatted(tierCode),
    memberId: client.subscription.memberId,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    lastPaidAt: overdue ? null : new Date(Date.now() - 16 * 86400000).toISOString(),
    nextBillingAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    billingFailedCount: overdue ? 2 : 0,
    isOverdue: overdue,
    daysPastDue: overdue ? 12 : 0,
    amountDueFormatted: overdue ? demoSubscriptionPriceFormatted(tierCode) : undefined,
    access: demoCustomerAccess(tierCode, userId),
  };
}

function demoLoyaltyFor(userId: string) {
  return (
    demoCustomerLoyalty.get(userId) ?? {
      tier: 'SILVER',
      tierName: 'Silver',
      points: 420,
      tierDiscountPercent: 5,
      manualDiscountPercent: 0,
      effectiveDiscountPercent: 5,
      activePromoCode: 'GEAR15',
      benefits: '5% off monthly cover · gear promo ready',
      notes: null,
      nextTierName: 'Gold',
      pointsToNext: 80,
    }
  );
}

function demoSiteProfileForCustomer(userId: string) {
  const client = findDemoCustomer(userId);
  const site =
    demoSurveillanceSites.find((s) => s.owner.id === userId) ??
    (client
      ? demoSurveillanceSites.find((s) => s.owner.name.includes(client.firstName))
      : undefined) ??
    demoSurveillanceSites[0];
  if (!site) return null;
  const fullName = client ? `${client.firstName} ${client.lastName}` : site.owner.name;
  return {
    id: userId,
    name: site.name,
    address: site.address,
    alarmStatus: site.alarmStatus,
    people: [
      { name: fullName, role: 'Primary subscriber', phone: client?.phone ?? site.owner.phone },
    ],
    response: {
      slaMinutes: 8,
      nearestUnit: site.assignedFleet?.[0]?.callSign ?? 'Unit 101',
      lastIncident:
        demoIncidents.find((i) => client && i.user.includes(client.firstName))?.time ?? '7 days ago',
    },
    equipment: [
      ...site.cameras.slice(0, 3).map((c) => ({
        name: c.name,
        serial: c.id.toUpperCase(),
        status: c.status,
      })),
      ...site.sensors.slice(0, 2).map((s) => ({
        name: s.name,
        serial: s.id.toUpperCase(),
        status: s.status,
      })),
    ],
    incidents: demoIncidents
      .filter((i) => !client || i.user.includes(client.firstName))
      .slice(0, 5)
      .map((i) => ({ id: i.id, type: i.type, status: i.status, time: i.time })),
  };
}

const demoBranches = [
  {
    id: 'demo-branch-1',
    name: 'Durban North',
    code: 'DBN',
    isActive: true,
    teams: [
      { id: 'demo-team-alpha', name: 'Alpha Response', members: [{}, {}, {}] },
      { id: 'demo-team-night', name: 'Night Patrol', members: [{}, {}] },
    ],
    _count: { users: 18, officers: 12 },
  },
  {
    id: 'demo-branch-2',
    name: 'Westville',
    code: 'WVL',
    isActive: true,
    teams: [{ id: 'demo-team-medic', name: 'Medical', members: [{}, {}] }],
    _count: { users: 9, officers: 4 },
  },
  {
    id: 'demo-branch-3',
    name: 'Umhlanga',
    code: 'UML',
    isActive: false,
    teams: [],
    _count: { users: 2, officers: 0 },
  },
];

const DEMO_CALL_KEY = '4ds-demo-active-call';
const DEMO_DISPATCHER = {
  id: 'demo-user-dispatch-demo-local',
  firstName: 'Lerato',
  lastName: 'Dispatch',
  role: 'DISPATCHER',
};

type DemoCallSession = {
  id: string;
  channel: string;
  status: string;
  targetName: string;
  targetPhone: string | null;
  targetRole: string | null;
  targetUserId: string | null;
  incidentId: string | null;
  isMuted: boolean;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  createdAt: string;
  initiator: { id: string; firstName: string; lastName: string; role: string };
  target: { id: string; firstName: string; lastName: string; role: string } | null;
  notes: { id: string; content: string; noteType: string; authorName: string; createdAt: string }[];
};

function readDemoCall(): DemoCallSession | null {
  try {
    const raw = localStorage.getItem(DEMO_CALL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoCallSession;
  } catch {
    return null;
  }
}

function writeDemoCall(call: DemoCallSession | null) {
  try {
    if (call) localStorage.setItem(DEMO_CALL_KEY, JSON.stringify(call));
    else localStorage.removeItem(DEMO_CALL_KEY);
    window.dispatchEvent(new Event('4ds-demo-call'));
  } catch {
    /* ignore */
  }
}

const DEMO_CHAT_KEY = '4ds-demo-internal-chat';

const demoChatMessages: {
  id: string;
  content: string;
  createdAt: string;
  toUserId?: string | null;
  sender: { id: string; firstName: string; lastName: string; role: string; phone: string | null };
  attachments: { id: string; fileName: string; fileType: string; fileUrl: string; fileSize: number; kind: 'IMAGE' | 'VIDEO' | 'FILE' }[];
}[] = [
  {
    id: 'demo-chat-1',
    content: 'Unit 101 en route to Umhlanga panic.',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    sender: {
      id: DEMO_DISPATCHER.id,
      firstName: DEMO_DISPATCHER.firstName,
      lastName: DEMO_DISPATCHER.lastName,
      role: DEMO_DISPATCHER.role,
      phone: '+27860000000',
    },
    attachments: [],
  },
];

function loadDemoChatMessages() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(DEMO_CHAT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as typeof demoChatMessages;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    demoChatMessages.splice(0, demoChatMessages.length, ...parsed);
  } catch {
    /* ignore */
  }
}

function saveDemoChatMessages() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(demoChatMessages));
  } catch {
    /* ignore */
  }
}

function participantFromUser(user?: AuthSession['user'] | null) {
  return {
    id: user?.id ?? 'demo-user',
    firstName: user?.firstName ?? 'Demo',
    lastName: user?.lastName ?? 'User',
    role: user?.role ?? 'USER',
  };
}

function parsePath(path: string) {
  const [pathname, query = ''] = path.split('?');
  const clean = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(query);
  return { clean, params };
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

const demoDocumentFolders: {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  icon: string | null;
}[] = [
  { id: 'demo-doc-folder-evidence', name: 'Incident Evidence', parentId: null as string | null, description: 'Photos, statements, and captured media', icon: '📷' },
  { id: 'demo-doc-folder-clients', name: 'Client Records', parentId: null as string | null, description: 'Contracts and ID copies', icon: '👤' },
  { id: 'demo-doc-folder-officers', name: 'Officer Files', parentId: null as string | null, description: 'Licenses, certifications, and reports', icon: '🛡️' },
  { id: 'demo-doc-folder-sops', name: 'Policies & SOPs', parentId: null as string | null, description: 'Operational playbooks', icon: '📘' },
];

let demoDocuments: {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSizeKb: number | null;
  tags: string[];
  isPinned: boolean;
  folderId: string | null;
  incidentId: string | null;
  createdAt: string;
  uploadedBy: string | null;
}[] = [
  {
    id: 'demo-doc-1',
    title: 'Panic scene photos',
    description: 'Initial responder photos from Unit 101.',
    category: 'INCIDENT_EVIDENCE',
    fileName: 'panic-scene-photos.pdf',
    fileType: 'application/pdf',
    fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent('Demo incident evidence packet')}`,
    fileSizeKb: 412,
    tags: ['panic', 'scene', 'unit-101'],
    isPinned: true,
    folderId: 'demo-doc-folder-evidence',
    incidentId: 'demo-inc-1',
    createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
    uploadedBy: 'Sipho Ndlovu',
  },
  {
    id: 'demo-doc-2',
    title: 'Nomsa client contract',
    description: 'Signed client service agreement and onboarding checklist.',
    category: 'CLIENT_RECORD',
    fileName: 'nomsa-client-contract.pdf',
    fileType: 'application/pdf',
    fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent('Demo client contract')}`,
    fileSizeKb: 188,
    tags: ['client', 'contract', 'nomsa'],
    isPinned: false,
    folderId: 'demo-doc-folder-clients',
    incidentId: null as string | null,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    uploadedBy: 'Lerato Dispatch',
  },
  {
    id: 'demo-doc-3',
    title: 'Officer duty roster',
    description: 'Current response roster and handover notes.',
    category: 'OFFICER_REPORT',
    fileName: 'officer-duty-roster.xlsx',
    fileType: 'application/vnd.ms-excel',
    fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent('Demo officer roster')}`,
    fileSizeKb: 74,
    tags: ['officers', 'roster', 'handover'],
    isPinned: false,
    folderId: 'demo-doc-folder-officers',
    incidentId: null as string | null,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    uploadedBy: 'Naledi Admin',
  },
  {
    id: 'demo-doc-4',
    title: 'Intrusion response SOP',
    description: 'Step-by-step response checklist for residential intrusion alarms.',
    category: 'POLICY_SOP',
    fileName: 'intrusion-response-sop.pdf',
    fileType: 'application/pdf',
    fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent('Demo response SOP')}`,
    fileSizeKb: 96,
    tags: ['sop', 'intrusion', 'training'],
    isPinned: true,
    folderId: 'demo-doc-folder-sops',
    incidentId: null as string | null,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    uploadedBy: 'Demo Admin',
  },
];

function buildDemoDocumentFolderTree() {
  const countForFolder = (folderId: string) =>
    demoDocuments.filter((doc) => doc.folderId === folderId).length;
  const nodes = demoDocumentFolders.map((folder) => ({
    ...folder,
    documentCount: countForFolder(folder.id),
    children: [] as Array<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      parentId: string | null;
      documentCount: number;
      children: unknown[];
    }>,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: typeof nodes = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function demoDocumentLibrary() {
  return {
    folderTree: buildDemoDocumentFolderTree(),
    folders: demoDocumentFolders.map((folder) => {
      const inFolder = demoDocuments.filter((doc) => doc.folderId === folder.id);
      const latest = inFolder.reduce<string | null>(
        (acc, doc) => (!acc || doc.createdAt > acc ? doc.createdAt : acc),
        null,
      );
      return {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        icon: folder.icon,
        documentCount: inFolder.length,
        updatedAt: latest ?? new Date().toISOString(),
      };
    }),
    categories: Object.keys(
      demoDocuments.reduce<Record<string, number>>((acc, doc) => {
        acc[doc.category] = (acc[doc.category] ?? 0) + 1;
        return acc;
      }, {}),
    ).map((category) => ({
      category,
      count: demoDocuments.filter((doc) => doc.category === category).length,
    })),
    stats: {
      totalDocuments: demoDocuments.length,
      pinned: demoDocuments.filter((doc) => doc.isPinned).length,
      folderCount: demoDocumentFolders.length,
    },
  };
}

function decorateDemoDocument(doc: (typeof demoDocuments)[number]) {
  const folder = demoDocumentFolders.find((f) => f.id === doc.folderId) ?? null;
  const incident = doc.incidentId
    ? demoIncidents.find((i) => i.id === doc.incidentId) ?? null
    : null;
  return {
    ...doc,
    folder: folder ? { id: folder.id, name: folder.name } : null,
    incident: incident
      ? {
          id: incident.id,
          type: incident.type,
          title: incident.title,
          address: incident.location,
          status: incident.status,
        }
      : null,
  };
}

export async function handleDemoRequest<T>({
  path,
  method,
  body,
  session,
  portal,
}: DemoRequest): Promise<T> {
  ensureOfficerProfiles();

  const { clean, params } = parsePath(path);
  const m = method.toUpperCase();
  const payload = parseBody(body);
  const user = session?.user;

  const security = handleDeviceSecurityDemo({
    clean,
    method: m,
    payload: (payload ?? {}) as Record<string, unknown>,
    session,
  });
  if (security) {
    const data = security.response.data as { error?: string; message?: string } | null;
    if (data && typeof data === 'object' && data.error) {
      throw new Error(data.message ?? 'Request failed');
    }
    if (security.incident) demoIncidents.unshift(security.incident);
    if (security.notification) demoClientNotifications.unshift(security.notification);
    if (security.crNotification) demoControlRoomNotifications.unshift(security.crNotification);
    return security.response as T;
  }

  // ——— Store (public) ———
  if (clean === '/store/catalog' && m === 'GET') {
    const category = params.get('category') ?? undefined;
    const featured = params.get('featured') === '1' || params.get('featured') === 'true';
    return ok(getDemoProducts({ category, featuredOnly: featured })) as T;
  }
  if (clean === '/store/categories' && m === 'GET') {
    return ok(getDemoCategories()) as T;
  }
  if (clean === '/store/checkout' && m === 'POST') {
    const orderNumber = `NX-DEMO-${orderSeq++}`;
    const items = Array.isArray(payload.items)
      ? (payload.items as { productId?: string; quantity?: number }[])
      : [];
    const named = items.map((item) => {
      const product = demoAdminProducts.find((p) => p.id === item.productId);
      return {
        productName: product?.name ?? 'Store item',
        quantity: Math.max(1, Number(item.quantity ?? 1)),
      };
    });
    const totalCents = items.reduce((sum, item) => {
      const product = demoAdminProducts.find((p) => p.id === item.productId);
      return sum + (product?.priceCents ?? 0) * Math.max(1, Number(item.quantity ?? 1));
    }, 0);
    demoStoreOrders.unshift({
      id: `demo-ord-${Date.now()}`,
      orderNumber,
      customerName: String(payload.customerName ?? user?.firstName ?? 'Client'),
      customerEmail: String(payload.customerEmail ?? user?.email ?? 'client@demo.local'),
      customerUserId: typeof payload.customerUserId === 'string' ? payload.customerUserId : user?.id,
      status: 'PAID',
      totalCents,
      totalFormatted: `R ${(totalCents / 100).toFixed(2)}`,
      createdAt: new Date().toISOString(),
      itemCount: named.reduce((n, i) => n + i.quantity, 0) || 1,
      items: named.length ? named : [{ productName: 'Nexus gear', quantity: 1 }],
    });
    return ok({ orderNumber }) as T;
  }
  if (clean === '/store/my-orders' && m === 'GET') {
    const email = (user?.email ?? '').toLowerCase();
    const uid = user?.id;
    return ok(
      demoStoreOrders.filter(
        (o) =>
          (email && o.customerEmail.toLowerCase() === email) ||
          (uid && o.customerUserId === uid),
      ),
    ) as T;
  }
  if (clean === '/store/admin/overview' && m === 'GET') {
    const openOrders = demoStoreOrders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    const revenue = demoStoreOrders.reduce((n, o) => n + o.totalCents, 0);
    return ok({
      stats: {
        catalogSize: demoAdminProducts.length,
        lowStock: demoAdminProducts.filter((p) => p.stock < 5).length,
        openOrders,
        revenueFormatted: `R ${(revenue / 100).toFixed(2)}`,
        openLeads: 3,
        technicians: 3,
        activeInstalls: 2,
      },
      lowStock: demoAdminProducts
        .filter((p) => p.stock < 5)
        .slice(0, 6)
        .map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, category: p.category })),
      recentOrders: demoStoreOrders.slice(0, 8),
    }) as T;
  }
  if (clean === '/store/admin/products' && m === 'GET') {
    return ok(demoAdminProducts) as T;
  }
  if (clean === '/store/admin/products' && m === 'POST') {
    const id = typeof payload.id === 'string' && payload.id ? payload.id : `demo-product-${Date.now()}`;
    const existing = demoAdminProducts.find((p) => p.id === id);
    const next = {
      id,
      sku: String(payload.sku ?? existing?.sku ?? 'SKU'),
      name: String(payload.name ?? existing?.name ?? 'Product'),
      description: String(payload.description ?? existing?.description ?? ''),
      category: String(payload.category ?? existing?.category ?? 'GEAR'),
      priceCents: Number(payload.priceCents ?? existing?.priceCents ?? 0),
      priceFormatted: `R ${(Number(payload.priceCents ?? existing?.priceCents ?? 0) / 100).toFixed(2)}`,
      stock: Number(payload.stock ?? existing?.stock ?? 0),
      imageEmoji: String(payload.imageEmoji ?? existing?.imageEmoji ?? '🛡️'),
      featured: Boolean(payload.featured ?? existing?.featured),
      requiresLicense: Boolean(payload.requiresLicense ?? existing?.requiresLicense),
      isActive: payload.isActive !== false,
    };
    if (existing) Object.assign(existing, next);
    else demoAdminProducts.unshift(next);
    return ok(next) as T;
  }
  if (clean === '/store/admin/orders' && m === 'GET') {
    const revenue = demoStoreOrders.reduce((n, o) => n + o.totalCents, 0);
    return {
      success: true as const,
      data: demoStoreOrders,
      stats: {
        revenueFormatted: `R ${(revenue / 100).toFixed(2)}`,
        pending: demoStoreOrders.filter((o) => o.status === 'PENDING' || o.status === 'PAID').length,
        total: demoStoreOrders.length,
      },
    } as T;
  }
  {
    const orderMatch = clean.match(/^\/store\/admin\/orders\/([^/]+)\/status$/);
    if (orderMatch && m === 'PATCH') {
      const order = demoStoreOrders.find((o) => o.id === orderMatch[1]);
      if (order && typeof payload.status === 'string') order.status = payload.status;
      return ok(order ?? { ok: true }) as T;
    }
  }
  if (clean === '/store/sales/dashboard' && m === 'GET') {
    return ok(buildSalesDashboard()) as T;
  }
  if (clean === '/store/sales/users' && m === 'GET') {
    const salesRoles = new Set(['SALES', 'MANAGER', 'OWNER', 'DISPATCHER']);
    return ok(
      demoManagedUsers
        .filter((u) => salesRoles.has(u.role) && u.status === 'ACTIVE')
        .map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
        })),
    ) as T;
  }
  if (clean === '/store/sales/leads' && m === 'POST') {
    const id = typeof payload.id === 'string' && payload.id ? payload.id : `demo-lead-${Date.now()}`;
    const existing = demoSalesLeads.find((l) => l.id === id);
    const next: DemoSalesLead = {
      id,
      companyName:
        payload.companyName === null || typeof payload.companyName === 'string'
          ? payload.companyName
          : (existing?.companyName ?? null),
      contactName: String(payload.contactName ?? existing?.contactName ?? ''),
      contactEmail:
        payload.contactEmail === null || typeof payload.contactEmail === 'string'
          ? payload.contactEmail
          : (existing?.contactEmail ?? null),
      contactPhone:
        payload.contactPhone === null || typeof payload.contactPhone === 'string'
          ? payload.contactPhone
          : (existing?.contactPhone ?? null),
      source: String(payload.source ?? existing?.source ?? 'Manual'),
      status: String(payload.status ?? existing?.status ?? 'NEW'),
      interest:
        payload.interest === null || typeof payload.interest === 'string'
          ? payload.interest
          : (existing?.interest ?? null),
      estimatedCents:
        payload.estimatedCents === null
          ? null
          : Number(payload.estimatedCents ?? existing?.estimatedCents ?? 0) || null,
      notes:
        payload.notes === null || typeof payload.notes === 'string'
          ? payload.notes
          : (existing?.notes ?? null),
      nextFollowUp:
        payload.nextFollowUp === null || typeof payload.nextFollowUp === 'string'
          ? payload.nextFollowUp
          : (existing?.nextFollowUp ?? null),
      ownerUserId:
        payload.ownerUserId === null || typeof payload.ownerUserId === 'string'
          ? payload.ownerUserId
          : (existing?.ownerUserId ?? null),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (existing) Object.assign(existing, next);
    else demoSalesLeads.unshift(next);
    return ok(salesLeadToApi(existing ?? next)) as T;
  }
  if (clean === '/store/installs' && m === 'GET') {
    const scheduled = techJobs.filter((j) => j.status === 'SCHEDULED').length;
    const inProgress = techJobs.filter((j) => !['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(j.status)).length;
    const completed = techJobs.filter((j) => j.status === 'COMPLETED').length;
    const techs = demoManagedUsers.filter((u) => u.role === 'TECHNICIAN');
    return {
      success: true as const,
      data: techJobs.map((j, index) => {
        const tech = techs[index % Math.max(techs.length, 1)];
        return {
          id: j.id,
          title: j.title,
          description: j.description ?? null,
          jobType: j.jobType,
          status: j.status,
          clientName: j.clientName ?? 'Demo client',
          clientPhone: j.clientPhone ?? null,
          address: j.address,
          scheduledAt: j.scheduledAt,
          equipmentNotes: j.equipmentNotes ?? null,
          technicianId: tech?.id ?? null,
          technicianName: tech ? `${tech.firstName} ${tech.lastName}` : 'Unassigned',
        };
      }),
      stats: { scheduled, inProgress, completed },
    } as T;
  }
  if (clean === '/store/installs' && m === 'POST') {
    const id = typeof payload.id === 'string' && payload.id ? payload.id : `demo-job-${Date.now()}`;
    const existing = techJobs.find((j) => j.id === id);
    const next: TechJob = {
      id,
      title: String(payload.title ?? existing?.title ?? 'Install job'),
      description:
        payload.description === null || typeof payload.description === 'string'
          ? payload.description ?? undefined
          : existing?.description,
      jobType: String(payload.jobType ?? existing?.jobType ?? 'CCTV'),
      status: String(payload.status ?? existing?.status ?? 'SCHEDULED'),
      clientName: String(payload.clientName ?? existing?.clientName ?? 'Demo client'),
      clientPhone:
        payload.clientPhone === null || typeof payload.clientPhone === 'string'
          ? payload.clientPhone ?? undefined
          : existing?.clientPhone,
      address: String(payload.address ?? existing?.address ?? 'Durban'),
      scheduledAt: String(payload.scheduledAt ?? existing?.scheduledAt ?? new Date().toISOString()),
      equipmentNotes:
        payload.equipmentNotes === null || typeof payload.equipmentNotes === 'string'
          ? payload.equipmentNotes ?? undefined
          : existing?.equipmentNotes,
      tests: existing?.tests,
      serial: existing?.serial,
    };
    if (existing) Object.assign(existing, next);
    else techJobs.unshift(next);
    return ok(next) as T;
  }
  if (clean === '/store/technicians' && m === 'GET') {
    return ok(
      demoManagedUsers
        .filter((u) => u.role === 'TECHNICIAN' && u.status === 'ACTIVE')
        .map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          jobTitle: u.jobTitle,
          phone: u.phone,
          teams: u.teams.map((t) => t.name),
        })),
    ) as T;
  }

  // ——— Client ———
  if (clean === '/client/profile' && m === 'GET') {
    const key = user?.id ?? 'demo-user-client-demo-local';
    const profile = demoClientProfiles[key];
    return ok({
      id: key,
      email: profile?.email ?? user?.email ?? 'client@demo.local',
      phone: profile?.phone ?? user?.phone ?? '+27821234567',
      firstName: profile?.firstName ?? user?.firstName ?? 'Nomsa',
      lastName: profile?.lastName ?? user?.lastName ?? 'Client',
      role: 'CLIENT',
      roleLabel: 'Primary subscriber',
      trackingEnabled: profile?.trackingEnabled ?? true,
      lastLocationAt: new Date().toISOString(),
      createdAt: '2024-03-12T08:00:00.000Z',
      tenant: {
        name: user?.tenant?.name ?? DEMO_TENANT.name,
        slug: user?.tenant?.slug ?? DEMO_TENANT.slug,
      },
    }) as T;
  }
  if (clean === '/client/profile' && m === 'PATCH') {
    const key = user?.id ?? 'demo-user-client-demo-local';
    const current = demoClientProfiles[key] ?? {
      firstName: user?.firstName ?? 'Nomsa',
      lastName: user?.lastName ?? 'Client',
      phone: user?.phone ?? '+27821234567',
      email: user?.email ?? 'client@demo.local',
      trackingEnabled: true,
    };
    if (typeof payload.phone === 'string') current.phone = payload.phone;
    if (typeof payload.trackingEnabled === 'boolean') current.trackingEnabled = payload.trackingEnabled;
    demoClientProfiles[key] = current;
    return ok({
      id: key,
      email: current.email,
      phone: current.phone,
      firstName: current.firstName,
      lastName: current.lastName,
      trackingEnabled: current.trackingEnabled,
      tenant: {
        name: user?.tenant?.name ?? DEMO_TENANT.name,
        slug: user?.tenant?.slug ?? DEMO_TENANT.slug,
      },
    }) as T;
  }
  if (clean === '/client/tracking' && m === 'POST') {
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    demoClientLocation = {
      lat: Number.isFinite(lat) ? lat : demoClientLocation.lat,
      lng: Number.isFinite(lng) ? lng : demoClientLocation.lng,
    };
    return ok({ ...demoClientLocation }) as T;
  }
  if (clean === '/client/medical' && m === 'GET') {
    return ok({ ...demoMedical }) as T;
  }
  if (clean === '/client/medical' && m === 'PATCH') {
    demoMedical = {
      bloodType: typeof payload.bloodType === 'string' ? payload.bloodType : demoMedical.bloodType,
      allergies: typeof payload.allergies === 'string' ? payload.allergies : demoMedical.allergies,
      medications: typeof payload.medications === 'string' ? payload.medications : demoMedical.medications,
      chronicConditions:
        typeof payload.chronicConditions === 'string'
          ? payload.chronicConditions
          : demoMedical.chronicConditions,
      emergencyNotes:
        typeof payload.emergencyNotes === 'string' ? payload.emergencyNotes : demoMedical.emergencyNotes,
      doctorContact:
        typeof payload.doctorContact === 'string' ? payload.doctorContact : demoMedical.doctorContact,
      ambulancePreference:
        typeof payload.ambulancePreference === 'string'
          ? payload.ambulancePreference
          : demoMedical.ambulancePreference,
      isComplete: true,
    };
    return ok({ ...demoMedical }) as T;
  }
  if (clean === '/client/contacts' && m === 'POST') {
    const contact = {
      id: `demo-c-${Date.now()}`,
      name: String(payload.name ?? 'Contact'),
      phone: String(payload.phone ?? ''),
      relationship: typeof payload.relationship === 'string' ? payload.relationship : 'Contact',
      priority: demoContacts.length + 1,
      verifiedAt: new Date().toISOString(),
    };
    demoContacts.push(contact);
    return ok(contact) as T;
  }
  {
    const delContact = clean.match(/^\/client\/contacts\/([^/]+)$/);
    if (delContact && m === 'DELETE') {
      const idx = demoContacts.findIndex((c) => c.id === delContact[1] && !('isDispatch' in c && c.isDispatch));
      if (idx >= 0) demoContacts.splice(idx, 1);
      return ok({ ok: true }) as T;
    }
  }
  if (clean === '/client/safe-zones' && m === 'GET') {
    return ok(demoSafeZones) as T;
  }
  if (clean === '/client/safe-zones' && m === 'POST') {
    const zone = {
      id: `demo-zone-${Date.now()}`,
      name: String(payload.name ?? 'Safe zone'),
      lat: String(payload.lat ?? demoClientLocation.lat),
      lng: String(payload.lng ?? demoClientLocation.lng),
      radiusM: Number(payload.radiusM ?? 500),
    };
    demoSafeZones.push(zone);
    return ok(zone) as T;
  }
  if (clean === '/client/panic/cancel' && m === 'POST') {
    const open = demoIncidents.find((i) => i.status === 'OPEN' && (i.type === 'PANIC' || i.isSilent));
    if (open) open.status = 'CANCELLED';
    return ok({ cancelled: Boolean(open) }) as T;
  }
  if (clean === '/client/overview' && m === 'GET') {
    return ok({
      user: {
        firstName: user?.firstName ?? 'Nomsa',
        trackingEnabled:
          demoClientProfiles[user?.id ?? 'demo-user-client-demo-local']?.trackingEnabled ?? true,
        address: '12 Lagoon Dr, Umhlanga',
      },
      stats: {
      contactCount: demoContacts.length,
        familyCount: 2,
        activeIncidents: demoIncidents.filter((i) =>
          ['OPEN', 'DISPATCHED', 'IN_PROGRESS'].includes(i.status),
        ).length,
        unreadNotifications: demoUnreadCount(),
      },
      services: {
        personal: 'active',
        family: 'active',
        vehicle: 'active',
        home: 'active',
        medical: 'active',
      },
      subscription: {
        planName: 'Family Protect',
        status: 'ACTIVE',
        memberId: 'NX-MEM-1001',
      },
      vehicles: [
        {
          id: 'demo-veh-1',
          registration: 'ND 123-456',
          make: 'Toyota',
          model: 'Fortuner',
          theftRecovery: demoVehicleState.theftRecovery,
          immobiliserOn: demoVehicleState.immobiliserOn,
          doorsLocked: demoVehicleState.doorsLocked,
        },
      ],
      properties: demoProperties.filter((p) => {
        const site = demoSurveillanceSites.find((s) => s.id === p.id);
        if (!site) return p.id === 'demo-prop-1';
        const ownerId = user?.id ?? 'demo-user-client-demo-local';
        return site.owner.id === ownerId || site.owner.email === user?.email || p.id === 'demo-prop-1';
      }),
      family: [
        { id: 'demo-fam-1', name: 'Thandi Client', trackingEnabled: true, phone: '+27821234568' },
        { id: 'demo-fam-2', name: 'Lerato Client', trackingEnabled: false, phone: '+27821234569' },
      ],
      contacts: demoContacts,
      recentIncidents: demoIncidents.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        title: i.title,
        isSilent: i.isSilent,
        time: i.time,
      })),
      recentActivity: [
        { title: 'Alarm armed', detail: 'Home — Umhlanga', time: '1h ago' },
        { title: 'Vehicle check-in', detail: 'ND 123-456', time: '3h ago' },
      ],
      medicalComplete: true,
      safeZoneCount: demoSafeZones.length,
      liveResponse: {
        id: 'demo-inc-1',
        publicRef: 'NX-0001',
        type: 'PANIC',
        status: 'DISPATCHED',
        events: [
          {
            id: 'demo-ev-1',
            kind: 'event',
            type: 'incident.created',
            source: 'portal',
            payload: { kind: 'panic' },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'demo-ev-2',
            kind: 'event',
            type: 'dispatch.created',
            source: 'control-room',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'demo-ev-3',
            kind: 'event',
            type: 'dispatch.en_route',
            source: 'officer',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }) as T;
  }
  if (clean === '/client/contacts' && m === 'GET') {
    return {
      success: true,
      data: demoContacts,
      meta: { dispatchLine: { name: '4DS Control Room', phone: '+27111004400' } },
    } as T;
  }
  if (clean === '/client/subscription/access' && m === 'GET') {
    return ok({
      tierCode: 'FAMILY',
      addons: ['HOME_SECURITY', 'VEHICLE_RESPONSE', 'FAMILY', 'MEDICAL_PLUS'],
      access: {
        home: true,
        vehicle: true,
        family: true,
        medical: true,
        personal: true,
        emergency: true,
      },
    }) as T;
  }
  if (clean === '/client/plans' && m === 'GET') {
    return ok({
      paymentProvider: {
        name: 'PayFast',
        description: 'Secure South African payments for monthly cover and upgrades (demo).',
        website: 'https://www.payfast.co.za',
      },
      tiers: [
        {
          code: 'PERSONAL',
          name: 'Personal Protect',
          priceFormatted: 'R299/mo',
          description: 'Panic, tracking, and personal response.',
          isCurrent: false,
          isAvailable: true,
        },
        {
          code: 'FAMILY',
          name: 'Family Protect',
          priceFormatted: 'R499/mo',
          description: 'Family tracking, home, and vehicle add-ons ready.',
          isCurrent: true,
          isAvailable: false,
        },
        {
          code: 'PREMIUM',
          name: 'Premium Protect',
          priceFormatted: 'R799/mo',
          description: 'Full stack cover with priority dispatch.',
          isCurrent: false,
          isAvailable: true,
        },
      ],
      addons: [
        {
          code: 'HOME_SECURITY',
          name: 'Home Security',
          priceFormatted: 'R149/mo',
          description: 'Alarm status and property monitoring.',
          isActive: true,
          isAvailable: false,
        },
        {
          code: 'VEHICLE_RESPONSE',
          name: 'Vehicle Response',
          priceFormatted: 'R199/mo',
          description: 'Theft recovery and live vehicle trails.',
          isActive: true,
          isAvailable: false,
        },
        {
          code: 'MEDICAL_PLUS',
          name: 'Medical Plus',
          priceFormatted: 'R99/mo',
          description: 'Medical profile shared with responders.',
          isActive: false,
          isAvailable: true,
        },
      ],
      availableUpgrades: {
        tier: {
          name: 'Premium Protect',
          priceFormatted: 'R799/mo',
          description: 'Priority response and full access to protection features.',
        },
        addons: [
          {
            code: 'MEDICAL_PLUS',
            name: 'Medical Plus',
            priceFormatted: 'R99/mo',
            description: 'Medical profile shared with responders.',
          },
        ],
      },
      current: {
        tierName: 'Family Protect',
        tierCode: 'FAMILY',
        priceFormatted: 'R499/mo',
        memberId: 'NX-MEM-1001',
        status: 'ACTIVE',
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        nextBillingAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        lastPaidAt: new Date(Date.now() - 16 * 86400000).toISOString(),
        isOverdue: false,
        daysPastDue: 0,
        amountDueFormatted: 'R499.00',
        billingFailedCount: 0,
        discountedMonthlyFormatted: 'R474.05',
        discountPercent: 5,
        discountCents: 2495,
        loyalty: {
          tier: 'SILVER',
          tierName: 'Silver',
          points: 420,
          tierDiscountPercent: 5,
          manualDiscountPercent: 0,
          effectiveDiscountPercent: 5,
          activePromoCode: 'GEAR15',
          promoDiscountPercent: 15,
          benefits: '5% off monthly cover · gear promo ready',
          nextTierName: 'Gold',
          pointsToNext: 80,
          progressPercent: 84,
        },
        activeAddonDetails: [
          { name: 'Home Security', priceFormatted: 'R149/mo' },
          { name: 'Vehicle Response', priceFormatted: 'R199/mo' },
        ],
        access: {
          home: true,
          vehicle: true,
          family: true,
          medical: true,
          personal: true,
          emergency: true,
        },
      },
    }) as T;
  }
  if (clean === '/client/subscription/payments' && m === 'GET') {
    return ok([
      {
        id: 'demo-pay-1',
        reference: 'PF-DEMO-1001',
        amountFormatted: 'R499.00',
        status: 'COMPLETE',
        kind: 'MONTHLY',
        createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
      },
      {
        id: 'demo-pay-2',
        reference: 'PF-DEMO-0988',
        amountFormatted: 'R499.00',
        status: 'COMPLETE',
        kind: 'MONTHLY',
        createdAt: new Date(Date.now() - 46 * 86400000).toISOString(),
      },
    ]) as T;
  }
  if (
    (clean === '/client/subscription/checkout' ||
      clean === '/client/subscription/charge-monthly') &&
    m === 'POST'
  ) {
    const ref = `PF-DEMO-${Date.now()}`;
    const isMonthly = clean.includes('charge-monthly');
    const description = isMonthly
      ? 'Monthly subscription renewal'
      : typeof payload.tierCode === 'string'
        ? `Upgrade to ${payload.tierCode}`
        : `Add-on: ${String(payload.addonCode ?? 'service')}`;
    demoCheckoutPayments[ref] = {
      reference: ref,
      provider: 'PayFast',
      amountFormatted: 'R499.00',
      status: 'PENDING',
      description,
      kind: isMonthly ? 'MONTHLY' : 'CHECKOUT',
    };
    return ok({
      checkoutUrl: `/portal/subscription/checkout?ref=${encodeURIComponent(ref)}`,
    }) as T;
  }
  {
    const payMatch = clean.match(/^\/client\/subscription\/payment\/([^/]+)$/);
    if (payMatch && m === 'GET') {
      const ref = decodeURIComponent(payMatch[1]);
      const payment = demoCheckoutPayments[ref] ?? {
        reference: ref,
        provider: 'PayFast',
        amountFormatted: 'R499.00',
        status: ref.startsWith('PF-DEMO-') ? 'PENDING' : 'COMPLETE',
        description: 'Subscription payment',
        kind: 'MONTHLY',
      };
      return ok(payment) as T;
    }
  }
  if (clean === '/client/subscription/confirm' && m === 'POST') {
    const ref = String(payload.reference ?? '');
    const method = String(payload.method ?? 'card');
    const payment = demoCheckoutPayments[ref];
    if (method === 'debit_order') {
      if (payment) payment.status = 'PENDING_VERIFICATION';
      demoPendingVerifications.push({
        id: `ver-debit-${Date.now()}`,
        type: 'DEBIT_ORDER',
        clientName: 'Nomsa Client',
        clientEmail: 'client@demo.local',
        summary: `Debit order payment · ${payment?.amountFormatted ?? 'R499.00'}`,
        detail: {
          reference: ref,
          bankName: demoDebitOrder.bankName,
          accountLast4: demoDebitOrder.accountLast4,
          debitDay: demoDebitOrder.debitDay,
        },
        createdAt: new Date().toISOString(),
      });
      return ok({ ok: true, pendingVerification: true }) as T;
    }
    if (payment) payment.status = 'COMPLETE';
    return ok({ ok: true }) as T;
  }
  if (clean === '/client/billing/debit-order' && m === 'GET') {
    return ok(demoDebitOrder) as T;
  }
  if (clean === '/client/billing/debit-order' && m === 'POST') {
    const accountNumber = String(payload.accountNumber ?? '');
    demoDebitOrder = {
      status: 'PENDING_VERIFICATION',
      bankName: String(payload.bankName ?? ''),
      accountLast4: accountNumber.slice(-4) || '0000',
      debitDay: Number(payload.debitDay ?? 1),
      verifiedAt: null,
      message:
        'Debit order submitted — control room is verifying your bank details. You can still pay by card in the meantime.',
    };
    demoPendingVerifications.push({
      id: `ver-debit-setup-${Date.now()}`,
      type: 'DEBIT_ORDER',
      clientName: 'Nomsa Client',
      clientEmail: 'client@demo.local',
      summary: `Debit order · ${demoDebitOrder.bankName} •••• ${demoDebitOrder.accountLast4}`,
      detail: {
        bankName: demoDebitOrder.bankName,
        accountLast4: demoDebitOrder.accountLast4,
        debitDay: demoDebitOrder.debitDay,
      },
      createdAt: new Date().toISOString(),
    });
    return ok(demoDebitOrder) as T;
  }
  if (clean === '/client/billing/documents' && m === 'GET') {
    return ok(demoBillingDocuments) as T;
  }
  if (clean === '/client/properties/register' && m === 'POST') {
    const name = String(payload.name ?? 'New property');
    const address = String(payload.address ?? '');
    const siteId = `demo-prop-${Date.now()}`;
    demoProperties.push({
      id: siteId,
      name,
      alarmStatus: 'DISARMED',
      alarmLinked: false,
    });
    demoSurveillanceSites.push({
      id: siteId,
      name,
      address,
      propertyType: 'RESIDENTIAL',
      alarmStatus: 'DISARMED',
      alarmLinked: false,
      camerasLinked: false,
      monitoringEnabled: false,
      shareInteriorCameras: false,
      privacy: {
        shareInteriorCameras: false,
        interiorUnlocked: true,
        unlockReason: 'OWNER',
        unlockLabel: 'Pending verification',
        interiorCameraCount: 0,
        privateInteriorCount: 0,
      },
      cameraCount: 0,
      onlineCameras: 0,
      sensorCount: 0,
      alertSensors: 0,
      openEvents: 0,
      cameras: [],
      sensors: [],
      gateCode: typeof payload.gateCode === 'string' ? payload.gateCode : null,
      accessNotes: 'Pending control-room verification',
      keyHolder: null,
      owner: {
        id: 'demo-user-client',
        name: 'Nomsa Client',
        email: 'client@demo.local',
        phone: '+27821234567',
        membershipNumber: 'NX-MEM-PENDING',
        plan: 'Pending verification',
        tier: 'HOME',
        subscriptionStatus: 'PENDING',
        joinedAt: new Date().toISOString(),
      },
      linkedVehicles: [],
      assignedFleet: [],
      subscription: {
        plan: 'Pending verification',
        status: 'PENDING',
        renewalDate: new Date().toISOString().slice(0, 10),
        monthlyAmount: 0,
        addons: [],
      },
      panel: {
        panelVendor: 'Pending',
        panelModel: '—',
        communicatorType: '—',
        monitoringAccount: '—',
        partitionLabel: '—',
        protocol: 'Contact ID',
        region: 'ZA',
      },
      lat: DURBAN.lat + (Math.random() - 0.5) * 0.08,
      lng: DURBAN.lng + (Math.random() - 0.5) * 0.08,
      mapAlarm: 'ALARM_OK',
    } satisfies DemoSurveillanceSite);
    demoPendingVerifications.push({
      id: `ver-prop-${siteId}`,
      type: 'PROPERTY',
      clientName: 'Nomsa Client',
      clientEmail: 'client@demo.local',
      summary: `Property registration · ${name}`,
      detail: { siteId, name, address },
      createdAt: new Date().toISOString(),
    });
    return ok({
      id: siteId,
      status: 'PENDING_VERIFICATION',
      message:
        'Property submitted. Our control room will verify ownership and link your alarm & cameras.',
    }) as T;
  }
  if (clean === '/client/loyalty' && m === 'GET') {
    return ok({
      tierName: 'Silver',
      points: 420,
      effectiveDiscountPercent: 5,
      activePromoCode: 'GEAR15',
    }) as T;
  }
  if (
    (clean === '/client/panic' ||
      clean === '/client/medical/emergency' ||
      clean === '/client/fire/emergency') &&
    m === 'POST'
  ) {
    const type =
      clean.includes('medical') ? 'MEDICAL' : clean.includes('fire') ? 'FIRE' : 'PANIC';
    demoIncidents.unshift({
      id: `demo-inc-${Date.now()}`,
      type,
      status: 'OPEN',
      title: type === 'PANIC' ? 'Panic alert' : `${type.charAt(0)}${type.slice(1).toLowerCase()} alert`,
      isSilent: Boolean(payload.silent),
      time: 'Just now',
      priority: 'CRITICAL',
      user: 'Nomsa Client',
      location: 'Umhlanga Rocks Dr',
    });
    if (type === 'MEDICAL') {
      medicalTickets.unshift({
        id: `demo-med-${Date.now()}`,
        incidentId: demoIncidents[0].id,
        client: 'Nomsa Client',
        location: 'Umhlanga Rocks Dr',
        priority: 'CRITICAL',
        status: 'OPEN',
        level: 'ALS',
        distanceKm: 2.4,
        patientSummary: 'Known medical profile on file · PHI withheld from officers',
        securityTicketId: demoIncidents[0].id,
      });
    }
    return ok({ created: true, dualDispatch: type === 'MEDICAL' }) as T;
  }
  {
    const alarmMatch = clean.match(/^\/client\/properties\/([^/]+)\/alarm$/);
    if (alarmMatch && m === 'PATCH') {
      const status = typeof payload.status === 'string' ? payload.status : 'DISARMED';
      setDemoAlarmStatus(alarmMatch[1], status);
      const site = demoSurveillanceSites.find((s) => s.id === alarmMatch[1]);
      const prop = demoProperties.find((p) => p.id === alarmMatch[1]);
      return ok(site ?? prop ?? { id: alarmMatch[1], alarmStatus: status }) as T;
    }
  }
  {
    const panicMatch = clean.match(/^\/client\/properties\/([^/]+)\/panic$/);
    if (panicMatch && m === 'POST') {
      const siteId = panicMatch[1];
      const site = demoSurveillanceSites.find((s) => s.id === siteId);
      demoIncidents.unshift({
        id: `demo-inc-${Date.now()}`,
        type: 'PANIC',
        status: 'OPEN',
        title: `Home panic — ${site?.name ?? 'Property'}`,
        isSilent: false,
        time: 'Just now',
        priority: 'CRITICAL',
        user: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client',
        location: site?.address ?? 'Home',
      });
      setDemoAlarmStatus(siteId, 'TRIGGERED');
      return ok({ created: true, incidentId: demoIncidents[0].id }) as T;
    }
  }
  {
    const sirenMatch = clean.match(/^\/client\/properties\/([^/]+)\/siren$/);
    if (sirenMatch && m === 'POST') {
      const siteId = sirenMatch[1];
      const site = demoSurveillanceSites.find((s) => s.id === siteId);
      demoIncidents.unshift({
        id: `demo-inc-${Date.now()}`,
        type: 'PANIC',
        status: 'OPEN',
        title: `CCTV siren — ${site?.name ?? 'Property'}`,
        isSilent: false,
        time: 'Just now',
        priority: 'CRITICAL',
        user: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client',
        location: site?.address ?? 'Home',
      });
      setDemoAlarmStatus(siteId, 'TRIGGERED');
      return ok({
        alarmStatus: 'TRIGGERED',
        incidentId: demoIncidents[0].id,
        message: `Siren sounding at ${site?.name ?? 'the property'}. Disarm to silence.`,
      }) as T;
    }
  }
  if (clean === '/client/notifications' && m === 'GET') {
    return ok({
      notifications: demoClientNotifications.map((n) => ({ ...n })),
      unreadCount: demoUnreadCount(),
    }) as T;
  }
  if (clean === '/client/notifications/read-all' && m === 'PATCH') {
    for (const n of demoClientNotifications) n.isRead = true;
    return ok({ ok: true, unreadCount: 0 }) as T;
  }
  {
    const readMatch = clean.match(/^\/client\/notifications\/([^/]+)\/read$/);
    if (readMatch && m === 'PATCH') {
      const n = demoClientNotifications.find((item) => item.id === readMatch[1]);
      if (n) n.isRead = true;
      return ok({ ok: true, unreadCount: demoUnreadCount() }) as T;
    }
  }
  if (clean === '/client/surveillance/sites' && m === 'GET') {
    const ownerId = user?.id ?? 'demo-user-client-demo-local';
    const owned = demoSurveillanceSites.filter(
      (s) => s.owner.id === ownerId || s.owner.email === user?.email,
    );
    return ok(owned.length ? owned : demoSurveillanceSites.filter((s) => s.id === 'demo-prop-1')) as T;
  }
  if (clean === '/client/surveillance/dashboard-feeds' && m === 'GET') {
    const ownerId = user?.id ?? 'demo-user-client-demo-local';
    const ownedSites = demoSurveillanceSites.filter(
      (s) => s.owner.id === ownerId || s.owner.email === user?.email,
    );
    const homeSite =
      ownedSites.find((s) => s.cameraCount > 0) ??
      demoSurveillanceSites.find((s) => s.id === 'demo-prop-1');
    const ownedVehicles = demoClientVehicles.filter(
      (v) =>
        v.ownerId === ownerId ||
        v.ownerName.toLowerCase().includes(String(user?.firstName ?? 'nomsa').toLowerCase()),
    );
    const linkedFromSites = (ownedSites.length
      ? ownedSites
      : demoSurveillanceSites.filter((s) => s.id === 'demo-prop-1')
    ).flatMap((s) => s.linkedVehicles.map((v) => v.id));
    const ownedVehicleIds = new Set([
      ...linkedFromSites,
      ...(ownedVehicles.length ? ownedVehicles : demoClientVehicles.filter((v) => v.id === 'demo-veh-1')).map(
        (v) => v.id,
      ),
    ]);
    if (ownedVehicleIds.size === 0) ownedVehicleIds.add('demo-veh-1');
    return ok({
      home: homeSite
        ? {
            id: homeSite.id,
            label: homeSite.name,
            subtitle: 'Home CCTV',
            href: `/portal/home/${homeSite.id}`,
            onlineCount: homeSite.onlineCameras,
            cameras: homeSite.cameras.map((c) => ({
              id: c.id,
              name: c.name,
              locationLabel: c.locationLabel,
              channel: c.channel,
              status: c.status,
              snapshotUrl: c.snapshotUrl,
              isLiveCapable: c.isLiveCapable,
              isInterior: c.isInterior,
            })),
          }
        : null,
      vehicles: demoVehicleCameraFeeds
        .filter((v) => ownedVehicleIds.has(v.vehicleId))
        .map((v) => ({
          id: v.vehicleId,
          label: v.label,
          subtitle: v.registration,
          href: `/portal/vehicles/${v.vehicleId}`,
          onlineCount: v.cameras.filter((c) => c.status.toUpperCase() !== 'OFFLINE').length,
          cameras: v.cameras.map((c) => ({
            id: c.id,
            name: c.name,
            locationLabel: c.locationLabel,
            channel: c.channel,
            status: c.status,
            snapshotUrl: c.snapshotUrl,
            isLiveCapable: c.isLiveCapable,
            isInterior: c.isInterior,
          })),
        })),
    }) as T;
  }
  {
    const siteMatch = clean.match(/^\/client\/surveillance\/sites\/([^/]+)$/);
    if (siteMatch && m === 'GET') {
      const site = demoSurveillanceSites.find((s) => s.id === siteMatch[1]);
      if (!site) return ok(null) as T;
      return ok({
        ...site,
        accessNotes: 'Gate remote · call if no answer',
        gateCode: '4521#',
        keyHolder: 'Thandi Client',
        events: [],
      } as typeof site & {
        accessNotes: string;
        gateCode: string;
        keyHolder: string;
        events: never[];
      }) as T;
    }
  }
  if (clean === '/client/support/silent-call' && m === 'POST') {
    demoIncidents.unshift({
      id: `demo-inc-${Date.now()}`,
      type: 'PANIC',
      status: 'OPEN',
      title: 'Silent safety call (demo)',
      isSilent: true,
      time: 'Just now',
      priority: 'CRITICAL',
      user: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client',
      location: 'Client location updating',
    });
    return ok({ ok: true, discreet: true }) as T;
  }
  if (clean === '/client/support/error-report' && m === 'POST') {
    const report = pushDemoErrorReport({
      id: `err-${Date.now()}`,
      message: String(payload.message ?? 'Client error'),
      path: typeof payload.path === 'string' ? payload.path : null,
      context: typeof payload.context === 'string' ? payload.context : null,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      reporter: {
        id: user?.id ?? 'demo-user-client',
        name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client',
        role: user?.role ?? 'USER',
        email: user?.email ?? 'client@demo.local',
      },
    });
    return ok({
      id: report.id,
      status: report.status,
      message: report.message,
      createdAt: report.createdAt,
      ticketCode: developerTicketCode(report.id),
    }) as T;
  }
  {
    const vehicleProfileMatch = clean.match(/^\/client\/vehicles\/([^/]+)\/profile$/);
    if (vehicleProfileMatch && m === 'GET') {
      const vehicleId = vehicleProfileMatch[1];
      const live = liveDemoClientVehicle(vehicleId);
      const v = live ?? {
        id: vehicleId,
        registration: 'ND 123-456',
        make: 'Toyota',
        model: 'Fortuner',
        variant: 'GD-6',
        year: 2022,
        color: 'White',
        vin: 'JTMDN123456789012',
        trackerLinked: true,
        theftRecovery: demoVehicleState.theftRecovery,
        immobiliserOn: demoVehicleState.immobiliserOn,
        doorsLocked: demoVehicleState.doorsLocked,
        insuranceInfo: 'Santam comprehensive',
      };
      return ok({
        vehicle: {
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          variant: 'variant' in v ? v.variant ?? null : 'GD-6',
          year: 'year' in v ? v.year : 2022,
          color: v.color,
          vin: 'vin' in v ? v.vin : null,
          trackerLinked: v.trackerLinked,
          phoneTrackingEnabled: demoVehicleState.phoneTrackingEnabled,
          theftRecovery: v.theftRecovery,
          immobiliserOn: v.immobiliserOn,
          doorsLocked: v.doorsLocked ?? true,
          insuranceInfo: 'insuranceInfo' in v ? v.insuranceInfo : 'Santam comprehensive',
          updatedAt: new Date().toISOString(),
        },
        tracking: {
          active: demoVehicleState.trackingMode !== 'OFF',
          mode: v.theftRecovery ? 'THEFT_RECOVERY' : demoVehicleState.trackingMode,
          hasPosition: true,
          lat: 'lat' in v ? v.lat : demoVehicleState.lat,
          lng: 'lng' in v ? v.lng : demoVehicleState.lng,
          lastUpdate: new Date().toISOString(),
          trail: mapTrail(
            'lat' in v ? v.lat : demoVehicleState.lat,
            'lng' in v ? v.lng : demoVehicleState.lng,
          ).map((p, i) => ({
            ...p,
            at: new Date(Date.now() - (7 - i) * 45000).toISOString(),
          })),
        },
        responseTeam: { synced: true },
        cameras: demoClientDashCams(v.id, v.registration),
        alerts: [],
        incidents: [],
      }) as T;
    }
  }
  if (clean === '/client/messages' && m === 'GET') {
    const clientUserId = user?.id ?? 'demo-user-client-demo-local';
    const msgs = ensureDemoClientChat(clientUserId);
    return ok({
      conversationId: `demo-conv-${clientUserId}`,
      clientUserId,
      messages: msgs.map(({ clientUserId: _c, ...rest }) => rest),
    }) as T;
  }
  if (clean === '/client/messages' && m === 'POST') {
    const clientUserId = user?.id ?? 'demo-user-client-demo-local';
    const content = String(payload.content ?? '').trim();
    if (!content) return { success: false as const, message: 'Message cannot be empty' } as T;
    const msg: DemoClientChatMessage = {
      id: `demo-cr-${Date.now()}`,
      clientUserId,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: clientUserId,
        firstName: user?.firstName ?? 'Nomsa',
        lastName: user?.lastName ?? 'Client',
        role: user?.role ?? 'USER',
      },
    };
    ensureDemoClientChat(clientUserId).push(msg);
    const { clientUserId: _c, ...data } = msg;
    return ok(data) as T;
  }
  if (clean === '/client/family' && m === 'GET') {
    return ok({
      id: 'demo-family-1',
      name: 'Client family',
      owner: 'Nomsa Client',
      familyMessagingEnabled: demoFamilyMessagingEnabled,
      members: [
        {
          id: 'demo-fam-1',
          name: 'Thandi Client',
          nickname: 'Thandi',
          trackingEnabled: true,
          familyMessagingEnabled: true,
          lastLocationAt: new Date(Date.now() - 180000).toISOString(),
          phone: '+27821234568',
          userId: 'demo-fam-1',
        },
        {
          id: 'demo-fam-2',
          name: 'Lerato Client',
          nickname: 'Lerato',
          trackingEnabled: false,
          familyMessagingEnabled: false,
          lastLocationAt: null,
          phone: '+27821234569',
          userId: 'demo-fam-2',
        },
      ],
    }) as T;
  }
  if (clean === '/client/communication-settings' && m === 'GET') {
    return ok({
      familyMessagingEnabled: demoFamilyMessagingEnabled,
      familyId: 'demo-family-1',
      controlRoomAlwaysOn: true,
      eligibleMembers: demoFamilyEligible(),
    }) as T;
  }
  if (clean === '/client/communication-settings' && m === 'PATCH') {
    if (typeof payload.familyMessagingEnabled === 'boolean') {
      demoFamilyMessagingEnabled = payload.familyMessagingEnabled;
    }
    return ok({
      familyMessagingEnabled: demoFamilyMessagingEnabled,
      familyId: 'demo-family-1',
      controlRoomAlwaysOn: true,
      eligibleMembers: demoFamilyEligible(),
    }) as T;
  }
  if (clean === '/client/family/messages' && m === 'GET') {
    return ok({
      familyId: 'demo-family-1',
      familyMessagingEnabled: demoFamilyMessagingEnabled,
      messages: [...demoFamilyMessages],
      eligibleMembers: demoFamilyEligible(),
    }) as T;
  }
  if (clean === '/client/family/messages' && m === 'POST') {
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    let content = String(payload.content ?? '').trim();
    if (hasLocation) {
      content = `📍 Live location\n${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      demoClientLocation = { lat, lng };
    }
    const incoming = Array.isArray(payload.attachments)
      ? (payload.attachments as {
          fileName?: string;
          fileType?: string;
          fileUrl?: string;
          fileSize?: number;
          kind?: 'IMAGE' | 'VIDEO' | 'FILE';
        }[])
      : [];
    const attachments = incoming
      .filter((a) => a.fileUrl)
      .slice(0, 5)
      .map((a, index) => ({
        id: `demo-fam-att-${Date.now()}-${index}`,
        fileName: String(a.fileName ?? 'file'),
        fileType: String(a.fileType ?? 'application/octet-stream'),
        fileUrl: String(a.fileUrl),
        fileSize: Number(a.fileSize ?? 0),
        kind: a.kind === 'IMAGE' || a.kind === 'VIDEO' ? a.kind : ('FILE' as const),
      }));
    if (!content && attachments.length === 0) {
      return { success: false as const, message: 'Message cannot be empty' } as T;
    }
    if (!content && attachments.length) {
      content =
        attachments.length === 1
          ? `Sent ${attachments[0].fileName}`
          : `Sent ${attachments.length} attachments`;
    }
    const replyToId = typeof payload.replyToId === 'string' ? payload.replyToId : '';
    if (replyToId) {
      const quoted = demoFamilyMessages.find((item) => item.id === replyToId);
      if (quoted) {
        const quotedBody = quoted.content.replace(/^«reply:[^»]*»\n?/, '').trim();
        const preview = quotedBody.startsWith('📍 Live location')
          ? 'Live location'
          : quoted.attachments[0]?.kind === 'IMAGE'
            ? 'Photo'
            : quoted.attachments[0]?.kind === 'VIDEO'
              ? 'Video'
              : quoted.attachments[0]?.fileName ||
                (quotedBody.startsWith('Sent ') ? 'Attachment' : quotedBody.replace(/\s+/g, ' ').slice(0, 80) || 'Message');
        const name = `${quoted.sender.firstName} ${quoted.sender.lastName}`.trim();
        content = `«reply:${quoted.id}|${name}|${preview}»\n${content}`;
      }
    }
    const msg = {
      id: `demo-fam-msg-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id ?? 'demo-user-client-demo-local',
        firstName: user?.firstName ?? 'Nomsa',
        lastName: user?.lastName ?? 'Client',
      },
      attachments,
    };
    demoFamilyMessages.push(msg);
    return ok(msg) as T;
  }
  if (clean === '/client/vehicles' && m === 'GET') {
    const ownerId = user?.id ?? 'demo-user-client-demo-local';
    const list = demoClientVehicles.filter(
      (v) => v.ownerId === ownerId || v.ownerName.toLowerCase().includes(String(user?.firstName ?? 'nomsa').toLowerCase()),
    );
    const scoped = list.length ? list : demoClientVehicles.filter((v) => v.id === 'demo-veh-1');
    return ok(
      scoped.map((v) => ({
        id: v.id,
        registration: v.registration,
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.year,
        color: v.color,
        vin: v.vin,
        trackerLinked: v.trackerLinked,
        theftRecovery: v.id === 'demo-veh-1' ? demoVehicleState.theftRecovery : v.theftRecovery,
        immobiliserOn: v.id === 'demo-veh-1' ? demoVehicleState.immobiliserOn : v.immobiliserOn,
        doorsLocked: v.id === 'demo-veh-1' ? demoVehicleState.doorsLocked : (v.doorsLocked ?? true),
        insuranceInfo: v.insuranceInfo,
      })),
    ) as T;
  }
  if (clean === '/client/subscription' && m === 'GET') {
    return ok({
      planName: 'Family Protect',
      tierName: 'Family',
      status: 'ACTIVE',
      memberId: 'NX-MEM-1001',
      validUntil: new Date(Date.now() + 20 * 86400000).toISOString(),
      access: {
        home: true,
        vehicle: true,
        family: true,
        medical: true,
        personal: true,
        emergency: true,
      },
      isOverdue: false,
    }) as T;
  }
  if (clean === '/client/service-requests' && m === 'POST') {
    const kind = String(payload.kind ?? 'escort');
    const details = (payload.details ?? {}) as Record<string, unknown>;
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
    const extras = [
      details.vehicleCount ? `${details.vehicleCount} vehicle(s)` : '',
      details.hasCargo ? String(details.productType || 'cargo') : '',
    ].filter(Boolean);
    const summary = [to ? `${from} → ${to}` : from || 'Submitted from portal', ...extras].join(' · ');
    const id = `demo-svc-${Date.now()}`;
    const publicRef = `NX-S${String(demoServiceRequests.length + 21).padStart(3, '0')}`;
    demoServiceRequests.unshift({
      id,
      publicRef,
      kind,
      title,
      status: 'OPEN',
      whenLabel: 'Just now',
      summary,
    });
    demoIncidents.unshift({
      id,
      type: 'OTHER',
      status: 'OPEN',
      title,
      isSilent: false,
      time: 'Just now',
      priority: kind === 'escort' || kind === 'roadside' ? 'HIGH' : 'MEDIUM',
      user: 'Nomsa Client',
      location: summary,
    });
    return ok({ id, publicRef, title }) as T;
  }
  if (clean === '/client/service-requests' && m === 'GET') {
    return ok(demoServiceRequests) as T;
  }
  if (clean === '/client/incidents' && m === 'GET') {
    return ok(
      demoIncidents.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        priority: i.priority,
        title: i.title,
        isSilent: i.isSilent,
        address: i.location,
        createdAt: new Date().toISOString(),
        media: [],
        hasResponse: Boolean(demoIncidentAssignments[i.id]),
      })),
    ) as T;
  }
  if (clean === '/client/incidents/evidence' && m === 'GET') {
    return ok(
      demoIncidents.slice(0, 2).map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        status: i.status,
        createdAt: new Date().toISOString(),
        media: [
          {
            id: `${i.id}-media`,
            fileName: 'scene-photo.jpg',
            fileType: 'image/jpeg',
            fileUrl: '/demo-evidence.jpg',
          },
        ],
      })),
    ) as T;
  }
  {
    const vehicleIdMatch = clean.match(
      /^\/client\/vehicles\/([^/]+)\/(tracking\/phone|location|theft-recovery|remote)$/,
    );
    if (vehicleIdMatch && (m === 'POST' || m === 'DELETE')) {
      const action = vehicleIdMatch[2];
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        demoVehicleState.lat = lat;
        demoVehicleState.lng = lng;
      }
      if (action === 'tracking/phone') {
        if (m === 'DELETE') {
          demoVehicleState.phoneTrackingEnabled = false;
          if (demoVehicleState.trackingMode === 'PHONE') demoVehicleState.trackingMode = 'TRACKER';
        } else {
          demoVehicleState.phoneTrackingEnabled = true;
          demoVehicleState.trackingMode = 'PHONE';
        }
      }
      if (action === 'theft-recovery' && m === 'POST') {
        demoVehicleState.theftRecovery = true;
        demoVehicleState.trackingMode = 'THEFT_RECOVERY';
        const existing = demoIncidents.find((i) => i.type === 'THEFT' && isActiveDemoIncident(i.status));
        if (!existing) {
          demoIncidents.unshift({
            id: `demo-inc-${Date.now()}`,
            type: 'THEFT',
            status: 'OPEN',
            title: 'Vehicle recovery track',
            isSilent: false,
            time: 'Just now',
            priority: 'HIGH',
            user: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client',
            location: 'Live phone relay',
          });
        }
      }
      if (action === 'remote' && m === 'POST') {
        const actor = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Nomsa Client';
        const result = applyDemoVehicleRemote(vehicleIdMatch[1], String(payload.action ?? ''), actor);
        if (!result) return { success: false as const, message: 'Unknown vehicle remote action' } as T;
        return ok(result) as T;
      }
      return ok({
        ok: true,
        phoneTrackingEnabled: demoVehicleState.phoneTrackingEnabled,
        theftRecovery: demoVehicleState.theftRecovery,
        trackingMode: demoVehicleState.trackingMode,
        lat: demoVehicleState.lat,
        lng: demoVehicleState.lng,
      }) as T;
    }
  }
  if (clean.startsWith('/client/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Developer desk ———
  if (clean === '/developer/error-reports' && m === 'GET') {
    const reports = readDemoErrorReports();
    const openCount = reports.filter((r) => r.status === 'OPEN').length;
    return ok({
      openCount,
      reports: reports.map((r) => ({ ...r, ticketCode: developerTicketCode(r.id) })),
    }) as T;
  }
  if (clean === '/developer/error-reports' && m === 'POST') {
    const report = pushDemoErrorReport({
      id: `err-${Date.now()}`,
      message: String(payload.message ?? 'Staff error report'),
      path: typeof payload.path === 'string' ? payload.path : null,
      context: typeof payload.context === 'string' ? payload.context : null,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      reporter: {
        id: user?.id ?? 'demo-user-staff',
        name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Staff user',
        role: user?.role ?? 'DISPATCHER',
        email: user?.email ?? 'staff@demo.local',
      },
    });
    return ok({
      id: report.id,
      status: report.status,
      message: report.message,
      createdAt: report.createdAt,
      ticketCode: developerTicketCode(report.id),
    }) as T;
  }
  if (clean === '/developer/revenue-access' && m === 'PATCH') {
    demoDeveloperCanViewRevenue = Boolean(payload.enabled);
    writeRevenueFlag(demoDeveloperCanViewRevenue);
    return ok({
      developerCanViewRevenue: demoDeveloperCanViewRevenue,
      message: demoDeveloperCanViewRevenue
        ? 'Developers can now see revenue figures.'
        : 'Developer revenue figures are hidden again.',
    }) as T;
  }
  if (clean === '/developer/desk' && m === 'GET') {
    const reports = readDemoErrorReports();
    const openCount = reports.filter((r) => r.status === 'OPEN').length;
    const canViewRevenue = developerRevenueVisible();
    const critical = reports.filter((r) => {
      try {
        const ctx = JSON.parse(r.context ?? '{}') as { severity?: string };
        return (ctx.severity === 'P0' || ctx.severity === 'P1') && r.status !== 'RESOLVED';
      } catch {
        return false;
      }
    }).length;
    return ok({
      tenantName: DEMO_TENANT.name,
      canViewRevenue,
      revenueNote: canViewRevenue
        ? 'Revenue figures are visible for this demo session.'
        : 'Revenue figures are hidden until the owner unlocks developer access.',
      openErrorReports: openCount,
      systemStatus: critical > 0 ? 'incident' : openCount > 0 ? 'degraded' : 'operational',
      systemMessage:
        critical > 0
          ? 'Critical issues require immediate attention'
          : 'Production monitoring active',
      production: {
        version: '2.4.18',
        build: '8421',
        deployedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        status: 'healthy',
        environment: 'production',
      },
      recentDeployments: [
        {
          version: '2.4.18',
          build: '8421',
          deployedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
          status: 'healthy',
          environment: 'production',
        },
        {
          version: '2.4.17',
          build: '8410',
          deployedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          status: 'healthy',
          environment: 'production',
        },
      ],
      platformHealth: [
        { id: 'api', label: 'API', status: 'operational', href: '/control-room' },
        { id: 'database', label: 'Database', status: 'operational' },
        { id: 'auth', label: 'Authentication', status: 'operational', href: '/control-room/device-security' },
        { id: 'map', label: 'Live map', status: 'operational', href: '/control-room/map' },
        { id: 'cctv', label: 'CCTV', status: 'operational', href: '/control-room/surveillance' },
        { id: 'dispatch', label: 'Dispatch', status: 'operational', href: '/control-room/dispatch' },
        { id: 'notifications', label: 'Notifications', status: 'degraded', detail: 'Delayed delivery' },
        { id: 'payments', label: 'Payments', status: 'operational', href: '/control-room/customers' },
      ],
      analytics: {
        total24h: reports.length,
        unique24h: new Set(reports.map((r) => r.message)).size,
        affectedUsers24h: new Set(reports.map((r) => r.reporter.id)).size,
        critical24h: critical,
        resolved24h: reports.filter((r) => r.status === 'RESOLVED').length,
        topErrors: Object.entries(
          reports.reduce<Record<string, { label: string; count: number }>>((acc, r) => {
            const key = r.message.slice(0, 40);
            acc[key] = acc[key] ? { label: key, count: acc[key].count + 1 } : { label: key, count: 1 };
            return acc;
          }, {}),
        )
          .map(([fingerprint, v]) => ({ fingerprint, label: v.label, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      },
      duplicateGroups: Object.entries(
        reports.reduce<Record<string, string[]>>((acc, r) => {
          let fp = r.message;
          try {
            const ctx = JSON.parse(r.context ?? '{}') as { errorFingerprint?: string };
            if (ctx.errorFingerprint) fp = ctx.errorFingerprint;
          } catch {
            /* ignore */
          }
          acc[fp] = acc[fp] ? [...acc[fp], r.id] : [r.id];
          return acc;
        }, {}),
      )
        .filter(([, ids]) => ids.length > 1)
        .map(([fingerprint, ticketIds]) => ({ fingerprint, ticketIds, count: ticketIds.length })),
      recentReports: reports.slice(0, 8).map((r) => {
        let workflowStatus = 'REPORTED';
        let severity = 'P3';
        try {
          const ctx = JSON.parse(r.context ?? '{}') as { workflowStatus?: string; severity?: string };
          if (ctx.workflowStatus) workflowStatus = ctx.workflowStatus;
          if (ctx.severity) severity = ctx.severity;
        } catch {
          /* ignore */
        }
        return {
          id: r.id,
          message: r.message,
          path: r.path,
          status: r.status,
          workflowStatus,
          severity,
          createdAt: r.createdAt,
          reporter: `${r.reporter.name} · ${r.reporter.role}`,
          ticketCode: developerTicketCode(r.id),
        };
      }),
      developers: [
        {
          id: user?.id ?? 'demo-user-developer-4ds-local',
          firstName: user?.firstName ?? 'Toxic',
          lastName: user?.lastName ?? 'Dev',
          email: user?.email ?? 'developer@4ds.local',
          phone: user?.phone ?? '+27 82 100 0099',
        },
      ],
      developerAccess: {
        production: true,
        staging: true,
        database: false,
        serverLogs: true,
        deployments: true,
        monitoring: true,
      },
      platformLinks: [
        { label: 'Ops Board', href: '/control-room' },
        { label: 'Live map', href: '/control-room/map' },
        { label: 'CCTV', href: '/control-room/surveillance' },
        { label: 'Vehicles', href: '/control-room/fleet' },
        { label: 'Incidents', href: '/control-room/incidents' },
        { label: 'Device security', href: '/control-room/device-security' },
        { label: 'Dispatch', href: '/control-room/dispatch' },
        { label: 'Customers', href: '/control-room/customers' },
        { label: 'Gear store', href: '/control-room/store' },
        { label: 'Internal chat', href: '/control-room/chat' },
        { label: 'Client portal', href: '/portal' },
        { label: 'Settings', href: '/control-room/my-settings' },
      ],
    }) as T;
  }
  {
    const devReportMatch = clean.match(/^\/developer\/error-reports\/([^/]+)$/);
    if (devReportMatch && m === 'PATCH') {
      const id = decodeURIComponent(devReportMatch[1]);
      const reports = readDemoErrorReports();
      const idx = reports.findIndex((r) => r.id === id);
      if (idx < 0) return { success: false as const, message: 'Report not found' } as T;
      const next = String(payload.status ?? '').toUpperCase();
      let context = reports[idx].context;
      if (typeof payload.context === 'string') {
        context = payload.context;
      } else if (payload.workflowStatus) {
        try {
          const meta = JSON.parse(context ?? '{}') as Record<string, unknown>;
          meta.workflowStatus = payload.workflowStatus;
          meta.audit = [
            ...((meta.audit as { at: string; action: string }[]) ?? []),
            { at: new Date().toISOString(), action: `Status → ${payload.workflowStatus}` },
          ];
          context = JSON.stringify(meta);
        } catch {
          /* ignore */
        }
      }
      if (next === 'ACKNOWLEDGED' || next === 'RESOLVED' || next === 'OPEN') {
        reports[idx] = {
          ...reports[idx],
          status: next as DemoErrorReport['status'],
          context,
        };
        writeDemoErrorReports(reports);
      } else if (payload.workflowStatus || payload.context) {
        reports[idx] = { ...reports[idx], context };
        if (payload.workflowStatus === 'RESOLVED' || payload.workflowStatus === 'VERIFIED') {
          reports[idx].status = 'RESOLVED';
        } else if (
          payload.workflowStatus === 'IN_PROGRESS' ||
          payload.workflowStatus === 'TRIAGED' ||
          payload.workflowStatus === 'TESTING' ||
          payload.workflowStatus === 'FIX_READY'
        ) {
          reports[idx].status = 'ACKNOWLEDGED';
        }
        writeDemoErrorReports(reports);
      }
      if (payload.mergeDuplicates) {
        try {
          const meta = JSON.parse(reports[idx].context ?? '{}') as { errorFingerprint?: string };
          const fp = meta.errorFingerprint;
          if (fp) {
            for (let i = 0; i < reports.length; i += 1) {
              if (i === idx || reports[i].status === 'RESOLVED') continue;
              try {
                const other = JSON.parse(reports[i].context ?? '{}') as { errorFingerprint?: string };
                if (other.errorFingerprint === fp) {
                  reports[i] = { ...reports[i], status: 'RESOLVED' };
                }
              } catch {
                /* ignore */
              }
            }
            writeDemoErrorReports(reports);
          }
        } catch {
          /* ignore */
        }
      }
      return ok({
        id: reports[idx].id,
        status: reports[idx].status,
        ticketCode: developerTicketCode(reports[idx].id),
        resolvedAt:
          reports[idx].status === 'RESOLVED'
            ? new Date().toISOString()
            : null,
      }) as T;
    }
  }

  // ——— Control room ———
  if (clean === '/control-room/dashboard' && m === 'GET') {
    const active = activeDemoIncidents();
    return ok({
      stats: {
        activeUsers: 128,
        activeIncidents: active.length,
        criticalIncidents: active.filter((i) =>
          ['CRITICAL', 'HIGH'].includes(i.priority),
        ).length,
        availableOfficers: demoOfficerRoster.filter((o) => o.status === 'AVAILABLE').length,
        totalOfficers: demoOfficerRoster.length,
        avgResponseFormatted: '4m 40s',
        avgResponseSec: 280,
        vehiclesAvailable: 3,
        ambulancesAvailable: 2,
      },
      incidents: active.map((i) => {
        const officerName = demoIncidentAssignments[i.id] ?? null;
        const officer = demoOfficerRoster.find(
          (o) => `${o.firstName} ${o.lastName}` === officerName,
        );
        const mins = Number((i.time.match(/(\d+)\s*min/) ?? [])[1] ?? (i.time.includes('h') ? 62 : 2));
        const createdAt = new Date(Date.now() - mins * 60_000).toISOString();
        const dispatched = Boolean(officerName) || ['DISPATCHED', 'EN_ROUTE', 'IN_PROGRESS', 'ON_SCENE'].includes(i.status);
        const isJames = i.user.includes('James');
        return {
          id: i.id,
          type: i.type,
          user: i.user,
          location: i.location,
          time: i.time,
          priority: i.priority,
          status: i.status,
          createdAt,
          officer: officerName,
          unit: officer?.vehicle?.callSign ?? null,
          etaDueAt: dispatched ? new Date(Date.now() + 4 * 60_000 + 32_000).toISOString() : null,
          isSilent: i.isSilent,
          source: i.type === 'PANIC' ? (i.isSilent ? 'DURESS' : 'APP PANIC') : null,
          cameraCount: isJames ? 6 : i.type === 'OTHER' ? 4 : 4,
          camerasOnline: isJames ? 4 : i.type === 'OTHER' ? 2 : 4,
          gpsAvailable: i.type !== 'THEFT',
          distanceKm: i.type === 'THEFT' ? null : isJames ? 1.2 : 0.8,
          userPhone:
            i.user === 'Nomsa Client'
              ? '+27821234567'
              : i.user === 'James Demo'
                ? '+27820000001'
                : '+27820001111',
          officerPhone: officerName ? '+27831110001' : null,
          slaTargetSec: i.priority === 'CRITICAL' ? 180 : i.priority === 'HIGH' ? 300 : 600,
          slaBreached: i.type === 'INTRUSION' || mins >= 15,
        };
      }),
      officers: demoOfficerRoster.map((o) => ({
        id: o.id,
        name: `${o.firstName} ${o.lastName}`,
        status: o.status,
        zone: o.zone,
      })),
      dispatches: demoDispatches.map((d) => ({
        id: d.id,
        status: d.status,
        officer: {
          firstName: d.officer.name.split(' ')[0] ?? d.officer.name,
          lastName: d.officer.name.split(' ').slice(1).join(' ') || '',
        },
        incident: {
          id: d.incident.id,
          type: d.incident.type,
          user: { firstName: d.incident.client.split(' ')[0] ?? d.incident.client },
        },
      })),
      system: {
        api: 'Demo mode',
        realtime: 'Simulated',
        maps: 'Online',
        store: 'Online',
      },
    }) as T;
  }
  if (clean === '/control-room/psim/overview' && m === 'GET') {
    const sourceCounts = new Map<string, number>();
    for (const e of demoSecurityEvents) {
      sourceCounts.set(e.source, (sourceCounts.get(e.source) ?? 0) + 1);
    }
    return ok({
      overview: {
        stats: psimOverviewStats(),
        eventMix: [...sourceCounts.entries()].map(([label, value]) => ({
          label: label.charAt(0) + label.slice(1).toLowerCase(),
          value,
          tone: 'accent' as const,
        })),
        alarmTrend: [
          { label: '06:00', value: 12 },
          { label: '08:00', value: 28 },
          { label: '10:00', value: 41 },
          { label: '12:00', value: 35 },
          { label: '14:00', value: 22 },
          { label: '16:00', value: 18 },
        ],
      },
      alarms: demoAlarmFeed,
      access: demoAccessDoors,
      patrols: demoPatrolRoutes,
      compliance: demoCompliance,
      watchlists: demoWatchlists,
      rules: DEMO_DISPATCH_RULES,
      integrations: integrationsCatalog(),
      events: demoSecurityEvents,
    }) as T;
  }
  {
    const alarmAck = clean.match(/^\/control-room\/alarms\/([^/]+)\/ack$/);
    if (alarmAck && m === 'POST') {
      const row = demoAlarmFeed.find((a) => a.id === alarmAck[1]);
      if (row) row.status = 'ACK';
      return ok(row ?? { id: alarmAck[1], status: 'ACK' }) as T;
    }
  }
  {
    const evtAck = clean.match(/^\/control-room\/psim\/events\/([^/]+)\/ack$/);
    if (evtAck && m === 'POST') {
      const evt = demoSecurityEvents.find((e) => e.id === evtAck[1]);
      if (evt) evt.acknowledged = true;
      return ok(evt ?? { id: evtAck[1], acknowledged: true }) as T;
    }
  }
  const crSiteMatch = clean.match(/^\/control-room\/surveillance\/sites\/([^/]+)$/);
  if (crSiteMatch && m === 'GET') {
    const siteId = crSiteMatch[1];
    const s = demoSurveillanceSites.find((x) => x.id === siteId);
    if (!s) return ok(null) as T;
    return ok({
      id: s.id,
      name: s.name,
      address: s.address,
      propertyType: s.propertyType,
      alarmStatus: s.alarmStatus,
      monitoringEnabled: s.monitoringEnabled,
      gateCode: s.gateCode,
      accessNotes: s.accessNotes,
      keyHolder: s.keyHolder,
      panel: s.panel,
      privacy: s.privacy,
      client: {
        id: s.owner.id,
        name: s.owner.name,
        email: s.owner.email,
        phone: s.owner.phone,
      },
      owner: s.owner,
      linkedVehicles: s.linkedVehicles,
      assignedFleet: s.assignedFleet,
      subscription: s.subscription,
      cameras: s.cameras,
      sensors: s.sensors,
      events: [
        {
          id: 'demo-ev-1',
          type: 'MOTION',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'Motion detected — front gate',
          description: 'Movement detected at perimeter camera during after-hours window.',
          cidCode: '570',
          triggeredAt: new Date(Date.now() - 8 * 60000).toISOString(),
          incidentId: null,
          camera: { id: 'demo-cam-1', name: 'Front gate', locationLabel: 'Driveway' },
          sensor: null,
        },
        {
          id: 'demo-ev-2',
          type: 'INTRUSION',
          severity: 'CRITICAL',
          status: 'OPEN',
          title: 'Door forced — server room',
          description: 'Zone 3 back gate PIR triggered with no arm/disarm sequence.',
          cidCode: '130',
          triggeredAt: new Date(Date.now() - 3 * 60000).toISOString(),
          incidentId: 'demo-inc-1',
          camera: null,
          sensor: { id: 'demo-sens-3', name: 'Back gate PIR', zoneNumber: 3, sensorType: 'PIR' },
        },
      ],
    }) as T;
  }
  {
    const crAlarm = clean.match(/^\/control-room\/surveillance\/sites\/([^/]+)\/alarm$/);
    if (crAlarm && m === 'PATCH') {
      const status = typeof payload.status === 'string' ? payload.status : 'DISARMED';
      setDemoAlarmStatus(crAlarm[1], status);
      const site = demoSurveillanceSites.find((s) => s.id === crAlarm[1]);
      return ok({
        id: crAlarm[1],
        alarmStatus: site?.alarmStatus ?? status,
      }) as T;
    }
  }
  {
    const crSiren = clean.match(/^\/control-room\/surveillance\/sites\/([^/]+)\/siren$/);
    if (crSiren && m === 'POST') {
      const siteId = crSiren[1];
      const site = demoSurveillanceSites.find((s) => s.id === siteId);
      setDemoAlarmStatus(siteId, 'TRIGGERED');
      demoIncidents.unshift({
        id: `demo-inc-${Date.now()}`,
        type: 'PANIC',
        status: 'OPEN',
        title: `CCTV siren — ${site?.name ?? 'Property'}`,
        isSilent: false,
        time: 'Just now',
        priority: 'CRITICAL',
        user: 'Control room',
        location: site?.address ?? 'Site',
      });
      return ok({
        alarmStatus: 'TRIGGERED',
        incidentId: demoIncidents[0].id,
        message: `Siren sounding at ${site?.name ?? 'the property'}. Disarm to silence.`,
      }) as T;
    }
  }
  if (clean === '/control-room/surveillance' && m === 'GET') {
    const sites = demoSurveillanceSites.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      propertyType: s.propertyType,
      alarmStatus: s.alarmStatus,
      monitoringEnabled: s.monitoringEnabled,
      camerasLinked: s.camerasLinked,
      alarmLinked: s.alarmLinked,
      panel: s.panel,
      cameraCount: s.cameraCount,
      onlineCameras: s.onlineCameras,
      sensorCount: s.sensorCount,
      client: {
        id: s.owner.id,
        name: s.owner.name,
        email: s.owner.email,
        phone: s.owner.phone,
      },
      cameras: s.cameras,
      openEvents: demoSiteOpenEvents(s.id),
    }));
    const totalOpenEvents = sites.reduce((n, s) => n + (s.openEvents?.length ?? 0), 0);
    const triggeredSites = sites.filter((s) => (s.openEvents?.length ?? 0) > 0).length;
    return ok({
      stats: {
        sites: sites.length,
        cameras: sites.reduce((n, s) => n + s.cameraCount, 0),
        sensors: sites.reduce((n, s) => n + s.sensorCount, 0),
        openEvents: totalOpenEvents,
        triggeredSites,
        offlineCameras: sites.reduce((n, s) => n + (s.cameraCount - s.onlineCameras), 0),
      },
      sites,
    }) as T;
  }
  if (clean === '/control-room/map' && m === 'GET') {
    const incidentCoords: Record<string, { lat: number; lng: number }> = {
      'demo-inc-1': { lat: -29.728, lng: 31.085 },
      'demo-inc-2': { lat: DURBAN.lat + 0.01, lng: DURBAN.lng + 0.008 },
      'demo-inc-3': { lat: demoVehicleState.lat, lng: demoVehicleState.lng },
    };
    return ok({
      center: DURBAN,
      clients: demoMapClients(),
      officers: [
        {
          id: 'demo-off-1',
          name: `${demoOfficerRoster.find((o) => o.id === 'demo-off-1')?.firstName ?? 'Sipho'} ${demoOfficerRoster.find((o) => o.id === 'demo-off-1')?.lastName ?? 'Ndlovu'}`,
          lat: -29.835,
          lng: 31.002,
          officerType: 'ARMED_RESPONSE',
          unitNumber: 'AR-101',
          status: demoOfficerRoster.find((o) => o.id === 'demo-off-1')?.status ?? 'EN_ROUTE',
          phone: '+27831110001',
          zone: demoOfficerRoster.find((o) => o.id === 'demo-off-1')?.zone ?? 'Zone A',
          avatarUrl: demoOfficerRoster.find((o) => o.id === 'demo-off-1')?.avatarUrl ?? null,
        },
        {
          id: 'demo-off-3',
          name: `${demoOfficerRoster.find((o) => o.id === 'demo-off-3')?.firstName ?? 'John'} ${demoOfficerRoster.find((o) => o.id === 'demo-off-3')?.lastName ?? 'Smith'}`,
          lat: -29.83,
          lng: 30.93,
          officerType: 'ARMED_RESPONSE',
          unitNumber: 'AR-103',
          status: demoOfficerRoster.find((o) => o.id === 'demo-off-3')?.status ?? 'AVAILABLE',
          zone: demoOfficerRoster.find((o) => o.id === 'demo-off-3')?.zone ?? 'Zone C',
          avatarUrl: demoOfficerRoster.find((o) => o.id === 'demo-off-3')?.avatarUrl ?? null,
        },
        {
          id: 'demo-off-4',
          name: `${demoOfficerRoster.find((o) => o.id === 'demo-off-4')?.firstName ?? 'Zanele'} ${demoOfficerRoster.find((o) => o.id === 'demo-off-4')?.lastName ?? 'Khumalo'}`,
          lat: -29.76,
          lng: 31.03,
          officerType: 'TACTICAL',
          unitNumber: 'TAC-1',
          status: demoOfficerRoster.find((o) => o.id === 'demo-off-4')?.status ?? 'AVAILABLE',
          zone: demoOfficerRoster.find((o) => o.id === 'demo-off-4')?.zone ?? 'Zone A',
          avatarUrl: demoOfficerRoster.find((o) => o.id === 'demo-off-4')?.avatarUrl ?? null,
        },
        {
          id: 'demo-off-6',
          name: `${demoOfficerRoster.find((o) => o.id === 'demo-off-6')?.firstName ?? 'Aisha'} ${demoOfficerRoster.find((o) => o.id === 'demo-off-6')?.lastName ?? 'Khan'}`,
          lat: -29.55,
          lng: 31.2,
          officerType: 'RAPID_RESPONSE',
          unitNumber: 'BIKE-1',
          status: demoOfficerRoster.find((o) => o.id === 'demo-off-6')?.status ?? 'AVAILABLE',
          zone: demoOfficerRoster.find((o) => o.id === 'demo-off-6')?.zone ?? 'Zone B',
          avatarUrl: demoOfficerRoster.find((o) => o.id === 'demo-off-6')?.avatarUrl ?? null,
        },
      ],
      vehicles: demoMapVehicles().map((v) => {
        const live = liveDemoClientVehicle(v.id);
        if (!live) return v;
        return {
          ...v,
          lat: live.lat,
          lng: live.lng,
          vehicleType: live.theftRecovery ? 'STOLEN' : 'CLIENT',
          doorsLocked: live.doorsLocked ?? true,
          immobiliserOn: live.immobiliserOn,
          theftRecovery: live.theftRecovery,
          speed: live.theftRecovery ? live.speed : v.speed,
        };
      }),
      fleet: demoFleet.map((v, i) => ({
        id: v.id,
        lat: DURBAN.lat + 0.012 - i * 0.007,
        lng: DURBAN.lng - 0.01 + i * 0.006,
        vehicleType: v.vehicleType,
        teamName: v.teamName ?? fleetTeamLabel(v.vehicleType),
        registration: v.registration,
        callSign: v.callSign,
        make: v.make,
        model: v.model,
        color: v.color,
        status: v.status,
        trackerStatus: v.status === 'MAINTENANCE' ? 'OFFLINE' : 'ONLINE',
        speed: v.status === 'ON_DUTY' || v.status === 'EN_ROUTE' ? 48 : 0,
        crew: v.crew.map((c) => ({ officerId: c.officerId, name: c.name, role: c.role })),
        crewCount: v.crewCount,
        isCompanyFleet: true as const,
        updatedAt: new Date().toISOString(),
      })),
      properties: demoMapProperties(),
      incidents: activeDemoIncidents().map((i, idx) => {
        const coords = incidentCoords[i.id] ?? {
          lat: DURBAN.lat + idx * 0.01,
          lng: DURBAN.lng + idx * 0.008,
        };
        return {
          id: i.id,
          category: i.type === 'PANIC' ? 'PANIC' : i.type === 'THEFT' ? 'THEFT_RECOVERY' : 'INTRUSION',
          type: i.type,
          priority: i.priority,
          status: i.status,
          name: i.title,
          clientUserId: 'demo-user-client',
          clientPhone: idx === 0 ? '+27821234567' : '+27829876543',
          lat: coords.lat,
          lng: coords.lng,
          address: i.location,
          isSilent: i.isSilent,
          createdAt: new Date().toISOString(),
          assignedOfficer: demoIncidentAssignments[i.id] ?? null,
          nearestUnitKm: 0.8 + idx,
          nearestUnitEta: `${3 + idx * 2} min`,
          trail: i.type === 'THEFT' || i.type === 'PANIC' ? mapTrail(coords.lat, coords.lng) : [],
        };
      }),
    }) as T;
  }
  // ——— Control room notifications shape ———
  if (clean === '/control-room/notifications' && m === 'GET') {
    const tickets = demoTicketNotifications(user?.role).map((n) => ({
      ...n,
      isRead: n.isRead || demoCrReadIds.has(n.id),
    }));
    const notifications = [
      ...tickets,
      ...demoControlRoomNotifications.map((n) => ({
        ...n,
        isRead: n.isRead || demoCrReadIds.has(n.id),
      })),
    ];
    return ok({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }) as T;
  }
  if (clean === '/control-room/notifications/read-all' && m === 'PATCH') {
    for (const n of demoControlRoomNotifications) n.isRead = true;
    for (const n of demoTicketNotifications(user?.role)) demoCrReadIds.add(n.id);
    return ok({ ok: true, unreadCount: 0 }) as T;
  }
  {
    const readMatch = clean.match(/^\/control-room\/notifications\/([^/]+)\/read$/);
    if (readMatch && m === 'PATCH') {
      markDemoCrRead(readMatch[1]);
      return ok({ ok: true }) as T;
    }
  }
  if (clean === '/calls/directory' && m === 'GET') {
    return ok({
      dispatchLine: { name: '4DS Control Room', phone: '+27111004400' },
      officers: [
        {
          officerId: 'demo-off-1',
          userId: 'demo-user-ndlovu-4ds-local',
          name: 'Sipho Ndlovu',
          status: 'AVAILABLE',
          phone: '+27831110001',
        },
      ],
      dispatchers: [
        {
          id: DEMO_DISPATCHER.id,
          firstName: DEMO_DISPATCHER.firstName,
          lastName: DEMO_DISPATCHER.lastName,
          role: DEMO_DISPATCHER.role,
          phone: '+27860000000',
        },
      ],
      clients: [
        {
          id: 'demo-user-client-demo-local',
          firstName: 'Nomsa',
          lastName: 'Client',
          phone: '+27821234567',
          role: 'USER',
        },
      ],
    }) as T;
  }
  if (clean === '/calls/active' && m === 'GET') {
    const call = readDemoCall();
    if (!call || ['ENDED', 'DECLINED', 'MISSED'].includes(call.status)) {
      return ok(null) as T;
    }
    const me = user?.id;
    const isOps =
      portal === 'admin' &&
      call.channel === 'DISPATCH_LINE' &&
      call.initiator.id !== me;
    if (isOps) {
      return ok({
        ...call,
        targetUserId: me ?? call.targetUserId,
        target: participantFromUser(user),
      }) as T;
    }
    if (me && call.initiator.id !== me && call.target?.id !== me) {
      return ok(null) as T;
    }
    return ok(call) as T;
  }
  if (clean === '/calls' && m === 'POST') {
    const channel = String(payload.channel ?? 'DISPATCH_LINE');
    const isClient =
      (user?.role ?? '').toUpperCase() === 'USER' ||
      (user?.role ?? '').toUpperCase() === 'CLIENT' ||
      (user?.role ?? '').toUpperCase() === 'FAMILY_MEMBER' ||
      portal === 'client';
    const targetUserId =
      typeof payload.targetUserId === 'string' && payload.targetUserId
        ? payload.targetUserId
        : channel === 'DISPATCH_LINE' && isClient
          ? DEMO_DISPATCHER.id
          : null;
    const rings =
      channel === 'INTERNAL' || (channel === 'DISPATCH_LINE' && Boolean(targetUserId));
    const target =
      targetUserId === DEMO_DISPATCHER.id
        ? { ...DEMO_DISPATCHER }
        : targetUserId
          ? {
              id: targetUserId,
              firstName: String(payload.targetName ?? 'Contact').split(' ')[0] ?? 'Contact',
              lastName: String(payload.targetName ?? '').split(' ').slice(1).join(' ') || 'Line',
              role: String(payload.targetRole ?? 'CLIENT'),
            }
          : channel === 'DISPATCH_LINE'
            ? { ...DEMO_DISPATCHER }
            : null;
    const call: DemoCallSession = {
      id: `demo-call-${Date.now()}`,
      channel,
      status: rings ? 'RINGING' : 'CONNECTED',
      targetName:
        String(payload.targetName ?? '') ||
        (channel === 'DISPATCH_LINE' ? '4DS Control Room' : 'Contact'),
      targetPhone: typeof payload.targetPhone === 'string' ? payload.targetPhone : '+27110000000',
      targetRole: typeof payload.targetRole === 'string' ? payload.targetRole : 'DISPATCH',
      targetUserId,
      incidentId: typeof payload.incidentId === 'string' ? payload.incidentId : null,
      isMuted: false,
      startedAt: rings ? null : new Date().toISOString(),
      endedAt: null,
      durationSec: null,
      createdAt: new Date().toISOString(),
      initiator: participantFromUser(user),
      target,
      notes: [],
    };
    if (channel === 'DISPATCH_LINE' && isClient) {
      call.targetName = '4DS Control Room';
      call.targetRole = 'DISPATCH';
      call.targetUserId = DEMO_DISPATCHER.id;
      call.target = { ...DEMO_DISPATCHER };
    }
    writeDemoCall(call);
    return ok(call) as T;
  }
  {
    const callMatch = clean.match(/^\/calls\/([^/]+)(?:\/(accept|decline|end|mute|hold|notes))?$/);
    if (callMatch && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
      const action = callMatch[2];
      const current = readDemoCall();
      if (!current || current.id !== callMatch[1]) {
        if (m === 'GET') return ok(null) as T;
        return ok({ ok: true, demo: true }) as T;
      }
      if (action === 'accept') {
        current.status = 'CONNECTED';
        current.startedAt = new Date().toISOString();
      } else if (action === 'decline' || action === 'end') {
        current.status = action === 'decline' ? 'DECLINED' : 'ENDED';
        current.endedAt = new Date().toISOString();
      } else if (action === 'mute') {
        current.isMuted = !current.isMuted;
      } else if (action === 'hold') {
        current.status = current.status === 'ON_HOLD' ? 'CONNECTED' : 'ON_HOLD';
      } else if (action === 'notes' && m === 'POST') {
        current.notes.push({
          id: `note-${Date.now()}`,
          content: String(payload.content ?? ''),
          noteType: String(payload.noteType ?? 'NOTE'),
          authorName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Operator',
          createdAt: new Date().toISOString(),
        });
      }
      if (current.status === 'ENDED' || current.status === 'DECLINED') {
        writeDemoCall(null);
      } else {
        writeDemoCall(current);
      }
      return ok(current) as T;
    }
  }

  // Map / incident Dispatch menu — must not fall through to generic [] payload
  {
    const optionsMatch = clean.match(/^\/control-room\/dispatch\/options\/([^/]+)$/);
    if (optionsMatch && m === 'GET') {
      const incidentId = optionsMatch[1];
      const incident =
        demoIncidents.find((i) => i.id === incidentId) ??
        ({
          id: incidentId,
          type: 'PANIC',
          status: 'OPEN',
          title: 'Demo incident',
          isSilent: false,
          time: 'now',
          priority: 'HIGH',
          user: 'Demo Client',
          location: 'Durban',
        } as (typeof demoIncidents)[number]);

      const officers = demoOfficerRoster
        .map((o, i) => {
          const unit = demoFleet.find((v) => v.crew.some((c) => c.officerId === o.id));
          return {
            id: o.id,
            name: `${o.firstName} ${o.lastName}`,
            status: o.status,
            zone: o.zone,
            available: o.status === 'AVAILABLE',
            distanceKm: Number((0.8 + i * 0.55).toFixed(1)),
            eta: `${3 + i} min`,
            unitCallSign: unit?.callSign ?? null,
            vehicleType: unit?.vehicleType ?? 'PATROL',
            registration: unit?.registration ?? null,
          };
        })
        .sort(
          (a, b) =>
            Number(b.available) - Number(a.available) ||
            (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
        );

      const assigned = demoIncidentAssignments[incident.id] ?? null;
      const resolved = ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(incident.status.toUpperCase());
      const canDispatch = !resolved;

      return ok({
        incident: {
          id: incident.id,
          type: incident.type,
          status: incident.status,
          priority: incident.priority,
          address: incident.location,
          client: incident.user,
        },
        canDispatch,
        assignedOfficer: assigned,
        availableCount: officers.filter((o) => o.available).length,
        officers,
        volunteers: canDispatch
          ? [
              {
                id: 'demo-off-4',
                name: 'Zanele Khumalo',
                status: 'AVAILABLE',
                zone: 'Zone A',
                distanceKm: 0.8,
                eta: '3 min',
                signalledAt: new Date().toISOString(),
                unitCallSign: 'Unit 110',
                vehicleType: 'PATROL',
                registration: 'ND 4DS-110',
              },
            ]
          : [],
        emergencyRaisedRecently: false,
      }) as T;
    }

    if (clean === '/control-room/dispatch/assign' && m === 'POST') {
      const incidentId =
        typeof payload.incidentId === 'string' ? payload.incidentId : demoIncidents[0]?.id;
      const officerId =
        typeof payload.officerId === 'string' ? payload.officerId : 'demo-off-4';
      const incident = demoIncidents.find((i) => i.id === incidentId);
      if (incident) incident.status = 'DISPATCHED';
      const officerName = officerFullName(officerId);
      demoIncidentAssignments[incidentId] = officerName;
      const officer = demoOfficerRoster.find((o) => o.id === officerId);
      if (officer) officer.status = 'EN_ROUTE';
      demoDispatches.unshift({
        id: `demo-disp-${Date.now()}`,
        status: 'EN_ROUTE',
        officer: { id: officerId, name: officerName, status: 'EN_ROUTE' },
        incident: {
          id: incidentId,
          type: incident?.type ?? 'PANIC',
          status: 'DISPATCHED',
          client: incident?.user ?? 'Client',
          address: incident?.location ?? null,
          latestReport: `${officerName} assigned and en route.`,
        },
      });
      return ok({
        ok: true,
        incidentId,
        officerId,
        officerName,
      }) as T;
    }

    if (clean === '/control-room/dispatch/emergency-notify' && m === 'POST') {
      return ok({
        alreadyNotified: false,
        message: 'Emergency alert sent to all officers and supervisors (demo).',
      }) as T;
    }
  }

  if (clean.match(/^\/control-room\/incidents\/[^/]+\/notes$/) && m === 'POST') {
    return ok({ ok: true, note: payload.body ?? 'noted' }) as T;
  }
  {
    const incidentPatchMatch = clean.match(/^\/control-room\/incidents\/([^/]+)$/);
    if (incidentPatchMatch && m === 'PATCH') {
      const id = incidentPatchMatch[1];
      const idx = demoIncidents.findIndex((i) => i.id === id);
      if (idx < 0) return { success: false as const, message: 'Incident not found' } as T;
      const nextStatus = String(payload.status ?? 'RESOLVED').toUpperCase();
      if (['RESOLVED', 'CLOSED', 'OPEN', 'DISPATCHED', 'IN_PROGRESS', 'EN_ROUTE', 'ON_SCENE'].includes(nextStatus)) {
        demoIncidents[idx] = { ...demoIncidents[idx], status: nextStatus };
      }
      return ok({
        id: demoIncidents[idx].id,
        status: demoIncidents[idx].status,
        falseAlarm: Boolean(payload.falseAlarm),
        resolution: payload.resolution ?? nextStatus,
      }) as T;
    }
  }
  if (clean.match(/^\/control-room\/incidents\/[^/]+\/request-medical$/) && m === 'POST') {
    const id = clean.split('/')[3];
    medicalTickets.unshift({
      id: `demo-med-${Date.now()}`,
      incidentId: id,
      client: 'Linked client',
      location: 'Active incident',
      priority: 'CRITICAL',
      status: 'OPEN',
      level: 'ALS',
      distanceKm: 2.1,
      patientSummary: 'Requested by control room · PHI withheld from officers',
      securityTicketId: id,
    });
    return ok({ ok: true, medicalTicket: true }) as T;
  }
  if (clean === '/control-room/documents/library' && m === 'GET') {
    return ok(demoDocumentLibrary()) as T;
  }
  if (clean === '/control-room/documents/incidents' && m === 'GET') {
    return ok(
      demoIncidents.map((incident) => ({
        id: incident.id,
        type: incident.type,
        title: incident.title,
        status: incident.status,
        address: incident.location,
        client: incident.user,
        documentCount: demoDocuments.filter((doc) => doc.incidentId === incident.id).length,
      })),
    ) as T;
  }
  if (clean === '/control-room/documents' && m === 'GET') {
    const folderId = params.get('folderId');
    const category = params.get('category');
    const pinned = params.get('pinned') === 'true';
    const incidentId = params.get('incidentId');
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const docs = demoDocuments
      .filter((doc) => !folderId || doc.folderId === folderId)
      .filter((doc) => !category || doc.category === category)
      .filter((doc) => !pinned || doc.isPinned)
      .filter((doc) => !incidentId || doc.incidentId === incidentId)
      .filter((doc) => {
        if (!search) return true;
        return [doc.title, doc.description ?? '', doc.fileName, ...doc.tags]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .map(decorateDemoDocument);
    return ok(docs) as T;
  }
  if (clean === '/control-room/documents/folders' && m === 'POST') {
    const name = String(payload.name ?? '').trim();
    if (!name) throw new Error('Folder name is required');
    const folder = {
      id: `demo-doc-folder-${Date.now()}`,
      name,
      parentId:
        typeof payload.parentId === 'string' && payload.parentId.trim()
          ? payload.parentId.trim()
          : null,
      description:
        typeof payload.description === 'string' && payload.description.trim()
          ? payload.description.trim()
          : null,
      icon: '📁',
    };
    demoDocumentFolders.push(folder);
    return ok(folder) as T;
  }
  if (clean === '/control-room/documents' && m === 'POST') {
    const title = String(payload.title ?? '').trim();
    const category = String(payload.category ?? 'OTHER').trim();
    const fileName = String(payload.fileName ?? `${title || 'document'}.txt`).trim();
    const fileType = String(payload.fileType ?? 'text/plain').trim();
    if (!title) throw new Error('Title is required');
    const doc = {
      id: `demo-doc-${Date.now()}`,
      title,
      description:
        typeof payload.description === 'string' && payload.description.trim()
          ? payload.description.trim()
          : null,
      category,
      fileName,
      fileType,
      fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`Demo document: ${title}`)}`,
      fileSizeKb: Number.isFinite(Number(payload.fileSizeKb)) ? Number(payload.fileSizeKb) : 24,
      tags: Array.isArray(payload.tags)
        ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
        : typeof payload.tags === 'string'
          ? payload.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      isPinned: Boolean(payload.isPinned),
      folderId:
        typeof payload.folderId === 'string' && payload.folderId.trim()
          ? payload.folderId.trim()
          : null,
      incidentId:
        typeof payload.incidentId === 'string' && payload.incidentId.trim()
          ? payload.incidentId.trim()
          : null,
      createdAt: new Date().toISOString(),
      uploadedBy: user ? `${user.firstName} ${user.lastName}`.trim() : 'Demo Admin',
    };
    demoDocuments.unshift(doc);
    return ok(decorateDemoDocument(doc)) as T;
  }
  {
    const documentPatch = clean.match(/^\/control-room\/documents\/([^/]+)$/);
    if (documentPatch && m === 'PATCH') {
      const doc = demoDocuments.find((item) => item.id === documentPatch[1]);
      if (!doc) throw new Error('Document not found');
      if (payload.isPinned !== undefined) doc.isPinned = Boolean(payload.isPinned);
      if (typeof payload.title === 'string' && payload.title.trim()) doc.title = payload.title.trim();
      if (typeof payload.description === 'string') doc.description = payload.description.trim() || null;
      return ok(decorateDemoDocument(doc)) as T;
    }
    if (documentPatch && m === 'DELETE') {
      demoDocuments = demoDocuments.filter((item) => item.id !== documentPatch[1]);
      return ok({ ok: true }) as T;
    }
  }
  {
    const documentLink = clean.match(/^\/control-room\/documents\/([^/]+)\/link-incident$/);
    if (documentLink && m === 'PATCH') {
      const doc = demoDocuments.find((item) => item.id === documentLink[1]);
      if (!doc) throw new Error('Document not found');
      doc.incidentId =
        typeof payload.incidentId === 'string' && payload.incidentId.trim()
          ? payload.incidentId.trim()
          : null;
      return ok(decorateDemoDocument(doc)) as T;
    }
  }
  if (clean === '/control-room/client-vehicles' && m === 'GET') {
    const rows = demoClientVehicles
      .map((v) => formatCrClientVehicle(v.id))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .sort((a, b) => Number(b.panicFocus) - Number(a.panicFocus) || Number(b.theftRecovery) - Number(a.theftRecovery));
    return ok(rows) as T;
  }
  {
    const remoteMatch = clean.match(/^\/control-room\/client-vehicles\/([^/]+)\/remote$/);
    if (remoteMatch && m === 'POST') {
      const actor = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Control room';
      const result = applyDemoVehicleRemote(remoteMatch[1], String(payload.action ?? ''), actor);
      if (!result) return { success: false as const, message: 'Unknown vehicle remote action' } as T;
      return ok(result) as T;
    }
  }
  if (clean === '/control-room/fleet' && m === 'GET') {
    const seen = new Set<string>();
    for (const vehicle of demoFleet) {
      vehicle.crew = vehicle.crew.filter((c) => {
        if (!c.officerId || seen.has(c.officerId)) return false;
        seen.add(c.officerId);
        return true;
      });
      vehicle.crewCount = vehicle.crew.length;
      if (!vehicle.teamName) vehicle.teamName = fleetTeamLabel(vehicle.vehicleType);
    }
    return ok(demoFleet) as T;
  }
  if (clean === '/control-room/fleet' && m === 'POST') {
    const callSign = String(payload.callSign ?? '').trim();
    const registration = String(payload.registration ?? '').trim();
    const make = String(payload.make ?? '').trim();
    const model = String(payload.model ?? '').trim();
    const color = String(payload.color ?? '').trim();
    const rawVehicleType = String(payload.vehicleType ?? '');
    const vehicleType: typeof demoFleet[number]['vehicleType'] =
      FLEET_TEAMS.some((t) => t.value === rawVehicleType)
        ? (rawVehicleType as typeof demoFleet[number]['vehicleType'])
        : 'PATROL';
    const teamName =
      String(payload.teamName ?? '').trim() || fleetTeamLabel(vehicleType);
    if (!callSign || !registration || !make || !model) {
      return { success: false as const, message: 'Call sign, registration, make, and model are required.' } as T;
    }
    const clash = demoFleet.find(
      (v) =>
        v.callSign.toLowerCase() === callSign.toLowerCase() ||
        v.registration.toLowerCase() === registration.toLowerCase(),
    );
    if (clash) {
      return { success: false as const, message: 'That call sign or registration is already on the board.' } as T;
    }
    const id = `demo-fleet-${Date.now()}`;
    const vehicle = {
      id,
      registration,
      callSign,
      make,
      model,
      color,
      vehicleType,
      teamName,
      status: 'AVAILABLE',
      crew: [] as typeof demoFleet[number]['crew'],
      crewCount: 0,
      cameras: demoDashCams(id, callSign, true),
    };
    demoFleet.push(vehicle);
    return ok(vehicle) as T;
  }
  {
    const fleetPatch = clean.match(/^\/control-room\/fleet\/([^/]+)$/);
    if (fleetPatch && m === 'PATCH') {
      const vehicle = demoFleet.find((v) => v.id === fleetPatch[1]);
      if (!vehicle) {
        return { success: false as const, message: 'Vehicle not found.' } as T;
      }
      if (typeof payload.callSign === 'string' && payload.callSign.trim()) {
        vehicle.callSign = payload.callSign.trim();
      }
      if (typeof payload.registration === 'string' && payload.registration.trim()) {
        vehicle.registration = payload.registration.trim();
      }
      if (typeof payload.make === 'string' && payload.make.trim()) vehicle.make = payload.make.trim();
      if (typeof payload.model === 'string' && payload.model.trim()) vehicle.model = payload.model.trim();
      if (typeof payload.color === 'string') vehicle.color = payload.color.trim();
      if (
        typeof payload.vehicleType === 'string' &&
        FLEET_TEAMS.some((t) => t.value === payload.vehicleType)
      ) {
        const nextType = payload.vehicleType as typeof demoFleet[number]['vehicleType'];
        Object.assign(vehicle, { vehicleType: nextType });
      }
      if (typeof payload.teamName === 'string') {
        vehicle.teamName = payload.teamName.trim() || fleetTeamLabel(vehicle.vehicleType);
      }
      vehicle.cameras = demoDashCams(vehicle.id, vehicle.callSign, vehicle.status !== 'MAINTENANCE');
      return ok(vehicle) as T;
    }
  }
  {
    const incMatch = clean.match(/^\/control-room\/incidents\/([^/]+)$/);
    if (incMatch && m === 'PATCH') {
      const inc = demoIncidents.find((i) => i.id === incMatch[1]);
      if (inc) {
        if (typeof payload.status === 'string') inc.status = payload.status;
        if (typeof payload.priority === 'string') inc.priority = payload.priority;
      }
      return ok(inc ?? { ok: true }) as T;
    }
  }
  if (clean.match(/^\/control-room\/incidents\/[^/]+\/(notes|request-medical)$/) && m === 'POST') {
    return ok({ ok: true }) as T;
  }
  if (clean.match(/^\/control-room\/sites\/[^/]+$/) && m === 'GET') {
    return ok({
      id: clean.split('/')[3],
      name: 'Home — Umhlanga',
      address: '12 Lagoon Dr, Umhlanga',
      alarmStatus: 'ARMED',
      people: [
        { name: 'Nomsa Client', role: 'Owner', phone: '+27821234567' },
        { name: 'Thandi Client', role: 'Key holder', phone: '+27820001111' },
      ],
      response: { slaMinutes: 8, nearestUnit: 'Unit 101', lastIncident: 'Panic · 2 min ago' },
      equipment: [
        { name: 'Paradox panel', serial: 'PX-8821', status: 'Online' },
        { name: 'NVR', serial: 'NX-CAM-4412', status: 'Online' },
      ],
      incidents: demoIncidents.slice(0, 3).map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        time: i.time,
      })),
    }) as T;
  }
  if (clean === '/control-room/analytics' && m === 'GET') {
    return ok({
      totalUsers: 128,
      totalIncidents: 42,
      resolvedIncidents: 31,
      resolutionRate: 74,
      panicCount: 9,
      theftCount: 4,
      avgResponseSec: 280,
      avgAckSec: 45,
      avgDispatchSec: 90,
      customerRating: 4.6,
      sla: [
        { type: 'PANIC', targetSec: 180, avgSec: 160, breaches: 1 },
        { type: 'MEDICAL', targetSec: 240, avgSec: 210, breaches: 0 },
        { type: 'INTRUSION', targetSec: 480, avgSec: 520, breaches: 2 },
      ],
      officerPerformance: [
        { name: 'Sipho Ndlovu', avgResponseSec: 240, status: 'EN_ROUTE', rank: 'Senior', skills: ['ARMED', 'MEDIC_FIRST_AID'] },
        { name: 'Zanele Khumalo', avgResponseSec: 165, status: 'AVAILABLE', rank: 'Lead', skills: ['ARMED', 'DRIVER'] },
        { name: 'Raj Patel', avgResponseSec: 310, status: 'BUSY', rank: 'Medic', skills: ['MEDIC', 'DRIVER'] },
        { name: 'Thabo Mokoena', avgResponseSec: 188, status: 'EN_ROUTE', rank: 'Fire', skills: ['FIRE', 'DRIVER'] },
        { name: 'Aisha Khan', avgResponseSec: 142, status: 'AVAILABLE', rank: 'Rapid', skills: ['MOTORCYCLE', 'ARMED'] },
        { name: 'Pieter Botha', avgResponseSec: 226, status: 'AVAILABLE', rank: 'Covert', skills: ['UNMARKED', 'SURVEILLANCE'] },
        { name: 'John Smith', avgResponseSec: 198, status: 'AVAILABLE', rank: 'Officer', skills: ['PATROL'] },
      ],
      aiSuggestions: [
        {
          id: 'ai-1',
          title: 'Recommend Bike 1',
          detail: 'Closest available · 0.8 km · rapid response — suggestion only',
        },
      ],
      incidentTrend: [
        { label: 'Mar', value: 6 },
        { label: 'Apr', value: 8 },
        { label: 'May', value: 5 },
        { label: 'Jun', value: 9 },
        { label: 'Jul', value: 7 },
        { label: 'Aug', value: 42 },
      ],
    }) as T;
  }
  if (clean === '/supervisor/dashboard' && m === 'GET') {
    return ok({
      incidents: demoIncidents.map((i) => ({
        id: i.id,
        type: i.type,
        user: i.user,
        location: i.location,
        slaBreached: i.type === 'INTRUSION',
      })),
      officers: {
        onDuty: 6,
        onScene: 1,
        available: 3,
        needingAttention: 1,
        roster: demoOfficerRoster.map((o) => ({
          id: o.id,
          name: `${o.firstName} ${o.lastName}`,
          status: o.status,
          zone: o.zone,
        })),
      },
    }) as T;
  }
  if (clean === '/supervisor/shifts' && m === 'GET') {
    return ok([
      { id: 'sh-1', officer: 'Sipho Ndlovu', start: '06:00', end: '18:00', flag: 'OK' },
      { id: 'sh-2', officer: 'Raj Patel', start: '06:00', end: '18:00', flag: 'LATE' },
      { id: 'sh-3', officer: 'John Smith', start: '18:00', end: '06:00', flag: 'OK' },
      { id: 'sh-4', officer: 'Lerato Dube', start: '06:00', end: '18:00', flag: 'ABSENT' },
    ]) as T;
  }
  if (clean === '/supervisor/performance' && m === 'GET') {
    return ok([
      { officer: 'Zanele Khumalo', index: 92, ackSec: 28, jobs: 14 },
      { officer: 'Sipho Ndlovu', index: 84, ackSec: 41, jobs: 11 },
      { officer: 'John Smith', index: 71, ackSec: 62, jobs: 9 },
    ]) as T;
  }
  if (clean === '/supervisor/patrol/checkin' && m === 'POST') {
    return ok({ ok: true, method: payload.method ?? 'GEO', code: payload.code }) as T;
  }
  if (clean === '/medical/queue' && m === 'GET') {
    return ok([...medicalTickets]) as T;
  }
  if (clean === '/medical/units' && m === 'GET') {
    return ok([
      { id: 'als-1', callSign: 'Medic 1', level: 'ALS', status: 'AVAILABLE', distanceKm: 1.8, eta: '5 min' },
      { id: 'bls-1', callSign: 'Medic 2', level: 'BLS', status: 'ON_DUTY', distanceKm: 3.2, eta: '9 min' },
    ]) as T;
  }
  if (clean.match(/^\/medical\/tickets\/[^/]+$/) && m === 'PATCH') {
    const id = clean.split('/')[3];
    const t = medicalTickets.find((x) => x.id === id);
    if (t && typeof payload.status === 'string') t.status = payload.status;
    return ok(t ?? { ok: true }) as T;
  }

  if (clean === '/control-room/officers' && m === 'GET') {
    // Build a reverse lookup: officerId → fleet vehicle they're crew on
    const crewMap: Record<string, typeof demoFleet[number]> = {};
    for (const v of demoFleet) {
      for (const seat of v.crew) {
        crewMap[seat.officerId] = v;
      }
    }
    // Phone lookup from demo accounts
    const phoneMap: Record<string, string> = {
      'demo-off-1': '+27831110001', 'demo-off-2': '+27831110002',
      'demo-off-3': '+27831110003', 'demo-off-4': '+27831110004',
      'demo-off-5': '+27831110005', 'demo-off-6': '+27831110006',
      'demo-off-7': '+27831110007', 'demo-off-8': '+27831110008',
      'demo-off-9': '+27831110009', 'demo-off-10': '+27831110010',
      'demo-off-11': '+27831110011', 'demo-off-12': '+27831110012',
      'demo-off-13': '+27831110013', 'demo-off-14': '+27831110014',
      'demo-off-15': '+27831110015', 'demo-off-16': '+27831110016',
    };
    const emailMap: Record<string, string> = {
      'demo-off-1': 'ndlovu@4ds.local', 'demo-off-2': 'patel@4ds.local',
      'demo-off-3': 'smith@4ds.local', 'demo-off-4': 'khumalo@4ds.local',
      'demo-off-5': 'mokoena@4ds.local', 'demo-off-6': 'khan@4ds.local',
      'demo-off-7': 'botha@4ds.local', 'demo-off-8': 'dlamini@4ds.local',
      'demo-off-9': 'sithole@4ds.local', 'demo-off-10': 'vanderberg@4ds.local',
      'demo-off-11': 'nkosi@4ds.local', 'demo-off-12': 'essop@4ds.local',
      'demo-off-13': 'motsepe@4ds.local', 'demo-off-14': 'adams@4ds.local',
      'demo-off-15': 'fourie@4ds.local', 'demo-off-16': 'cele@4ds.local',
    };
    const rankMap: Record<string, string> = {
      'demo-off-1': 'Senior Officer', 'demo-off-2': 'Paramedic',
      'demo-off-3': 'Officer', 'demo-off-4': 'Tactical Lead',
      'demo-off-5': 'Fire Officer', 'demo-off-6': 'Motorcycle Officer',
      'demo-off-7': 'Detective', 'demo-off-8': 'Officer',
      'demo-off-9': 'Medic', 'demo-off-10': 'Fire Fighter',
      'demo-off-11': 'Fire Fighter', 'demo-off-12': 'Tactical Officer',
      'demo-off-13': 'Tactical Officer', 'demo-off-14': 'Covert Officer',
      'demo-off-15': 'Officer', 'demo-off-16': 'Officer',
    };
    return ok(
      demoOfficerRoster.map((o) => {
        const fleetV = crewMap[o.id];
        const seatRole = fleetV?.crew.find((c) => c.officerId === o.id)?.role ?? null;
        return {
          id: o.id,
          firstName: o.firstName,
          lastName: o.lastName,
          status: o.status,
          zone: o.zone,
          avgResponseSec: o.avgResponseSec,
          avatarUrl: o.avatarUrl ?? null,
          phone: phoneMap[o.id] ?? null,
          email: emailMap[o.id] ?? null,
          rank: rankMap[o.id] ?? 'Officer',
          vehicle: o.vehicle,
          assignedFleet: fleetV
            ? {
                id: fleetV.id,
                callSign: fleetV.callSign,
                registration: fleetV.registration,
                vehicleType: fleetV.vehicleType,
                teamName: fleetV.teamName,
                status: fleetV.status,
                seatRole,
                crewCount: fleetV.crewCount,
                crewNames: fleetV.crew.filter((c) => c.officerId !== o.id).map((c) => c.name),
              }
            : null,
        };
      }),
    ) as T;
  }
  if (clean === '/control-room/officers' && m === 'POST') {
    const firstName = String(payload.firstName ?? '').trim();
    const lastName = String(payload.lastName ?? '').trim();
    const zone = String(payload.zone ?? '').trim() || 'Zone A';
    const avatarUrl = typeof payload.avatarUrl === 'string' && payload.avatarUrl.trim() ? payload.avatarUrl : null;
    if (!firstName || !lastName) {
      return { success: false as const, message: 'First and last name are required.' } as T;
    }
    const officer = {
      id: `demo-off-${Date.now()}`,
      firstName,
      lastName,
      status: 'AVAILABLE',
      zone,
      avgResponseSec: 240,
      avatarUrl,
      vehicle: null as typeof demoOfficerRoster[number]['vehicle'],
    };
    demoOfficerRoster.push(officer);
    persistOfficerProfiles();
    return ok(officer) as T;
  }
  {
    const officerPatch = clean.match(/^\/control-room\/officers\/([^/]+)$/);
    if (officerPatch && m === 'PATCH') {
      const officer = demoOfficerRoster.find((o) => o.id === officerPatch[1]);
      if (!officer) {
        return { success: false as const, message: 'Officer not found.' } as T;
      }
      if (typeof payload.firstName === 'string' && payload.firstName.trim()) {
        officer.firstName = payload.firstName.trim();
      }
      if (typeof payload.lastName === 'string' && payload.lastName.trim()) {
        officer.lastName = payload.lastName.trim();
      }
      if (typeof payload.zone === 'string') officer.zone = payload.zone.trim() || 'Zone A';
      if (payload.avatarUrl === null) officer.avatarUrl = null;
      if (typeof payload.avatarUrl === 'string') {
        officer.avatarUrl = payload.avatarUrl.trim() || null;
      }
      syncOfficerCrewNames(officer);
      persistOfficerProfiles();
      return ok({
        id: officer.id,
        firstName: officer.firstName,
        lastName: officer.lastName,
        zone: officer.zone,
        avatarUrl: officer.avatarUrl,
        status: officer.status,
      }) as T;
    }
  }
  {
    const officerStatusMatch = clean.match(/^\/control-room\/officers\/([^/]+)\/status$/);
    if (officerStatusMatch && m === 'PATCH') {
      const officer = demoOfficerRoster.find((o) => o.id === officerStatusMatch[1]);
      if (officer && typeof payload.status === 'string') officer.status = payload.status;
      persistOfficerProfiles();
      return ok({
        id: officer?.id ?? officerStatusMatch[1],
        status: officer?.status ?? payload.status,
      }) as T;
    }
  }
  if (clean === '/control-room/dispatches' && m === 'GET') {
    return ok(demoDispatches) as T;
  }
  if (clean === '/control-room/clients' && m === 'GET') {
    return ok(demoClients) as T;
  }
  if (clean === '/control-room/incidents' && m === 'GET') {
    return ok(
      demoIncidents.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        priority: i.priority,
        user: i.user,
        location: i.location,
        time: i.time,
        officer: demoIncidentAssignments[i.id] ?? null,
        title: i.title,
      })),
    ) as T;
  }
  {
    const incGet = clean.match(/^\/control-room\/incidents\/([^/]+)$/);
    if (incGet && m === 'GET') {
      const inc = demoIncidents.find((i) => i.id === incGet[1]) ?? demoIncidents[0];
      const assigned = demoIncidentAssignments[inc.id] ?? 'Unassigned';
      return ok({
        id: inc.id,
        type: inc.type,
        status: inc.status,
        priority: inc.priority,
        user: inc.user,
        location: inc.location,
        description: inc.title,
        notes: [],
        dispatches: assigned === 'Unassigned'
          ? []
          : [{ id: `demo-disp-${inc.id}`, status: inc.status, officer: assigned }],
        media: [],
      }) as T;
    }
  }
  if (clean === '/control-room/incidents' && m === 'POST') {
    const client =
      demoClients.find((c) => c.id === payload.userId) ?? demoClients[0];
    const type = String(payload.type ?? 'OTHER');
    const incident = {
      id: `demo-inc-${Date.now()}`,
      type,
      status: 'OPEN',
      title:
        typeof payload.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : `${type} — ${client.firstName} ${client.lastName}`,
      isSilent: Boolean(payload.isSilent),
      time: 'Just now',
      priority: String(payload.priority ?? 'HIGH'),
      user: `${client.firstName} ${client.lastName}`,
      location: typeof payload.address === 'string' && payload.address ? payload.address : 'Logged from dispatch',
    };
    demoIncidents.unshift(incident);
    return ok(incident) as T;
  }
  {
    const fleetCrewMatch = clean.match(/^\/control-room\/fleet\/([^/]+)\/crew$/);
    if (fleetCrewMatch && m === 'PATCH') {
      const vehicle = demoFleet.find((v) => v.id === fleetCrewMatch[1]);
      const crewPayload = Array.isArray(payload.crew) ? payload.crew : [];
      const officerIds = crewPayload
        .map((slot: { officerId?: string }) => slot.officerId)
        .filter((id): id is string => Boolean(id));
      if (new Set(officerIds).size !== officerIds.length) {
        return { success: false as const, message: 'The same officer cannot hold two seats on this unit.' } as T;
      }
      const drivers = crewPayload.filter(
        (slot: { role?: string }) => (slot.role ?? 'PASSENGER') === 'DRIVER',
      );
      if (crewPayload.length > 0 && drivers.length !== 1) {
        return { success: false as const, message: 'Each unit needs exactly one driver.' } as T;
      }
      for (const id of officerIds) {
        const elsewhere = demoFleet.find(
          (v) => v.id !== fleetCrewMatch[1] && v.crew.some((c) => c.officerId === id),
        );
        if (elsewhere) {
          const officer = demoOfficerRoster.find((o) => o.id === id);
          const name = officer ? `${officer.firstName} ${officer.lastName}` : 'That officer';
          return {
            success: false as const,
            message: `${name} is already assigned to ${elsewhere.callSign}. Unassign them there first.`,
          } as T;
        }
      }
      if (vehicle) {
        vehicle.crew = crewPayload.map((slot: { officerId?: string; role?: string }) => {
          const officer = demoOfficerRoster.find((o) => o.id === slot.officerId);
          return {
            officerId: slot.officerId ?? '',
            name: officer ? `${officer.firstName} ${officer.lastName}` : 'Officer',
            role: slot.role ?? 'PASSENGER',
            status: officer?.status ?? 'AVAILABLE',
            zone: officer?.zone ?? '',
          };
        });
        vehicle.crewCount = vehicle.crew.length;
        vehicle.status = vehicle.crew.length ? 'ON_DUTY' : vehicle.status;
      }
      return ok(vehicle ?? { ok: true }) as T;
    }
  }

  if (clean.startsWith('/control-room/') && (m === 'GET' || m === 'POST' || m === 'PATCH' || m === 'DELETE')) {
    if (clean === '/control-room/users' && m === 'GET') {
      return ok(demoManagedUsers) as T;
    }
    if (clean === '/control-room/users' && m === 'POST') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const firstName = String(payload.firstName ?? '').trim();
      const lastName = String(payload.lastName ?? '').trim();
      const role = String(payload.role ?? 'DISPATCHER').trim();
      if (!email || !firstName || !lastName) {
        return { success: false as const, message: 'Name and email are required' } as T;
      }
      if (demoManagedUsers.some((item) => item.email === email)) {
        return { success: false as const, message: 'A user with this email already exists' } as T;
      }
      const isClientRole = role === 'USER' || role === 'FAMILY_MEMBER';
      const password = typeof payload.password === 'string' ? payload.password.trim() : '';
      if (password && !canManageUserPasswords(user?.role)) {
        return {
          success: false as const,
          message: 'Only owners, developers, and tenant admins can set staff passwords',
        } as T;
      }
      if (!isClientRole && password.length < 8) {
        return { success: false as const, message: 'Password must be at least 8 characters' } as T;
      }
      if (password.length >= 8) setDemoAccountPassword(email, password);
      const created = demoStaff(email, firstName, lastName, role, {
        phone: typeof payload.phone === 'string' ? payload.phone.trim() || null : null,
        jobTitle: typeof payload.jobTitle === 'string' ? payload.jobTitle.trim() || null : null,
        status:
          typeof payload.status === 'string'
            ? payload.status
            : isClientRole
              ? 'PENDING_VERIFICATION'
              : 'ACTIVE',
      });
      if (typeof payload.avatarUrl === 'string') created.avatarUrl = payload.avatarUrl || null;
      demoManagedUsers.unshift(created);
      if (isClientRole) {
        return ok({
          ...created,
          inviteToken: 'NX-DEMO01',
          inviteUrl: '/portal/register?token=NX-DEMO01',
        }) as T;
      }
      return ok(created) as T;
    }
    if (clean === '/control-room/branches' && m === 'GET') {
      return ok(demoBranches) as T;
    }
    if (clean === '/control-room/branches' && m === 'POST') {
      const name = String(payload.name ?? '').trim();
      const code = String(payload.code ?? '').trim().toUpperCase();
      if (!name || !code) return { success: false as const, message: 'Name and code are required' } as T;
      const branch = {
        id: `demo-branch-${Date.now()}`,
        name,
        code,
        isActive: true,
        teams: [] as { id: string; name: string; members: {}[] }[],
        _count: { users: 0, officers: 0 },
      };
      demoBranches.push(branch);
      return ok(branch) as T;
    }
    {
      const branchPatch = clean.match(/^\/control-room\/branches\/([^/]+)$/);
      if (branchPatch && m === 'PATCH') {
        const branch = demoBranches.find((item) => item.id === branchPatch[1]);
        if (!branch) return { success: false as const, message: 'Branch not found' } as T;
        if (typeof payload.name === 'string') branch.name = payload.name;
        if (typeof payload.code === 'string') branch.code = payload.code.toUpperCase();
        if (typeof payload.isActive === 'boolean') branch.isActive = payload.isActive;
        return ok(branch) as T;
      }
    }
    {
      const userPatch = clean.match(/^\/control-room\/users\/([^/]+)$/);
      if (userPatch && m === 'PATCH') {
        const target = demoManagedUsers.find((item) => item.id === userPatch[1]);
        if (!target) {
          const client = findDemoCustomer(userPatch[1]);
          if (
            client &&
            typeof payload.password === 'string' &&
            payload.password.trim().length >= 8
          ) {
            if (!canManageUserPasswords(user?.role)) {
              return {
                success: false as const,
                message: 'Only owners, developers, and tenant admins can change user passwords',
              } as T;
            }
            setDemoAccountPassword(client.email, payload.password.trim());
            return ok({ id: client.id, email: client.email }) as T;
          }
          return { success: false as const, message: 'User not found' } as T;
        }
        if (typeof payload.firstName === 'string' && payload.firstName.trim()) {
          target.firstName = payload.firstName.trim();
        }
        if (typeof payload.lastName === 'string' && payload.lastName.trim()) {
          target.lastName = payload.lastName.trim();
        }
        if (payload.phone === null || typeof payload.phone === 'string') {
          target.phone = typeof payload.phone === 'string' ? payload.phone.trim() || null : null;
        }
        if (payload.jobTitle === null || typeof payload.jobTitle === 'string') {
          target.jobTitle = typeof payload.jobTitle === 'string' ? payload.jobTitle.trim() || null : null;
        }
        if (typeof payload.status === 'string' && payload.status.trim()) {
          target.status = payload.status.trim();
        }
        if (typeof payload.role === 'string' && payload.role.trim()) {
          target.role = payload.role.trim();
        }
        if (typeof payload.avatarUrl === 'string') {
          target.avatarUrl = payload.avatarUrl || null;
        }
        if (typeof payload.password === 'string' && payload.password.trim()) {
          if (!canManageUserPasswords(user?.role)) {
            return {
              success: false as const,
              message: 'Only owners, developers, and tenant admins can change user passwords',
            } as T;
          }
          if (payload.password.trim().length < 8) {
            return { success: false as const, message: 'Password must be at least 8 characters' } as T;
          }
          setDemoAccountPassword(target.email, payload.password.trim());
        }
        return ok(target) as T;
      }
    }
    if (clean === '/control-room/customers' && m === 'GET') {
      const rows = demoClients.map((c) => {
        const propertyCount = demoSurveillanceSites.filter((s) => s.owner.id === c.id).length;
        const vehicleCount = demoClientVehicles.filter((v) => v.ownerId === c.id).length;
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          role: 'USER',
          status: 'ACTIVE',
          incidentCount: c.id.includes('client-demo') ? 2 : c.id.includes('thabo') ? 1 : 0,
          vehicleCount,
          propertyCount,
          subscription: {
            planName: c.subscription.planName,
            tierCode: c.subscription.tierCode,
            tierLabel: c.subscription.tierCode,
            addons: [],
            activeAddonDetails: [],
            status: c.subscription.status,
            priceFormatted:
              c.subscription.tierCode === 'BUSINESS'
                ? 'R3,100.00'
                : c.subscription.tierCode === 'FAMILY'
                  ? 'R1,250.00'
                  : 'R690.00',
            memberId: c.subscription.memberId,
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
            access: {
              home: true,
              vehicle: vehicleCount > 0,
              family: c.subscription.tierCode === 'FAMILY',
              medical: true,
              personal: true,
              emergency: true,
            },
          },
        };
      });
      return {
        success: true as const,
        data: rows,
        stats: {
          total: rows.length,
          premium: rows.filter((r) => r.subscription.tierCode === 'BUSINESS' || r.subscription.tierCode === 'FAMILY').length,
          pastDue: rows.filter((r) => r.subscription.status === 'PAST_DUE').length,
          active: rows.filter((r) => r.subscription.status === 'ACTIVE' || r.subscription.status === 'TRIALING').length,
        },
      } as T;
    }
    if (clean === '/control-room/billing/overview' && m === 'GET') {
      return ok(buildBillingOverview()) as T;
    }
    if (clean === '/control-room/subscription/plans' && m === 'GET') {
      return ok(DEMO_CONTROL_PLANS_CATALOG) as T;
    }
    if (clean === '/control-room/discount-codes' && m === 'GET') {
      return ok(demoDiscountCodes) as T;
    }
    if (clean === '/control-room/discount-codes' && m === 'POST') {
      const code = String(payload.code ?? '').trim().toUpperCase();
      const percentOff = Number(payload.percentOff ?? 0);
      if (!code || percentOff < 1 || percentOff > 30) {
        return { success: false as const, message: 'Valid code and percent (1–30) required' } as T;
      }
      const row = {
        id: `demo-disc-${Date.now()}`,
        code,
        percentOff,
        appliesTo: String(payload.appliesTo ?? 'BOTH'),
        maxUses: typeof payload.maxUses === 'number' ? payload.maxUses : null,
        usedCount: 0,
        isActive: payload.isActive !== false,
        expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : null,
        description: typeof payload.description === 'string' ? payload.description : null,
      };
      demoDiscountCodes.unshift(row);
      return ok(row) as T;
    }
    if (clean === '/control-room/billing/run-overdue-check' && m === 'POST') {
      const pastDue = demoClients.filter((c) => c.subscription.status === 'PAST_DUE').length;
      return ok({
        scanned: demoClients.length,
        markedPastDue: 0,
        noticesSent: pastDue,
      }) as T;
    }
    {
      const siteMatch = clean.match(/^\/control-room\/sites\/([^/]+)$/);
      if (siteMatch && m === 'GET') {
        const profile = demoSiteProfileForCustomer(siteMatch[1]);
        if (!profile) return { success: false as const, message: 'Site not found' } as T;
        return ok(profile) as T;
      }
    }
    {
      const customerSubMatch = clean.match(/^\/control-room\/customers\/([^/]+)\/subscription$/);
      if (customerSubMatch && m === 'GET') {
        const client = findDemoCustomer(customerSubMatch[1]);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        const userId = client.id;
        return ok({
          customer: {
            id: userId,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            role: 'USER',
            roleLabel: 'Primary subscriber',
            status: 'ACTIVE',
            incidentCount: userId.includes('client-demo') ? 2 : userId.includes('thabo') ? 1 : 0,
            vehicleCount: demoClientVehicles.filter((v) => v.ownerId === userId).length,
            propertyCount: demoSurveillanceSites.filter((s) => s.owner.id === userId).length,
            subscription: null,
          },
          subscription: demoFormatSubscription(client, userId),
          payments: [
            {
              id: `demo-pay-${userId}-1`,
              reference: `PAY-${client.subscription.memberId}`,
              amountFormatted: demoSubscriptionPriceFormatted(client.subscription.tierCode),
              status: client.subscription.status === 'PAST_DUE' ? 'FAILED' : 'COMPLETED',
              kind: 'MONTHLY',
              createdAt: new Date(Date.now() - 32 * 86400000).toISOString(),
            },
            {
              id: `demo-pay-${userId}-2`,
              reference: `PAY-${client.subscription.memberId}-PREV`,
              amountFormatted: demoSubscriptionPriceFormatted(client.subscription.tierCode),
              status: 'COMPLETED',
              kind: 'MONTHLY',
              createdAt: new Date(Date.now() - 62 * 86400000).toISOString(),
            },
          ],
        }) as T;
      }
      if (customerSubMatch && m === 'PATCH') {
        const client = findDemoCustomer(customerSubMatch[1]);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        const userId = client.id;
        if (typeof payload.tierCode === 'string' && payload.tierCode.trim()) {
          const tier = DEMO_CONTROL_PLANS_CATALOG.tiers.find((t) => t.code === payload.tierCode);
          client.subscription.tierCode = payload.tierCode.trim();
          if (tier) client.subscription.planName = tier.name;
        }
        if (Array.isArray(payload.addons)) {
          demoCustomerAddons.set(
            userId,
            payload.addons.filter((c: unknown) => typeof c === 'string'),
          );
        }
        if (typeof payload.status === 'string' && payload.status.trim()) {
          client.subscription.status = payload.status.trim();
        }
        if (typeof payload.memberId === 'string' && payload.memberId.trim()) {
          client.subscription.memberId = payload.memberId.trim();
        }
        if (typeof payload.note === 'string' && payload.note.trim()) {
          demoCustomerLoyalty.set(userId, {
            ...demoLoyaltyFor(userId),
            notes: payload.note.trim(),
          });
        }
        return ok({
          customer: {
            id: userId,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            role: 'USER',
            status: 'ACTIVE',
          },
          subscription: demoFormatSubscription(client, userId),
        }) as T;
      }
    }
    {
      const loyaltyMatch = clean.match(/^\/control-room\/customers\/([^/]+)\/loyalty$/);
      if (loyaltyMatch && m === 'GET') {
        const client = findDemoCustomer(loyaltyMatch[1]);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        return ok(demoLoyaltyFor(loyaltyMatch[1])) as T;
      }
      if (loyaltyMatch && m === 'PATCH') {
        const userId = loyaltyMatch[1];
        const client = findDemoCustomer(userId);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        const current = demoLoyaltyFor(userId);
        const manual = Math.min(
          30,
          Math.max(0, Number(payload.manualDiscountPercent ?? current.manualDiscountPercent)),
        );
        const adjust = Number(payload.adjustPoints ?? 0);
        const next = {
          ...current,
          manualDiscountPercent: manual,
          effectiveDiscountPercent: Math.min(30, current.tierDiscountPercent + manual),
          notes:
            payload.notes === null
              ? null
              : typeof payload.notes === 'string'
                ? payload.notes
                : current.notes,
          points: Math.max(0, current.points + (Number.isFinite(adjust) ? adjust : 0)),
        };
        demoCustomerLoyalty.set(userId, next);
        return ok(next) as T;
      }
    }
    {
      const chargeMatch = clean.match(/^\/control-room\/customers\/([^/]+)\/charge-monthly$/);
      if (chargeMatch && m === 'POST') {
        const client = findDemoCustomer(chargeMatch[1]);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        const ref = `CRG-${Date.now().toString(36).toUpperCase()}`;
        return ok({
          reference: ref,
          amountFormatted: demoSubscriptionPriceFormatted(client.subscription.tierCode),
          checkoutUrl: `/portal/subscription/checkout?ref=${encodeURIComponent(ref)}`,
        }) as T;
      }
    }
    {
      const inviteMatch = clean.match(/^\/control-room\/customers\/([^/]+)\/invite$/);
      if (inviteMatch && m === 'POST') {
        const client = findDemoCustomer(inviteMatch[1]);
        if (!client) return { success: false as const, message: 'Customer not found' } as T;
        const code = `NX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        return ok({
          inviteCode: code,
          inviteToken: code,
          inviteUrl: `/portal/register?token=${encodeURIComponent(code)}`,
        }) as T;
      }
    }
    if (clean === '/control-room/client-chats' && m === 'GET') {
      return ok(demoClientChatThreads()) as T;
    }
    {
      const clientChatMatch = clean.match(/^\/control-room\/client-chats\/([^/]+)\/messages$/);
      if (clientChatMatch && m === 'GET') {
        const clientUserId = clientChatMatch[1];
        const profile = demoClientProfiles[clientUserId];
        if (!profile) return { success: false as const, message: 'Client not found' } as T;
        const msgs = ensureDemoClientChat(clientUserId);
        return ok({
          conversationId: `demo-conv-${clientUserId}`,
          client: { id: clientUserId, ...profile },
          messages: msgs.map(({ clientUserId: _c, ...rest }) => rest),
        }) as T;
      }
      if (clientChatMatch && m === 'POST') {
        const clientUserId = clientChatMatch[1];
        if (!demoClientProfiles[clientUserId]) {
          return { success: false as const, message: 'Client not found' } as T;
        }
        const content = String(payload.content ?? '').trim();
        if (!content) return { success: false as const, message: 'Message cannot be empty' } as T;
        const msg: DemoClientChatMessage = {
          id: `demo-cr-staff-${Date.now()}`,
          clientUserId,
          content,
          createdAt: new Date().toISOString(),
          sender: {
            id: user?.id ?? 'demo-dispatch',
            firstName: user?.firstName ?? 'Control',
            lastName: user?.lastName ?? 'Room',
            role: user?.role ?? 'DISPATCHER',
          },
        };
        ensureDemoClientChat(clientUserId).push(msg);
        const { clientUserId: _c, ...data } = msg;
        return ok(data) as T;
      }
    }
    if (clean === '/control-room/billing/verifications' && m === 'GET') {
      return ok(demoPendingVerifications.map(({ detail: _d, ...rest }) => rest)) as T;
    }
    {
      const verifyMatch = clean.match(/^\/control-room\/billing\/verifications\/([^/]+)\/approve$/);
      if (verifyMatch && m === 'PATCH') {
        const approved = demoApproveVerification(verifyMatch[1]);
        return ok({ ok: true, approved: approved?.type ?? null }) as T;
      }
    }
    if (m === 'GET') {
      // Never return a bare [] for dispatch option payloads (breaks Dispatch menus).
      if (clean.includes('/dispatch/')) {
        return ok({
          incident: {
            id: 'unknown',
            type: 'UNKNOWN',
            status: 'OPEN',
            priority: 'HIGH',
            address: null,
            client: 'Unknown',
          },
          canDispatch: false,
          assignedOfficer: null,
          availableCount: 0,
          officers: [],
          volunteers: [],
          emergencyRaisedRecently: false,
        }) as T;
      }
      // Common list endpoints
      if (clean.includes('incidents')) {
        return ok(
          demoIncidents.map((i) => ({
            id: i.id,
            type: i.type,
            status: i.status,
            priority: i.priority,
            title: i.title,
            client: i.user,
            address: i.location,
            createdAt: new Date().toISOString(),
            time: i.time,
          })),
        ) as T;
      }
      if (clean.includes('officers')) {
        return ok(
          demoOfficerRoster.map((o) => ({
            id: o.id,
            firstName: o.firstName,
            lastName: o.lastName,
            name: `${o.firstName} ${o.lastName}`,
            status: o.status,
            zone: o.zone,
            avgResponseSec: o.avgResponseSec,
            email: `${o.lastName.toLowerCase()}@4ds.local`,
            vehicle: o.vehicle,
          })),
        ) as T;
      }
      if (clean.includes('customers') || clean.includes('users')) {
        return ok([
          {
            id: 'demo-user-client',
            email: 'client@demo.local',
            firstName: 'Nomsa',
            lastName: 'Client',
            phone: '+27821234567',
            status: 'ACTIVE',
          },
        ]) as T;
      }
      return ok([]) as T;
    }
    return ok({ ok: true }) as T;
  }

  // ——— Officer ———
  {
    const dispatchMatch = clean.match(
      /^\/officer\/dispatch\/([^/]+)\/(accept|en-route|on-scene|complete|undo)$/,
    );
    if (dispatchMatch && m === 'POST') {
      const [, id, action] = dispatchMatch;
      const d = officerDispatches.find((x) => x.id === id);
      if (d) {
        if (action === 'undo' && typeof payload.status === 'string') {
          d.status = payload.status;
        } else {
          const map: Record<string, string> = {
            accept: 'ACCEPTED',
            'en-route': 'EN_ROUTE',
            'on-scene': 'ON_SCENE',
            complete: 'COMPLETED',
          };
          d.status = map[action] ?? d.status;
        }
      }
      return ok(d ?? { ok: true, id, status: payload.status }) as T;
    }
  }
  if (clean === '/officer/queue' && m === 'GET') {
    const assigned = officerDispatches.filter((d) => d.status !== 'COMPLETED');
    return ok({
      assigned,
      unassigned: demoIncidents
        .filter((i) => i.status === 'OPEN')
        .map((i) => ({
          id: i.id,
          type: i.type,
          priority: i.priority,
          client: i.user,
          address: i.location,
          lat: DURBAN.lat,
          lng: DURBAN.lng,
          volunteered: false,
        })),
    }) as T;
  }
  if (clean === '/officer/dashboard' && m === 'GET') {
    const open = officerDispatches.filter((d) => d.status !== 'COMPLETED');
    const active =
      open.find((d) =>
        ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'].includes(d.status),
      ) ?? open[0] ?? null;
    const completedToday = officerDispatches.filter((d) => d.status === 'COMPLETED').length;
    return ok({
      officer: {
        firstName: user?.firstName ?? 'Sipho',
        lastName: user?.lastName ?? 'Ndlovu',
        status: active?.status ?? 'AVAILABLE',
        zone: 'Zone A',
        avgResponseSec: 280,
      },
      stats: {
        activeAssignments: open.filter((d) =>
          ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'].includes(d.status),
        ).length,
        completedToday: Math.max(3, completedToday),
        avgResponseFormatted: '4m 40s',
      },
      activeDispatch: active,
      queue: open,
    }) as T;
  }
  if (clean === '/officer/status' && m === 'PATCH') {
    const next = payload.status as string | undefined;
    const roster = (
      demoOfficerRoster.find(
        (o) => o.firstName === user?.firstName && o.lastName === user?.lastName,
      ) ?? demoOfficerRoster[0]
    ) as (typeof demoOfficerRoster)[number] & { phone?: string | null };
    if (roster && next) roster.status = next;
    return ok({ ok: true, status: next ?? roster?.status ?? 'AVAILABLE' }) as T;
  }
  if (clean === '/officer/profile' && m === 'GET') {
    const roster = (
      demoOfficerRoster.find(
        (o) => o.firstName === user?.firstName && o.lastName === user?.lastName,
      ) ?? demoOfficerRoster[0]
    ) as (typeof demoOfficerRoster)[number] & { phone?: string | null };
    return ok({
      firstName: user?.firstName ?? roster?.firstName ?? 'Sipho',
      lastName: user?.lastName ?? roster?.lastName ?? 'Ndlovu',
      email: user?.email ?? 'ndlovu@4ds.local',
      phone: roster?.phone ?? user?.phone ?? '+27831110001',
      zone: roster?.zone ?? 'Zone A',
      status: roster?.status ?? 'AVAILABLE',
      avgResponseSec: roster?.avgResponseSec ?? 280,
      avatarUrl: roster?.avatarUrl ?? null,
    }) as T;
  }
  if (clean === '/officer/profile' && m === 'PATCH') {
    const roster = (
      demoOfficerRoster.find(
        (o) => o.firstName === user?.firstName && o.lastName === user?.lastName,
      ) ?? demoOfficerRoster[0]
    ) as (typeof demoOfficerRoster)[number] & { phone?: string | null };
    if (roster) {
      if (payload.phone !== undefined) roster.phone = payload.phone as string;
      if (payload.avatarUrl !== undefined) roster.avatarUrl = payload.avatarUrl as string | null;
    }
    return ok({ ok: true }) as T;
  }
  if (clean === '/officer/map' && m === 'GET') {
    const roster = demoOfficerRoster.find(
      (o) => o.firstName === user?.firstName && o.lastName === user?.lastName,
    ) ?? demoOfficerRoster[0];
    const open = officerDispatches.filter((d) => d.status !== 'COMPLETED');
    return ok({
      center: { lat: -29.835, lng: 31.002 },
      officer: {
        id: roster?.id ?? 'demo-off-1',
        name: `${user?.firstName ?? roster?.firstName ?? 'Sipho'} ${user?.lastName ?? roster?.lastName ?? 'Ndlovu'}`,
        lat: -29.835,
        lng: 31.002,
        status: roster?.status ?? 'EN_ROUTE',
        avatarUrl: roster?.avatarUrl ?? null,
      },
      assignments: open.map((d) => ({
        dispatchId: d.id,
        status: d.status,
        incident: {
          id: d.incident.id,
          type: d.incident.type,
          lat: d.incident.lat,
          lng: d.incident.lng,
          address: d.incident.address,
          client: d.incident.client,
        },
      })),
    }) as T;
  }
  if (clean === '/officer/active-incident' && m === 'GET') {
    const active = officerDispatches.find((d) =>
      ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'].includes(d.status),
    );
    if (!active) return ok(null) as T;
    return ok({
      incidentId: active.incident.id,
      type: active.incident.type,
      status: active.status,
      client: active.incident.client,
      address: active.incident.address ?? null,
    }) as T;
  }
  if (clean === '/officer/surveillance' && m === 'GET') {
    const incidentId = params.get('incidentId');
    const active =
      (incidentId
        ? officerDispatches.find((d) => d.incident.id === incidentId)
        : officerDispatches.find((d) =>
            ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'ASSIGNED'].includes(d.status),
          )) ?? null;
    const site = demoSurveillanceSites[0] ?? null;
    if (!active || !site) return ok(null) as T;
    const siteEvents = Array.isArray(((site as unknown) as { openEvents?: unknown }).openEvents)
      ? ((((site as unknown) as {
          openEvents?: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            triggeredAt: string;
          }>;
        }).openEvents) ?? [])
      : [];
    return ok({
      incidentId: active.incident.id,
      property: {
        id: site.id,
        name: site.name,
        address: site.address,
        accessNotes: site.accessNotes ?? null,
        gateCode: site.gateCode ?? null,
        keyHolder: site.keyHolder ?? null,
        alarmStatus: site.alarmStatus,
      },
      privacy: site.privacy,
      cameras: (site.cameras ?? []).map((camera) => ({
        id: camera.id,
        name: camera.name,
        locationLabel: camera.locationLabel,
        channel: camera.channel,
        status: camera.status,
        isInterior: camera.isInterior ?? false,
        privacyLocked: Boolean(camera.isInterior && !site.privacy?.interiorUnlocked),
      })),
      events: siteEvents.map((event) => ({
        id: event.id,
        title: event.title,
        type: event.type,
        status: event.status,
        triggeredAt: event.triggeredAt,
      })),
    }) as T;
  }
  if (clean === '/officer/sos' && m === 'POST') {
    return ok({
      ok: true,
      alerted: ['control-room', 'supervisor'],
      incidentId: payload.incidentId ?? null,
    }) as T;
  }
  if (clean === '/officer/check-in' && m === 'POST') {
    return ok({ ok: true, kind: payload.kind ?? payload.type, at: new Date().toISOString() }) as T;
  }
  if (clean === '/officer/evidence' && m === 'POST') {
    return ok({
      ok: true,
      capturedAt: payload.capturedAt ?? new Date().toISOString(),
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      incidentId: payload.incidentId ?? null,
    }) as T;
  }
  if (clean.startsWith('/officer/messages') && m === 'GET') {
    return ok([
      {
        id: 'demo-msg-1',
        unread: true,
        from: 'Control',
        preview: 'Confirm ETA to Umhlanga',
      },
    ]) as T;
  }
  if (clean.match(/^\/officer\/incidents\/[^/]+\/volunteer$/) && m === 'POST') {
    return ok({ volunteered: true, message: 'Dispatch notified (demo).' }) as T;
  }
  if (clean.match(/^\/officer\/messages\/[^/]+\/reply$/) && m === 'POST') {
    return ok({ ok: true, sent: true }) as T;
  }
  if (clean.startsWith('/officer/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Technician ———
  if (clean === '/store/tech/me' && m === 'GET') {
    const scheduled = techJobs.filter((j) => j.status === 'SCHEDULED').length;
    const active = techJobs.filter((j) =>
      !['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(j.status),
    ).length;
    const completed = techJobs.filter((j) => j.status === 'COMPLETED').length;
    return ok({
      firstName: user?.firstName ?? 'Camera',
      lastName: user?.lastName ?? 'Tech',
      email: user?.email ?? 'tech.cameras@4ds.local',
      phone: user?.phone ?? '+27 82 000 0040',
      jobTitle: user?.jobTitle ?? 'CCTV Installer',
      avatarUrl: null,
      branch: { name: 'Sandton', code: 'JHB-01' },
      teams: [{ id: 'team-install-a', name: 'Install Team A', isLead: false }],
      stats: { scheduled, active, completed },
      jobs: [...techJobs],
    }) as T;
  }
  if (clean === '/store/tech/jobs' && m === 'GET') {
    const scheduled = techJobs.filter((j) => j.status === 'SCHEDULED').length;
    const inProgress = techJobs.filter((j) => !['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(j.status)).length;
    const completed = techJobs.filter((j) => j.status === 'COMPLETED').length;
    return {
      success: true,
      data: techJobs.map((j) => ({
        ...j,
        description: j.description ?? j.title,
        clientName: j.clientName ?? 'Demo client',
        clientPhone: j.clientPhone ?? '+27820000000',
        equipmentNotes: j.equipmentNotes ?? null,
      })),
      stats: { scheduled, inProgress, completed },
    } as T;
  }
  {
    const jobMatch = clean.match(/^\/store\/tech\/jobs\/([^/]+)\/status$/);
    if (jobMatch && m === 'PATCH') {
      const job = techJobs.find((j) => j.id === jobMatch[1]);
      if (job && typeof payload.status === 'string') {
        job.status = payload.status;
        if (typeof payload.overrideReason === 'string') job.overrideReason = payload.overrideReason;
      }
      return ok(job ?? { ok: true }) as T;
    }
  }
  {
    const testMatch = clean.match(/^\/store\/tech\/jobs\/([^/]+)\/tests$/);
    if (testMatch && m === 'PATCH') {
      const job = techJobs.find((j) => j.id === testMatch[1]);
      if (job && Array.isArray(payload.tests)) {
        job.tests = payload.tests as TechJob['tests'];
      }
      return ok(job ?? { ok: true }) as T;
    }
  }
  {
    const serialMatch = clean.match(/^\/store\/tech\/jobs\/([^/]+)\/serial$/);
    if (serialMatch && m === 'PATCH') {
      const job = techJobs.find((j) => j.id === serialMatch[1]);
      if (job && typeof payload.serial === 'string') job.serial = payload.serial;
      return ok(job ?? { ok: true }) as T;
    }
  }
  if (clean === '/store/tech/team' && m === 'GET') {
    const meId = user?.id ?? 'demo-tech';
    return ok({
      id: 'demo-tech-team',
      name: 'Install Tech Unit',
      branch: { id: 'demo-branch-dbn', name: 'Durban', code: 'DBN' },
      myRole: 'MEMBER',
      members: [
        {
          id: meId,
          firstName: user?.firstName ?? 'Camera',
          lastName: user?.lastName ?? 'Tech',
          email: user?.email ?? 'tech.cameras@4ds.local',
          phone: user?.phone ?? '+27831110900',
          jobTitle: user?.jobTitle ?? 'CCTV Installer',
          isLead: false,
          isMe: true,
          openJobs: techJobs.filter((j) => !['COMPLETED', 'CANCELLED'].includes(j.status)).length,
          statusLabel: 'On job',
        },
        {
          id: 'demo-tech-2',
          firstName: 'Alarm',
          lastName: 'Tech',
          email: 'tech.alarms@4ds.local',
          phone: '+27831110901',
          jobTitle: 'Alarm Technician',
          isLead: true,
          isMe: false,
          openJobs: 1,
          statusLabel: 'Available',
        },
        {
          id: 'demo-tech-3',
          firstName: 'Access',
          lastName: 'Tech',
          email: 'tech.access@4ds.local',
          phone: '+27831110902',
          jobTitle: 'Access Control',
          isLead: false,
          isMe: false,
          openJobs: 0,
          statusLabel: 'Available',
        },
      ],
    }) as T;
  }
  if (clean === '/store/tech/inventory' && m === 'GET') {
    return ok(
      getDemoProducts().slice(0, 12).map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        stock: p.stock,
        imageEmoji: p.imageEmoji,
        lowStock: p.stock < 8,
        priceFormatted: p.priceFormatted,
      })),
    ) as T;
  }
  if (clean === '/store/tech/stock-requests' && m === 'GET') {
    return ok([]) as T;
  }
  if (clean === '/store/tech/properties' && m === 'GET') {
    return ok([
      {
        id: 'demo-prop-berea',
        name: 'Berea residence',
        address: '42 Musgrave Rd, Berea, Durban',
        camerasLinked: true,
        cameraCount: 4,
        clientName: 'Nomsa Client',
      },
      {
        id: 'demo-prop-westville',
        name: 'Westville home',
        address: '18 Jan Hofmeyr Rd, Westville',
        camerasLinked: false,
        cameraCount: 0,
        clientName: 'James Demo',
      },
    ]) as T;
  }
  if (clean.startsWith('/store/tech/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  if (
    (clean === '/chat/internal' || clean === '/chat/tech-team' || clean === '/chat/dev-support') &&
    m === 'GET'
  ) {
    loadDemoChatMessages();
    const me = participantFromUser(user);
    return ok({
      conversationId: `demo-chat-${clean.slice(6)}`,
      team: { id: 'ops-desk', name: 'Ops desk' },
      participants: [
        me,
        { id: 'demo-off-1', firstName: 'Sipho', lastName: 'Ndlovu', role: 'OFFICER', phone: '+27831110001' },
        { id: DEMO_DISPATCHER.id, firstName: DEMO_DISPATCHER.firstName, lastName: DEMO_DISPATCHER.lastName, role: 'DISPATCHER', phone: '+27860000000' },
      ],
      messages: demoChatMessages.map((message) => ({ ...message, attachments: [...message.attachments] })),
    }) as T;
  }
  if (
    (clean === '/chat/internal' || clean === '/chat/tech-team' || clean === '/chat/dev-support') &&
    m === 'POST'
  ) {
    const me = participantFromUser(user);
    const toUserId = typeof payload.toUserId === 'string' && payload.toUserId ? payload.toUserId : null;
    const msg = {
      id: `demo-chat-${Date.now()}`,
      content: String(payload.content ?? '').trim() || 'Message sent',
      createdAt: new Date().toISOString(),
      toUserId,
      sender: {
        id: me.id,
        firstName: me.firstName,
        lastName: me.lastName,
        role: me.role,
        phone: null,
      },
      attachments: [] as { id: string; fileName: string; fileType: string; fileUrl: string; fileSize: number; kind: 'IMAGE' | 'VIDEO' | 'FILE' }[],
    };
    demoChatMessages.push(msg);
    saveDemoChatMessages();
    return ok({ ...msg }) as T;
  }

  if (clean === '/auth/me' && m === 'GET') {
    return ok({
      id: user?.id ?? 'demo-user',
      email: user?.email ?? 'admin@demo.local',
      firstName: user?.firstName ?? 'Demo',
      lastName: user?.lastName ?? 'Admin',
      role: user?.role ?? 'ADMIN',
      status: 'ACTIVE',
      tenantId: user?.tenantId ?? DEMO_TENANT.id,
      jobTitle: user?.jobTitle ?? null,
      phone: user?.phone ?? null,
      tenant: user?.tenant ?? DEMO_TENANT,
    }) as T;
  }
  if (clean === '/auth/me' && m === 'PATCH') {
    const next = {
      id: user?.id ?? 'demo-user',
      email: user?.email ?? 'admin@demo.local',
      firstName:
        typeof payload.firstName === 'string' && payload.firstName.trim()
          ? payload.firstName.trim()
          : (user?.firstName ?? 'Demo'),
      lastName:
        typeof payload.lastName === 'string' && payload.lastName.trim()
          ? payload.lastName.trim()
          : (user?.lastName ?? 'Admin'),
      role: user?.role ?? 'ADMIN',
      status: 'ACTIVE',
      tenantId: user?.tenantId ?? DEMO_TENANT.id,
      jobTitle:
        payload.jobTitle === null
          ? null
          : typeof payload.jobTitle === 'string'
            ? payload.jobTitle.trim() || null
            : (user?.jobTitle ?? null),
      phone:
        payload.phone === null
          ? null
          : typeof payload.phone === 'string'
            ? payload.phone.trim() || null
            : (user?.phone ?? null),
      tenant: user?.tenant ?? DEMO_TENANT,
    };
    return ok(next) as T;
  }
  if (clean.startsWith('/auth/client/register') && m === 'POST') {
    const session = demoRegisterSession({
      email: String(payload.email ?? 'new@demo.local'),
      firstName: String(payload.firstName ?? 'New'),
      lastName: String(payload.lastName ?? 'Client'),
      phone: payload.phone ? String(payload.phone) : undefined,
    });
    return ok({
      user: session.user,
      tokens: { accessToken: session.accessToken, refreshToken: 'demo', expiresIn: 86400 },
    }) as T;
  }

  if (clean.startsWith('/incidents/') && m === 'GET') {
    const id = clean.split('/')[2];
    const suffix = clean.split('/').slice(3).join('/');
    if (suffix === 'timeline') {
      const created = Date.now() - 8 * 60_000;
      return ok([
        {
          id: `${id}-ev-created`,
          kind: 'event',
          type: 'incident.created',
          source: 'portal',
          createdAt: new Date(created).toISOString(),
        },
        {
          id: `${id}-ev-dispatch`,
          kind: 'event',
          type: 'dispatch.created',
          source: 'control-room',
          createdAt: new Date(created + 45_000).toISOString(),
        },
        {
          id: `${id}-ev-accept`,
          kind: 'event',
          type: 'dispatch.accepted',
          source: 'officer',
          createdAt: new Date(created + 90_000).toISOString(),
        },
        {
          id: `${id}-ev-enroute`,
          kind: 'event',
          type: 'dispatch.en_route',
          source: 'officer',
          createdAt: new Date(created + 2 * 60_000).toISOString(),
        },
      ]) as T;
    }
    if (suffix === 'resources') {
      const officer = demoIncidentAssignments[id] ?? 'Sipho Ndlovu';
      return ok([
        {
          id: `${id}-res-1`,
          callSign: officer.split(' ')[0] ? `Unit · ${officer}` : 'O-24',
          kind: 'officer',
          status: 'EN_ROUTE',
          etaSeconds: 180,
          lat: DURBAN.lat,
          lng: DURBAN.lng,
          incidentId: id,
        },
      ]) as T;
    }
    if (suffix === 'chat') {
      return ok({ conversationId: 'demo-inc-chat', incidentId: id, messages: [] }) as T;
    }
    return ok({
      id,
      publicRef: 'NX-0001',
      type: 'PANIC',
      status: 'DISPATCHED',
      timeline: [],
      resources: [],
    }) as T;
  }
  if (clean.startsWith('/incidents/') && clean.endsWith('/agencies') && m === 'POST') {
    return ok({ ok: true, agency: (payload as { agency?: string }).agency ?? 'SECURITY' }) as T;
  }
  if (clean.startsWith('/incidents/') && clean.endsWith('/chat') && m === 'POST') {
    return ok({
      id: `demo-msg-${Date.now()}`,
      content: String((payload as { content?: string }).content ?? ''),
      createdAt: new Date().toISOString(),
      sender: { id: 'demo', firstName: 'You', lastName: '', role: 'DISPATCHER' },
    }) as T;
  }

  // Default stub so deep pages don't hard-crash
  if (m === 'GET') return ok([]) as T;
  return ok({ ok: true, demo: true }) as T;
}

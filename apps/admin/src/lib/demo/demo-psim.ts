import type { NormalizedSecurityEvent } from '../psim/security-events';
import type { IntegrationEntry } from '../psim/integration-catalog';
import { DEMO_DISPATCH_RULES, PSIM_INTEGRATIONS } from '../psim/integration-catalog';

export type AlarmFeedRow = {
  id: string;
  account: string;
  zone: string;
  signal: string;
  protocol: string;
  severity: string;
  receivedAt: string;
  status: 'NEW' | 'ACK' | 'DISPATCHED' | 'CLOSED';
  incidentId?: string | null;
};

export type AccessDoorRow = {
  id: string;
  name: string;
  site: string;
  status: 'SECURE' | 'OPEN' | 'FORCED' | 'OFFLINE';
  lastEvent: string;
  lastEventAt: string;
  readerCount: number;
};

export type PatrolRouteRow = {
  id: string;
  name: string;
  site: string;
  officer: string;
  progress: number;
  checkpoints: { id: string; label: string; scannedAt?: string | null }[];
  status: 'ON_ROUTE' | 'COMPLETE' | 'MISSED' | 'LATE';
  darSubmitted?: boolean;
};

export type WatchlistRow = {
  id: string;
  kind: 'PLATE' | 'PERSON' | 'VEHICLE';
  value: string;
  reason: string;
  addedBy: string;
  hits: number;
  active: boolean;
};

export type ComplianceRow = {
  id: string;
  officer: string;
  psiraGrade: string;
  firearmExpiry: string;
  medicalExpiry: string;
  trainingDue: string;
  status: 'COMPLIANT' | 'EXPIRING' | 'NON_COMPLIANT';
};

const now = Date.now();

export const demoAlarmFeed: AlarmFeedRow[] = [
  {
    id: 'alm-1',
    account: 'ACC-8842 · James Demo',
    zone: 'Perimeter — Gate B',
    signal: 'BA',
    protocol: 'Contact ID',
    severity: 'HIGH',
    receivedAt: new Date(now - 3 * 60_000).toISOString(),
    status: 'NEW',
    incidentId: 'demo-inc-2',
  },
  {
    id: 'alm-2',
    account: 'ACC-1201 · Thabo Retail',
    zone: 'Shop front PIR',
    signal: 'NR',
    protocol: 'SIA DC-09',
    severity: 'MEDIUM',
    receivedAt: new Date(now - 8 * 60_000).toISOString(),
    status: 'ACK',
    incidentId: 'demo-inc-4',
  },
  {
    id: 'alm-3',
    account: 'ACC-5520 · Ridge Clinic',
    zone: 'Smoke — Zone 3',
    signal: 'FA',
    protocol: 'Contact ID',
    severity: 'CRITICAL',
    receivedAt: new Date(now - 4 * 60_000).toISOString(),
    status: 'DISPATCHED',
    incidentId: 'demo-inc-6',
  },
  {
    id: 'alm-4',
    account: 'ACC-3310 · Warehouse 12',
    zone: 'After-hours motion',
    signal: 'MA',
    protocol: 'IP Module',
    severity: 'HIGH',
    receivedAt: new Date(now - 22 * 60_000).toISOString(),
    status: 'CLOSED',
    incidentId: null,
  },
];

export const demoAccessDoors: AccessDoorRow[] = [
  {
    id: 'door-1',
    name: 'Main lobby',
    site: 'Gateway Office Park',
    status: 'SECURE',
    lastEvent: 'Card IN — Lerato M.',
    lastEventAt: new Date(now - 12 * 60_000).toISOString(),
    readerCount: 2,
  },
  {
    id: 'door-2',
    name: 'Server room',
    site: 'Gateway Office Park',
    status: 'FORCED',
    lastEvent: 'Forced open alarm',
    lastEventAt: new Date(now - 6 * 60_000).toISOString(),
    readerCount: 1,
  },
  {
    id: 'door-3',
    name: 'Loading bay',
    site: 'Prospecton DC',
    status: 'OPEN',
    lastEvent: 'Remote unlock — dispatch',
    lastEventAt: new Date(now - 2 * 60_000).toISOString(),
    readerCount: 1,
  },
  {
    id: 'door-4',
    name: 'East gate',
    site: 'Hillcrest Estate',
    status: 'OFFLINE',
    lastEvent: 'Reader offline',
    lastEventAt: new Date(now - 45 * 60_000).toISOString(),
    readerCount: 2,
  },
];

export const demoPatrolRoutes: PatrolRouteRow[] = [
  {
    id: 'pat-1',
    name: 'Night perimeter',
    site: 'Gateway Office Park',
    officer: 'Sipho Ndlovu',
    progress: 72,
    status: 'ON_ROUTE',
    darSubmitted: false,
    checkpoints: [
      { id: 'cp-1', label: 'Gate A', scannedAt: new Date(now - 40 * 60_000).toISOString() },
      { id: 'cp-2', label: 'Carpark L2', scannedAt: new Date(now - 28 * 60_000).toISOString() },
      { id: 'cp-3', label: 'Roof access', scannedAt: null },
      { id: 'cp-4', label: 'Loading bay', scannedAt: null },
    ],
  },
  {
    id: 'pat-2',
    name: 'Retail close-down',
    site: 'Thabo Retail',
    officer: 'John Smith',
    progress: 100,
    status: 'COMPLETE',
    darSubmitted: true,
    checkpoints: [
      { id: 'cp-5', label: 'Front shutters', scannedAt: new Date(now - 90 * 60_000).toISOString() },
      { id: 'cp-6', label: 'Stock room', scannedAt: new Date(now - 85 * 60_000).toISOString() },
    ],
  },
  {
    id: 'pat-3',
    name: 'Estate patrol',
    site: 'Hillcrest Estate',
    officer: 'Zanele Khumalo',
    progress: 35,
    status: 'LATE',
    darSubmitted: false,
    checkpoints: [
      { id: 'cp-7', label: 'North wall', scannedAt: new Date(now - 55 * 60_000).toISOString() },
      { id: 'cp-8', label: 'Pump house', scannedAt: null },
    ],
  },
];

export const demoWatchlists: WatchlistRow[] = [
  {
    id: 'wl-1',
    kind: 'PLATE',
    value: 'ND 123 GP',
    reason: 'Repeat theft — mall parking',
    addedBy: 'Dispatch supervisor',
    hits: 2,
    active: true,
  },
  {
    id: 'wl-2',
    kind: 'PERSON',
    value: 'Known associate — banned',
    reason: 'Trespass order — Gateway',
    addedBy: 'Client admin',
    hits: 0,
    active: true,
  },
  {
    id: 'wl-3',
    kind: 'VEHICLE',
    value: 'White Hilux — no plates',
    reason: 'Suspicious loitering reports',
    addedBy: 'Officer report',
    hits: 1,
    active: true,
  },
];

export const demoCompliance: ComplianceRow[] = [
  {
    id: 'cmp-1',
    officer: 'Sipho Ndlovu',
    psiraGrade: 'Grade C',
    firearmExpiry: '2026-11-14',
    medicalExpiry: '2026-06-01',
    trainingDue: '2026-04-20',
    status: 'COMPLIANT',
  },
  {
    id: 'cmp-2',
    officer: 'Raj Patel',
    psiraGrade: 'Grade B (Medic)',
    firearmExpiry: '2025-12-01',
    medicalExpiry: '2026-09-15',
    trainingDue: '2026-03-01',
    status: 'EXPIRING',
  },
  {
    id: 'cmp-3',
    officer: 'John Smith',
    psiraGrade: 'Grade C',
    firearmExpiry: '2025-08-10',
    medicalExpiry: '2026-01-20',
    trainingDue: '2026-02-28',
    status: 'NON_COMPLIANT',
  },
];

export const demoSecurityEvents: NormalizedSecurityEvent[] = [
  {
    id: 'evt-1',
    source: 'ALARM',
    type: 'ZONE_TRIP',
    severity: 'HIGH',
    title: 'Perimeter BA — James Demo',
    site: 'Glenwood',
    zone: 'Gate B',
    incidentId: 'demo-inc-2',
    receivedAt: new Date(now - 3 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'evt-2',
    source: 'ACCESS',
    type: 'FORCED_OPEN',
    severity: 'CRITICAL',
    title: 'Server room forced open',
    site: 'Gateway Office Park',
    incidentId: null,
    receivedAt: new Date(now - 6 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'evt-3',
    source: 'VIDEO',
    type: 'ANALYTICS',
    severity: 'MEDIUM',
    title: 'Loitering — carpark L2',
    site: 'Gateway',
    receivedAt: new Date(now - 9 * 60_000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'evt-4',
    source: 'FLEET',
    type: 'GEOFENCE',
    severity: 'LOW',
    title: 'Unit 101 entered client geofence',
    site: 'Umhlanga',
    receivedAt: new Date(now - 14 * 60_000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'evt-5',
    source: 'PATROL',
    type: 'MISSED_CHECKPOINT',
    severity: 'HIGH',
    title: 'Missed scan — Pump house',
    site: 'Hillcrest Estate',
    receivedAt: new Date(now - 18 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'evt-6',
    source: 'APP',
    type: 'PANIC',
    severity: 'CRITICAL',
    title: 'App panic — Nomsa Client',
    site: 'Umhlanga Rocks Dr',
    incidentId: 'demo-inc-1',
    receivedAt: new Date(now - 2 * 60_000).toISOString(),
    acknowledged: true,
  },
];

export function psimOverviewStats() {
  const unackedAlarms = demoAlarmFeed.filter((a) => a.status === 'NEW').length;
  const forcedDoors = demoAccessDoors.filter((d) => d.status === 'FORCED').length;
  const latePatrols = demoPatrolRoutes.filter((p) => p.status === 'LATE' || p.status === 'MISSED').length;
  const nonCompliant = demoCompliance.filter((c) => c.status !== 'COMPLIANT').length;
  const liveIntegrations = PSIM_INTEGRATIONS.filter((i) => i.status === 'LIVE').length;
  const eventQueue = demoSecurityEvents.filter((e) => !e.acknowledged).length;

  return {
    unackedAlarms,
    forcedDoors,
    latePatrols,
    nonCompliant,
    liveIntegrations,
    eventQueue,
    totalIntegrations: PSIM_INTEGRATIONS.length,
    activeRules: DEMO_DISPATCH_RULES.filter((r) => r.enabled).length,
  };
}

export function integrationsCatalog(): IntegrationEntry[] {
  return PSIM_INTEGRATIONS;
}

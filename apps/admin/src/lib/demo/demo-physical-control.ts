/**
 * Demo Physical Control Engine — mutable access points with command lifecycle.
 * COMMAND SENT → ACKNOWLEDGED → MOVING → SUCCEEDED (simulated).
 * Access points are tailored by property type (house, apartment, mall, warehouse, …).
 */

export type DemoAccessKind =
  | 'VEHICLE_GATE'
  | 'PEDESTRIAN_GATE'
  | 'DOOR'
  | 'BARRIER'
  | 'PARKING_GATE'
  | 'ROLLER'
  | 'FIRE_EXIT';

export type DemoPropertyType =
  | 'HOUSE'
  | 'APARTMENT'
  | 'TOWNHOUSE'
  | 'ESTATE'
  | 'MALL'
  | 'RETAIL'
  | 'WAREHOUSE'
  | 'OFFICE'
  | 'BRANCH'
  | 'BUSINESS'
  | 'RURAL'
  | 'HOSPITALITY'
  | 'STORE';

export type DemoAccessState =
  | 'CLOSED'
  | 'OPEN'
  | 'LOCKED'
  | 'UNLOCKED'
  | 'MOVING'
  | 'FORCED'
  | 'HELD_OPEN'
  | 'OFFLINE'
  | 'UNKNOWN';

export type DemoAccessHealth = 'HEALTHY' | 'DEGRADED' | 'OFFLINE';

export type DemoAccessCommand =
  | 'OPEN'
  | 'CLOSE'
  | 'HOLD_OPEN'
  | 'UNLOCK'
  | 'LOCK'
  | 'EMERGENCY_RELEASE';

export type DemoCommandPhase =
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'MOVING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMEOUT';

export type DemoAccessPoint = {
  id: string;
  propertyId: string;
  propertyType: DemoPropertyType;
  name: string;
  site: string;
  kind: DemoAccessKind;
  state: DemoAccessState;
  health: DemoAccessHealth;
  controllerOnline: boolean;
  networkOnline: boolean;
  powerOnline: boolean;
  sensorNormal: boolean;
  motorNormal: boolean;
  cameraId: string | null;
  cameraName: string | null;
  cameraSnapshotUrl: string | null;
  cameraStreamUrl: string | null;
  cameraStatus: string;
  lastEvent: string;
  lastEventAt: string;
  lastCommandAt: string | null;
  openSince: string | null;
  readerCount: number;
  /** Legacy PSIM card status */
  status: 'SECURE' | 'OPEN' | 'FORCED' | 'OFFLINE';
};

export type DemoAccessLog = {
  id: string;
  accessPointId: string;
  accessPointName: string;
  command: DemoAccessCommand;
  phase: DemoCommandPhase;
  actorName: string;
  source: string;
  createdAt: string;
  message: string;
};

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function uiStatus(state: DemoAccessState): DemoAccessPoint['status'] {
  if (state === 'FORCED') return 'FORCED';
  if (state === 'OFFLINE') return 'OFFLINE';
  if (state === 'OPEN' || state === 'UNLOCKED' || state === 'HELD_OPEN' || state === 'MOVING') {
    return 'OPEN';
  }
  return 'SECURE';
}

function targetState(command: DemoAccessCommand, kind: DemoAccessKind): DemoAccessState {
  if (command === 'OPEN' || command === 'HOLD_OPEN' || command === 'EMERGENCY_RELEASE') {
    if (command === 'HOLD_OPEN') return 'HELD_OPEN';
    return kind === 'PEDESTRIAN_GATE' || kind === 'DOOR' || kind === 'FIRE_EXIT' ? 'UNLOCKED' : 'OPEN';
  }
  if (command === 'UNLOCK') return 'UNLOCKED';
  if (command === 'LOCK') return 'LOCKED';
  return kind === 'PEDESTRIAN_GATE' || kind === 'DOOR' || kind === 'FIRE_EXIT' ? 'LOCKED' : 'CLOSED';
}

type PointSeed = Omit<
  DemoAccessPoint,
  | 'status'
  | 'controllerOnline'
  | 'networkOnline'
  | 'powerOnline'
  | 'sensorNormal'
  | 'motorNormal'
  | 'health'
  | 'cameraStreamUrl'
  | 'cameraStatus'
  | 'cameraSnapshotUrl'
> &
  Partial<
    Pick<
      DemoAccessPoint,
      | 'controllerOnline'
      | 'networkOnline'
      | 'powerOnline'
      | 'sensorNormal'
      | 'motorNormal'
      | 'health'
      | 'cameraStreamUrl'
      | 'cameraStatus'
      | 'cameraSnapshotUrl'
    >
  >;

function point(seed: PointSeed): DemoAccessPoint {
  const health = seed.health ?? 'HEALTHY';
  const row: DemoAccessPoint = {
    controllerOnline: true,
    networkOnline: true,
    powerOnline: true,
    sensorNormal: true,
    motorNormal: true,
    cameraStreamUrl: seed.cameraId ? 'demo' : null,
    cameraStatus: seed.cameraId ? 'ONLINE' : 'OFFLINE',
    cameraSnapshotUrl: null,
    ...seed,
    health,
    status: 'SECURE',
  };
  row.status = uiStatus(row.state);
  if (row.state === 'OFFLINE' || health === 'OFFLINE') {
    row.controllerOnline = seed.controllerOnline ?? false;
    row.networkOnline = seed.networkOnline ?? false;
    row.cameraStatus = 'OFFLINE';
  }
  if (row.state === 'FORCED') {
    row.sensorNormal = false;
    row.health = 'DEGRADED';
  }
  return row;
}

/** Property-type tailored access points with zone CCTV links. */
let points: DemoAccessPoint[] = [
  // ——— HOUSE (demo-prop-1 Umhlanga) ———
  point({
    id: 'ap-main-gate',
    propertyId: 'demo-prop-1',
    propertyType: 'HOUSE',
    name: 'Main Vehicle Gate',
    site: 'Home — Umhlanga',
    kind: 'VEHICLE_GATE',
    state: 'CLOSED',
    cameraId: 'demo-cam-1',
    cameraName: 'Front gate',
    lastEvent: 'Main gate closed',
    lastEventAt: ago(8 * 60_000),
    lastCommandAt: ago(8 * 60_000),
    openSince: null,
    readerCount: 2,
  }),
  point({
    id: 'ap-delivery',
    propertyId: 'demo-prop-1',
    propertyType: 'HOUSE',
    name: 'Delivery Gate',
    site: 'Home — Umhlanga',
    kind: 'VEHICLE_GATE',
    state: 'OPEN',
    cameraId: 'demo-cam-2',
    cameraName: 'Garage / delivery',
    lastEvent: 'Remote unlock — dispatch',
    lastEventAt: ago(2 * 60_000),
    lastCommandAt: ago(2 * 60_000),
    openSince: ago(2 * 60_000),
    readerCount: 1,
  }),
  point({
    id: 'ap-ped',
    propertyId: 'demo-prop-1',
    propertyType: 'HOUSE',
    name: 'Pedestrian Gate',
    site: 'Home — Umhlanga',
    kind: 'PEDESTRIAN_GATE',
    state: 'LOCKED',
    cameraId: 'demo-cam-3',
    cameraName: 'Pool & patio',
    lastEvent: 'Locked',
    lastEventAt: ago(40 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-garage',
    propertyId: 'demo-prop-1',
    propertyType: 'HOUSE',
    name: 'Garage door',
    site: 'Home — Umhlanga',
    kind: 'ROLLER',
    state: 'CLOSED',
    cameraId: 'demo-cam-2',
    cameraName: 'Garage',
    lastEvent: 'Closed',
    lastEventAt: ago(55 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),

  // ——— APARTMENT (demo-prop-2 Ballito) ———
  point({
    id: 'ap-apt-lobby',
    propertyId: 'demo-prop-2',
    propertyType: 'APARTMENT',
    name: 'Building lobby',
    site: 'Flat — Ballito',
    kind: 'DOOR',
    state: 'LOCKED',
    cameraId: 'demo-cam-21',
    cameraName: 'Lobby entrance',
    lastEvent: 'Intercom unlock — resident',
    lastEventAt: ago(25 * 60_000),
    lastCommandAt: ago(25 * 60_000),
    openSince: null,
    readerCount: 2,
  }),
  point({
    id: 'ap-apt-unit',
    propertyId: 'demo-prop-2',
    propertyType: 'APARTMENT',
    name: 'Unit A door',
    site: 'Flat — Ballito',
    kind: 'DOOR',
    state: 'LOCKED',
    cameraId: 'demo-cam-22',
    cameraName: 'Balcony / unit approach',
    lastEvent: 'Locked',
    lastEventAt: ago(3 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-apt-parking',
    propertyId: 'demo-prop-2',
    propertyType: 'APARTMENT',
    name: 'Basement parking boom',
    site: 'Flat — Ballito',
    kind: 'PARKING_GATE',
    state: 'CLOSED',
    cameraId: 'demo-cam-23',
    cameraName: 'Living / park link',
    lastEvent: 'Plate IN — ND 882',
    lastEventAt: ago(18 * 60_000),
    lastCommandAt: ago(18 * 60_000),
    openSince: null,
    readerCount: 1,
  }),

  // ——— WAREHOUSE (demo-prop-3) ———
  point({
    id: 'ap-wh-boom',
    propertyId: 'demo-prop-3',
    propertyType: 'WAREHOUSE',
    name: 'Yard boom',
    site: 'Warehouse — Prospecton',
    kind: 'BARRIER',
    state: 'CLOSED',
    cameraId: 'demo-cam-31',
    cameraName: 'Yard entrance',
    lastEvent: 'Closed after truck exit',
    lastEventAt: ago(12 * 60_000),
    lastCommandAt: ago(12 * 60_000),
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-wh-roller',
    propertyId: 'demo-prop-3',
    propertyType: 'WAREHOUSE',
    name: 'Loading roller shutter',
    site: 'Warehouse — Prospecton',
    kind: 'ROLLER',
    state: 'OPEN',
    cameraId: 'demo-cam-32',
    cameraName: 'Dock A',
    lastEvent: 'Hold open — receiving',
    lastEventAt: ago(4 * 60_000),
    lastCommandAt: ago(4 * 60_000),
    openSince: ago(4 * 60_000),
    readerCount: 0,
  }),
  point({
    id: 'ap-wh-ped',
    propertyId: 'demo-prop-3',
    propertyType: 'WAREHOUSE',
    name: 'Staff turnstile',
    site: 'Warehouse — Prospecton',
    kind: 'PEDESTRIAN_GATE',
    state: 'LOCKED',
    cameraId: 'demo-cam-33',
    cameraName: 'Staff entrance',
    lastEvent: 'Card IN — Sipho N.',
    lastEventAt: ago(9 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 2,
  }),

  // ——— MALL / RETAIL (demo-prop-4) ———
  point({
    id: 'ap-mall-entrance',
    propertyId: 'demo-prop-4',
    propertyType: 'MALL',
    name: 'Public entrance',
    site: 'Retail — Gateway',
    kind: 'DOOR',
    state: 'UNLOCKED',
    cameraId: 'demo-cam-41',
    cameraName: 'Mall entrance',
    lastEvent: 'Trading hours unlock',
    lastEventAt: ago(5 * 60 * 60_000),
    lastCommandAt: ago(5 * 60 * 60_000),
    openSince: ago(5 * 60 * 60_000),
    readerCount: 4,
  }),
  point({
    id: 'ap-mall-loading',
    propertyId: 'demo-prop-4',
    propertyType: 'MALL',
    name: 'Loading bay barrier',
    site: 'Retail — Gateway',
    kind: 'BARRIER',
    state: 'CLOSED',
    cameraId: 'demo-cam-42',
    cameraName: 'Loading bay',
    lastEvent: 'Delivery complete',
    lastEventAt: ago(35 * 60_000),
    lastCommandAt: ago(35 * 60_000),
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-mall-fire',
    propertyId: 'demo-prop-4',
    propertyType: 'MALL',
    name: 'Fire exit — east',
    site: 'Retail — Gateway',
    kind: 'FIRE_EXIT',
    state: 'LOCKED',
    cameraId: 'demo-cam-43',
    cameraName: 'East fire corridor',
    lastEvent: 'Secured',
    lastEventAt: ago(2 * 60 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-mall-server',
    propertyId: 'demo-prop-4',
    propertyType: 'MALL',
    name: 'Server / plant room',
    site: 'Retail — Gateway',
    kind: 'DOOR',
    state: 'FORCED',
    cameraId: 'demo-cam-44',
    cameraName: 'Plant corridor',
    lastEvent: 'Forced open alarm',
    lastEventAt: ago(6 * 60_000),
    lastCommandAt: null,
    openSince: ago(6 * 60_000),
    readerCount: 1,
  }),

  // ——— RURAL / FARM (demo-prop-5) ———
  point({
    id: 'ap-farm-east',
    propertyId: 'demo-prop-5',
    propertyType: 'RURAL',
    name: 'East farm gate',
    site: 'Farmstead — Hillcrest',
    kind: 'VEHICLE_GATE',
    state: 'OFFLINE',
    health: 'OFFLINE',
    cameraId: 'demo-cam-51',
    cameraName: 'East approach',
    lastEvent: 'Controller offline',
    lastEventAt: ago(45 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),
  point({
    id: 'ap-farm-main',
    propertyId: 'demo-prop-5',
    propertyType: 'RURAL',
    name: 'Main driveway gate',
    site: 'Farmstead — Hillcrest',
    kind: 'VEHICLE_GATE',
    state: 'CLOSED',
    cameraId: 'demo-cam-52',
    cameraName: 'Driveway',
    lastEvent: 'Closed',
    lastEventAt: ago(20 * 60_000),
    lastCommandAt: ago(20 * 60_000),
    openSince: null,
    readerCount: 1,
  }),

  // ——— OFFICE (demo-prop-6) ———
  point({
    id: 'ap-off-lobby',
    propertyId: 'demo-prop-6',
    propertyType: 'OFFICE',
    name: 'Reception lobby',
    site: 'Clinic — Umhlanga Ridge',
    kind: 'DOOR',
    state: 'LOCKED',
    cameraId: 'demo-cam-61',
    cameraName: 'Reception',
    lastEvent: 'After-hours lock',
    lastEventAt: ago(90 * 60_000),
    lastCommandAt: ago(90 * 60_000),
    openSince: null,
    readerCount: 2,
  }),
  point({
    id: 'ap-off-park',
    propertyId: 'demo-prop-6',
    propertyType: 'OFFICE',
    name: 'Staff parking boom',
    site: 'Clinic — Umhlanga Ridge',
    kind: 'PARKING_GATE',
    state: 'CLOSED',
    cameraId: 'demo-cam-62',
    cameraName: 'Parking entrance',
    lastEvent: 'Closed',
    lastEventAt: ago(15 * 60_000),
    lastCommandAt: null,
    openSince: null,
    readerCount: 1,
  }),
];

let logs: DemoAccessLog[] = [
  {
    id: 'alog-1',
    accessPointId: 'ap-main-gate',
    accessPointName: 'Main Vehicle Gate',
    command: 'CLOSE',
    phase: 'SUCCEEDED',
    actorName: 'System',
    source: 'system',
    createdAt: ago(8 * 60_000),
    message: 'Main gate closed',
  },
  {
    id: 'alog-2',
    accessPointId: 'ap-delivery',
    accessPointName: 'Delivery Gate',
    command: 'OPEN',
    phase: 'SUCCEEDED',
    actorName: 'Control Room',
    source: 'control-room',
    createdAt: ago(2 * 60_000),
    message: 'Remote unlock — dispatch',
  },
  {
    id: 'alog-3',
    accessPointId: 'ap-mall-server',
    accessPointName: 'Server / plant room',
    command: 'OPEN',
    phase: 'FAILED',
    actorName: 'System',
    source: 'system',
    createdAt: ago(6 * 60_000),
    message: 'Forced open / state mismatch',
  },
];

function ok<T>(data: T) {
  return { success: true, data };
}

function syncLegacyStatus(p: DemoAccessPoint) {
  p.status = uiStatus(p.state);
  return p;
}

export function propertyTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    HOUSE: 'House',
    APARTMENT: 'Apartment',
    TOWNHOUSE: 'Townhouse',
    ESTATE: 'Estate',
    MALL: 'Mall',
    RETAIL: 'Retail',
    STORE: 'Store',
    WAREHOUSE: 'Warehouse',
    OFFICE: 'Office',
    BRANCH: 'Branch',
    BUSINESS: 'Business',
    RURAL: 'Rural / farm',
    HOSPITALITY: 'Hospitality',
  };
  return map[(type ?? '').toUpperCase()] ?? (type ? type.replace(/_/g, ' ') : 'Property');
}

export function accessKindLabel(kind?: string | null) {
  const map: Record<string, string> = {
    VEHICLE_GATE: 'Vehicle gate',
    PEDESTRIAN_GATE: 'Pedestrian',
    DOOR: 'Door',
    BARRIER: 'Barrier',
    PARKING_GATE: 'Parking',
    ROLLER: 'Roller / shutter',
    FIRE_EXIT: 'Fire exit',
  };
  return map[(kind ?? '').toUpperCase()] ?? 'Access point';
}

export function listDemoAccessPoints(propertyId?: string): DemoAccessPoint[] {
  const rows = propertyId ? points.filter((p) => p.propertyId === propertyId) : points;
  return rows.map((p) => syncLegacyStatus({ ...p }));
}

/** Map to Command Hub AccessDoorRow shape (+ extras for Property Command). */
export function demoAccessDoorsForPsim() {
  return listDemoAccessPoints().map((p) => ({
    id: p.id,
    name: p.name,
    site: p.site,
    status: p.status,
    lastEvent: p.lastEvent,
    lastEventAt: p.lastEventAt,
    readerCount: p.readerCount,
    kind: p.kind,
    state: p.state,
    health: p.health,
    controllerOnline: p.controllerOnline,
    networkOnline: p.networkOnline,
    powerOnline: p.powerOnline,
    sensorNormal: p.sensorNormal,
    motorNormal: p.motorNormal,
    cameraId: p.cameraId,
    cameraName: p.cameraName,
    cameraSnapshotUrl: p.cameraSnapshotUrl,
    cameraStreamUrl: p.cameraStreamUrl,
    cameraStatus: p.cameraStatus,
    openSince: p.openSince,
    lastCommandAt: p.lastCommandAt,
    propertyId: p.propertyId,
    propertyType: p.propertyType,
  }));
}

export function listDemoAccessHistory(propertyId?: string, take = 40) {
  const ids = propertyId
    ? new Set(points.filter((p) => p.propertyId === propertyId).map((p) => p.id))
    : null;
  return logs.filter((l) => !ids || ids.has(l.accessPointId)).slice(0, take);
}

export type PhysicalDemoResult =
  | { handled: true; response: { success: boolean; data: unknown } }
  | { handled: false };

export function handlePhysicalControlDemo(input: {
  clean: string;
  method: string;
  payload: Record<string, unknown>;
  actorName?: string;
}): PhysicalDemoResult {
  const { clean, method: m, payload } = input;
  const actor = input.actorName ?? 'Operator';

  if (clean === '/control-room/access-points' && m === 'GET') {
    const propertyId = typeof payload.propertyId === 'string' ? payload.propertyId : undefined;
    return { handled: true, response: ok(listDemoAccessPoints(propertyId)) };
  }

  if (clean === '/control-room/access-history' && m === 'GET') {
    const propertyId = typeof payload.propertyId === 'string' ? payload.propertyId : undefined;
    return { handled: true, response: ok(listDemoAccessHistory(propertyId)) };
  }

  const crGet = clean.match(/^\/control-room\/access-points\/([^/]+)$/);
  if (crGet && m === 'GET') {
    const found = points.find((p) => p.id === crGet[1]);
    if (!found) return { handled: true, response: { success: false, data: { error: 'Not found' } } };
    return {
      handled: true,
      response: ok({
        ...syncLegacyStatus({ ...found }),
        commands: listDemoAccessHistory().filter((l) => l.accessPointId === found.id).slice(0, 8),
      }),
    };
  }

  const crCmd = clean.match(/^\/control-room\/access-points\/([^/]+)\/command$/);
  if (crCmd && m === 'POST') {
    return { handled: true, response: runCommand(crCmd[1], payload, actor, 'control-room') };
  }

  const crForce = clean.match(/^\/control-room\/access-points\/([^/]+)\/force-mismatch$/);
  if (crForce && m === 'POST') {
    const found = points.find((p) => p.id === crForce[1]);
    if (!found) return { handled: true, response: { success: false, data: { error: 'Not found' } } };
    found.state = 'FORCED';
    found.health = 'DEGRADED';
    found.sensorNormal = false;
    found.lastEvent = 'GATE STATE MISMATCH — forced / unauthorized open';
    found.lastEventAt = new Date().toISOString();
    found.openSince = new Date().toISOString();
    syncLegacyStatus(found);
    logs.unshift({
      id: `alog-${Date.now()}`,
      accessPointId: found.id,
      accessPointName: found.name,
      command: 'OPEN',
      phase: 'FAILED',
      actorName: 'System',
      source: 'system',
      createdAt: new Date().toISOString(),
      message: 'Forced open / state mismatch',
    });
    return { handled: true, response: ok(found) };
  }

  const clientList = clean.match(/^\/client\/properties\/([^/]+)\/access-points$/);
  if (clientList && m === 'GET') {
    return { handled: true, response: ok(listDemoAccessPoints(clientList[1])) };
  }

  const clientHist = clean.match(/^\/client\/properties\/([^/]+)\/access-history$/);
  if (clientHist && m === 'GET') {
    return { handled: true, response: ok(listDemoAccessHistory(clientHist[1])) };
  }

  const clientCmd = clean.match(
    /^\/client\/properties\/([^/]+)\/access-points\/([^/]+)\/command$/,
  );
  if (clientCmd && m === 'POST') {
    const found = points.find((p) => p.id === clientCmd[2] && p.propertyId === clientCmd[1]);
    if (!found) {
      return { handled: true, response: { success: false, data: { error: 'Access point not found' } } };
    }
    return { handled: true, response: runCommand(found.id, payload, actor, 'portal') };
  }

  return { handled: false };
}

function runCommand(
  id: string,
  payload: Record<string, unknown>,
  actor: string,
  source: string,
) {
  const found = points.find((p) => p.id === id);
  if (!found) return { success: false, data: { error: 'Not found' } };

  const command = String(payload.command ?? 'OPEN').toUpperCase() as DemoAccessCommand;
  const confirmedClear = payload.confirmedClear === true;

  if (found.state === 'OFFLINE' || found.health === 'OFFLINE') {
    return { success: false, data: { error: 'Access point controller is offline', accessPoint: found } };
  }

  if (
    (command === 'OPEN' || command === 'HOLD_OPEN' || command === 'EMERGENCY_RELEASE') &&
    found.cameraId &&
    !confirmedClear &&
    source === 'control-room'
  ) {
    return ok({
      needsConfirmation: true,
      accessPoint: syncLegacyStatus({ ...found }),
      camera: {
        id: found.cameraId,
        name: found.cameraName,
        snapshotUrl: found.cameraSnapshotUrl,
        streamUrl: found.cameraStreamUrl,
        status: found.cameraStatus,
        locationLabel: found.cameraName,
        channel: 1,
        isLiveCapable: true,
      },
      message: 'Confirm the approach is clear on CCTV before opening.',
    });
  }

  const target = targetState(command, found.kind);
  const ts = new Date().toISOString();
  found.state = 'MOVING';
  found.lastCommandAt = ts;
  found.lastEvent = `${actor} · ${command.replace(/_/g, ' ').toLowerCase()} · moving`;
  found.lastEventAt = ts;
  syncLegacyStatus(found);

  found.state = target;
  found.openSince =
    target === 'OPEN' || target === 'UNLOCKED' || target === 'HELD_OPEN' ? ts : null;
  found.lastEvent = `${actor} ${command.replace(/_/g, ' ').toLowerCase()} — authorized`;
  found.lastEventAt = ts;
  if (target !== 'FORCED') {
    found.sensorNormal = true;
    found.health = found.controllerOnline ? 'HEALTHY' : 'OFFLINE';
  }
  syncLegacyStatus(found);

  const log: DemoAccessLog = {
    id: `alog-${Date.now()}`,
    accessPointId: found.id,
    accessPointName: found.name,
    command,
    phase: 'SUCCEEDED',
    actorName: actor,
    source,
    createdAt: ts,
    message: `${actor} · ${found.name} · ${command.replace(/_/g, ' ')} — authorized`,
  };
  logs.unshift(log);

  return ok({
    needsConfirmation: false,
    ok: true,
    phases: ['SENT', 'ACKNOWLEDGED', 'MOVING', 'SUCCEEDED'],
    command: log,
    accessPoint: syncLegacyStatus({ ...found }),
  });
}

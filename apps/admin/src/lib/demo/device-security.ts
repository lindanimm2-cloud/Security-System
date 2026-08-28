import { DEMO_PASSWORD } from './users';
import type { AuthSession } from '../auth';

export type DemoDevice = {
  id: string;
  publicId: string;
  name: string;
  deviceType: string;
  osName: string;
  osVersion: string | null;
  appVersion: string;
  status: string;
  isPrimary: boolean;
  isLocked: boolean;
  lostReason: string | null;
  nativeSos: 'NOT_AVAILABLE';
  nativeSosNote: string;
  lastActiveAt: string;
  lastAuthAt: string | null;
  lastFailedAuthAt: string | null;
  registeredAt: string;
  lastActiveLabel: string;
  /** Account owner for portal scoping + control-room display */
  clientName: string;
  clientEmail: string;
  clientPhone: string;
};

export type DemoAudit = {
  id: string;
  action: string;
  createdAt: string;
  actor: string;
  result: string;
  reason?: string;
  source?: string;
  deviceId?: string;
};

export type DemoPanic = {
  id: string;
  source: string;
  workflowStatus: string;
  transmissionStatus: string;
  isTest: boolean;
  isSilent: boolean;
  incidentId: string | null;
  createdAt: string;
  client: string;
  deviceName: string;
  deviceStatus: string;
  location: { lat: number; lng: number; accuracy: number } | null;
  history: { toStatus: string; note: string; at: string; actor: string }[];
  cancelRequestedAt: string | null;
};

export type DeviceSecurityDemoResult = {
  response: { success: true; data: unknown };
  incident?: {
    id: string;
    type: string;
    status: string;
    title: string;
    isSilent: boolean;
    time: string;
    priority: string;
    user: string;
    location: string;
  };
  notification?: {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    href: string;
  };
  crNotification?: {
    id: string;
    category: string;
    title: string;
    body: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    isRead: boolean;
    createdAt: string;
    link: string;
  };
};

const SOS_NOTE =
  'Emergency SOS functionality is dependent on the device manufacturer, operating system, device model, operating-system version, permissions and regional availability. Native Emergency SOS may operate independently of this application. This web application cannot intercept protected OS-level Emergency SOS events.';

const nowIso = () => new Date().toISOString();

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function makeDevice(
  partial: Omit<DemoDevice, 'nativeSos' | 'nativeSosNote' | 'appVersion'> & {
    nativeSosNote?: string;
    appVersion?: string;
  },
): DemoDevice {
  return {
    ...partial,
    appVersion: partial.appVersion ?? '4.2.1',
    nativeSos: 'NOT_AVAILABLE',
    nativeSosNote: partial.nativeSosNote ?? SOS_NOTE,
  };
}

const devices: DemoDevice[] = [
  makeDevice({
    id: 'demo-dev-s24',
    publicId: 'SEC-DEVICE-S24ULTRA01',
    name: 'Samsung Galaxy S24 Ultra',
    deviceType: 'mobile',
    osName: 'Android',
    osVersion: '15',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: nowIso(),
    lastAuthAt: minutesAgo(1),
    lastFailedAuthAt: null,
    registeredAt: '2026-08-18T08:00:00.000Z',
    lastActiveLabel: 'Just now',
    clientName: 'Nomsa Client',
    clientEmail: 'client@demo.local',
    clientPhone: '+27821234567',
  }),
  makeDevice({
    id: 'demo-dev-iphone',
    publicId: 'SEC-DEVICE-IPHONE1501',
    name: 'iPhone 15',
    deviceType: 'mobile',
    osName: 'iOS',
    osVersion: '17.5',
    status: 'TRUSTED',
    isPrimary: false,
    isLocked: false,
    lostReason: null,
    nativeSosNote:
      "Apple's Emergency SOS is controlled by iOS. Some Emergency SOS actions may operate independently from this application.",
    lastActiveAt: minutesAgo(50),
    lastAuthAt: minutesAgo(50),
    lastFailedAuthAt: null,
    registeredAt: '2026-07-02T10:00:00.000Z',
    lastActiveLabel: '50 minutes ago',
    clientName: 'Nomsa Client',
    clientEmail: 'client@demo.local',
    clientPhone: '+27821234567',
  }),
  makeDevice({
    id: 'demo-dev-chrome',
    publicId: 'SEC-DEVICE-CHROMEWIN1',
    name: 'Chrome / Windows',
    deviceType: 'desktop',
    osName: 'Windows',
    osVersion: '11',
    status: 'TEMPORARY',
    isPrimary: false,
    isLocked: false,
    lostReason: null,
    lastActiveAt: minutesAgo(120),
    lastAuthAt: minutesAgo(120),
    lastFailedAuthAt: null,
    registeredAt: '2026-08-17T18:20:00.000Z',
    lastActiveLabel: '2 hours ago',
    clientName: 'Nomsa Client',
    clientEmail: 'client@demo.local',
    clientPhone: '+27821234567',
  }),
  makeDevice({
    id: 'demo-dev-unknown',
    publicId: 'SEC-DEVICE-UNKNOWN01',
    name: 'Unknown device',
    deviceType: 'unknown',
    osName: 'Unknown',
    osVersion: null,
    appVersion: '—',
    status: 'BLOCKED',
    isPrimary: false,
    isLocked: true,
    lostReason: null,
    lastActiveAt: hoursAgo(26),
    lastAuthAt: null,
    lastFailedAuthAt: hoursAgo(26),
    registeredAt: '2026-06-01T09:00:00.000Z',
    lastActiveLabel: 'Yesterday',
    clientName: 'Nomsa Client',
    clientEmail: 'client@demo.local',
    clientPhone: '+27821234567',
  }),
  makeDevice({
    id: 'demo-dev-james-pixel',
    publicId: 'SEC-DEVICE-PIXELPRO8',
    name: 'Google Pixel 8 Pro',
    deviceType: 'mobile',
    osName: 'Android',
    osVersion: '15',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: minutesAgo(8),
    lastAuthAt: minutesAgo(8),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(40).slice(0, 10) + 'T09:15:00.000Z',
    lastActiveLabel: '8 minutes ago',
    clientName: 'James Demo',
    clientEmail: 'james@demo.local',
    clientPhone: '+27829876543',
  }),
  makeDevice({
    id: 'demo-dev-james-watch',
    publicId: 'SEC-DEVICE-GWATCH07',
    name: 'Galaxy Watch 7',
    deviceType: 'wearable',
    osName: 'Wear OS',
    osVersion: '5.0',
    status: 'TRUSTED',
    isPrimary: false,
    isLocked: false,
    lostReason: null,
    lastActiveAt: minutesAgo(22),
    lastAuthAt: minutesAgo(22),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(28).slice(0, 10) + 'T14:00:00.000Z',
    lastActiveLabel: '22 minutes ago',
    clientName: 'James Demo',
    clientEmail: 'james@demo.local',
    clientPhone: '+27829876543',
  }),
  makeDevice({
    id: 'demo-dev-priya-s23',
    publicId: 'SEC-DEVICE-S23FE01',
    name: 'Samsung Galaxy S23 FE',
    deviceType: 'mobile',
    osName: 'Android',
    osVersion: '14',
    status: 'LOST',
    isPrimary: false,
    isLocked: true,
    lostReason: 'LOST',
    lastActiveAt: daysAgo(2),
    lastAuthAt: daysAgo(2),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(90).slice(0, 10) + 'T11:30:00.000Z',
    lastActiveLabel: '2 days ago',
    clientName: 'Priya Naidoo',
    clientEmail: 'priya@warehouse.local',
    clientPhone: '+27831112201',
  }),
  makeDevice({
    id: 'demo-dev-priya-ipad',
    publicId: 'SEC-DEVICE-IPADPRO01',
    name: 'iPad Pro 12.9',
    deviceType: 'tablet',
    osName: 'iPadOS',
    osVersion: '17.6',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: hoursAgo(3),
    lastAuthAt: hoursAgo(3),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(55).slice(0, 10) + 'T08:45:00.000Z',
    lastActiveLabel: '3 hours ago',
    clientName: 'Priya Naidoo',
    clientEmail: 'priya@warehouse.local',
    clientPhone: '+27831112201',
  }),
  makeDevice({
    id: 'demo-dev-thabo-a55',
    publicId: 'SEC-DEVICE-A55RETAIL',
    name: 'Samsung Galaxy A55',
    deviceType: 'mobile',
    osName: 'Android',
    osVersion: '14',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: minutesAgo(35),
    lastAuthAt: minutesAgo(35),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(18).slice(0, 10) + 'T16:10:00.000Z',
    lastActiveLabel: '35 minutes ago',
    clientName: 'Thabo Retail',
    clientEmail: 'thabo@gateway.local',
    clientPhone: '+27832223302',
  }),
  makeDevice({
    id: 'demo-dev-lerato-iphone',
    publicId: 'SEC-DEVICE-IPHONE13F',
    name: 'iPhone 13',
    deviceType: 'mobile',
    osName: 'iOS',
    osVersion: '17.4',
    status: 'STOLEN',
    isPrimary: false,
    isLocked: true,
    lostReason: 'STOLEN',
    lastActiveAt: daysAgo(5),
    lastAuthAt: daysAgo(5),
    lastFailedAuthAt: daysAgo(5),
    registeredAt: daysAgo(120).slice(0, 10) + 'T07:20:00.000Z',
    lastActiveLabel: '5 days ago',
    clientName: 'Lerato Mokoena',
    clientEmail: 'lerato@hillcrest.local',
    clientPhone: '+27834445503',
  }),
  makeDevice({
    id: 'demo-dev-asha-pixel',
    publicId: 'SEC-DEVICE-PIXEL7A',
    name: 'Google Pixel 7a',
    deviceType: 'mobile',
    osName: 'Android',
    osVersion: '14',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: hoursAgo(1),
    lastAuthAt: hoursAgo(1),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(12).slice(0, 10) + 'T12:00:00.000Z',
    lastActiveLabel: '1 hour ago',
    clientName: 'Asha Patel',
    clientEmail: 'asha@ridgeclinic.local',
    clientPhone: '+27835556604',
  }),
  makeDevice({
    id: 'demo-dev-sarah-iphone',
    publicId: 'SEC-DEVICE-IPHONE14S',
    name: 'iPhone 14',
    deviceType: 'mobile',
    osName: 'iOS',
    osVersion: '17.5',
    status: 'TRUSTED',
    isPrimary: true,
    isLocked: false,
    lostReason: null,
    lastActiveAt: minutesAgo(95),
    lastAuthAt: minutesAgo(95),
    lastFailedAuthAt: null,
    registeredAt: daysAgo(33).slice(0, 10) + 'T19:40:00.000Z',
    lastActiveLabel: '1 hour ago',
    clientName: 'Sarah Guest',
    clientEmail: 'sarah@morningside.local',
    clientPhone: '+27836667705',
  }),
];

const audits: DemoAudit[] = [
  {
    id: 'demo-aud-1',
    action: 'DEVICE_REGISTERED',
    createdAt: '2026-08-18T18:20:00.000Z',
    actor: 'Nomsa Client',
    result: 'SUCCESS',
    deviceId: 'demo-dev-s24',
  },
  {
    id: 'demo-aud-2',
    action: 'EMERGENCY_SESSION_CREATED',
    createdAt: minutesAgo(12),
    actor: 'Nomsa Client',
    result: 'SUCCESS',
    deviceId: 'demo-dev-s24',
  },
  {
    id: 'demo-aud-3',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(40),
    actor: 'James Demo',
    result: 'SUCCESS',
    deviceId: 'demo-dev-james-pixel',
  },
  {
    id: 'demo-aud-4',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(28),
    actor: 'James Demo',
    result: 'SUCCESS',
    deviceId: 'demo-dev-james-watch',
  },
  {
    id: 'demo-aud-5',
    action: 'DEVICE_LOST',
    createdAt: daysAgo(2),
    actor: 'Priya Naidoo',
    result: 'SUCCESS',
    reason: 'Left in Uber — Umhlanga',
    deviceId: 'demo-dev-priya-s23',
  },
  {
    id: 'demo-aud-6',
    action: 'SECURITY_LOCKDOWN',
    createdAt: daysAgo(2),
    actor: 'Priya Naidoo',
    result: 'SUCCESS',
    deviceId: 'demo-dev-priya-s23',
  },
  {
    id: 'demo-aud-7',
    action: 'DEVICE_STOLEN',
    createdAt: daysAgo(5),
    actor: 'Lerato Mokoena',
    result: 'SUCCESS',
    reason: 'Taken from vehicle — Hillcrest',
    deviceId: 'demo-dev-lerato-iphone',
  },
  {
    id: 'demo-aud-8',
    action: 'PANIC',
    createdAt: minutesAgo(18),
    actor: 'Thabo Retail',
    result: 'SUCCESS',
    source: 'APP_PANIC',
    deviceId: 'demo-dev-thabo-a55',
  },
  {
    id: 'demo-aud-9',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(18),
    actor: 'Thabo Retail',
    result: 'SUCCESS',
    deviceId: 'demo-dev-thabo-a55',
  },
  {
    id: 'demo-aud-10',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(12),
    actor: 'Asha Patel',
    result: 'SUCCESS',
    deviceId: 'demo-dev-asha-pixel',
  },
  {
    id: 'demo-aud-11',
    action: 'PANIC',
    createdAt: hoursAgo(6),
    actor: 'Sarah Guest',
    result: 'SUCCESS',
    source: 'APP_PANIC_TEST',
    deviceId: 'demo-dev-sarah-iphone',
  },
  {
    id: 'demo-aud-12',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(33),
    actor: 'Sarah Guest',
    result: 'SUCCESS',
    deviceId: 'demo-dev-sarah-iphone',
  },
  {
    id: 'demo-aud-13',
    action: 'EMERGENCY_SESSION_CREATED',
    createdAt: hoursAgo(9),
    actor: 'James Demo',
    result: 'SUCCESS',
    deviceId: 'demo-dev-james-pixel',
  },
  {
    id: 'demo-aud-14',
    action: 'DEVICE_REGISTERED',
    createdAt: daysAgo(55),
    actor: 'Priya Naidoo',
    result: 'SUCCESS',
    deviceId: 'demo-dev-priya-ipad',
  },
];

const panics: DemoPanic[] = [
  {
    id: 'demo-panic-thabo-1',
    source: 'APP_PANIC',
    workflowStatus: 'ACKNOWLEDGED',
    transmissionStatus: 'DELIVERED',
    isTest: false,
    isSilent: false,
    incidentId: 'demo-inc-panic-thabo',
    createdAt: minutesAgo(18),
    client: 'Thabo Retail',
    deviceName: 'Samsung Galaxy A55',
    deviceStatus: 'TRUSTED',
    location: { lat: -29.7265, lng: 31.0654, accuracy: 18 },
    history: [
      { toStatus: 'NEW', note: 'Client held Panic', at: minutesAgo(18), actor: 'System' },
      { toStatus: 'ACKNOWLEDGED', note: 'Ops desk acknowledged', at: minutesAgo(16), actor: 'Control Room' },
    ],
    cancelRequestedAt: null,
  },
  {
    id: 'demo-panic-sarah-test',
    source: 'APP_PANIC_TEST',
    workflowStatus: 'RESOLVED',
    transmissionStatus: 'DELIVERED',
    isTest: true,
    isSilent: false,
    incidentId: null,
    createdAt: hoursAgo(6),
    client: 'Sarah Guest',
    deviceName: 'iPhone 14',
    deviceStatus: 'TRUSTED',
    location: { lat: -29.8301, lng: 31.0162, accuracy: 12 },
    history: [
      { toStatus: 'NEW', note: 'Labelled test Panic', at: hoursAgo(6), actor: 'System' },
      { toStatus: 'RESOLVED', note: 'Test closed — no dispatch', at: hoursAgo(5.8), actor: 'Control Room' },
    ],
    cancelRequestedAt: null,
  },
  {
    id: 'demo-panic-james-duress',
    source: 'APP_DURESS',
    workflowStatus: 'CONTACTING_CLIENT',
    transmissionStatus: 'DELIVERED',
    isTest: false,
    isSilent: true,
    incidentId: 'demo-inc-duress-james',
    createdAt: minutesAgo(42),
    client: 'James Demo',
    deviceName: 'Google Pixel 8 Pro',
    deviceStatus: 'TRUSTED',
    location: { lat: -29.7288, lng: 31.0821, accuracy: 24 },
    history: [
      { toStatus: 'NEW', note: 'Silent duress PIN', at: minutesAgo(42), actor: 'System' },
      { toStatus: 'ACKNOWLEDGED', note: 'Silent protocol', at: minutesAgo(40), actor: 'Control Room' },
      { toStatus: 'CONTACTING_CLIENT', note: 'Calling verify line', at: minutesAgo(38), actor: 'Control Room' },
    ],
    cancelRequestedAt: null,
  },
];
let emergencySession: {
  id: string;
  token: string;
  expiresAt: string;
  status: string;
} | null = null;
let lockdownActive = false;
let consentAccepted = true;
let panicTested = true;
let duressEnabled = false;
let trackingMode: 'OFF' | 'EMERGENCY_ONLY' | 'CONTINUOUS' = 'EMERGENCY_ONLY';
const failCounts = new Map<string, number>();
const panicKeys = new Map<string, string>();

function ok(data: unknown): DeviceSecurityDemoResult {
  return { response: { success: true, data } };
}

function findDevice(id: string) {
  return devices.find((d) => d.id === id || d.publicId === id);
}

function clientDevicesForSession(session?: AuthSession | null) {
  const email = session?.user?.email?.toLowerCase();
  if (!email || email === 'client@demo.local') {
    return devices.filter((d) => d.clientEmail === 'client@demo.local');
  }
  const owned = devices.filter((d) => d.clientEmail.toLowerCase() === email);
  return owned.length ? owned : devices.filter((d) => d.clientEmail === 'client@demo.local');
}

function clientName(session?: AuthSession | null) {
  if (!session?.user) return 'Nomsa Client';
  return `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() || session.user.email;
}

function pushAudit(action: string, actor: string, extra?: Partial<DemoAudit>) {
  audits.unshift({
    id: `demo-aud-${Date.now()}`,
    action,
    createdAt: nowIso(),
    actor,
    result: extra?.result ?? 'SUCCESS',
    reason: extra?.reason,
    source: extra?.source,
    deviceId: extra?.deviceId,
  });
}

function statusPayload(session?: AuthSession | null) {
  const scoped = clientDevicesForSession(session);
  const primary = scoped.find((d) => d.isPrimary);
  const items = [
    { id: 'primary', ok: Boolean(primary && primary.status === 'TRUSTED'), label: 'Primary device registered' },
    { id: 'location', ok: trackingMode !== 'OFF', label: 'Location configured' },
    { id: 'notifications', ok: true, label: 'Notifications configured' },
    { id: 'native-sos', ok: false, warn: true, label: 'Native SOS', detail: 'Not available in this web app. App Panic still works.' },
    { id: 'contacts', ok: true, label: 'Emergency contacts configured' },
    { id: 'panic-test', ok: panicTested, label: 'Panic tested' },
    { id: 'consent', ok: consentAccepted, label: 'Emergency consent recorded' },
  ];
  const score = Math.round((items.filter((i) => i.id !== 'native-sos' && i.ok).length / 6) * 100);
  const activePanic = panics.find((p) =>
    ['NEW', 'ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'].includes(
      p.workflowStatus,
    ),
  );
  return {
    protected: Boolean(primary && primary.status === 'TRUSTED' && !lockdownActive),
    lockdownActive,
    primaryDevice: primary ?? null,
    nativeSos: { status: 'NOT_AVAILABLE' as const, note: SOS_NOTE },
    emergencyAccessAvailable: true,
    contactCount: 3,
    readiness: { score, items },
    activePanic: activePanic ?? null,
    trackingMode,
    panicHoldMs: 3000,
    duressEnabled,
    consentVersion: '2026-08-18',
    policyVersion: '1.0',
    disclaimer: SOS_NOTE,
  };
}

export function handleDeviceSecurityDemo(args: {
  clean: string;
  method: string;
  payload: Record<string, unknown>;
  session?: AuthSession | null;
}): DeviceSecurityDemoResult | null {
  const { clean, method, payload, session } = args;
  const m = method.toUpperCase();
  const actor = clientName(session);

  if (!clean.startsWith('/client/security') && !clean.startsWith('/control-room/security')) {
    return null;
  }

  if (clean === '/client/security/status' && m === 'GET') return ok(statusPayload(session));
  if (clean === '/client/security/activity' && m === 'GET') {
    const ownedIds = new Set(clientDevicesForSession(session).map((d) => d.id));
    return ok(audits.filter((a) => !a.deviceId || ownedIds.has(a.deviceId)));
  }
  if (clean === '/client/security/devices' && m === 'GET') {
    return ok(clientDevicesForSession(session).map((d) => ({ ...d })));
  }

  const deviceGet = clean.match(/^\/client\/security\/devices\/([^/]+)$/);
  if (deviceGet && m === 'GET' && deviceGet[1] !== 'register' && deviceGet[1] !== 'heartbeat') {
    const device = clientDevicesForSession(session).find(
      (d) => d.id === decodeURIComponent(deviceGet[1]) || d.publicId === decodeURIComponent(deviceGet[1]),
    ) ?? findDevice(decodeURIComponent(deviceGet[1]));
    if (!device) return ok(null);
    return ok({
      ...device,
      currentSession: device.status === 'TRUSTED' || device.status === 'TEMPORARY' ? { id: 'sess-1', authMethod: 'password' } : null,
      sessions: [],
      securityEvents: audits.filter((a) => a.deviceId === device.id || a.action.includes('DEVICE')).slice(0, 8),
      panicHistory: panics.filter((p) => p.deviceName === device.name),
    });
  }

  if (clean === '/client/security/devices/register' && m === 'POST') {
    const publicId = String(payload.publicId ?? `SEC-DEVICE-WEB${Date.now().toString(36).toUpperCase()}`);
    let device = findDevice(publicId);
    if (!device) {
      device = {
        id: `demo-dev-${Date.now()}`,
        publicId,
        name: String(payload.name ?? 'This browser'),
        deviceType: 'desktop',
        osName: 'Windows',
        osVersion: '11',
        appVersion: '4.2.1',
        status: payload.trustBrowser || payload.makePrimary ? 'TRUSTED' : 'TEMPORARY',
        isPrimary: Boolean(payload.makePrimary) && !clientDevicesForSession(session).some((d) => d.isPrimary && d.status === 'TRUSTED'),
        isLocked: false,
        lostReason: null,
        nativeSos: 'NOT_AVAILABLE',
        nativeSosNote: SOS_NOTE,
        lastActiveAt: nowIso(),
        lastAuthAt: nowIso(),
        lastFailedAuthAt: null,
        registeredAt: nowIso(),
        lastActiveLabel: 'Just now',
        clientName: clientName(session),
        clientEmail: session?.user?.email ?? 'client@demo.local',
        clientPhone: session?.user?.phone ?? '+27821234567',
      };
      if (device.isPrimary) {
        clientDevicesForSession(session).forEach((d) => {
          d.isPrimary = false;
        });
      }
      devices.unshift(device);
      pushAudit('DEVICE_REGISTERED', actor, { deviceId: device.id });
    }
    return {
      ...ok(device),
      notification: {
        id: `demo-cn-dev-${Date.now()}`,
        type: 'DEVICE_SECURITY',
        title: 'New device registered',
        body: `${device.name} was registered as ${device.isPrimary ? 'your primary security device' : 'a device on your account'}.`,
        isRead: false,
        createdAt: nowIso(),
        href: '/portal/security/devices',
      },
    };
  }

  if (clean === '/client/security/devices/heartbeat' && m === 'POST') return ok({ ok: true });

  const actionMatch = clean.match(/^\/client\/security\/devices\/([^/]+)\/(lock|revoke|report-lost|report-stolen|make-primary|replace-primary)$/);
  if (actionMatch && m === 'POST') {
    const device = findDevice(decodeURIComponent(actionMatch[1]));
    if (!device) return ok({ error: 'not_found' });
    const action = actionMatch[2];
    if (action === 'lock') {
      device.isLocked = true;
      pushAudit('DEVICE_LOCKED', actor);
    }
    if (action === 'revoke') {
      device.status = 'REVOKED';
      device.isPrimary = false;
      pushAudit('DEVICE_REVOKED', actor);
    }
    if (action === 'report-lost' || action === 'report-stolen') {
      const reason = action === 'report-stolen' ? 'STOLEN' : String(payload.reason ?? 'LOST');
      device.status = reason === 'STOLEN' ? 'STOLEN' : 'LOST';
      device.lostReason = reason;
      device.isLocked = true;
      device.isPrimary = false;
      pushAudit(reason === 'STOLEN' ? 'DEVICE_STOLEN' : 'DEVICE_LOST', actor, { reason });
      return {
        ...ok(device),
        crNotification: {
          id: `demo-cr-dev-${Date.now()}`,
          category: 'SYSTEM',
          title: reason === 'STOLEN' ? 'Device reported stolen' : 'Device reported lost',
          body: `${actor} marked ${device.name} as ${reason.toLowerCase()}.`,
          priority: 'high',
          isRead: false,
          createdAt: nowIso(),
          link: '/control-room/device-security',
        },
        notification: {
          id: `demo-cn-lost-${Date.now()}`,
          type: 'DEVICE_SECURITY',
          title: reason === 'STOLEN' ? 'Device marked stolen' : 'Device marked lost',
          body: `${device.name} access has been restricted. Emergency access remains available.`,
          isRead: false,
          createdAt: nowIso(),
          href: '/portal/security/emergency-access',
        },
      };
    }
    if (action === 'make-primary') {
      devices.forEach((d) => (d.isPrimary = false));
      device.isPrimary = true;
      device.status = 'TRUSTED';
      pushAudit('PRIMARY_DEVICE_CHANGED', actor);
    }
    if (action === 'replace-primary') {
      device.status = 'REVOKED';
      device.isPrimary = false;
      device.lostReason = 'REPLACED';
      const neu: DemoDevice = {
        ...devices[0],
        id: `demo-dev-new-${Date.now()}`,
        publicId: String(payload.newPublicId ?? `SEC-DEVICE-NEW${Date.now().toString(36).toUpperCase()}`),
        name: String(payload.name ?? 'New primary device'),
        status: 'TRUSTED',
        isPrimary: true,
        isLocked: false,
        lostReason: null,
        lastActiveAt: nowIso(),
        lastAuthAt: nowIso(),
        registeredAt: nowIso(),
        lastActiveLabel: 'Just now',
      };
      devices.unshift(neu);
      pushAudit('DEVICE_REPLACED', actor);
      return ok({ oldDevice: { id: device.id, status: 'REVOKED' }, newDevice: neu });
    }
    return ok(device);
  }

  if (clean.match(/^\/client\/security\/devices\/[^/]+$/) && m === 'DELETE') {
    const id = clean.split('/').pop() ?? '';
    const device = findDevice(id);
    if (device) {
      device.status = 'REVOKED';
      device.isPrimary = false;
    }
    return ok({ removed: true });
  }

  if (clean === '/client/security/emergency/access' && m === 'POST') {
    const key = session?.user?.id ?? 'anon';
    const fails = failCounts.get(key) ?? 0;
    if (fails >= 5) {
      return ok({ error: 'rate_limited', message: 'Too many failed attempts.' });
    }
    if (String(payload.password ?? '') !== DEMO_PASSWORD) {
      failCounts.set(key, fails + 1);
      pushAudit('EMERGENCY_ACCESS_FAILED', actor, { result: 'FAILURE' });
      return ok({ error: 'invalid', message: 'Verification failed. Emergency access was not opened.' });
    }
    failCounts.set(key, 0);
    emergencySession = {
      id: `demo-es-${Date.now()}`,
      token: `emt_${Date.now().toString(36)}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      status: 'ACTIVE',
    };
    pushAudit('EMERGENCY_SESSION_CREATED', actor);
    return {
      ...ok({
        sessionId: emergencySession.id,
        token: emergencySession.token,
        expiresAt: emergencySession.expiresAt,
        status: 'ACTIVE',
        deviceTrusted: false,
        allowedActions: ['PANIC', 'CALL_CONTROL_ROOM', 'SHARE_LOCATION', 'PROPERTY', 'MEDICAL', 'SECURITY_RESPONSE'],
      }),
      notification: {
        id: `demo-cn-ea-${Date.now()}`,
        type: 'DEVICE_SECURITY',
        title: 'Emergency access activated',
        body: 'A temporary emergency session was created. This device was not added as a trusted device.',
        isRead: false,
        createdAt: nowIso(),
        href: '/portal/security/emergency-access',
      },
      crNotification: {
        id: `demo-cr-ea-${Date.now()}`,
        category: 'SYSTEM',
        title: 'Emergency session created',
        body: `${actor} opened a temporary emergency session.`,
        priority: 'high',
        isRead: false,
        createdAt: nowIso(),
        link: '/control-room/device-security',
      },
    };
  }

  if (clean === '/client/security/emergency/session' && m === 'POST') {
    if (!emergencySession || emergencySession.token !== String(payload.token ?? '') || new Date(emergencySession.expiresAt) < new Date()) {
      return ok({ error: 'expired', message: 'SESSION EXPIRED. Complete reauthentication is required.' });
    }
    return ok(emergencySession);
  }

  if (
    (clean === '/client/security/emergency/panic' || clean === '/client/security/emergency/test') &&
    m === 'POST'
  ) {
    const isTest = clean.endsWith('/test') || payload.source === 'TEST';
    const key = String(payload.idempotencyKey ?? '');
    if (key && panicKeys.has(key)) {
      const existing = panics.find((p) => p.id === panicKeys.get(key));
      if (existing) return ok(existing);
    }
    const open = panics.find(
      (p) =>
        !p.isTest &&
        ['NEW', 'ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'ESCALATED'].includes(
          p.workflowStatus,
        ),
    );
    if (open && !isTest) return { ...ok(open), response: { success: true, data: { ...open, reused: true } } };

    const primary = devices.find((d) => d.isPrimary);
    const panic: DemoPanic = {
      id: `demo-panic-${Date.now()}`,
      source: isTest ? 'TEST' : emergencySession ? 'WEB_EMERGENCY_ACCESS' : String(payload.source ?? 'APP_PANIC'),
      workflowStatus: 'NEW',
      transmissionStatus: payload.pendingTransmission ? 'PENDING_TRANSMISSION' : 'SENT',
      isTest,
      isSilent: Boolean(payload.silent),
      incidentId: isTest ? null : `demo-inc-${Date.now()}`,
      createdAt: nowIso(),
      client: actor,
      deviceName: primary?.name ?? 'Unknown',
      deviceStatus: primary?.isPrimary ? 'PRIMARY / TRUSTED' : primary?.status ?? 'UNKNOWN',
      location:
        typeof payload.lat === 'number'
          ? { lat: Number(payload.lat), lng: Number(payload.lng ?? 31.02), accuracy: Number(payload.accuracy ?? 18) }
          : { lat: -29.8587, lng: 31.0218, accuracy: 18 },
      history: [{ toStatus: 'NEW', note: isTest ? 'TEST_EMERGENCY_EVENT' : 'PANIC_ACTIVATED', at: nowIso(), actor }],
      cancelRequestedAt: null,
    };
    panics.unshift(panic);
    if (key) panicKeys.set(key, panic.id);
    if (isTest) panicTested = true;
    pushAudit(isTest ? 'TEST_EMERGENCY_EVENT' : 'PANIC_ACTIVATED', actor, { source: panic.source });
    return {
      ...ok(panic),
      incident: isTest
        ? undefined
        : {
            id: panic.incidentId!,
            type: 'PANIC',
            status: 'OPEN',
            title: isTest ? 'Test emergency' : `Panic — ${actor}`,
            isSilent: panic.isSilent,
            time: 'Just now',
            priority: 'CRITICAL',
            user: actor,
            location: 'Umhlanga Rocks Dr',
          },
      notification: {
        id: `demo-cn-panic-${Date.now()}`,
        type: isTest ? 'SYSTEM' : 'PANIC_ALERT',
        title: isTest ? 'Test successful' : 'Panic alert',
        body: isTest
          ? 'Your security company successfully received your test alert.'
          : 'Your security company has received your emergency alert.',
        isRead: false,
        createdAt: nowIso(),
        href: '/portal/emergency',
      },
      crNotification: {
        id: `demo-cr-panic-${Date.now()}`,
        category: 'PANIC',
        title: isTest ? 'TEST ALERT — NOT A REAL EMERGENCY' : 'CRITICAL — CLIENT PANIC',
        body: `${actor} · ${primary?.name ?? 'Device'} · ${panic.source}`,
        priority: isTest ? 'medium' : 'critical',
        isRead: false,
        createdAt: nowIso(),
        link: '/control-room/device-security',
      },
    };
  }

  const cancel = clean.match(/^\/client\/security\/emergency\/panic\/([^/]+)\/cancel$/);
  if (cancel && m === 'POST') {
    const panic = panics.find((p) => p.id === cancel[1]);
    if (panic) {
      panic.cancelRequestedAt = nowIso();
      panic.history.push({
        toStatus: panic.workflowStatus,
        note: 'Client attempting to cancel Panic.',
        at: nowIso(),
        actor,
      });
      pushAudit('PANIC_CANCEL_REQUESTED', actor);
    }
    return ok({ ...(panic ?? {}), pendingOperatorAck: true });
  }

  if (clean === '/client/security/lockdown' && m === 'POST') {
    lockdownActive = true;
    pushAudit('SECURITY_LOCKDOWN', actor, { reason: String(payload.reason ?? '') });
    return {
      ...ok({ active: true }),
      crNotification: {
        id: `demo-cr-lock-${Date.now()}`,
        category: 'SYSTEM',
        title: 'Security lockdown',
        body: `${actor} activated account lockdown.`,
        priority: 'high',
        isRead: false,
        createdAt: nowIso(),
        link: '/control-room/device-security',
      },
      notification: {
        id: `demo-cn-lock-${Date.now()}`,
        type: 'DEVICE_SECURITY',
        title: 'Security lockdown active',
        body: 'Active sessions were revoked. Emergency recovery access is still available.',
        isRead: false,
        createdAt: nowIso(),
        href: '/portal/security/lockdown',
      },
    };
  }
  if (clean === '/client/security/lockdown/cancel' && m === 'POST') {
    lockdownActive = false;
    pushAudit('SECURITY_LOCKDOWN_CANCELLED', actor);
    return ok({ active: false });
  }
  if (clean === '/client/security/consent' && m === 'POST') {
    consentAccepted = Boolean(payload.accepted);
    pushAudit('CONSENT_RECORDED', actor);
    return ok({ accepted: consentAccepted, version: '2026-08-18', policyVersion: '1.0' });
  }
  if (clean === '/client/security/settings' && m === 'POST') {
    if (typeof payload.trackingMode === 'string') trackingMode = payload.trackingMode as typeof trackingMode;
    if (typeof payload.duressEnabled === 'boolean') duressEnabled = payload.duressEnabled;
    return ok({ trackingMode, duressEnabled });
  }
  if (clean === '/client/security/setup/complete' && m === 'POST') return ok({ completed: true });

  if (clean === '/control-room/security/devices' && m === 'GET') {
    return ok(
      devices.map((d) => ({
        id: d.id,
        publicId: d.publicId,
        name: d.name,
        deviceType: d.deviceType,
        osName: d.osName,
        osVersion: d.osVersion,
        status: d.status,
        isPrimary: d.isPrimary,
        isLocked: d.isLocked,
        lastActiveAt: d.lastActiveAt,
        lastActiveLabel: d.lastActiveLabel,
        registeredAt: d.registeredAt,
        clientName: d.clientName,
        clientEmail: d.clientEmail,
        clientPhone: d.clientPhone,
      })),
    );
  }
  if (clean === '/control-room/security/events' && m === 'GET') {
    return ok(
      audits.map((a) => {
        const device = a.deviceId ? findDevice(a.deviceId) : undefined;
        return {
          id: a.id,
          type: a.action,
          createdAt: a.createdAt,
          payload: { actor: a.actor, result: a.result, reason: a.reason, source: a.source },
          device: device
            ? { name: device.name, status: device.status, clientName: device.clientName }
            : { name: a.actor },
        };
      }),
    );
  }
  if (clean === '/control-room/security/panic' && m === 'GET') {
    return ok(
      panics.map((p) => ({
        id: p.id,
        priority: p.isTest ? 'TEST' : p.isSilent ? 'SILENT' : 'P1',
        headline: p.isTest
          ? 'TEST ALERT — NOT A REAL EMERGENCY'
          : p.isSilent
            ? 'SILENT DURESS — VERIFY QUIETLY'
            : 'CRITICAL — CLIENT PANIC',
        client: p.client,
        email:
          devices.find((d) => d.name === p.deviceName)?.clientEmail ??
          'client@demo.local',
        phone:
          devices.find((d) => d.name === p.deviceName)?.clientPhone ??
          '+27821234567',
        source: p.source,
        workflowStatus: p.workflowStatus,
        device: { name: p.deviceName, status: p.deviceStatus },
        location: p.location,
        createdAt: p.createdAt,
        incidentId: p.incidentId,
        transmissionStatus: p.transmissionStatus,
        history: p.history,
        cancelRequestedAt: p.cancelRequestedAt,
      })),
    );
  }
  const transition = clean.match(/^\/control-room\/security\/panic\/([^/]+)\/transition$/);
  if (transition && m === 'POST') {
    const panic = panics.find((p) => p.id === transition[1]);
    if (panic) {
      panic.workflowStatus = String(payload.status ?? 'ACKNOWLEDGED');
      panic.history.push({
        toStatus: panic.workflowStatus,
        note: String(payload.note ?? ''),
        at: nowIso(),
        actor,
      });
      pushAudit(`PANIC_${panic.workflowStatus}`, actor);
    }
    return ok(panic ?? {});
  }
  if (clean === '/control-room/security/analytics' && m === 'GET') {
    const lost = devices.filter((d) => d.status === 'LOST' || d.status === 'STOLEN').length;
    return ok({
      events90d: audits.length + panics.length,
      tests: panics.filter((p) => p.isTest).length + audits.filter((a) => a.source === 'APP_PANIC_TEST').length,
      falseAlarms: 1,
      avgAckMs: 42000,
      avgResolveMs: 18 * 60_000,
      lostDeviceReports: lost,
      registeredDevices: devices.length,
      activeClients: new Set(devices.map((d) => d.clientEmail)).size,
    });
  }

  return ok({ ok: true });
}

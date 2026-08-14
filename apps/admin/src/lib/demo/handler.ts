import type { AuthPortal, AuthSession } from '../auth';
import { getDemoCategories, getDemoProducts } from './catalog';
import { DEMO_TENANT, demoRegisterSession } from './users';

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
      { id: 'power', label: 'Power / battery check', done: true },
      { id: 'signal', label: 'Signal / comms test', done: false },
      { id: 'zones', label: 'Zone walk-test', done: false },
      { id: 'client', label: 'Client walkthrough', done: false },
    ],
    clientName: 'Nomsa Client',
    equipmentNotes: '4x turret cams + NVR',
  },
  {
    id: 'demo-job-2',
    title: 'Alarm panel upgrade — Westville',
    status: 'EN_ROUTE',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    address: '8 Dawncliffe Rd, Westville',
    jobType: 'ALARM',
  },
  {
    id: 'demo-job-3',
    title: 'Access control — Florida Rd retail',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    address: '215 Florida Rd, Morningside',
    jobType: 'ACCESS',
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
    status: 'OPEN',
    title: 'Alarm trip — Glenwood',
    isSilent: false,
    time: '18 min ago',
    priority: 'HIGH',
    user: 'James Demo',
    location: 'Glenwood, Durban',
  },
  {
    id: 'demo-inc-3',
    type: 'THEFT',
    status: 'IN_PROGRESS',
    title: 'Vehicle recovery track',
    isSilent: false,
    time: '45 min ago',
    priority: 'HIGH',
    user: 'Nomsa Client',
    location: 'N2 northbound',
  },
];

const demoProperties: {
  id: string;
  name: string;
  alarmStatus: string;
  alarmLinked: boolean;
}[] = [
  {
    id: 'demo-prop-1',
    name: 'Home — Umhlanga',
    alarmStatus: 'ARMED',
    alarmLinked: true,
  },
];

type DemoClientChatMessage = {
  id: string;
  clientUserId: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
};

const demoClientProfiles: Record<
  string,
  { firstName: string; lastName: string; phone: string; email: string }
> = {
  'demo-user-client-demo-local': {
    firstName: 'Nomsa',
    lastName: 'Client',
    phone: '+27821234567',
    email: 'client@demo.local',
  },
  'demo-user-james-demo-local': {
    firstName: 'James',
    lastName: 'Demo',
    phone: '+27829876543',
    email: 'james@demo.local',
  },
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

const demoSurveillanceSites = [
  {
    id: 'demo-prop-1',
    name: 'Home — Umhlanga',
    address: '12 Lagoon Dr, Umhlanga',
    propertyType: 'RESIDENTIAL',
    alarmStatus: 'ARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: true,
      unlockReason: 'OWNER',
      unlockLabel: 'Owner view',
      interiorCameraCount: 1,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'Paradox',
      panelModel: 'MG5050+',
      communicatorType: 'IP150',
      monitoringAccount: 'ZA-88421',
      partitionLabel: 'Partition 1',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 4,
    onlineCameras: 4,
    sensorCount: 8,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      {
        id: 'demo-cam-1',
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
        id: 'demo-cam-2',
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
      {
        id: 'demo-cam-3',
        name: 'Pool & patio',
        locationLabel: 'Back garden',
        channel: 3,
        status: 'RECORDING',
        snapshotUrl: null,
        streamUrl: 'demo',
        isLiveCapable: true,
        isInterior: false,
        placement: 'EXTERIOR',
      },
      {
        id: 'demo-cam-4',
        name: 'Lounge',
        locationLabel: 'Interior',
        channel: 4,
        status: 'ONLINE',
        snapshotUrl: null,
        streamUrl: 'demo',
        isLiveCapable: true,
        isInterior: true,
        placement: 'INTERIOR',
      },
    ],
    sensors: [],
    gateCode: null as string | null,
    accessNotes: null as string | null,
    keyHolder: null as string | null,
  },
];

const demoVehicleCameraFeeds = [
  {
    vehicleId: 'demo-veh-1',
    registration: 'ND 123-456',
    label: 'Toyota Fortuner',
    cameras: [
      {
        id: 'demo-vcam-1',
        name: 'Dash forward',
        locationLabel: 'Windscreen',
        channel: 1,
        status: 'ONLINE',
        snapshotUrl: null,
        streamUrl: 'demo',
        isLiveCapable: true,
        isInterior: false,
        placement: 'EXTERIOR',
      },
      {
        id: 'demo-vcam-2',
        name: 'Cabin',
        locationLabel: 'Interior',
        channel: 2,
        status: 'ONLINE',
        snapshotUrl: null,
        streamUrl: 'demo',
        isLiveCapable: true,
        isInterior: true,
        placement: 'INTERIOR',
      },
      {
        id: 'demo-vcam-3',
        name: 'Rear view',
        locationLabel: 'Tailgate cam',
        channel: 3,
        status: 'RECORDING',
        snapshotUrl: null,
        streamUrl: 'demo',
        isLiveCapable: true,
        isInterior: false,
        placement: 'EXTERIOR',
      },
    ],
  },
];

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

const demoErrorReports: DemoErrorReport[] = [];

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
    downloadUrl: '/portal/subscription/receipt/PF-DEMO-0988',
  },
  {
    id: 'doc-rcp-1',
    title: 'Payment receipt',
    type: 'RECEIPT' as const,
    reference: 'PF-DEMO-1001',
    amountFormatted: 'R499.00',
    issuedAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    downloadUrl: '/portal/subscription/receipt/PF-DEMO-1001',
  },
  {
    id: 'doc-stm-1',
    title: 'Monthly statement',
    type: 'STATEMENT' as const,
    reference: 'STM-2026-07',
    amountFormatted: 'R499.00',
    periodLabel: 'Jul 2026',
    issuedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    downloadUrl: '/portal/subscription/receipt/PF-DEMO-0988',
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
    body: 'Pitch demo mode — notifications mark-read works offline.',
    isRead: false,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    href: '/portal/updates',
  },
];

function demoUnreadCount() {
  return demoClientNotifications.filter((n) => !n.isRead).length;
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
    status: 'ON_DUTY',
    crew: [{ officerId: 'demo-off-1', name: 'Sipho Ndlovu', role: 'DRIVER', status: 'EN_ROUTE', zone: 'Zone A' }],
    crewCount: 1,
  },
  {
    id: 'demo-fleet-2',
    registration: 'ND 4DS-ALS',
    callSign: 'Medic 1',
    make: 'Mercedes',
    model: 'Sprinter',
    color: 'White',
    vehicleType: 'MEDICAL',
    status: 'AVAILABLE',
    crew: [],
    crewCount: 0,
  },
  {
    id: 'demo-fleet-3',
    registration: 'ND 4DS-204',
    callSign: 'Unit 204',
    make: 'Ford',
    model: 'Ranger',
    color: 'Silver',
    vehicleType: 'PATROL',
    status: 'MAINTENANCE',
    crew: [],
    crewCount: 0,
  },
];

function ok<T>(data: T) {
  return { success: true as const, data };
}

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

export async function handleDemoRequest<T>({
  path,
  method,
  body,
  session,
  portal,
}: DemoRequest): Promise<T> {
  // Simulate slight network latency for realism
  await new Promise((r) => setTimeout(r, 120));

  const { clean, params } = parsePath(path);
  const m = method.toUpperCase();
  const payload = parseBody(body);
  const user = session?.user;

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
    return ok({ orderNumber }) as T;
  }

  // ——— Client ———
  if (clean === '/client/profile' && m === 'GET') {
    return ok({
      id: user?.id ?? 'demo-user-client',
      email: user?.email ?? 'client@demo.local',
      phone: user?.phone ?? '+27821234567',
      firstName: user?.firstName ?? 'Nomsa',
      lastName: user?.lastName ?? 'Client',
      trackingEnabled: true,
      tenant: {
        name: user?.tenant?.name ?? DEMO_TENANT.name,
        slug: user?.tenant?.slug ?? DEMO_TENANT.slug,
      },
    }) as T;
  }
  if (clean === '/client/overview' && m === 'GET') {
    return ok({
      user: {
        firstName: user?.firstName ?? 'Nomsa',
        trackingEnabled: true,
        address: '12 Lagoon Dr, Umhlanga',
      },
      stats: {
        contactCount: 3,
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
          theftRecovery: true,
        },
      ],
      properties: [...demoProperties],
      family: [
        { id: 'demo-fam-1', name: 'Thandi Client', trackingEnabled: true },
        { id: 'demo-fam-2', name: 'Lerato Client', trackingEnabled: false },
      ],
      contacts: [
        {
          id: 'demo-c-1',
          name: 'Thandi Client',
          phone: '+27820001111',
          relationship: 'Spouse',
          priority: 1,
        },
        {
          id: 'demo-c-2',
          name: '4DS Dispatch',
          phone: '+27110000000',
          relationship: 'Dispatch',
          priority: 0,
          isDispatch: true,
        },
      ],
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
      safeZoneCount: 2,
    }) as T;
  }
  if (clean === '/client/contacts' && m === 'GET') {
    return {
      success: true,
      data: [
        {
          id: 'demo-c-1',
          name: 'Thandi Client',
          phone: '+27820001111',
          relationship: 'Spouse',
          priority: 1,
        },
        {
          id: 'demo-c-2',
          name: '4DS Dispatch',
          phone: '+27110000000',
          relationship: 'Dispatch',
          priority: 0,
          isDispatch: true,
        },
      ],
      meta: { dispatchLine: { name: '4DS Dispatch', phone: '+27110000000' } },
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
          description: 'Priority response and full module access.',
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
        : `Add-on: ${String(payload.addonCode ?? 'module')}`;
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
      panel: {
        panelVendor: 'Pending',
        panelModel: '—',
        communicatorType: '—',
        monitoringAccount: '—',
        partitionLabel: '—',
        protocol: 'Contact ID',
        region: 'ZA',
      },
    });
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
      title: `${type} alert (demo)`,
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
      const prop = demoProperties.find((p) => p.id === alarmMatch[1]);
      if (prop && typeof payload.status === 'string') {
        prop.alarmStatus = payload.status;
      }
      return ok(prop ?? { ok: true }) as T;
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
    return ok(demoSurveillanceSites) as T;
  }
  if (clean === '/client/surveillance/dashboard-feeds' && m === 'GET') {
    const homeSite = demoSurveillanceSites.find((s) => s.cameraCount > 0);
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
      vehicles: demoVehicleCameraFeeds.map((v) => ({
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
    const report: DemoErrorReport = {
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
    };
    demoErrorReports.unshift(report);
    return ok({ id: report.id, status: report.status, message: report.message, createdAt: report.createdAt }) as T;
  }
  {
    const vehicleProfileMatch = clean.match(/^\/client\/vehicles\/([^/]+)\/profile$/);
    if (vehicleProfileMatch && m === 'GET') {
      const vehicleId = vehicleProfileMatch[1];
      return ok({
        vehicle: {
          id: vehicleId,
          registration: 'ND 123-456',
          make: 'Toyota',
          model: 'Fortuner',
          variant: 'GD-6',
          year: 2022,
          color: 'White',
          vin: 'JTMDN123456789012',
          trackerLinked: true,
          phoneTrackingEnabled: false,
          theftRecovery: false,
          immobiliserOn: false,
          insuranceInfo: 'Santam comprehensive',
          updatedAt: new Date().toISOString(),
        },
        tracking: {
          active: true,
          mode: 'TRACKER',
          hasPosition: true,
          lat: -29.7281,
          lng: 31.0873,
          lastUpdate: new Date().toISOString(),
          trail: [
            { lat: -29.7281, lng: 31.0873, at: new Date().toISOString() },
            { lat: -29.7295, lng: 31.085, at: new Date(Date.now() - 120000).toISOString() },
          ],
        },
        responseTeam: { synced: true },
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
  if (clean.startsWith('/client/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Developer desk ———
  if (clean === '/developer/error-reports' && m === 'GET') {
    const openCount = demoErrorReports.filter((r) => r.status === 'OPEN').length;
    return ok({
      openCount,
      reports: demoErrorReports.map((r) => ({ ...r })),
    }) as T;
  }
  if (clean === '/developer/error-reports' && m === 'POST') {
    const report: DemoErrorReport = {
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
    };
    demoErrorReports.unshift(report);
    return ok({
      id: report.id,
      status: report.status,
      message: report.message,
      createdAt: report.createdAt,
    }) as T;
  }
  if (clean === '/developer/desk' && m === 'GET') {
    const openCount = demoErrorReports.filter((r) => r.status === 'OPEN').length;
    return ok({
      tenantName: DEMO_TENANT.name,
      canViewRevenue: false,
      revenueNote: 'Revenue figures are hidden until the owner unlocks developer access.',
      openErrorReports: openCount,
      recentReports: demoErrorReports.slice(0, 8).map((r) => ({
        id: r.id,
        message: r.message,
        path: r.path,
        status: r.status,
        createdAt: r.createdAt,
        reporter: `${r.reporter.name} · ${r.reporter.role}`,
      })),
      developers: [
        {
          id: user?.id ?? 'demo-user-developer-4ds-local',
          firstName: user?.firstName ?? 'Toxic',
          lastName: user?.lastName ?? 'Dev',
          email: user?.email ?? 'developer@4ds.local',
          phone: user?.phone ?? '+27 82 100 0099',
        },
      ],
      platformLinks: [
        { label: 'Control room', href: '/control-room' },
        { label: 'Live map', href: '/control-room/map' },
        { label: 'Customers', href: '/control-room/customers' },
        { label: 'Fleet', href: '/control-room/fleet' },
        { label: 'Billing verifications', href: '/control-room/customers' },
        { label: 'Client portal', href: '/portal' },
        { label: 'Settings', href: '/control-room/settings' },
      ],
    }) as T;
  }
  {
    const devReportMatch = clean.match(/^\/developer\/error-reports\/([^/]+)$/);
    if (devReportMatch && m === 'PATCH') {
      const id = devReportMatch[1];
      const idx = demoErrorReports.findIndex((r) => r.id === id);
      if (idx < 0) return { success: false as const, message: 'Report not found' } as T;
      const next = String(payload.status ?? '').toUpperCase();
      if (next === 'ACKNOWLEDGED' || next === 'RESOLVED' || next === 'OPEN') {
        demoErrorReports[idx] = {
          ...demoErrorReports[idx],
          status: next as DemoErrorReport['status'],
        };
      }
      return ok({
        id: demoErrorReports[idx].id,
        status: demoErrorReports[idx].status,
        resolvedAt:
          demoErrorReports[idx].status === 'RESOLVED'
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
        availableOfficers: 2,
        totalOfficers: 4,
        avgResponseFormatted: '4m 40s',
        avgResponseSec: 280,
        vehiclesAvailable: 3,
        ambulancesAvailable: 2,
      },
      incidents: active.map((i) => ({
        id: i.id,
        type: i.type,
        user: i.user,
        location: i.location,
        time: i.time,
        priority: i.priority,
        status: i.status,
        slaBreached: i.type === 'INTRUSION' || i.time.includes('18'),
      })),
      officers: [
        { id: 'demo-off-1', name: 'Sipho Ndlovu', status: 'EN_ROUTE', zone: 'Zone A' },
        { id: 'demo-off-2', name: 'Raj Patel', status: 'BUSY', zone: 'Zone B' },
        { id: 'demo-off-3', name: 'John Smith', status: 'AVAILABLE', zone: 'Zone C' },
        { id: 'demo-off-4', name: 'Zanele Khumalo', status: 'AVAILABLE', zone: 'Zone A' },
      ],
      system: {
        api: 'Demo mode',
        realtime: 'Simulated',
        maps: 'Online',
        store: 'Online',
      },
    }) as T;
  }
  if (clean === '/control-room/map' && m === 'GET') {
    return ok({
      center: DURBAN,
      clients: [
        {
          id: 'demo-user-client',
          name: 'Nomsa Client',
          lat: -29.728,
          lng: 31.085,
          clientType: 'VIP',
          membershipNumber: 'NX-MEM-1001',
          tierCode: 'FAMILY',
          planName: 'Family Protect',
          subscriptionStatus: 'ACTIVE',
          addons: ['HOME_SECURITY'],
          phone: '+27821234567',
          emergencyContacts: [{ name: 'Thandi', phone: '+27820001111' }],
          status: 'ONLINE',
          batteryPct: 86,
          updatedAt: new Date().toISOString(),
        },
      ],
      officers: [
        {
          id: 'demo-off-1',
          name: 'Sipho Ndlovu',
          lat: -29.835,
          lng: 31.002,
          officerType: 'ARMED_RESPONSE',
          unitNumber: 'AR-101',
          status: 'EN_ROUTE',
          phone: '+27831110001',
          zone: 'Zone A',
        },
        {
          id: 'demo-off-3',
          name: 'John Smith',
          lat: -29.83,
          lng: 30.93,
                        officerType: 'ARMED_RESPONSE',
          unitNumber: 'AR-103',
          status: 'AVAILABLE',
          zone: 'Zone C',
        },
      ],
      vehicles: [
        {
          id: 'demo-veh-1',
          lat: -29.81,
          lng: 31.01,
          vehicleType: 'CLIENT',
          registration: 'ND 123-456',
          make: 'Toyota',
          model: 'Fortuner',
          owner: 'Nomsa Client',
          trackerStatus: 'ONLINE',
          speed: 42,
          updatedAt: new Date().toISOString(),
        },
      ],
      fleet: [
        {
          id: 'demo-fleet-1',
          lat: -29.84,
          lng: 31.0,
          vehicleType: 'ARMED_RESPONSE',
          registration: 'ND 4DS-101',
          callSign: 'Unit 101',
          make: 'Toyota',
          model: 'Hilux',
          status: 'ON_DUTY',
          trackerStatus: 'ONLINE',
          speed: 55,
          crew: [{ officerId: 'demo-off-1', name: 'Sipho Ndlovu', role: 'DRIVER' }],
          crewCount: 1,
          isCompanyFleet: true as const,
          updatedAt: new Date().toISOString(),
        },
      ],
      properties: [
        {
          id: 'demo-prop-1',
          lat: -29.728,
          lng: 31.085,
          propertyType: 'ALARM_ACTIVE',
          name: 'Home — Umhlanga',
          address: '12 Lagoon Dr, Umhlanga',
          alarmStatus: 'ARMED',
          owner: 'Nomsa Client',
        },
      ],
      incidents: demoIncidents.slice(0, 2).map((i, idx) => ({
        id: i.id,
        category: i.type === 'PANIC' ? 'PANIC' : i.type === 'THEFT' ? 'THEFT_RECOVERY' : 'INTRUSION',
        type: i.type,
        priority: i.priority,
        status: i.status,
        name: i.title,
        clientUserId: 'demo-user-client',
        clientPhone: idx === 0 ? '+27821234567' : '+27829876543',
        lat: DURBAN.lat + idx * 0.01,
        lng: DURBAN.lng + idx * 0.008,
        address: i.location,
        isSilent: i.isSilent,
        createdAt: new Date().toISOString(),
        assignedOfficer: idx === 0 ? 'Sipho Ndlovu' : null,
        nearestUnitKm: 0.8 + idx,
        nearestUnitEta: `${3 + idx * 2} min`,
        trail: [],
      })),
    }) as T;
  }
  // ——— Control room notifications shape ———
  if (clean === '/control-room/notifications' && m === 'GET') {
    return ok({
      notifications: [
        {
          id: 'demo-n-1',
          category: 'PANIC',
          title: 'Panic alert',
          body: 'Nomsa Client — Umhlanga',
          priority: 'critical',
          isRead: false,
          createdAt: new Date().toISOString(),
          link: '/control-room/incidents',
        },
      ],
      unreadCount: 1,
    }) as T;
  }
  if (clean === '/calls/directory' && m === 'GET') {
    return ok({
      dispatchLine: { name: '4DS Dispatch', phone: '+27110000000' },
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

      const officers = [
        {
          id: 'demo-off-1',
          name: 'Sipho Ndlovu',
          status: 'EN_ROUTE',
          zone: 'Zone A',
          available: false,
          distanceKm: 1.2,
          eta: '4 min',
          unitCallSign: 'Unit 101',
          vehicleType: 'ARMED_RESPONSE',
          registration: 'ND 4DS-101',
        },
        {
          id: 'demo-off-2',
          name: 'Raj Patel',
          status: 'BUSY',
          zone: 'Zone B',
          available: false,
          distanceKm: 3.4,
          eta: '9 min',
          unitCallSign: 'Unit 204',
          vehicleType: 'PATROL',
          registration: 'ND 4DS-204',
        },
        {
          id: 'demo-off-3',
          name: 'John Smith',
          status: 'AVAILABLE',
          zone: 'Zone C',
          available: true,
          distanceKm: 2.1,
          eta: '6 min',
          unitCallSign: 'AR-103',
          vehicleType: 'ARMED_RESPONSE',
          registration: null as string | null,
        },
        {
          id: 'demo-off-4',
          name: 'Zanele Khumalo',
          status: 'AVAILABLE',
          zone: 'Zone A',
          available: true,
          distanceKm: 0.8,
          eta: '3 min',
          unitCallSign: 'Unit 110',
          vehicleType: 'PATROL',
          registration: 'ND 4DS-110',
        },
      ].sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
      );

      const assigned =
        incident.id === 'demo-inc-1' ||
        ['DISPATCHED', 'IN_PROGRESS'].includes(incident.status.toUpperCase())
          ? 'Sipho Ndlovu'
          : null;
      const canDispatch =
        !assigned && ['OPEN', 'ACTIVE', 'PENDING'].includes(incident.status.toUpperCase());

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
      const officerNames: Record<string, string> = {
        'demo-off-1': 'Sipho Ndlovu',
        'demo-off-2': 'Raj Patel',
        'demo-off-3': 'John Smith',
        'demo-off-4': 'Zanele Khumalo',
      };
      const incident = demoIncidents.find((i) => i.id === incidentId);
      if (incident) incident.status = 'DISPATCHED';
      return ok({
        ok: true,
        incidentId,
        officerId,
        officerName: officerNames[officerId] ?? 'Assigned officer',
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
  if (clean === '/control-room/fleet' && m === 'GET') {
    return ok(demoFleet) as T;
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
        { name: 'Zanele Khumalo', avgResponseSec: 190, status: 'AVAILABLE', rank: 'Lead', skills: ['ARMED', 'DRIVER'] },
        { name: 'John Smith', avgResponseSec: 310, status: 'AVAILABLE', rank: 'Officer', skills: ['PATROL'] },
      ],
      aiSuggestions: [
        {
          id: 'ai-1',
          title: 'Recommend Unit 110',
          detail: 'Closest available · 0.8 km · rating 4.8 — suggestion only',
        },
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
        onDuty: 4,
        onScene: 1,
        available: 2,
        needingAttention: 1,
        roster: [
          { id: 'demo-off-1', name: 'Sipho Ndlovu', status: 'EN_ROUTE', zone: 'Zone A' },
          { id: 'demo-off-3', name: 'John Smith', status: 'AVAILABLE', zone: 'Zone C' },
          { id: 'demo-off-4', name: 'Zanele Khumalo', status: 'AVAILABLE', zone: 'Zone A' },
          { id: 'demo-off-2', name: 'Raj Patel', status: 'BUSY', zone: 'Zone B' },
        ],
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

  if (clean.startsWith('/control-room/') && (m === 'GET' || m === 'POST' || m === 'PATCH' || m === 'DELETE')) {
    if (clean === '/control-room/customers' && m === 'GET') {
      return ok([
        {
          id: 'demo-user-client-demo-local',
          firstName: 'Nomsa',
          lastName: 'Client',
          email: 'client@demo.local',
          phone: '+27821234567',
        },
        {
          id: 'demo-user-james-demo-local',
          firstName: 'James',
          lastName: 'Demo',
          email: 'james@demo.local',
          phone: '+27829876543',
        },
      ]) as T;
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
        return ok([
          { id: 'demo-off-1', name: 'Sipho Ndlovu', status: 'EN_ROUTE', zone: 'Zone A', email: 'ndlovu@4ds.local' },
          { id: 'demo-off-2', name: 'Raj Patel', status: 'BUSY', zone: 'Zone B', email: 'patel@4ds.local' },
          { id: 'demo-off-3', name: 'John Smith', status: 'AVAILABLE', zone: 'Zone C', email: 'smith@4ds.local' },
          { id: 'demo-off-4', name: 'Zanele Khumalo', status: 'AVAILABLE', zone: 'Zone A', email: 'khumalo@4ds.local' },
        ]) as T;
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
      ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status),
    ).length;
    const completed = techJobs.filter((j) => j.status === 'COMPLETED').length;
    return ok({
      firstName: user?.firstName ?? 'Camera',
      lastName: user?.lastName ?? 'Tech',
      jobTitle: user?.jobTitle ?? 'CCTV Installer',
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
  if (clean.startsWith('/store/tech/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Auth helpers used via publicApi rarely ———
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

  // Default stub so deep pages don't hard-crash
  if (m === 'GET') return ok([]) as T;
  return ok({ ok: true, demo: true }) as T;
}

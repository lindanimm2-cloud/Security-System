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
};

const techJobs: TechJob[] = [
  {
    id: 'demo-job-1',
    title: 'CCTV install — Berea residence',
    status: 'IN_PROGRESS',
    scheduledAt: new Date().toISOString(),
    address: '42 Musgrave Rd, Berea, Durban',
    jobType: 'CCTV',
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

function ok<T>(data: T) {
  return { success: true as const, data };
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
        unreadNotifications: 2,
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
      properties: [
        {
          id: 'demo-prop-1',
          name: 'Home — Umhlanga',
          alarmStatus: 'ARMED',
          alarmLinked: true,
        },
      ],
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
    return ok({ created: true }) as T;
  }
  if (clean.startsWith('/client/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Control room ———
  if (clean === '/control-room/dashboard' && m === 'GET') {
    return ok({
      stats: {
        activeUsers: 128,
        activeIncidents: demoIncidents.length,
        criticalIncidents: demoIncidents.filter((i) =>
          ['CRITICAL', 'HIGH'].includes(i.priority),
        ).length,
        availableOfficers: 2,
        totalOfficers: 4,
        avgResponseFormatted: '4m 40s',
        avgResponseSec: 280,
      },
      incidents: demoIncidents.map((i) => ({
        id: i.id,
        type: i.type,
        user: i.user,
        location: i.location,
        time: i.time,
        priority: i.priority,
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
        lat: DURBAN.lat + idx * 0.01,
        lng: DURBAN.lng + idx * 0.008,
        address: i.location,
        isSilent: i.isSilent,
        createdAt: new Date().toISOString(),
        assignedOfficer: idx === 0 ? 'Sipho Ndlovu' : null,
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
  if (clean === '/client/notifications' && m === 'GET') {
    return ok({
      notifications: [
        {
          id: 'demo-cn-1',
          type: 'SYSTEM',
          title: 'Welcome to Nexus demo',
          body: 'Pitch mode — no live API connected.',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    }) as T;
  }
  if (clean === '/calls/active' && m === 'GET') {
    return ok(null) as T;
  }
  if (clean.startsWith('/control-room/') && (m === 'GET' || m === 'POST' || m === 'PATCH' || m === 'DELETE')) {
    if (m === 'GET') {
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
  if (clean === '/officer/dashboard' && m === 'GET') {
    const active = {
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
    };
    return ok({
      officer: {
        firstName: user?.firstName ?? 'Sipho',
        lastName: user?.lastName ?? 'Ndlovu',
        status: 'EN_ROUTE',
        zone: 'Zone A',
        avgResponseSec: 280,
      },
      stats: {
        activeAssignments: 1,
        completedToday: 3,
        avgResponseFormatted: '4m 40s',
      },
      activeDispatch: active,
      queue: [
        active,
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
      ],
    }) as T;
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
  {
    const jobMatch = clean.match(/^\/store\/tech\/jobs\/([^/]+)\/status$/);
    if (jobMatch && m === 'PATCH') {
      const job = techJobs.find((j) => j.id === jobMatch[1]);
      if (job && typeof payload.status === 'string') {
        job.status = payload.status;
      }
      return ok(job ?? { ok: true }) as T;
    }
  }
  if (clean.startsWith('/store/tech/') && (m === 'GET' || m === 'POST' || m === 'PATCH')) {
    if (m === 'GET') return ok([]) as T;
    return ok({ ok: true }) as T;
  }

  // ——— Auth helpers used via publicApi rarely ———
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

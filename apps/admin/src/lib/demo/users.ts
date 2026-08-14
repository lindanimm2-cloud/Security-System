const TENANT = {
  id: 'demo-tenant',
  name: '4DS Solutions',
  slug: 'demo',
  primaryColor: '#c9302c',
};

export const DEMO_PASSWORD = 'Demo123!';

type DemoPortal = 'client' | 'admin' | 'officer' | 'technician';

type DemoUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  jobTitle?: string | null;
  phone?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string | null;
  };
};

type DemoSession = {
  user: DemoUser;
  accessToken: string;
  authSource?: 'site' | 'portal';
};

type DemoAccount = {
  email: string;
  portal: DemoPortal;
  role: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
};

const ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@demo.local',
    portal: 'admin',
    role: 'ADMIN',
    firstName: 'Demo',
    lastName: 'Admin',
    jobTitle: 'Control Room Admin',
  },
  {
    email: 'owner@4ds.local',
    portal: 'admin',
    role: 'OWNER',
    firstName: 'Thabo',
    lastName: 'Owner',
  },
  {
    email: 'dispatch@demo.local',
    portal: 'admin',
    role: 'DISPATCHER',
    firstName: 'Lerato',
    lastName: 'Dispatch',
  },
  {
    email: 'manager@4ds.local',
    portal: 'admin',
    role: 'MANAGER',
    firstName: 'Ayesha',
    lastName: 'Manager',
  },
  {
    email: 'supervisor@4ds.local',
    portal: 'admin',
    role: 'SUPERVISOR',
    firstName: 'Mandla',
    lastName: 'Supervisor',
    jobTitle: 'Field Supervisor',
  },
  {
    email: 'medical@4ds.local',
    portal: 'admin',
    role: 'MEDICAL_DISPATCHER',
    firstName: 'Priya',
    lastName: 'Medics',
    jobTitle: 'Medical Dispatcher',
  },
  {
    email: 'crew@4ds.local',
    portal: 'admin',
    role: 'MEDICAL_CREW',
    firstName: 'Andile',
    lastName: 'Paramedic',
  },
  {
    email: 'developer@4ds.local',
    portal: 'admin',
    role: 'DEVELOPER',
    firstName: 'Toxic',
    lastName: 'Dev',
    jobTitle: 'Platform Developer',
    phone: '+27 82 100 0099',
  },
  {
    email: 'sales@4ds.local',
    portal: 'admin',
    role: 'SALES',
    firstName: 'Sihle',
    lastName: 'Sales',
  },
  {
    email: 'admin.tenant@4ds.local',
    portal: 'admin',
    role: 'TENANT_ADMIN',
    firstName: 'Naledi',
    lastName: 'Admin',
  },
  {
    email: 'client@demo.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Nomsa',
    lastName: 'Client',
    phone: '+27821234567',
  },
  {
    email: 'james@demo.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'James',
    lastName: 'Demo',
    phone: '+27829876543',
  },
  {
    email: 'ndlovu@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Sipho',
    lastName: 'Ndlovu',
    phone: '+27831110001',
  },
  {
    email: 'patel@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Raj',
    lastName: 'Patel',
  },
  {
    email: 'tech.cameras@4ds.local',
    portal: 'technician',
    role: 'TECHNICIAN',
    firstName: 'Camera',
    lastName: 'Tech',
    jobTitle: 'CCTV Installer',
  },
  {
    email: 'tech.alarms@4ds.local',
    portal: 'technician',
    role: 'TECHNICIAN',
    firstName: 'Alarm',
    lastName: 'Tech',
    jobTitle: 'Alarm Technician',
  },
];

function toUser(account: DemoAccount): DemoUser {
  return {
    id: `demo-user-${account.email.replace(/[^a-z0-9]/gi, '-')}`,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    role: account.role,
    tenantId: TENANT.id,
    jobTitle: account.jobTitle ?? null,
    phone: account.phone ?? null,
    tenant: TENANT,
  };
}

export function demoLogin(
  portal: DemoPortal,
  email: string,
  password: string,
  tenantSlug: string,
): DemoSession {
  if (tenantSlug.trim().toLowerCase() !== 'demo') {
    throw new Error('Unknown organisation. Use tenant slug: demo');
  }
  if (password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password');
  }
  const normalized = email.trim().toLowerCase();
  const account = ACCOUNTS.find(
    (a) => a.email === normalized && a.portal === portal,
  );
  if (!account) {
    const fallback = ACCOUNTS.find((a) => a.portal === portal);
    if (!fallback || !normalized.includes('@')) {
      throw new Error('Invalid email or password');
    }
    const user = toUser({
      ...fallback,
      email: normalized,
      firstName: normalized.split('@')[0] || fallback.firstName,
    });
    return {
      user,
      accessToken: `demo-token-${portal}-${user.id}`,
    };
  }
  return {
    user: toUser(account),
    accessToken: `demo-token-${portal}-${account.email}`,
  };
}

export function demoRegisterSession(payload: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): DemoSession {
  const user: DemoUser = {
    id: `demo-user-${payload.email.replace(/[^a-z0-9]/gi, '-')}`,
    email: payload.email.trim().toLowerCase(),
    firstName: payload.firstName || 'Demo',
    lastName: payload.lastName || 'User',
    role: 'CLIENT',
    tenantId: TENANT.id,
    phone: payload.phone ?? null,
    tenant: TENANT,
  };
  return {
    user,
    accessToken: `demo-token-client-${user.id}`,
    authSource: 'site',
  };
}

export function getDemoInvite(token: string) {
  if (token.toUpperCase() !== 'NX-DEMO01' && token !== 'demo') {
    throw new Error('Invite not found');
  }
  return {
    email: 'invitee@demo.local',
    firstName: 'Invite',
    lastName: 'Client',
    tenant: { name: TENANT.name, slug: TENANT.slug },
    expiresAt: null,
    status: 'PENDING',
  };
}

export { TENANT as DEMO_TENANT, ACCOUNTS as DEMO_ACCOUNTS };

const TENANT = {
  id: 'demo-tenant',
  name: '4DS Solutions',
  slug: 'demo',
  primaryColor: '#c9302c',
};

export const DEMO_PASSWORD = 'Demo123!';
const REGISTERED_CLIENTS_KEY = '4ds_demo_registered_clients';
const PASSWORD_OVERRIDES_KEY = '4ds_demo_password_overrides';

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
  password?: string;
};

type StoredDemoClientAccount = DemoAccount & {
  portal: 'client';
  password: string;
};

const ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@demo.local',
    portal: 'admin',
    role: 'OWNER',
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
    email: 'priya@warehouse.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Priya',
    lastName: 'Naidoo',
    phone: '+27831112201',
  },
  {
    email: 'thabo@gateway.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Thabo',
    lastName: 'Retail',
    phone: '+27832223302',
  },
  {
    email: 'lerato@hillcrest.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Lerato',
    lastName: 'Mokoena',
    phone: '+27834445503',
  },
  {
    email: 'asha@ridgeclinic.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Asha',
    lastName: 'Patel',
    phone: '+27835556604',
  },
  {
    email: 'sarah@morningside.local',
    portal: 'client',
    role: 'CLIENT',
    firstName: 'Sarah',
    lastName: 'Guest',
    phone: '+27836667705',
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
    phone: '+27831110002',
  },
  {
    email: 'smith@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+27831110003',
  },
  {
    email: 'khumalo@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Zanele',
    lastName: 'Khumalo',
    phone: '+27831110004',
  },
  {
    email: 'dlamini@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Lebo',
    lastName: 'Dlamini',
    phone: '+27831110005',
  },
  {
    email: 'sithole@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Naledi',
    lastName: 'Sithole',
    phone: '+27831110006',
  },
  {
    email: 'vanderberg@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Ruan',
    lastName: 'van der Berg',
    phone: '+27831110007',
  },
  {
    email: 'nkosi@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Bongani',
    lastName: 'Nkosi',
    phone: '+27831110008',
  },
  {
    email: 'essop@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Fatima',
    lastName: 'Essop',
    phone: '+27831110009',
  },
  {
    email: 'motsepe@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Kgosi',
    lastName: 'Motsepe',
    phone: '+27831110010',
  },
  {
    email: 'adams@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Yusuf',
    lastName: 'Adams',
    phone: '+27831110011',
  },
  {
    email: 'fourie@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Chantelle',
    lastName: 'Fourie',
    phone: '+27831110012',
  },
  {
    email: 'cele@4ds.local',
    portal: 'officer',
    role: 'OFFICER',
    firstName: 'Siphamandla',
    lastName: 'Cele',
    phone: '+27831110013',
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

function readStoredDemoClients(): StoredDemoClientAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REGISTERED_CLIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDemoClientAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredDemoClients(accounts: StoredDemoClientAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REGISTERED_CLIENTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore demo persistence issues and keep the session usable.
  }
}

function readPasswordOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PASSWORD_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist a control-room password reset for demo logins. */
export function setDemoAccountPassword(email: string, password: string) {
  if (typeof window === 'undefined') return;
  const normalized = email.trim().toLowerCase();
  const next = password.trim();
  if (!normalized || next.length < 8) return;
  try {
    const overrides = readPasswordOverrides();
    overrides[normalized] = next;
    window.localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(overrides));
    const clients = readStoredDemoClients();
    const idx = clients.findIndex((entry) => entry.email === normalized);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], password: next };
      writeStoredDemoClients(clients);
    }
  } catch {
    // Ignore demo persistence issues.
  }
}

function expectedDemoPassword(email: string, storedPassword?: string): string {
  const overrides = readPasswordOverrides();
  const override = overrides[email.trim().toLowerCase()];
  if (override) return override;
  if (storedPassword) return storedPassword;
  return DEMO_PASSWORD;
}

function persistRegisteredDemoClient(account: StoredDemoClientAccount) {
  const existing = readStoredDemoClients().filter(
    (entry) => entry.email !== account.email,
  );
  existing.unshift(account);
  writeStoredDemoClients(existing.slice(0, 50));
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
  const normalized = email.trim().toLowerCase();
  const storedAccount = portal === 'client'
    ? readStoredDemoClients().find((a) => a.email === normalized && a.portal === 'client')
    : undefined;
  if (storedAccount) {
    if (password !== expectedDemoPassword(normalized, storedAccount.password)) {
      throw new Error('Invalid email or password');
    }
    return {
      user: toUser(storedAccount),
      accessToken: `demo-token-${portal}-${storedAccount.email}`,
    };
  }
  const account = ACCOUNTS.find(
    (a) => a.email === normalized && a.portal === portal,
  );
  if (!account) {
    const fallback = ACCOUNTS.find((a) => a.portal === portal);
    if (!fallback || !normalized.includes('@')) {
      throw new Error('Invalid email or password');
    }
    if (password !== expectedDemoPassword(normalized, fallback.password)) {
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
  if (password !== expectedDemoPassword(normalized, account.password)) {
    throw new Error('Invalid email or password');
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
  password?: string;
}): DemoSession {
  const email = payload.email.trim().toLowerCase();
  persistRegisteredDemoClient({
    email,
    portal: 'client',
    role: 'CLIENT',
    firstName: payload.firstName || 'Demo',
    lastName: payload.lastName || 'User',
    phone: payload.phone,
    password: payload.password || DEMO_PASSWORD,
  });
  const user: DemoUser = {
    id: `demo-user-${email.replace(/[^a-z0-9]/gi, '-')}`,
    email,
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

import type {
  Organization,
  OrgDashboardKpis,
  OrgGate,
  OrgIncident,
  OrgPerson,
  OrgSite,
  OrganizationType,
} from './types';
import { ORG_TYPE_OPTIONS } from './types';

const STORAGE_KEY = '4ds-org-directory-v1';

export const DEMO_ORG_ID = 'org-nomsa-group';
export const DEMO_SITES = {
  gateway: 'site-gateway-mall',
  umhlanga: 'site-umhlanga-office',
  warehouse: 'site-durban-warehouse',
  springfield: 'site-springfield-dc',
} as const;

function typeLabel(type: OrganizationType) {
  return ORG_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function seedOrganizations(): Organization[] {
  return [
    {
      id: DEMO_ORG_ID,
      name: 'Corporate Demo',
      type: 'company',
      typeLabel: 'Corporate Security',
      logoInitials: 'CD',
      primaryContactName: 'Org Admin',
      primaryContactEmail: 'security@demo.local',
      primaryContactPhone: '+27 31 555 0100',
      createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    },
  ];
}

function seedSites(): OrgSite[] {
  return [
    {
      id: DEMO_SITES.gateway,
      organizationId: DEMO_ORG_ID,
      name: 'Gateway Mall',
      address: '1 Palm Blvd, Umhlanga Ridge, Durban',
      siteType: 'Shopping mall',
      status: 'ACTIVE_INCIDENT',
      peopleOnSite: 1842,
      vehiclesOnSite: 640,
      visitorsOnSite: 210,
      officersOnDuty: 12,
      officersRostered: 14,
      camerasOnline: 118,
      camerasTotal: 124,
      openGates: 2,
      activeAlerts: 4,
    },
    {
      id: DEMO_SITES.umhlanga,
      organizationId: DEMO_ORG_ID,
      name: 'Umhlanga Office',
      address: '12 Lagoon Dr, Umhlanga, Durban',
      siteType: 'Office building',
      status: 'NORMAL',
      peopleOnSite: 186,
      vehiclesOnSite: 74,
      visitorsOnSite: 12,
      officersOnDuty: 3,
      officersRostered: 3,
      camerasOnline: 28,
      camerasTotal: 28,
      openGates: 0,
      activeAlerts: 1,
    },
    {
      id: DEMO_SITES.warehouse,
      organizationId: DEMO_ORG_ID,
      name: 'Durban Warehouse',
      address: '44 Trafford Rd, Prospecton, Durban',
      siteType: 'Warehouse',
      status: 'WARNING',
      peopleOnSite: 92,
      vehiclesOnSite: 38,
      visitorsOnSite: 6,
      officersOnDuty: 2,
      officersRostered: 3,
      camerasOnline: 22,
      camerasTotal: 24,
      openGates: 1,
      activeAlerts: 2,
    },
    {
      id: DEMO_SITES.springfield,
      organizationId: DEMO_ORG_ID,
      name: 'Springfield Distribution Centre',
      address: '8 Springfield Park, Durban',
      siteType: 'Logistics',
      status: 'NORMAL',
      peopleOnSite: 64,
      vehiclesOnSite: 41,
      visitorsOnSite: 4,
      officersOnDuty: 1,
      officersRostered: 1,
      camerasOnline: 16,
      camerasTotal: 16,
      openGates: 0,
      activeAlerts: 0,
    },
  ];
}

function seedIncidents(): OrgIncident[] {
  const now = Date.now();
  return [
    {
      id: 'inc-org-1',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.gateway,
      siteName: 'Gateway Mall',
      type: 'PANIC',
      severity: 'critical',
      status: 'RESPONDING',
      subject: 'Retail staff · Shop ABC',
      location: 'Building A · Unit 104',
      createdAt: new Date(now - 2 * 60_000).toISOString(),
      ageLabel: '2 min ago',
    },
    {
      id: 'inc-org-2',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.gateway,
      siteName: 'Gateway Mall',
      type: 'MEDICAL',
      severity: 'high',
      status: 'DISPATCHED',
      subject: 'Visitor',
      location: 'Parking Level 2',
      createdAt: new Date(now - 8 * 60_000).toISOString(),
      ageLabel: '8 min ago',
    },
    {
      id: 'inc-org-3',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.warehouse,
      siteName: 'Durban Warehouse',
      type: 'SECURITY',
      severity: 'high',
      status: 'ACKNOWLEDGED',
      subject: 'Unauthorized access',
      location: 'Gate 3',
      createdAt: new Date(now - 14 * 60_000).toISOString(),
      ageLabel: '14 min ago',
    },
  ];
}

function seedGates(): OrgGate[] {
  return [
    {
      id: 'gate-1',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.gateway,
      siteName: 'Gateway Mall',
      name: 'GATE 01 · Main entrance',
      status: 'OPEN',
    },
    {
      id: 'gate-2',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.gateway,
      siteName: 'Gateway Mall',
      name: 'GATE 02 · Loading bay',
      status: 'CLOSED',
    },
    {
      id: 'gate-3',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.warehouse,
      siteName: 'Durban Warehouse',
      name: 'GATE 03 · Yard',
      status: 'OPEN',
    },
    {
      id: 'gate-4',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.umhlanga,
      siteName: 'Umhlanga Office',
      name: 'GATE 04 · Basement',
      status: 'LOCKED',
    },
    {
      id: 'gate-5',
      organizationId: DEMO_ORG_ID,
      siteId: DEMO_SITES.springfield,
      siteName: 'Springfield Distribution Centre',
      name: 'GATE 05 · Dispatch',
      status: 'OFFLINE',
    },
  ];
}

function seedPeople(): OrgPerson[] {
  return [
    {
      id: 'p1',
      organizationId: DEMO_ORG_ID,
      name: 'Thandi Mokoena',
      role: 'Security Manager',
      siteName: 'Gateway Mall',
      status: 'on_site',
    },
    {
      id: 'p2',
      organizationId: DEMO_ORG_ID,
      name: 'Johan Pretorius',
      role: 'Control Room Operator',
      siteName: 'Gateway Mall',
      status: 'on_site',
    },
    {
      id: 'p3',
      organizationId: DEMO_ORG_ID,
      name: 'Aisha Khan',
      role: 'Property Manager',
      siteName: 'Umhlanga Office',
      status: 'on_site',
    },
    {
      id: 'p4',
      organizationId: DEMO_ORG_ID,
      name: 'Sipho Ndlovu',
      role: 'Security Officer',
      siteName: 'Durban Warehouse',
      status: 'on_site',
    },
    {
      id: 'p5',
      organizationId: DEMO_ORG_ID,
      name: 'Visitor · Courier',
      role: 'Visitor',
      siteName: 'Gateway Mall',
      status: 'visitor',
    },
  ];
}

type OrgDirectory = {
  organizations: Organization[];
  sites: OrgSite[];
  incidents: OrgIncident[];
  gates: OrgGate[];
  people: OrgPerson[];
};

function defaultDirectory(): OrgDirectory {
  return {
    organizations: seedOrganizations(),
    sites: seedSites(),
    incidents: seedIncidents(),
    gates: seedGates(),
    people: seedPeople(),
  };
}

function readDirectory(): OrgDirectory {
  if (typeof window === 'undefined') return defaultDirectory();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = defaultDirectory();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as OrgDirectory;
    if (!parsed.organizations?.length) {
      const seeded = defaultDirectory();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    return defaultDirectory();
  }
}

function writeDirectory(next: OrgDirectory) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('4ds-org-directory-changed'));
}

export function listOrganizations(): Organization[] {
  return readDirectory().organizations;
}

export function getOrganization(id: string): Organization | null {
  return readDirectory().organizations.find((o) => o.id === id) ?? null;
}

export function listSites(organizationId: string): OrgSite[] {
  return readDirectory().sites.filter((s) => s.organizationId === organizationId);
}

export function getSite(organizationId: string, siteId: string): OrgSite | null {
  return (
    readDirectory().sites.find((s) => s.organizationId === organizationId && s.id === siteId) ??
    null
  );
}

export function listIncidents(
  organizationId: string,
  siteId: string | 'all' = 'all',
): OrgIncident[] {
  return readDirectory().incidents.filter(
    (i) =>
      i.organizationId === organizationId && (siteId === 'all' || i.siteId === siteId),
  );
}

export function listGates(organizationId: string, siteId: string | 'all' = 'all'): OrgGate[] {
  return readDirectory().gates.filter(
    (g) =>
      g.organizationId === organizationId && (siteId === 'all' || g.siteId === siteId),
  );
}

export function listPeople(organizationId: string): OrgPerson[] {
  return readDirectory().people.filter((p) => p.organizationId === organizationId);
}

export function getDashboardKpis(
  organizationId: string,
  siteId: string | 'all' = 'all',
): OrgDashboardKpis {
  const sites = listSites(organizationId).filter((s) => siteId === 'all' || s.id === siteId);
  const incidents = listIncidents(organizationId, siteId).filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED',
  );
  let camerasOnline = sites.reduce((n, s) => n + s.camerasOnline, 0);
  let camerasTotal = sites.reduce((n, s) => n + s.camerasTotal, 0);
  let peopleOnSite = sites.reduce((n, s) => n + s.peopleOnSite, 0);
  let vehiclesOnSite = sites.reduce((n, s) => n + s.vehiclesOnSite, 0);
  let visitors = sites.reduce((n, s) => n + s.visitorsOnSite, 0);
  let openGates = sites.reduce((n, s) => n + s.openGates, 0);
  let officersOnDuty = sites.reduce((n, s) => n + s.officersOnDuty, 0);
  let officersRostered = sites.reduce((n, s) => n + s.officersRostered, 0);
  let activeAlerts = sites.reduce((n, s) => n + s.activeAlerts, 0);

  // New / empty orgs still get a populated operations picture from demo overlays.
  if (camerasTotal === 0 && sites.length > 0) {
    camerasTotal = 8;
    camerasOnline = 7;
    peopleOnSite = peopleOnSite || 64;
    vehiclesOnSite = vehiclesOnSite || 18;
    visitors = visitors || 8;
    openGates = openGates || 1;
    officersOnDuty = officersOnDuty || 2;
    officersRostered = officersRostered || 3;
    activeAlerts = activeAlerts || 2;
  }

  return {
    activeIncidents: incidents.length,
    peopleOnSite,
    vehiclesOnSite,
    visitors,
    openGates,
    officersOnDuty,
    officersRostered,
    camerasOnline,
    camerasTotal,
    activeAlerts,
  };
}

export type CreateOrganizationInput = {
  name: string;
  type: OrganizationType;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  siteName: string;
  siteAddress: string;
  siteTypeLabel?: string;
  gateCode?: string;
};

export function createOrganization(input: CreateOrganizationInput): Organization {
  const dir = readDirectory();
  const id = `org-${Date.now().toString(36)}`;
  const siteId = `site-${Date.now().toString(36)}`;
  const org: Organization = {
    id,
    name: input.name.trim(),
    type: input.type,
    typeLabel: typeLabel(input.type),
    logoInitials: input.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'ORG',
    primaryContactName: input.primaryContactName.trim(),
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactPhone: input.primaryContactPhone.trim(),
    createdAt: new Date().toISOString(),
  };
  const site: OrgSite = {
    id: siteId,
    organizationId: id,
    name: input.siteName.trim(),
    address: input.siteAddress.trim(),
    siteType: input.siteTypeLabel ?? typeLabel(input.type),
    status: 'NORMAL',
    peopleOnSite: 128,
    vehiclesOnSite: 42,
    visitorsOnSite: 18,
    officersOnDuty: 4,
    officersRostered: 5,
    camerasOnline: 7,
    camerasTotal: 8,
    openGates: 1,
    activeAlerts: 2,
  };
  const gate: OrgGate = {
    id: `gate-${Date.now().toString(36)}`,
    organizationId: id,
    siteId,
    siteName: site.name,
    name: 'GATE 01 · Main entrance',
    status: 'OPEN',
  };
  dir.organizations = [org, ...dir.organizations];
  dir.sites = [site, ...dir.sites];
  dir.gates = [gate, ...dir.gates];
  writeDirectory(dir);
  return org;
}

export function ensureDemoOrgDirectory() {
  const dir = readDirectory();
  let changed = false;
  const organizations = dir.organizations.map((org) => {
    if (org.id !== DEMO_ORG_ID) return org;
    if (org.name === 'Corporate Demo' && org.logoInitials === 'CD') return org;
    changed = true;
    return {
      ...org,
      name: 'Corporate Demo',
      typeLabel: 'Corporate Security',
      logoInitials: 'CD',
      primaryContactName: 'Org Admin',
      primaryContactEmail: 'security@demo.local',
    };
  });
  if (changed) {
    writeDirectory({ ...dir, organizations });
  }
}

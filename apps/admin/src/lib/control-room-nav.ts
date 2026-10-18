import type { NavIconName } from '@/components/nav/NavIcon';

export type ControlRoomNavSectionId =
  | 'development'
  | 'command'
  | 'watch'
  | 'field'
  | 'clients'
  | 'insight'
  | 'admin';

export type ControlRoomNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
  /** If set, only these roles see the item. Empty/undefined = all admin roles. */
  roles?: string[];
  section?: ControlRoomNavSectionId;
  /** Rendered outside the grouped list, e.g. profile at the bottom of the rail. */
  pin?: 'bottom';
};

export type ControlRoomNavSection = {
  id: ControlRoomNavSectionId;
  title: string;
  icon: NavIconName;
  items: ControlRoomNavItem[];
};

const OWNER_ADMIN_ROLES = ['OWNER', 'TENANT_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'DEVELOPER'];

const SECTION_ORDER: ControlRoomNavSectionId[] = [
  'development',
  'command',
  'watch',
  'field',
  'clients',
  'insight',
  'admin',
];

export const CONTROL_ROOM_SECTION_META: Record<
  ControlRoomNavSectionId,
  { title: string; icon: NavIconName }
> = {
  development: { title: 'Development', icon: 'report' },
  command: { title: 'Command', icon: 'hub' },
  watch: { title: 'Watch', icon: 'surveillance' },
  field: { title: 'Field', icon: 'officers' },
  clients: { title: 'Clients', icon: 'customers' },
  insight: { title: 'Insight', icon: 'analytics' },
  admin: { title: 'Administration', icon: 'lock' },
};

export const CONTROL_ROOM_NAV: ControlRoomNavItem[] = [
  {
    href: '/control-room/developer',
    label: 'Developer',
    icon: 'report',
    roles: ['DEVELOPER'],
    section: 'development',
  },
  { href: '/control-room', label: 'Command', icon: 'overview', exact: true, section: 'command' },
  { href: '/control-room/map', label: 'Live Map', icon: 'live-map', section: 'command' },
  { href: '/control-room/command', label: 'Property command', icon: 'hub', section: 'command' },
  { href: '/control-room/surveillance', label: 'Cameras', icon: 'surveillance', section: 'watch' },
  { href: '/control-room/emap', label: 'E-map', icon: 'hub', section: 'watch' },
  { href: '/control-room/cctv-systems', label: 'Devices', icon: 'devices', section: 'watch' },
  { href: '/control-room/alarm-systems', label: 'Alarms', icon: 'alarm', section: 'watch' },
  { href: '/control-room/device-security', label: 'Panic & Devices', icon: 'emergency', section: 'watch' },
  { href: '/control-room/incidents', label: 'Incidents', icon: 'incidents', section: 'watch' },
  { href: '/control-room/dispatch', label: 'Dispatch', icon: 'dispatch', section: 'watch' },
  { href: '/control-room/fleet', label: 'Vehicles', icon: 'fleet', section: 'field' },
  { href: '/control-room/communications', label: 'Access & gates', icon: 'key', section: 'field' },
  { href: '/control-room/officers', label: 'Officers', icon: 'officers', section: 'field' },
  { href: '/control-room/chat', label: 'Communications', icon: 'chat', section: 'field' },
  { href: '/control-room/customers', label: 'Subscriptions', icon: 'customers', section: 'clients' },
  {
    href: '/control-room/installs',
    label: 'Install Jobs',
    icon: 'install',
    roles: [...OWNER_ADMIN_ROLES, 'SUPERVISOR'],
    section: 'clients',
  },
  { href: '/control-room/documents', label: 'Documents', icon: 'documents', section: 'insight' },
  { href: '/control-room/analytics', label: 'Analytics', icon: 'analytics', section: 'insight' },
  { href: '/control-room/alert-history', label: 'Alarm history', icon: 'history', section: 'insight' },
  { href: '/control-room/teams', label: 'Teams & users', icon: 'teams', section: 'admin' },
  { href: '/control-room/settings', label: 'Ops settings', icon: 'grid', section: 'admin' },
  { href: '/control-room/my-settings', label: 'Settings', icon: 'account', section: 'admin' },
  { href: '/control-room/profile', label: 'My Profile', icon: 'profile', pin: 'bottom' },
];

export function canAccessControlRoomRoute(role: string, href: string): boolean {
  const path = href.split('?')[0].replace(/\/$/, '') || '/';
  const allowed = navForRole(role);
  if (
    allowed.some((item) => {
      if (item.href === '/control-room') return path === '/control-room';
      return path === item.href || path.startsWith(`${item.href}/`);
    })
  ) {
    return true;
  }
  // Customer / CCTV detail deep-links used from ops screens
  if (path.startsWith('/control-room/sites/')) {
    return allowed.some(
      (item) => item.href === '/control-room/customers' || item.href === '/control-room/surveillance',
    );
  }
  return false;
}

function hrefsAllowedForRole(role: string): Set<string> | null {
  if (role === 'SALES') {
    return new Set([
      '/control-room',
      '/control-room/customers',
      '/control-room/installs',
      '/control-room/chat',
      '/control-room/documents',
      '/control-room/profile',
      '/control-room/my-settings',
      '/control-room/settings',
    ]);
  }

  if (role === 'DISPATCHER') {
    return new Set([
      '/control-room',
      '/control-room/map',
      '/control-room/surveillance',
      '/control-room/emap',
      '/control-room/alert-history',
      '/control-room/fleet',
      '/control-room/incidents',
      '/control-room/command',
      '/control-room/device-security',
      '/control-room/alarm-systems',
      '/control-room/dispatch',
      '/control-room/communications',
      '/control-room/chat',
      '/control-room/profile',
      '/control-room/my-settings',
      '/control-room/settings',
    ]);
  }

  if (role === 'TENANT_ADMIN') {
    return new Set([
      '/control-room',
      '/control-room/officers',
      '/control-room/customers',
      '/control-room/analytics',
      '/control-room/my-settings',
      '/control-room/profile',
      '/control-room/settings',
    ]);
  }

  if (role === 'DEVELOPER') {
    return new Set(
      CONTROL_ROOM_NAV.filter((item) => item.href !== '/control-room/teams').map((item) => item.href),
    );
  }

  return null;
}

export function navForRole(role: string): ControlRoomNavItem[] {
  const hrefs = hrefsAllowedForRole(role);
  return CONTROL_ROOM_NAV.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (hrefs && !hrefs.has(item.href)) return false;
    return true;
  });
}

export function navSectionsForRole(role: string): ControlRoomNavSection[] {
  const items = navForRole(role).filter((item) => !item.pin);
  return SECTION_ORDER.map((id) => ({
    id,
    ...CONTROL_ROOM_SECTION_META[id],
    items: items.filter((item) => item.section === id),
  })).filter((section) => section.items.length > 0);
}

export function pinnedNavForRole(role: string): ControlRoomNavItem[] {
  return navForRole(role).filter((item) => item.pin === 'bottom');
}

/** Short labels for the floating mobile bottom bar (max 5). */
const MOBILE_LABELS: Record<string, string> = {
  '/control-room': 'Command',
  '/control-room/developer': 'Desk',
  '/control-room/map': 'Map',
  '/control-room/surveillance': 'Cameras',
  '/control-room/alarm-systems': 'Alarms',
  '/control-room/fleet': 'Vehicles',
  '/control-room/customers': 'Subs',
  '/control-room/installs': 'Jobs',
  '/control-room/incidents': 'Incidents',
  '/control-room/settings': 'Admin',
  '/control-room/my-settings': 'Settings',
  '/control-room/profile': 'More',
};

const MOBILE_PREFERRED: Record<string, string[]> = {
  SALES: [
    '/control-room',
    '/control-room/customers',
    '/control-room/installs',
    '/control-room/chat',
    '/control-room/my-settings',
  ],
  DEFAULT: [
    '/control-room',
    '/control-room/surveillance',
    '/control-room/alarm-systems',
    '/control-room/map',
    '/control-room/incidents',
  ],
  DEVELOPER: [
    '/control-room/developer',
    '/control-room',
    '/control-room/map',
    '/control-room/surveillance',
    '/control-room/profile',
  ],
};

export type ControlRoomMobileNavItem = ControlRoomNavItem & {
  mobileLabel: string;
};

export function mobileNavForRole(role: string): ControlRoomMobileNavItem[] {
  const items = navForRole(role);
  const preferred = MOBILE_PREFERRED[role] ?? MOBILE_PREFERRED.DEFAULT;
  return preferred
    .map((href) => {
      const item = items.find((entry) => entry.href === href);
      if (!item) return null;
      return {
        ...item,
        mobileLabel: MOBILE_LABELS[href] ?? item.label,
        icon: item.icon,
      };
    })
    .filter((item): item is ControlRoomMobileNavItem => item != null)
    .slice(0, 5);
}

import type { NavIconName } from '@/components/nav/NavIcon';

export type ControlRoomNavSectionId =
  | 'development'
  | 'operations'
  | 'field'
  | 'business'
  | 'management'
  | 'system';

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

const OWNER_STORE_ROLES = ['OWNER', 'TENANT_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'DEVELOPER'];
const SALES_ROLES = [...OWNER_STORE_ROLES, 'SALES'];

const SECTION_ORDER: ControlRoomNavSectionId[] = [
  'development',
  'operations',
  'field',
  'business',
  'management',
  'system',
];

export const CONTROL_ROOM_SECTION_META: Record<
  ControlRoomNavSectionId,
  { title: string; icon: NavIconName }
> = {
  development: { title: 'Development', icon: 'report' },
  operations: { title: 'Command & operations', icon: 'hub' },
  field: { title: 'Field security', icon: 'devices' },
  business: { title: 'Customers & business', icon: 'customers' },
  management: { title: 'Management', icon: 'analytics' },
  system: { title: 'System', icon: 'grid' },
};

export const CONTROL_ROOM_NAV: ControlRoomNavItem[] = [
  {
    href: '/control-room/developer',
    label: 'Developer',
    icon: 'report',
    roles: ['DEVELOPER'],
    section: 'development',
  },
  { href: '/control-room', label: 'Ops Board', icon: 'overview', exact: true, section: 'operations' },
  { href: '/control-room/command', label: 'Command Hub', icon: 'hub', section: 'operations' },
  { href: '/control-room/map', label: 'Live Map', icon: 'live-map', section: 'operations' },
  { href: '/control-room/dispatch', label: 'Dispatch', icon: 'dispatch', section: 'operations' },
  { href: '/control-room/incidents', label: 'Incidents', icon: 'incidents', section: 'operations' },
  { href: '/control-room/surveillance', label: 'CCTV', icon: 'surveillance', section: 'operations' },
  { href: '/control-room/cctv-systems', label: 'CCTV Kits', icon: 'devices', section: 'operations' },
  { href: '/control-room/alarm-systems', label: 'Alarm Panels', icon: 'incidents', section: 'operations' },
  { href: '/control-room/fleet', label: 'Vehicles', icon: 'fleet', section: 'operations' },
  { href: '/control-room/device-security', label: 'Device Security', icon: 'devices', section: 'field' },
  { href: '/control-room/officers', label: 'Officers', icon: 'officers', section: 'field' },
  { href: '/control-room/documents', label: 'Documents', icon: 'documents', section: 'field' },
  { href: '/control-room/communications', label: 'Communications', icon: 'communications', section: 'field' },
  { href: '/control-room/chat', label: 'Internal Chat', icon: 'chat', section: 'field' },
  { href: '/control-room/customers', label: 'Customers', icon: 'customers', section: 'business' },
  {
    href: '/control-room/sales',
    label: 'Sales Desk',
    icon: 'sales',
    roles: SALES_ROLES,
    section: 'business',
  },
  {
    href: '/control-room/installs',
    label: 'Install Jobs',
    icon: 'install',
    roles: [...OWNER_STORE_ROLES, 'SUPERVISOR', 'SALES'],
    section: 'business',
  },
  {
    href: '/control-room/store',
    label: 'Gear Store',
    icon: 'store',
    roles: OWNER_STORE_ROLES,
    section: 'business',
  },
  { href: '/control-room/analytics', label: 'Analytics', icon: 'analytics', section: 'management' },
  { href: '/control-room/teams', label: 'Teams & Users', icon: 'teams', section: 'management' },
  { href: '/control-room/settings', label: 'Ops Settings', icon: 'grid', section: 'system' },
  { href: '/control-room/alert-history', label: 'Alert History', icon: 'history', section: 'system' },
  {
    href: '/control-room/assurance',
    label: 'Assurance',
    icon: 'lock',
    roles: OWNER_STORE_ROLES,
    section: 'system',
  },
  { href: '/control-room/my-settings', label: 'Settings', icon: 'account', section: 'system' },
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
      '/control-room/sales',
      '/control-room/installs',
      '/control-room/chat',
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
      '/control-room/fleet',
      '/control-room/incidents',
      '/control-room/command',
      '/control-room/device-security',
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
      '/control-room/store',
      '/control-room/sales',
      '/control-room/analytics',
      '/control-room/my-settings',
      '/control-room/profile',
      '/control-room/settings',
      '/control-room/assurance',
    ]);
  }

  if (role === 'DEVELOPER') {
    return new Set(
      CONTROL_ROOM_NAV.filter(
        (item) => item.href !== '/control-room/sales' && item.href !== '/control-room/teams',
      ).map((item) => item.href),
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
  '/control-room': 'Ops',
  '/control-room/developer': 'Desk',
  '/control-room/map': 'Map',
  '/control-room/surveillance': 'CCTV',
  '/control-room/fleet': 'Fleet',
  '/control-room/customers': 'Clients',
  '/control-room/incidents': 'File',
  '/control-room/sales': 'Sales',
  '/control-room/installs': 'Jobs',
  '/control-room/settings': 'Ops',
  '/control-room/my-settings': 'Settings',
  '/control-room/profile': 'More',
};

const MOBILE_PREFERRED: Record<string, string[]> = {
  SALES: [
    '/control-room',
    '/control-room/customers',
    '/control-room/sales',
    '/control-room/installs',
    '/control-room/my-settings',
  ],
  DEFAULT: [
    '/control-room',
    '/control-room/map',
    '/control-room/surveillance',
    '/control-room/fleet',
    '/control-room/my-settings',
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
        icon:
          href === '/control-room' && role !== 'DEVELOPER'
            ? ('incidents' as const)
            : href === '/control-room/profile'
              ? ('grid' as const)
              : href === '/control-room/settings'
                ? ('profile' as const)
                : item.icon,
      };
    })
    .filter((item): item is ControlRoomMobileNavItem => item != null)
    .slice(0, 5);
}

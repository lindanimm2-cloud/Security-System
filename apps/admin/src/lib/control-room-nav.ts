import type { NavIconName } from '@/components/nav/NavIcon';

export type ControlRoomNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
  /** If set, only these roles see the item. Empty/undefined = all admin roles. */
  roles?: string[];
};

const OWNER_STORE_ROLES = ['OWNER', 'TENANT_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'DEVELOPER'];
const SALES_ROLES = [...OWNER_STORE_ROLES, 'SALES'];

export const CONTROL_ROOM_NAV: ControlRoomNavItem[] = [
  { href: '/control-room', label: 'Ops Board', icon: 'overview', exact: true },
  { href: '/control-room/map', label: 'Live Map', icon: 'live-map' },
  { href: '/control-room/surveillance', label: 'CCTV', icon: 'surveillance' },
  { href: '/control-room/fleet', label: 'Vehicles', icon: 'fleet' },
  { href: '/control-room/incidents', label: 'Incidents', icon: 'incidents' },
  { href: '/control-room/command', label: 'Command Hub', icon: 'hub' },
  { href: '/control-room/device-security', label: 'Device Security', icon: 'devices' },
  { href: '/control-room/dispatch', label: 'Dispatch', icon: 'dispatch' },
  { href: '/control-room/customers', label: 'Customers', icon: 'customers' },
  {
    href: '/control-room/store',
    label: 'Gear Store',
    icon: 'store',
    roles: OWNER_STORE_ROLES,
  },
  {
    href: '/control-room/sales',
    label: 'Sales desk',
    icon: 'sales',
    roles: SALES_ROLES,
  },
  {
    href: '/control-room/installs',
    label: 'Install Jobs',
    icon: 'install',
    roles: [...OWNER_STORE_ROLES, 'SUPERVISOR', 'SALES'],
  },
  { href: '/control-room/officers', label: 'Officers', icon: 'officers' },
  { href: '/control-room/documents', label: 'Documents', icon: 'documents' },
  { href: '/control-room/communications', label: 'Communications', icon: 'communications' },
  { href: '/control-room/chat', label: 'Internal Chat', icon: 'chat' },
  {
    href: '/control-room/developer',
    label: 'Developer',
    icon: 'report',
    roles: ['DEVELOPER'],
  },
  { href: '/control-room/teams', label: 'Teams & Users', icon: 'teams' },
  { href: '/control-room/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/control-room/settings', label: 'Ops settings', icon: 'grid' },
  { href: '/control-room/my-settings', label: 'Settings', icon: 'account' },
  { href: '/control-room/profile', label: 'My profile', icon: 'profile' },
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

export function navForRole(role: string): ControlRoomNavItem[] {
  if (role === 'SALES') {
    const salesHrefs = new Set([
      '/control-room',
      '/control-room/customers',
      '/control-room/sales',
      '/control-room/installs',
      '/control-room/chat',
      '/control-room/profile',
      '/control-room/my-settings',
      '/control-room/settings',
    ]);
    return CONTROL_ROOM_NAV.filter((item) => salesHrefs.has(item.href));
  }

  if (role === 'DISPATCHER') {
    const hrefs = new Set([
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
    return CONTROL_ROOM_NAV.filter((item) => hrefs.has(item.href));
  }

  if (role === 'TENANT_ADMIN') {
    const order = [
      '/control-room',
      '/control-room/officers',
      '/control-room/customers',
      '/control-room/store',
      '/control-room/sales',
      '/control-room/analytics',
      '/control-room/my-settings',
      '/control-room/profile',
      '/control-room/settings',
    ];
    return order
      .map((href) => CONTROL_ROOM_NAV.find((item) => item.href === href))
      .filter((item): item is ControlRoomNavItem => Boolean(item));
  }

  if (role === 'OWNER') {
    const first = [
      '/control-room',
      '/control-room/map',
      '/control-room/surveillance',
      '/control-room/fleet',
      '/control-room/incidents',
      '/control-room/command',
      '/control-room/device-security',
    ];
    const rest = CONTROL_ROOM_NAV.filter(
      (item) =>
        !first.includes(item.href) &&
        (!item.roles || item.roles.includes(role)),
    );
    return [
      ...first
        .map((href) => CONTROL_ROOM_NAV.find((item) => item.href === href))
        .filter((item): item is ControlRoomNavItem => Boolean(item)),
      ...rest,
    ];
  }

  /** Developer: desk first, then full ops visibility (no teams / sales admin). */
  if (role === 'DEVELOPER') {
    const order = [
      '/control-room/developer',
      '/control-room',
      '/control-room/map',
      '/control-room/surveillance',
      '/control-room/fleet',
      '/control-room/incidents',
      '/control-room/command',
      '/control-room/device-security',
      '/control-room/dispatch',
      '/control-room/customers',
      '/control-room/store',
      '/control-room/installs',
      '/control-room/officers',
      '/control-room/documents',
      '/control-room/communications',
      '/control-room/chat',
      '/control-room/analytics',
      '/control-room/my-settings',
      '/control-room/profile',
      '/control-room/settings',
    ];
    return order
      .map((href) => CONTROL_ROOM_NAV.find((item) => item.href === href))
      .filter((item): item is ControlRoomNavItem => Boolean(item));
  }

  return CONTROL_ROOM_NAV.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
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

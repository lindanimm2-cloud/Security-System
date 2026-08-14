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
  { href: '/control-room/surveillance', label: 'Surveillance', icon: 'surveillance' },
  { href: '/control-room/incidents', label: 'Incidents', icon: 'incidents' },
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
  { href: '/control-room/fleet', label: 'Fleet', icon: 'fleet' },
  { href: '/control-room/documents', label: 'Documents', icon: 'documents' },
  { href: '/control-room/communications', label: 'Communications', icon: 'communications' },
  { href: '/control-room/chat', label: 'Internal Chat', icon: 'chat' },
  {
    href: '/control-room/developer',
    label: 'Developer',
    icon: 'report',
    roles: ['DEVELOPER', 'OWNER', 'SUPER_ADMIN'],
  },
  { href: '/control-room/teams', label: 'Teams & Users', icon: 'teams' },
  { href: '/control-room/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/control-room/settings', label: 'Settings', icon: 'profile' },
  { href: '/control-room/profile', label: 'My profile', icon: 'profile' },
];

export function navForRole(role: string): ControlRoomNavItem[] {
  if (role === 'SALES') {
    const salesHrefs = new Set([
      '/control-room',
      '/control-room/customers',
      '/control-room/sales',
      '/control-room/installs',
      '/control-room/chat',
      '/control-room/profile',
      '/control-room/settings',
    ]);
    return CONTROL_ROOM_NAV.filter((item) => salesHrefs.has(item.href));
  }

  if (role === 'DISPATCHER') {
    const hrefs = new Set([
      '/control-room',
      '/control-room/map',
      '/control-room/incidents',
      '/control-room/dispatch',
      '/control-room/communications',
      '/control-room/chat',
      '/control-room/profile',
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
      '/control-room/incidents',
      '/control-room/analytics',
      '/control-room/customers',
      '/control-room/officers',
    ];
    const rest = CONTROL_ROOM_NAV.filter((item) => !first.includes(item.href));
    return [
      ...first
        .map((href) => CONTROL_ROOM_NAV.find((item) => item.href === href))
        .filter((item): item is ControlRoomNavItem => Boolean(item)),
      ...rest,
    ];
  }

  if (role === 'DEVELOPER' || role === 'SUPER_ADMIN') {
    const first = CONTROL_ROOM_NAV.filter((item) => item.href === '/control-room/developer');
    const rest = CONTROL_ROOM_NAV.filter(
      (item) =>
        item.href !== '/control-room/developer' &&
        (!item.roles || item.roles.includes(role)),
    );
    return [...first, ...rest];
  }

  return CONTROL_ROOM_NAV.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
}

/** Short labels for the floating mobile bottom bar (max 5). */
const MOBILE_LABELS: Record<string, string> = {
  '/control-room': 'Home',
  '/control-room/map': 'Map',
  '/control-room/customers': 'Clients',
  '/control-room/incidents': 'Ops',
  '/control-room/sales': 'Sales',
  '/control-room/installs': 'Jobs',
  '/control-room/settings': 'Settings',
  '/control-room/profile': 'Account',
};

const MOBILE_PREFERRED: Record<string, string[]> = {
  SALES: [
    '/control-room',
    '/control-room/customers',
    '/control-room/sales',
    '/control-room/installs',
    '/control-room/profile',
  ],
  DEFAULT: [
    '/control-room',
    '/control-room/map',
    '/control-room/incidents',
    '/control-room/customers',
    '/control-room/profile',
  ],
  DEVELOPER: [
    '/control-room/developer',
    '/control-room/map',
    '/control-room/incidents',
    '/control-room/profile',
    '/control-room/chat',
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
          href === '/control-room'
            ? ('home' as const)
            : href === '/control-room/profile'
              ? ('profile' as const)
              : href === '/control-room/settings'
                ? ('profile' as const)
                : item.icon,
      };
    })
    .filter((item): item is ControlRoomMobileNavItem => item != null)
    .slice(0, 5);
}

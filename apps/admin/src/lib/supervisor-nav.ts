import type { NavIconName } from '@/components/nav/NavIcon';

export type SupervisorNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const SUPERVISOR_NAV: SupervisorNavItem[] = [
  { href: '/supervisor', label: 'Home', icon: 'overview', exact: true },
  { href: '/supervisor/map', label: 'Officer map', icon: 'live-map' },
  { href: '/supervisor/shifts', label: 'Shifts', icon: 'officers' },
  { href: '/supervisor/patrol', label: 'Patrol', icon: 'safe-zones' },
  { href: '/supervisor/performance', label: 'Performance', icon: 'analytics' },
  { href: '/control-room', label: 'Control room', icon: 'dispatch' },
  { href: '/supervisor/profile', label: 'My profile', icon: 'profile' },
  { href: '/supervisor/settings', label: 'Settings', icon: 'account' },
];

export const SUPERVISOR_MOBILE_NAV: Array<SupervisorNavItem & { mobileLabel: string }> = [
  { href: '/supervisor', label: 'Home', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/supervisor/map', label: 'Officer map', mobileLabel: 'Map', icon: 'live-map' },
  { href: '/supervisor/shifts', label: 'Shifts', mobileLabel: 'Shifts', icon: 'officers' },
  { href: '/supervisor/patrol', label: 'Patrol', mobileLabel: 'Patrol', icon: 'safe-zones' },
  { href: '/supervisor/settings', label: 'Settings', mobileLabel: 'Settings', icon: 'account' },
];

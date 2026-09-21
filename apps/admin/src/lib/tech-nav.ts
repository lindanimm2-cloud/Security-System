import type { NavIconName } from '@/components/nav/NavIcon';

export type TechNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const TECH_NAV: TechNavItem[] = [
  { href: '/tech', label: 'Today’s jobs', icon: 'dashboard', exact: true },
  { href: '/tech/jobs', label: 'Install Jobs', icon: 'install' },
  { href: '/tech/map', label: 'Job map', icon: 'live-map' },
  { href: '/tech/team', label: 'My Team', icon: 'teams' },
  { href: '/tech/chat', label: 'Team Chat', icon: 'team-chat' },
  { href: '/tech/inventory', label: 'Inventory', icon: 'store' },
  { href: '/tech/cameras', label: 'CCTV kits', icon: 'surveillance' },
  { href: '/tech/profile', label: 'My Profile', icon: 'profile' },
  { href: '/tech/settings', label: 'Settings', icon: 'account' },
];

/** Floating mobile bottom bar — Ops · Map · CCTV · Chat · Settings */
export const TECH_MOBILE_NAV: Array<TechNavItem & { mobileLabel: string }> = [
  { href: '/tech', label: 'Today’s ops', mobileLabel: 'Ops', icon: 'dashboard', exact: true },
  { href: '/tech/map', label: 'Job map', mobileLabel: 'Map', icon: 'live-map' },
  { href: '/tech/cameras', label: 'CCTV kits', mobileLabel: 'CCTV', icon: 'surveillance' },
  { href: '/tech/chat', label: 'Team Chat', mobileLabel: 'Chat', icon: 'team-chat' },
  { href: '/tech/settings', label: 'Settings', mobileLabel: 'Settings', icon: 'account' },
];

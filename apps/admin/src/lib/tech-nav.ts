import type { NavIconName } from '@/components/nav/NavIcon';

export type TechNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const TECH_NAV: TechNavItem[] = [
  { href: '/tech', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/tech/jobs', label: 'Install Jobs', icon: 'install' },
  { href: '/tech/team', label: 'My Team', icon: 'teams' },
  { href: '/tech/chat', label: 'Team Chat', icon: 'team-chat' },
  { href: '/tech/inventory', label: 'Inventory', icon: 'store' },
  { href: '/tech/cameras', label: 'Cameras', icon: 'surveillance' },
  { href: '/tech/profile', label: 'My Profile', icon: 'profile' },
];

/** Floating mobile bottom bar — primary tech actions. */
export const TECH_MOBILE_NAV: Array<TechNavItem & { mobileLabel: string }> = [
  { href: '/tech', label: 'Dashboard', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/tech/jobs', label: 'Install Jobs', mobileLabel: 'Jobs', icon: 'install' },
  { href: '/tech/inventory', label: 'Inventory', mobileLabel: 'Gear', icon: 'store' },
  { href: '/tech/chat', label: 'Team Chat', mobileLabel: 'Chat', icon: 'team-chat' },
  { href: '/tech/profile', label: 'My Profile', mobileLabel: 'Account', icon: 'profile' },
];

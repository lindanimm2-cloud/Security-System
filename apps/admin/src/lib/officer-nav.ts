import type { NavIconName } from '@/components/nav/NavIcon';

export type OfficerNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const OFFICER_NAV: OfficerNavItem[] = [
  { href: '/officer', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/officer/queue', label: 'Incident Queue', icon: 'queue' },
  { href: '/officer/record', label: 'Quick Record', icon: 'record' },
  { href: '/officer/report', label: 'Incident Report', icon: 'report' },
  { href: '/officer/map', label: 'Navigation', icon: 'navigation' },
  { href: '/officer/internal-chat', label: 'Team Chat', icon: 'team-chat' },
  { href: '/officer/messages', label: 'Dispatch Chat', icon: 'dispatch-chat' },
  { href: '/officer/calls', label: 'Calls', icon: 'calls' },
  { href: '/officer/profile', label: 'Profile & Shift', icon: 'profile' },
];

/** Floating mobile bottom bar — primary field actions. */
export const OFFICER_MOBILE_NAV: Array<OfficerNavItem & { mobileLabel: string }> = [
  { href: '/officer', label: 'Dashboard', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/officer/queue', label: 'Incident Queue', mobileLabel: 'Queue', icon: 'queue' },
  { href: '/officer/map', label: 'Navigation', mobileLabel: 'Map', icon: 'navigation' },
  { href: '/officer/messages', label: 'Dispatch Chat', mobileLabel: 'Chat', icon: 'dispatch-chat' },
  { href: '/officer/profile', label: 'Profile & Shift', mobileLabel: 'Account', icon: 'profile' },
];

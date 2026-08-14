import type { NavIconName } from '@/components/nav/NavIcon';

export type OfficerNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const OFFICER_NAV: OfficerNavItem[] = [
  { href: '/officer', label: 'Home', icon: 'home', exact: true },
  { href: '/officer/queue', label: 'Jobs', icon: 'queue' },
  { href: '/officer/map', label: 'Map', icon: 'navigation' },
  { href: '/officer/record', label: 'Evidence', icon: 'evidence' },
  { href: '/officer/report', label: 'Incident Report', icon: 'report' },
  { href: '/officer/internal-chat', label: 'Team Chat', icon: 'team-chat' },
  { href: '/officer/messages', label: 'Dispatch Chat', icon: 'dispatch-chat' },
  { href: '/officer/calls', label: 'Calls', icon: 'calls' },
  { href: '/officer/profile', label: 'Profile', icon: 'profile' },
];

/** Floating mobile bottom bar — Home · Jobs · Map · Evidence · Profile */
export const OFFICER_MOBILE_NAV: Array<OfficerNavItem & { mobileLabel: string }> = [
  { href: '/officer', label: 'Home', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/officer/queue', label: 'Jobs', mobileLabel: 'Jobs', icon: 'queue' },
  { href: '/officer/map', label: 'Map', mobileLabel: 'Map', icon: 'navigation' },
  { href: '/officer/record', label: 'Evidence', mobileLabel: 'Evidence', icon: 'evidence' },
  { href: '/officer/profile', label: 'Profile', mobileLabel: 'Profile', icon: 'profile' },
];

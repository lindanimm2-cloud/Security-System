import type { NavIconName } from '@/components/nav/NavIcon';

export type OfficerNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const OFFICER_NAV: OfficerNavItem[] = [
  { href: '/officer/queue', label: 'Your Jobs', icon: 'queue' },
  { href: '/officer', label: 'Home', icon: 'home', exact: true },
  { href: '/officer/map', label: 'Map', icon: 'navigation' },
  { href: '/officer/record', label: 'Evidence', icon: 'evidence' },
  { href: '/officer/report', label: 'Incident Report', icon: 'report' },
  { href: '/officer/internal-chat', label: 'Crew Chat', icon: 'team-chat' },
  { href: '/officer/messages', label: 'Dispatch Chat', icon: 'dispatch-chat' },
  { href: '/officer/calls', label: 'Calls', icon: 'calls' },
  { href: '/officer/profile', label: 'Profile', icon: 'profile' },
  { href: '/officer/settings', label: 'Settings', icon: 'account' },
];

/** Floating mobile bottom bar — Your Jobs · Home · Map · Evidence · Settings */
export const OFFICER_MOBILE_NAV: Array<OfficerNavItem & { mobileLabel: string }> = [
  { href: '/officer/queue', label: 'Your Jobs', mobileLabel: 'Jobs', icon: 'queue' },
  { href: '/officer', label: 'Home', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/officer/map', label: 'Map', mobileLabel: 'Map', icon: 'navigation' },
  { href: '/officer/record', label: 'Evidence', mobileLabel: 'Evidence', icon: 'evidence' },
  { href: '/officer/settings', label: 'Settings', mobileLabel: 'Settings', icon: 'account' },
];

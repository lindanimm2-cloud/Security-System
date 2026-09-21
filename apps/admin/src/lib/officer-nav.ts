import type { NavIconName } from '@/components/nav/NavIcon';

export type OfficerNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export type OfficerNavGroup = {
  id: string;
  label: string;
  items: OfficerNavItem[];
};

export const OFFICER_NAV_GROUPS: OfficerNavGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { href: '/officer', label: 'Command Home', icon: 'home', exact: true },
      { href: '/officer/duty', label: 'Duty Mode', icon: 'emergency' },
      { href: '/officer/queue', label: 'Assignment Queue', icon: 'queue' },
      { href: '/officer/map', label: 'Live Map', icon: 'navigation' },
      { href: '/officer/patrol', label: 'Patrol', icon: 'location' },
    ],
  },
  {
    id: 'records',
    label: 'Field records',
    items: [
      { href: '/officer/record', label: 'Evidence', icon: 'evidence' },
      { href: '/officer/report', label: 'Incident Report', icon: 'report' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    items: [
      { href: '/officer/internal-chat', label: 'Crew Chat', icon: 'team-chat' },
      { href: '/officer/messages', label: 'Dispatch', icon: 'dispatch-chat' },
      { href: '/officer/calls', label: 'Calls', icon: 'calls' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { href: '/officer/profile', label: 'Profile', icon: 'profile' },
      { href: '/officer/settings', label: 'Settings', icon: 'account' },
    ],
  },
];

export const OFFICER_NAV: OfficerNavItem[] = OFFICER_NAV_GROUPS.flatMap((g) => g.items);

/** Floating mobile bottom bar — Home · Tasks · Map · Patrol · More */
export const OFFICER_MOBILE_NAV: Array<OfficerNavItem & { mobileLabel: string }> = [
  { href: '/officer', label: 'Command Home', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/officer/queue', label: 'Assignment Queue', mobileLabel: 'Tasks', icon: 'queue' },
  { href: '/officer/map', label: 'Live Map', mobileLabel: 'Map', icon: 'navigation' },
  { href: '/officer/patrol', label: 'Patrol', mobileLabel: 'Patrol', icon: 'location' },
  { href: '/officer/settings', label: 'Settings', mobileLabel: 'More', icon: 'account' },
];

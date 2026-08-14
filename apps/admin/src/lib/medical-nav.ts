import type { NavIconName } from '@/components/nav/NavIcon';

export type MedicalNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

export const MEDICAL_NAV: MedicalNavItem[] = [
  { href: '/medical', label: 'Queue', icon: 'emergency', exact: true },
  { href: '/medical/crew', label: 'Crew board', icon: 'fleet' },
  { href: '/medical/map', label: 'Ops map', icon: 'live-map' },
];

export const MEDICAL_MOBILE_NAV: Array<MedicalNavItem & { mobileLabel: string }> = [
  { href: '/medical', label: 'Queue', mobileLabel: 'Queue', icon: 'emergency', exact: true },
  { href: '/medical/crew', label: 'Crew board', mobileLabel: 'Crew', icon: 'fleet' },
  { href: '/medical/map', label: 'Ops map', mobileLabel: 'Map', icon: 'live-map' },
];

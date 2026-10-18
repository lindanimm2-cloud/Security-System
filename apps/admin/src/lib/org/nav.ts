import type { NavIconName } from '@/components/nav/NavIcon';

export type OrgNavItem = {
  id: string;
  href: string;
  label: string;
  exact?: boolean;
  prominent?: boolean;
  icon?: NavIconName;
};

export type OrgNavSection = {
  title: string;
  items: OrgNavItem[];
};

export function orgNav(organizationId: string): OrgNavSection[] {
  const base = `/org/${organizationId}`;
  return [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', href: `${base}/dashboard`, label: 'Dashboard', exact: true },
        { id: 'map', href: `${base}/map`, label: 'Live map' },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        { id: 'cctv', href: `${base}/cctv`, label: 'CCTV', prominent: true },
        { id: 'incidents', href: `${base}/incidents`, label: 'Incidents' },
        { id: 'alerts', href: `${base}/emergencies`, label: 'Alerts' },
        { id: 'panic', href: `${base}/emergencies`, label: 'Panic & SOS' },
      ],
    },
    {
      title: 'Site operations',
      items: [
        { id: 'gates', href: `${base}/gates`, label: 'Gates & intercoms' },
        { id: 'officers', href: `${base}/security`, label: 'Officers & posts' },
        { id: 'visitors', href: `${base}/visitors`, label: 'Visitors' },
        { id: 'vehicles', href: `${base}/vehicles`, label: 'Vehicles' },
        { id: 'access', href: `${base}/access`, label: 'Access control' },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'sites', href: `${base}/sites`, label: 'Sites & buildings' },
        { id: 'reports', href: `${base}/reports`, label: 'Reports' },
        { id: 'activity', href: `${base}/documents`, label: 'Activity log' },
        { id: 'people', href: `${base}/people`, label: 'People & roles' },
        { id: 'tenants', href: `${base}/tenants`, label: 'Tenants' },
        { id: 'deliveries', href: `${base}/deliveries`, label: 'Deliveries' },
        { id: 'billing', href: `${base}/billing`, label: 'Billing' },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'devices', href: `${base}/settings`, label: 'Devices' },
        { id: 'integrations', href: `${base}/settings#integrations`, label: 'Integrations' },
        { id: 'settings', href: `${base}/settings`, label: 'Settings' },
      ],
    },
  ];
}

export function orgMobileNav(organizationId: string): OrgNavItem[] {
  const base = `/org/${organizationId}`;
  return [
    { id: 'm-home', href: `${base}/dashboard`, label: 'Home', exact: true, icon: 'home' },
    { id: 'm-cctv', href: `${base}/cctv`, label: 'CCTV', prominent: true, icon: 'surveillance' },
    { id: 'm-incidents', href: `${base}/incidents`, label: 'Incidents', icon: 'incidents' },
    { id: 'm-map', href: `${base}/map`, label: 'Map', icon: 'live-map' },
    { id: 'm-more', href: `${base}/settings`, label: 'More', icon: 'grid' },
  ];
}

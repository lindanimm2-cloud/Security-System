import type { NavIconName } from '@/components/nav/NavIcon';
import { navHrefIsActive } from '@/lib/nav-active';
import type { AddonCode, AccessMap } from './subscription-plans';

export type PortalNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
  /** When set, item is hidden unless subscription access grants this category */
  requiresAccess?: keyof AccessMap;
};

export type PortalNavSection = {
  title: string;
  icon: NavIconName;
  items: PortalNavItem[];
};

export const PORTAL_NAV: PortalNavSection[] = [
  {
    title: 'Overview',
    icon: 'overview',
    items: [
      { href: '/portal', label: 'Dashboard', icon: 'dashboard', exact: true },
      { href: '/portal/chat', label: 'Control Room Chat', icon: 'dispatch-chat' },
    ],
  },
  {
    title: 'Emergency',
    icon: 'emergency',
    items: [
      { href: '/portal/protect', label: 'Protect', icon: 'emergency', requiresAccess: 'emergency' },
      { href: '/portal/emergency', label: 'Emergency Hub', icon: 'hub', requiresAccess: 'emergency' },
      { href: '/portal/security', label: 'Emergency Protection', icon: 'officers', requiresAccess: 'emergency' },
      { href: '/portal/contacts', label: 'Emergency Contacts', icon: 'contacts', requiresAccess: 'emergency' },
      { href: '/portal/medical', label: 'Medical', icon: 'medical', requiresAccess: 'medical' },
      { href: '/portal/incidents', label: 'Response history', icon: 'incidents', requiresAccess: 'emergency' },
      { href: '/portal/evidence', label: 'Evidence Vault', icon: 'evidence', requiresAccess: 'emergency' },
    ],
  },
  {
    title: 'Family',
    icon: 'family',
    items: [
      { href: '/portal/family', label: 'Family Safety', icon: 'family', requiresAccess: 'family' },
      { href: '/portal/family/chat', label: 'Family Chat', icon: 'team-chat', requiresAccess: 'family' },
      { href: '/portal/safe-zones', label: 'Safe Zones', icon: 'safe-zones', requiresAccess: 'family' },
      { href: '/portal/location', label: 'Family Tracking', icon: 'location', requiresAccess: 'family' },
    ],
  },
  {
    title: 'Vehicle',
    icon: 'vehicle',
    items: [{ href: '/portal/vehicles', label: 'Vehicle Security', icon: 'vehicle', requiresAccess: 'vehicle' }],
  },
  {
    title: 'Home',
    icon: 'home',
    items: [
      { href: '/portal/home', label: 'Home Security', icon: 'home', requiresAccess: 'home' },
    ],
  },
  {
    title: 'Personal',
    icon: 'personal',
    items: [
      { href: '/portal/personal', label: 'Personal Security', icon: 'personal', requiresAccess: 'personal' },
      { href: '/portal/requests', label: 'Service Requests', icon: 'services', requiresAccess: 'personal' },
    ],
  },
  {
    title: 'Account',
    icon: 'account',
    items: [
      { href: '/portal/subscription', label: 'Subscription', icon: 'subscription' },
      { href: '/portal/billing', label: 'Billing & Documents', icon: 'documents' },
      { href: '/portal/subscription/upgrade', label: 'Upgrade Plan', icon: 'upgrade' },
      { href: '/portal/updates', label: 'Security Updates', icon: 'updates' },
      { href: '/portal/profile', label: 'Profile', icon: 'profile' },
      { href: '/portal/settings', label: 'Settings', icon: 'account' },
    ],
  },
];

export type FeatureCard = {
  title: string;
  description: string;
  href?: string;
  status?: string;
  action?: string;
  price?: string;
  requiresAddon?: AddonCode;
  requiresAccess?: keyof AccessMap;
};

const JOB_ONLY_ACCOUNT_HREFS = new Set([
  '/portal/profile',
  '/portal/settings',
  '/portal/updates',
]);

const JOB_ONLY_OVERVIEW_HREFS = new Set(['/portal', '/portal/chat']);

/** Sidebar sections/items visible for the current subscription */
export function filterPortalNav(
  access: AccessMap | null,
  loading: boolean,
  nav: PortalNavSection[] = PORTAL_NAV,
  options?: { jobOnly?: boolean },
): PortalNavSection[] {
  if (loading || !access) {
    return nav.filter((section) => section.title === 'Overview' || section.title === 'Account');
  }

  const jobOnly = Boolean(options?.jobOnly);

  return nav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requiresAccess && !access[item.requiresAccess]) return false;
        if (!jobOnly) return true;
        if (section.title === 'Home' || section.title === 'Vehicle' || section.title === 'Family') {
          return false;
        }
        if (section.title === 'Account') return JOB_ONLY_ACCOUNT_HREFS.has(item.href);
        if (section.title === 'Overview') return JOB_ONLY_OVERVIEW_HREFS.has(item.href);
        if (section.title === 'Personal') return false;
        if (section.title === 'Emergency') {
          return (
            item.href === '/portal/protect' ||
            item.href === '/portal/contacts' ||
            item.href === '/portal/incidents' ||
            item.href === '/portal/emergency'
          );
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

/** Route segment → required access for direct URL guards */
export function portalPathRequiresAccess(pathname: string): keyof AccessMap | null {
  const segment = pathname.replace(/^\/portal\/?/, '').split('/')[0] || '';
  const rules: Record<string, keyof AccessMap> = {
    protect: 'emergency',
    emergency: 'emergency',
    contacts: 'emergency',
    incidents: 'emergency',
    security: 'emergency',
    family: 'family',
    'safe-zones': 'family',
    location: 'family',
    vehicles: 'vehicle',
    theft: 'vehicle',
    home: 'home',
    medical: 'medical',
    personal: 'personal',
  };
  return rules[segment] ?? null;
}

type PortalMobileNavItem = PortalNavItem & { mobileLabel: string };

const PORTAL_MOBILE_PREFERRED: Array<{
  href: string;
  mobileLabel: string;
  icon: NavIconName;
  exact?: boolean;
  requiresAccess?: keyof AccessMap;
}> = [
  { href: '/portal', mobileLabel: 'Home', icon: 'home', exact: true },
  { href: '/portal/protect', mobileLabel: 'Protect', icon: 'emergency', requiresAccess: 'emergency' },
  { href: '/portal/family', mobileLabel: 'Family', icon: 'family', requiresAccess: 'family' },
  { href: '/portal/home', mobileLabel: 'Security', icon: 'safe-zones', requiresAccess: 'home' },
  { href: '/portal/settings', mobileLabel: 'Account', icon: 'account' },
];

const JOB_ONLY_MOBILE: Array<{
  href: string;
  mobileLabel: string;
  icon: NavIconName;
  exact?: boolean;
  requiresAccess?: keyof AccessMap;
}> = [
  { href: '/portal', mobileLabel: 'Job', icon: 'dashboard', exact: true },
  { href: '/portal/protect', mobileLabel: 'Protect', icon: 'emergency', requiresAccess: 'emergency' },
  { href: '/portal/chat', mobileLabel: 'Chat', icon: 'dispatch-chat' },
  { href: '/portal/contacts', mobileLabel: 'Contacts', icon: 'contacts', requiresAccess: 'emergency' },
  { href: '/portal/settings', mobileLabel: 'Account', icon: 'account' },
];

/** Floating mobile bottom bar — up to 5 primary portal destinations. */
export function portalMobileNav(
  access: AccessMap | null,
  loading: boolean,
  options?: { jobOnly?: boolean },
): PortalMobileNavItem[] {
  const preferred = options?.jobOnly ? JOB_ONLY_MOBILE : PORTAL_MOBILE_PREFERRED;
  return preferred
    .filter((item) => {
      if (!item.requiresAccess) return true;
      if (loading || !access) return false;
      return access[item.requiresAccess];
    })
    .map((item) => ({
      href: item.href,
      label: item.mobileLabel,
      mobileLabel: item.mobileLabel,
      icon: item.icon,
      exact: item.exact,
      requiresAccess: item.requiresAccess,
    }))
    .slice(0, 5);
}

export type PortalRailDockItem = {
  id: string;
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
};

/** Icon-rail primary dock (control-room style). Everything else lives in More. */
export function portalRailDock(
  sections: PortalNavSection[],
  options?: { jobOnly?: boolean },
): PortalRailDockItem[] {
  const flat = sections.flatMap((section) => section.items);
  const byHref = (href: string) => flat.find((item) => item.href === href);

  if (options?.jobOnly) {
    return [
      byHref('/portal') && {
        id: 'dashboard',
        href: '/portal',
        label: 'Dashboard',
        icon: 'dashboard' as NavIconName,
        exact: true,
      },
      byHref('/portal/protect') && {
        id: 'protect',
        href: '/portal/protect',
        label: 'Protect',
        icon: 'emergency' as NavIconName,
      },
      byHref('/portal/chat') && {
        id: 'chat',
        href: '/portal/chat',
        label: 'Chat',
        icon: 'dispatch-chat' as NavIconName,
      },
      byHref('/portal/contacts') && {
        id: 'contacts',
        href: '/portal/contacts',
        label: 'Contacts',
        icon: 'contacts' as NavIconName,
      },
    ].filter(Boolean) as PortalRailDockItem[];
  }

  return [
    byHref('/portal') && {
      id: 'dashboard',
      href: '/portal',
      label: 'Dashboard',
      icon: 'dashboard' as NavIconName,
      exact: true,
    },
    byHref('/portal/protect') && {
      id: 'protect',
      href: '/portal/protect',
      label: 'Protect',
      icon: 'emergency' as NavIconName,
    },
    byHref('/portal/chat') && {
      id: 'chat',
      href: '/portal/chat',
      label: 'Chat',
      icon: 'dispatch-chat' as NavIconName,
    },
    byHref('/portal/home') && {
      id: 'home',
      href: '/portal/home',
      label: 'Home',
      icon: 'home' as NavIconName,
    },
    byHref('/portal/family') && {
      id: 'family',
      href: '/portal/family',
      label: 'Family',
      icon: 'family' as NavIconName,
    },
    byHref('/portal/vehicles') && {
      id: 'vehicle',
      href: '/portal/vehicles',
      label: 'Vehicles',
      icon: 'vehicle' as NavIconName,
    },
  ]
    .filter(Boolean)
    .slice(0, 5) as PortalRailDockItem[];
}

export function portalRailMoreActive(
  sections: PortalNavSection[],
  pathname: string,
  dock: PortalRailDockItem[],
): boolean {
  const dockHrefs = new Set(dock.map((item) => item.href));
  const candidates = sections.flatMap((section) => section.items.map((item) => item.href));
  return sections.some((section) =>
    section.items.some((item) => {
      if (dockHrefs.has(item.href)) return false;
      return navHrefIsActive(pathname, item.href, item.exact, candidates);
    }),
  );
}

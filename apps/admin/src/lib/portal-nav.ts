import type { NavIconName } from '@/components/nav/NavIcon';
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
    items: [{ href: '/portal', label: 'Dashboard', icon: 'dashboard', exact: true }],
  },
  {
    title: 'Emergency',
    icon: 'emergency',
    items: [
      { href: '/portal/emergency', label: 'Emergency Hub', icon: 'emergency', requiresAccess: 'emergency' },
      { href: '/portal/contacts', label: 'Emergency Contacts', icon: 'contacts', requiresAccess: 'emergency' },
      { href: '/portal/medical', label: 'Medical', icon: 'medical', requiresAccess: 'medical' },
      { href: '/portal/incidents', label: 'Incident History', icon: 'incidents', requiresAccess: 'emergency' },
      { href: '/portal/evidence', label: 'Evidence Vault', icon: 'evidence', requiresAccess: 'emergency' },
    ],
  },
  {
    title: 'Family',
    icon: 'family',
    items: [
      { href: '/portal/family', label: 'Family Safety', icon: 'family', requiresAccess: 'family' },
      { href: '/portal/family/chat', label: 'Family Chat', icon: 'dispatch-chat', requiresAccess: 'family' },
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
    items: [{ href: '/portal/personal', label: 'Personal Security', icon: 'personal', requiresAccess: 'personal' }],
  },
  {
    title: 'Account',
    icon: 'account',
    items: [
      { href: '/portal/subscription', label: 'Subscription', icon: 'subscription' },
      { href: '/portal/subscription/upgrade', label: 'Upgrade Plan', icon: 'upgrade' },
      { href: '/portal/updates', label: 'Security Updates', icon: 'updates' },
      { href: '/portal/profile', label: 'Profile', icon: 'profile' },
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

/** Sidebar sections/items visible for the current subscription */
export function filterPortalNav(
  access: AccessMap | null,
  loading: boolean,
  nav: PortalNavSection[] = PORTAL_NAV,
): PortalNavSection[] {
  if (loading || !access) {
    return nav.filter((section) => section.title === 'Overview' || section.title === 'Account');
  }

  return nav
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiresAccess || access[item.requiresAccess],
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Route segment → required access for direct URL guards */
export function portalPathRequiresAccess(pathname: string): keyof AccessMap | null {
  const segment = pathname.replace(/^\/portal\/?/, '').split('/')[0] || '';
  const rules: Record<string, keyof AccessMap> = {
    emergency: 'emergency',
    contacts: 'emergency',
    incidents: 'emergency',
    evidence: 'emergency',
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
  { href: '/portal/emergency', mobileLabel: 'SOS', icon: 'emergency', requiresAccess: 'emergency' },
  { href: '/portal/family', mobileLabel: 'Family', icon: 'family', requiresAccess: 'family' },
  { href: '/portal/home', mobileLabel: 'Home Sec', icon: 'safe-zones', requiresAccess: 'home' },
  { href: '/portal/profile', mobileLabel: 'Account', icon: 'profile' },
];

/** Floating mobile bottom bar — up to 5 primary portal destinations. */
export function portalMobileNav(
  access: AccessMap | null,
  loading: boolean,
): PortalMobileNavItem[] {
  return PORTAL_MOBILE_PREFERRED.filter((item) => {
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

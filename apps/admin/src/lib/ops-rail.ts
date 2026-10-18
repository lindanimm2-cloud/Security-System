import type { NavIconName } from '@/components/nav/NavIcon';
import { canAccessControlRoomRoute } from '@/lib/control-room-nav';

export type OpsRailLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export type OpsRailGroup = {
  id: string;
  label: string;
  icon: NavIconName;
  href: string;
  exact?: boolean;
  /** Expanded rail shows a heading plus child links. */
  nested?: boolean;
  children?: OpsRailLink[];
};

/**
 * Left dock — watch strip then respond strip.
 * Keep this short; everything else lives in More.
 */
export const OPS_DOCK_WATCH = ['command', 'cameras', 'alarms', 'map'] as const;
export const OPS_DOCK_RESPOND = ['dispatch', 'officers'] as const;

/** Dock-only solos — nested watch groups still appear in More for child pages. */
const OPS_DOCK_SOLO = new Set(['map', 'dispatch', 'officers']);

export const OPS_RAIL: OpsRailGroup[] = [
  {
    id: 'command',
    label: 'Command',
    icon: 'dashboard',
    href: '/control-room',
    exact: true,
    nested: true,
    children: [
      { href: '/control-room', label: 'Operations Wall', exact: true },
      { href: '/control-room/incidents', label: 'Incidents' },
      { href: '/control-room/command', label: 'Property Command' },
    ],
  },
  {
    id: 'cameras',
    label: 'Cameras',
    icon: 'surveillance',
    href: '/control-room/surveillance',
    nested: true,
    children: [
      { href: '/control-room/surveillance', label: 'Live View' },
      { href: '/control-room/surveillance?view=recordings', label: 'Playback' },
      { href: '/control-room/surveillance?view=exports', label: 'Backup & Export' },
      { href: '/control-room/emap', label: 'E-map' },
      { href: '/control-room/command?tab=intelligence', label: 'AI Detection' },
    ],
  },
  {
    id: 'alarms',
    label: 'Alarms',
    icon: 'alarm',
    href: '/control-room/alarm-systems',
    nested: true,
    children: [
      { href: '/control-room/alarm-systems', label: 'Alarm Overview' },
      { href: '/control-room/alarm-systems?tab=rules', label: 'Camera Rules' },
      { href: '/control-room/command?tab=alarms', label: 'Alarm Zones' },
      { href: '/control-room/alert-history', label: 'Alarm History' },
    ],
  },
  { id: 'map', label: 'Live Map', icon: 'live-map', href: '/control-room/map' },
  { id: 'dispatch', label: 'Dispatch', icon: 'calls', href: '/control-room/dispatch' },
  { id: 'officers', label: 'Officers', icon: 'team-chat', href: '/control-room/officers' },
  {
    id: 'field',
    label: 'Field',
    icon: 'fleet',
    href: '/control-room/fleet',
    nested: true,
    children: [
      { href: '/control-room/fleet', label: 'Vehicles' },
      { href: '/control-room/communications', label: 'Access & Gates' },
      { href: '/control-room/chat', label: 'Communications' },
    ],
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: 'devices',
    href: '/control-room/cctv-systems',
    nested: true,
    children: [
      { href: '/control-room/cctv-systems', label: 'CCTV Kits' },
      { href: '/control-room/device-security', label: 'Panic & Devices' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'analytics',
    href: '/control-room/analytics',
    nested: true,
    children: [
      { href: '/control-room/analytics', label: 'Operations Reports' },
      { href: '/control-room/documents', label: 'Documents' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'grid',
    href: '/control-room/teams',
    nested: true,
    children: [
      { href: '/control-room/teams', label: 'Teams & Users' },
      { href: '/control-room/customers', label: 'Subscriptions' },
      { href: '/control-room/installs', label: 'Install Jobs' },
      { href: '/control-room/developer', label: 'Developer' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'account',
    href: '/control-room/my-settings',
    nested: true,
    children: [
      { href: '/control-room/settings', label: 'Ops Settings' },
      { href: '/control-room/my-settings', label: 'My Settings' },
    ],
  },
];

/** Groups shown in the More flyout (no dock-solo duplicates). */
export function opsMoreGroups(groups: OpsRailGroup[]): OpsRailGroup[] {
  return groups.filter((group) => !OPS_DOCK_SOLO.has(group.id));
}

export function opsHrefActive(pathname: string, search: string, href: string, exact?: boolean): boolean {
  const base = new URL(href, 'http://4ds.local');
  const path = base.pathname.replace(/\/$/, '') || '/';
  const current = (pathname || '/').replace(/\/$/, '') || '/';
  const want = base.searchParams;
  const have = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  if (exact || path === '/control-room') {
    if (current !== path) return false;
  } else if (current !== path && !current.startsWith(`${path}/`)) {
    return false;
  }

  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) return false;
  }

  if (Array.from(want.keys()).length === 0 && (have.has('view') || have.has('tab'))) return false;
  return true;
}

export function opsGroupActive(group: OpsRailGroup, pathname: string, search: string): boolean {
  if (opsHrefActive(pathname, search, group.href, group.exact)) return true;
  return (group.children ?? []).some((child) => opsHrefActive(pathname, search, child.href, child.exact));
}

export function opsRailForRole(role: string): OpsRailGroup[] {
  return OPS_RAIL.flatMap((group) => {
    const children = (group.children ?? []).filter((item) => canAccessControlRoomRoute(role, item.href));
    const selfOk = canAccessControlRoomRoute(role, group.href);
    if (!selfOk && children.length === 0) return [];
    const href = selfOk ? group.href : children[0].href;
    const exact = selfOk ? group.exact : children[0].exact;
    return [{ ...group, href, exact, children }];
  });
}

export function opsRailDestinations(groups: OpsRailGroup[]): OpsRailLink[] {
  const seen = new Set<string>();
  const links: OpsRailLink[] = [];
  for (const group of groups) {
    const nested = Boolean(group.nested && (group.children?.length ?? 0) > 0);
    const items = nested ? (group.children ?? []) : [{ href: group.href, label: group.label, exact: group.exact }];
    for (const item of items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      links.push(item);
    }
  }
  return links;
}

/** Full 4DS Nexus Supply catalogue departments (SA security superstore). */
export const STORE_DEPARTMENTS = [
  {
    id: 'FIREARMS',
    label: 'Firearms & Licensed',
    icon: '🔫',
    blurb: 'Licensed pathways for authorised customers',
    requiresLicense: true,
  },
  {
    id: 'BODY_ARMOUR',
    label: 'Body Armour',
    icon: '🛡️',
    blurb: 'Vests, plates, helmets & PPE',
  },
  {
    id: 'PERSONAL_SECURITY',
    label: 'Personal Security',
    icon: '🚨',
    blurb: 'Less-lethal, panic & personal defence',
  },
  {
    id: 'CCTV',
    label: 'CCTV Cameras',
    icon: '📹',
    blurb: 'IP, PTZ, thermal & doorbell cameras',
  },
  {
    id: 'NVR_STORAGE',
    label: 'NVR / DVR & Storage',
    icon: '💾',
    blurb: 'Recorders, HDDs & backup',
  },
  {
    id: 'SMART_HOME',
    label: 'Smart Home Security',
    icon: '🏠',
    blurb: 'Doorbells, smart locks & hubs',
  },
  {
    id: 'ALARMS',
    label: 'Alarm Systems',
    icon: '🔔',
    blurb: 'Panels, sirens & GSM/LTE kits',
  },
  {
    id: 'SENSORS',
    label: 'Sensors & Detection',
    icon: '📡',
    blurb: 'PIR, contacts, beams & glass-break',
  },
  {
    id: 'ELECTRIC_FENCING',
    label: 'Electric Fencing',
    icon: '⚡',
    blurb: 'Energisers, monitoring & signs',
  },
  {
    id: 'PERIMETER',
    label: 'Perimeter Security',
    icon: '🚧',
    blurb: 'Beams, fence sensors & driveway alarms',
  },
  {
    id: 'ACCESS_CONTROL',
    label: 'Access Control',
    icon: '🔐',
    blurb: 'Biometrics, cards, maglocks & panels',
  },
  {
    id: 'GATES',
    label: 'Gates & Automation',
    icon: '🚪',
    blurb: 'Motors, boom gates & turnstiles',
  },
  {
    id: 'INTERCOMS',
    label: 'Intercoms & Radios',
    icon: '📞',
    blurb: 'Video intercoms & two-way radios',
  },
  {
    id: 'GUARD_EQUIPMENT',
    label: 'Guard Equipment',
    icon: '👮',
    blurb: 'Uniforms, batons, torches & duty gear',
  },
  {
    id: 'GUARD_TOUR',
    label: 'Guard Tour Systems',
    icon: '📍',
    blurb: 'Patrol tags, scanners & software',
  },
  {
    id: 'VEHICLE_SECURITY',
    label: 'Vehicle Security',
    icon: '🚗',
    blurb: 'Trackers, dash cams & immobilisers',
  },
  {
    id: 'LIGHTING',
    label: 'Security Lighting',
    icon: '💡',
    blurb: 'Floodlights, solar & IR illuminators',
  },
  {
    id: 'NETWORKING',
    label: 'Networking',
    icon: '🌐',
    blurb: 'PoE switches, cable & LTE routers',
  },
  {
    id: 'POWER',
    label: 'Power & Backup',
    icon: '🔌',
    blurb: 'PSUs, UPS, batteries & solar',
  },
  {
    id: 'INSTALL_MATERIALS',
    label: 'Install Materials',
    icon: '🔩',
    blurb: 'Cable, connectors, conduit & mounts',
  },
  {
    id: 'TOOLS',
    label: 'Installation Tools',
    icon: '🧰',
    blurb: 'Hand tools, drills & cable tools',
  },
  {
    id: 'TECH_EQUIPMENT',
    label: 'Technician Gear',
    icon: '🔧',
    blurb: 'CCTV testers, multimeters & fibre',
  },
  {
    id: 'SAFES',
    label: 'Safes & Storage',
    icon: '🔒',
    blurb: 'Home, office, gun & cash safes',
  },
  {
    id: 'LOCKS',
    label: 'Locks & Hardware',
    icon: '🔑',
    blurb: 'Padlocks, cylinders & smart locks',
  },
  {
    id: 'PHYSICAL_PERIMETER',
    label: 'Physical Perimeter',
    icon: '🧱',
    blurb: 'Bars, palisade, razor & spikes',
  },
  {
    id: 'FIRE_SAFETY',
    label: 'Fire & Life Safety',
    icon: '🔥',
    blurb: 'Extinguishers, detectors & exit signs',
  },
  {
    id: 'PACKAGES',
    label: 'Security Packages',
    icon: '📦',
    blurb: 'Home, business & industrial bundles',
  },
  {
    id: 'CONTROL_ROOM',
    label: 'Control Room',
    icon: '🖥️',
    blurb: 'Monitors, radios & operator gear',
  },
  {
    id: 'SIGNS',
    label: 'Signs & ID',
    icon: '🪧',
    blurb: 'CCTV, armed response & fence signs',
  },
  {
    id: 'INSPECTION',
    label: 'Inspection Equipment',
    icon: '🚁',
    blurb: 'Drones & inspection cameras',
  },
  {
    id: 'CYBER',
    label: 'Cyber & Digital',
    icon: '💻',
    blurb: 'Firewalls, VPN & secure storage',
  },
  {
    id: 'SPARE_PARTS',
    label: 'Spare Parts',
    icon: '⚙️',
    blurb: 'Batteries, remotes, cards & brackets',
  },
] as const;

export type StoreDepartmentId = (typeof STORE_DEPARTMENTS)[number]['id'];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  STORE_DEPARTMENTS.map((d) => [d.id, d.label]),
);

/** Legacy Prisma values still present until DB remap — hide from shop nav. */
export const LEGACY_CATEGORIES = new Set([
  'VESTS',
  'BATONS',
  'TASERS',
  'GEAR',
  'ACCESSORIES',
]);

export const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  STORE_DEPARTMENTS.map((d) => [d.id, d.icon]),
);

export function shopCategoriesFromApi(apiCategories: string[]): string[] {
  const allowed = new Set(STORE_DEPARTMENTS.map((d) => d.id));
  const ordered = STORE_DEPARTMENTS.map((d) => d.id).filter(
    (id) => apiCategories.includes(id) || allowed.has(id),
  );
  // Prefer API order filtered to known store depts; if API empty, show all depts
  const fromApi = STORE_DEPARTMENTS.map((d) => d.id).filter((id) =>
    apiCategories.includes(id),
  );
  return fromApi.length ? fromApi : ordered;
}

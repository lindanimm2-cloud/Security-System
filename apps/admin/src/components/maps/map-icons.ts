import L from 'leaflet';
import type {
  ClientType,
  IncidentCategory,
  OfficerType,
  PropertyType,
  VehicleType,
} from './map-types';

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function divIcon(
  html: string,
  className: string,
  size = 32,
  pulse = false,
) {
  return L.divIcon({
    className: `map-marker-wrap ${className}${pulse ? ' map-marker-wrap--pulse' : ''}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Compact white line icons for map pins */
const SVG = {
  person: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Zm0 2.2c-3.6 0-6.6 1.8-6.6 4v1.1h13.2V18.2c0-2.2-3-4-6.6-4Z"/></svg>`,
  child: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 11.2a3.4 3.4 0 1 0-3.4-3.4A3.4 3.4 0 0 0 12 11.2Zm0 1.6c-3.1 0-5.6 1.5-5.6 3.4v1.4h11.2v-1.4c0-1.9-2.5-3.4-5.6-3.4Z"/></svg>`,
  star: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.6 7.2 18.1l.9-5.4-3.9-3.8 5.4-.8Z"/></svg>`,
  medical: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.2 4.5h3.6v5.7h5.7v3.6h-5.7v5.7h-3.6v-5.7H4.5v-3.6h5.7Z"/></svg>`,
  shield: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 5.2 5.8v5.3c0 4.4 2.9 8.4 6.8 9.7 3.9-1.3 6.8-5.3 6.8-9.7V5.8Zm0 2.2 5.2 2v3.7c0 3.3-2.1 6.4-5.2 7.5-3.1-1.1-5.2-4.2-5.2-7.5V7.4Z"/></svg>`,
  eye: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 6.2C7 6.2 2.8 9.3 1.4 12c1.4 2.7 5.6 5.8 10.6 5.8S21.2 14.7 22.6 12C21.2 9.3 17 6.2 12 6.2Zm0 9.2A3.4 3.4 0 1 1 15.4 12 3.4 3.4 0 0 1 12 15.4Zm0-5.4A2 2 0 1 0 14 12a2 2 0 0 0-2-2Z"/></svg>`,
  dog: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.2 8.2 4.5 6.6v2.8l2 1.1v5.9h2.2v-3.1h4.4l1.5 3.1H17l-1.7-3.5c1.3-.5 2.2-1.7 2.2-3.1V7.4h-2.1v1.8H13V6.5H9.8v2.7H8.4l-.2-1Zm8.8 9.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z"/></svg>`,
  badge: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8 8.4 4.6v3.7c0 .9.5 2.1 1.4 2.8L8.2 18.8h7.6l-1.6-7.7c.9-.7 1.4-1.9 1.4-2.8V4.6Zm0 2.1 2.1 1v2.4c0 .6-.4 1.3-1 1.6l-.6.4-.5-.4c-.6-.3-1-.9-1-1.6V5.9Z"/></svg>`,
  tactical: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.5 4.8 7v5.2c0 4.6 3.1 8.8 7.2 9.8 4.1-1 7.2-5.2 7.2-9.8V7Zm0 2.3 5.5 2.6v4c0 3.2-2.1 6.1-5.5 7.1-3.4-1-5.5-3.9-5.5-7.1v-4Z"/></svg>`,
  car: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.4 11.2 6.8 7.4A1.8 1.8 0 0 1 8.5 6.2h7a1.8 1.8 0 0 1 1.7 1.2l1.4 3.8H20a1 1 0 0 1 1 1v3.2a1 1 0 0 1-1 1h-.8a2.2 2.2 0 0 1-4.3 0H9.1a2.2 2.2 0 0 1-4.3 0H4a1 1 0 0 1-1-1v-3.2a1 1 0 0 1 1-1Zm2.5.8a1.3 1.3 0 1 0 1.3 1.3A1.3 1.3 0 0 0 7.9 12Zm8.2 0a1.3 1.3 0 1 0 1.3 1.3A1.3 1.3 0 0 0 16.1 12ZM8.7 8l-.9 2.5h8.4L15.3 8Z"/></svg>`,
  motorcycle: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.2 14.2a2.6 2.6 0 1 0 2.6 2.6 2.6 2.6 0 0 0-2.6-2.6Zm11.6 0a2.6 2.6 0 1 0 2.6 2.6 2.6 2.6 0 0 0-2.6-2.6ZM8.8 12.4l1.8-3.2h3.1l1.2 2.1h2.3l-1.5-2.8a1.4 1.4 0 0 0-1.3-.8H10a1.4 1.4 0 0 0-1.3.8L7.2 12.1Zm1.5 1.8h5.2l.7 1.2H9.6Z"/></svg>`,
  ambulance: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 10.2h9.2V6.8H15l3.8 3.4V16H17a2.2 2.2 0 0 1-4.3 0H9.5a2.2 2.2 0 0 1-4.3 0H4Zm4.2-1.8H7v1.2H5.8v1.4H7v1.2h1.4v-1.2h1.2V9.6H8.4Zm8.8 1.3-1.8-1.6v1.6Z"/></svg>`,
  tow: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.8 11.5h6.2l1.2-2.8h3.5l1.5 2.8H20v2.2h-1.1a2.1 2.1 0 0 1-4.1 0H9.4a2.1 2.1 0 0 1-4.1 0H3.8Zm12.4-4.2.9 1.7h1.7V7.3Zm-8.9 6.4a1.2 1.2 0 1 0 1.2 1.2 1.2 1.2 0 0 0-1.2-1.2Zm8.4 0a1.2 1.2 0 1 0 1.2 1.2 1.2 1.2 0 0 0-1.2-1.2Z"/></svg>`,
  house: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.6 3.8 10.2V20h6.1v-5.2h4.2V20h6.1v-9.8Zm0 2.4 6.4 5.1V18h-2.5v-5.2H8.1V18H5.6v-6.9Z"/></svg>`,
  alarm: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4.2a6.2 6.2 0 0 0-6.2 6.2v3.1L4.2 16v1.4h15.6V16l-1.6-2.5v-3.1A6.2 6.2 0 0 0 12 4.2Zm-1.8 14.2h3.6a1.8 1.8 0 0 1-3.6 0Z"/></svg>`,
  camera: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.2 6.4 10.5 8h7.3A1.8 1.8 0 0 1 19.6 9.8v7.4a1.8 1.8 0 0 1-1.8 1.8H6.2A1.8 1.8 0 0 1 4.4 17.2V9.8A1.8 1.8 0 0 1 6.2 8h1.7l1.3-1.6Zm2.8 3.2a3.4 3.4 0 1 0 3.4 3.4 3.4 3.4 0 0 0-3.4-3.4Zm0 2a1.4 1.4 0 1 1-1.4 1.4 1.4 1.4 0 0 1 1.4-1.4Z"/></svg>`,
  estate: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.2 19.2h6.2V11l3.4-2.6 3.4 2.6v8.2h2.6V9.4L13.8 4.8 4.2 9.4Zm2.2-2h1.8v-1.8H6.4Zm0-3.2h1.8V12H6.4Zm3.4 3.2h1.8v-1.8H9.8Zm0-3.2h1.8V12H9.8Zm3.2 5.2h1.8v-4.2h-1.8Zm3.2 0h1.8v-4.2h-1.8Z"/></svg>`,
  alert: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4.2 2.8 19.6h18.4Zm0 4.2 5.5 9.2H6.5Zm-.9 3.1h1.8v3.2H11.1Zm0 4.1h1.8v1.6H11.1Z"/></svg>`,
  silent: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4.4a5.8 5.8 0 0 0-5.8 5.8v2.8L4.6 15v1.2h6.1v1.8a1.3 1.3 0 0 0 2.6 0v-1.8h6.1V15l-1.6-2V10.2A5.8 5.8 0 0 0 12 4.4Zm7.2-1.1 1.1 1.1-15.4 15.4-1.1-1.1Z"/></svg>`,
  fire: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.4 3.4s1.8 2.3 1.8 4.4a3.2 3.2 0 0 1-3.2 3.2 3 3 0 0 1-.5-5.9C9.2 7.8 8 9.9 8 12.2a4.4 4.4 0 0 0 8.8 0c0-3.4-2.4-5.9-4.4-8.8Z"/></svg>`,
  lock: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.8a3.6 3.6 0 0 0-3.6 3.6v2.2H6.8v10.6h10.4V9.6h-1.6V7.4A3.6 3.6 0 0 0 12 3.8Zm0 2a1.6 1.6 0 0 1 1.6 1.6v2.2h-3.2V7.4A1.6 1.6 0 0 1 12 5.8Z"/></svg>`,
  escort: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.2 11.2a3.2 3.2 0 1 0-3.2-3.2 3.2 3.2 0 0 0 3.2 3.2Zm7.6 0a3.2 3.2 0 1 0-3.2-3.2 3.2 3.2 0 0 0 3.2 3.2ZM8.2 13c-2.8 0-5.2 1.4-5.2 3.1v2.1h10.4V16.1C13.4 14.4 11 13 8.2 13Zm7.6 0c-.5 0-1 .1-1.5.2 1.2.8 2 1.9 2 3.2v2h5.1V16.1c0-1.7-2.4-3.1-5.6-3.1Z"/></svg>`,
  heart: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 19.4 10.6 18.1C6.2 14.1 3.4 11.5 3.4 8.4A3.9 3.9 0 0 1 7.3 4.5 4.3 4.3 0 0 1 12 6.7a4.3 4.3 0 0 1 4.7-2.2 3.9 3.9 0 0 1 3.9 3.9c0 3.1-2.8 5.7-7.2 9.7Z"/></svg>`,
  community: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7.2A2.8 2.8 0 1 0 9.2 4.4 2.8 2.8 0 0 0 12 7.2Zm-6.4 2.2A2.4 2.4 0 1 0 3.2 7a2.4 2.4 0 0 0 2.4 2.4Zm12.8 0A2.4 2.4 0 1 0 18.4 7a2.4 2.4 0 0 0 2.4 2.4ZM12 9.4c-2.5 0-4.6 1.3-4.6 2.9v2.1h9.2v-2.1c0-1.6-2.1-2.9-4.6-2.9Zm-6.4 1.2c-.4 0-.8.1-1.2.2.9.7 1.5 1.6 1.5 2.7v1.9h2.8v-1.5c0-.9-.4-1.7-1.1-2.3Zm13.9.2c-.4-.1-.8-.2-1.1-.2-.7.6-1.2 1.4-1.2 2.3v1.5h2.8v-1.9c0-1.1.6-2 1.5-2.7Z"/></svg>`,
  question: `<svg class="map-marker-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17.4h2v2h-2Zm1-13a5 5 0 0 0-5 5h2a3 3 0 1 1 3.8 2.9c-.9.3-1.8 1.1-1.8 2.3v.8h2v-.7c0-.4.3-.8.9-1A5 5 0 0 0 12 4.4Z"/></svg>`,
};

type GlyphSpec = { icon: string; cls: string; size?: number };

const CLIENT_GLYPH: Record<ClientType, GlyphSpec> = {
  STANDARD: { icon: SVG.person, cls: 'client--standard' },
  FAMILY_MEMBER: { icon: SVG.person, cls: 'client--family' },
  CHILD: { icon: SVG.child, cls: 'client--child' },
  ELDERLY: { icon: SVG.person, cls: 'client--elderly' },
  VIP: { icon: SVG.star, cls: 'client--vip' },
  MEDICAL: { icon: SVG.medical, cls: 'client--medical' },
};

const OFFICER_GLYPH: Record<OfficerType, GlyphSpec> = {
  ARMED_RESPONSE: { icon: SVG.shield, cls: 'officer--armed' },
  UNDERCOVER: { icon: SVG.eye, cls: 'officer--undercover' },
  K9: { icon: SVG.dog, cls: 'officer--k9' },
  SUPERVISOR: { icon: SVG.badge, cls: 'officer--supervisor' },
  TACTICAL: { icon: SVG.tactical, cls: 'officer--tactical' },
  MEDICAL: { icon: SVG.medical, cls: 'officer--medical' },
  OFF_DUTY: { icon: SVG.person, cls: 'officer--offduty' },
};

const OFFICER_TYPE_ALIASES: Record<string, OfficerType> = {
  PATROL: 'ARMED_RESPONSE',
  MOTORCYCLE: 'TACTICAL',
  TOW: 'ARMED_RESPONSE',
  CLIENT: 'ARMED_RESPONSE',
  STOLEN: 'UNDERCOVER',
};

function resolveOfficerType(type: string): OfficerType {
  if (type in OFFICER_GLYPH) return type as OfficerType;
  return OFFICER_TYPE_ALIASES[type] ?? 'ARMED_RESPONSE';
}

const VEHICLE_GLYPH: Record<VehicleType, GlyphSpec> = {
  CLIENT: { icon: SVG.car, cls: 'vehicle--client' },
  STOLEN: { icon: SVG.car, cls: 'vehicle--stolen' },
  ARMED_RESPONSE: { icon: SVG.car, cls: 'vehicle--armed' },
  UNDERCOVER: { icon: SVG.car, cls: 'vehicle--undercover' },
  PATROL: { icon: SVG.car, cls: 'vehicle--patrol' },
  MOTORCYCLE: { icon: SVG.motorcycle, cls: 'vehicle--moto' },
  MEDICAL: { icon: SVG.ambulance, cls: 'vehicle--medical' },
  TOW: { icon: SVG.tow, cls: 'vehicle--tow' },
};

const PROPERTY_GLYPH: Record<PropertyType, GlyphSpec> = {
  REGISTERED_HOME: { icon: SVG.house, cls: 'property--home' },
  ALARM_ACTIVE: { icon: SVG.alarm, cls: 'property--alarm' },
  CCTV: { icon: SVG.camera, cls: 'property--cctv' },
  PANIC_EVENT: { icon: SVG.alert, cls: 'property--panic' },
  GUARDED_ESTATE: { icon: SVG.estate, cls: 'property--estate' },
};

const PROPERTY_TYPE_ALIASES: Record<string, PropertyType> = {
  HOUSE: 'REGISTERED_HOME',
  HOME: 'REGISTERED_HOME',
  APARTMENT: 'REGISTERED_HOME',
  FLAT: 'REGISTERED_HOME',
  ALARM_OK: 'REGISTERED_HOME',
  ALARM_STAY: 'REGISTERED_HOME',
  ALARM_TRIGGERED: 'ALARM_ACTIVE',
  WAREHOUSE: 'GUARDED_ESTATE',
  MALL: 'GUARDED_ESTATE',
  ESTATE: 'GUARDED_ESTATE',
  CAMERA: 'CCTV',
  PANIC: 'PANIC_EVENT',
};

function resolvePropertyType(type: string): PropertyType {
  if (type in PROPERTY_GLYPH) return type as PropertyType;
  return PROPERTY_TYPE_ALIASES[type] ?? 'REGISTERED_HOME';
}

const INCIDENT_GLYPH: Record<IncidentCategory, GlyphSpec> = {
  PANIC: { icon: SVG.alert, cls: 'incident--panic', size: 42 },
  SILENT_PANIC: { icon: SVG.silent, cls: 'incident--silent', size: 34 },
  THEFT_RECOVERY: { icon: SVG.car, cls: 'incident--theft', size: 34 },
  MEDICAL: { icon: SVG.medical, cls: 'incident--medical', size: 34 },
  FIRE: { icon: SVG.fire, cls: 'incident--fire', size: 34 },
  INTRUSION: { icon: SVG.lock, cls: 'incident--intrusion', size: 34 },
  ESCORT: { icon: SVG.escort, cls: 'incident--escort', size: 32 },
  WELLNESS: { icon: SVG.heart, cls: 'incident--wellness', size: 32 },
  SUSPICIOUS: { icon: SVG.question, cls: 'incident--suspicious', size: 32 },
  COMMUNITY: { icon: SVG.community, cls: 'incident--community', size: 32 },
};

function markerHtml(kind: string, cls: string, icon: string, extra = '') {
  return `<div class="map-marker map-marker--${kind} ${cls}${extra}">${icon}</div>`;
}

export function clientIcon(type: ClientType | string) {
  const { icon, cls } = CLIENT_GLYPH[(type as ClientType)] ?? CLIENT_GLYPH.STANDARD;
  return divIcon(markerHtml('client', cls, icon), `map-marker-wrap--client ${cls}`);
}

export function officerIcon(type: OfficerType | string, avatarUrl?: string | null) {
  const { icon, cls } = OFFICER_GLYPH[resolveOfficerType(type)];
  const hasPhoto = Boolean(avatarUrl);
  const inner = hasPhoto
    ? `<img class="map-marker-photo" src="${escapeAttr(avatarUrl!)}" alt="" />`
    : icon;
  return divIcon(
    markerHtml('officer', cls, inner, hasPhoto ? ' map-marker--photo' : ''),
    `map-marker-wrap--officer ${cls}${hasPhoto ? ' map-marker-wrap--photo' : ''}`,
    hasPhoto ? 38 : 34,
  );
}

export function vehicleIcon(type: VehicleType | string) {
  const { icon, cls } = VEHICLE_GLYPH[(type as VehicleType)] ?? VEHICLE_GLYPH.CLIENT;
  return divIcon(
    markerHtml('vehicle', cls, icon),
    `map-marker-wrap--vehicle ${cls}`,
    type === 'STOLEN' ? 36 : 34,
    type === 'STOLEN',
  );
}

export function fleetIcon(vehicleType: string, crewCount: number) {
  const icon =
    vehicleType === 'MOTORCYCLE'
      ? SVG.motorcycle
      : vehicleType === 'MEDICAL'
        ? SVG.ambulance
        : vehicleType === 'FIRE_TRUCK'
          ? SVG.fire
          : vehicleType === 'ARMED_RESPONSE' || vehicleType === 'TACTICAL'
            ? SVG.car
            : SVG.car;
  const badge =
    crewCount > 1
      ? `<span class="map-marker-crew-badge">${crewCount}</span>`
      : '';
  return divIcon(
    `<div class="map-marker map-marker--fleet">${icon}${badge}</div>`,
    'map-marker-wrap--fleet',
    36,
    vehicleType === 'ARMED_RESPONSE' || vehicleType === 'FIRE_TRUCK',
  );
}

export function propertyIcon(type: PropertyType | string) {
  const resolved = resolvePropertyType(String(type));
  const { icon, cls } = PROPERTY_GLYPH[resolved];
  return divIcon(
    markerHtml('property', cls, icon),
    `map-marker-wrap--property ${cls}`,
    32,
    resolved === 'ALARM_ACTIVE' || resolved === 'PANIC_EVENT',
  );
}

export function incidentIcon(category: IncidentCategory | string) {
  const { icon, cls, size = 32 } =
    INCIDENT_GLYPH[(category as IncidentCategory)] ?? INCIDENT_GLYPH.SUSPICIOUS;
  const pulse = category === 'PANIC' || category === 'SILENT_PANIC' || category === 'THEFT_RECOVERY';
  return divIcon(
    markerHtml('incident', cls, icon),
    `map-marker-wrap--incident ${cls}`,
    size,
    pulse,
  );
}

export function clusterCountIcon(count: number) {
  const size = count >= 25 ? 48 : count >= 8 ? 42 : 36;
  const tone = count >= 25 ? 'large' : count >= 8 ? 'medium' : 'small';
  return L.divIcon({
    className: `map-cluster-wrap map-cluster-wrap--${tone}`,
    html: `<div class="map-cluster map-cluster--${tone}"><span>${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function selectedRingIcon(baseHtml: string, className: string, size = 38) {
  return divIcon(
    `<div class="map-marker-selected-ring">${baseHtml}</div>`,
    className,
    size + 8,
  );
}

/** @deprecated Legacy LiveMap exports */
export const userIcon = clientIcon('STANDARD');
/** @deprecated Legacy LiveMap exports */
export const officerIconLegacy = officerIcon('ARMED_RESPONSE');

/** @deprecated Legacy LiveMap — maps incident type string to icon */
export function legacyIncidentIcon(type: string) {
  if (type === 'PANIC') return incidentIcon('PANIC');
  if (type === 'THEFT') return incidentIcon('THEFT_RECOVERY');
  if (type === 'MEDICAL') return incidentIcon('MEDICAL');
  if (type === 'FIRE') return incidentIcon('FIRE');
  return incidentIcon('SUSPICIOUS');
}

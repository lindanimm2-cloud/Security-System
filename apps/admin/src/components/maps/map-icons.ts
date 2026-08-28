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

const CLIENT_GLYPH: Record<ClientType, { glyph: string; cls: string }> = {
  STANDARD: { glyph: 'C', cls: 'client--standard' },
  FAMILY_MEMBER: { glyph: 'F', cls: 'client--family' },
  CHILD: { glyph: 'K', cls: 'client--child' },
  ELDERLY: { glyph: 'E', cls: 'client--elderly' },
  VIP: { glyph: '★', cls: 'client--vip' },
  MEDICAL: { glyph: '+', cls: 'client--medical' },
};

const OFFICER_GLYPH: Record<OfficerType, { glyph: string; cls: string }> = {
  ARMED_RESPONSE: { glyph: 'AR', cls: 'officer--armed' },
  UNDERCOVER: { glyph: 'UC', cls: 'officer--undercover' },
  K9: { glyph: 'K9', cls: 'officer--k9' },
  SUPERVISOR: { glyph: 'SV', cls: 'officer--supervisor' },
  TACTICAL: { glyph: 'TX', cls: 'officer--tactical' },
  MEDICAL: { glyph: 'MD', cls: 'officer--medical' },
  OFF_DUTY: { glyph: 'OD', cls: 'officer--offduty' },
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

const VEHICLE_GLYPH: Record<VehicleType, { glyph: string; cls: string }> = {
  CLIENT: { glyph: 'V', cls: 'vehicle--client' },
  STOLEN: { glyph: 'S', cls: 'vehicle--stolen' },
  ARMED_RESPONSE: { glyph: 'AR', cls: 'vehicle--armed' },
  UNDERCOVER: { glyph: 'UC', cls: 'vehicle--undercover' },
  PATROL: { glyph: 'P', cls: 'vehicle--patrol' },
  MOTORCYCLE: { glyph: 'M', cls: 'vehicle--moto' },
  MEDICAL: { glyph: 'MD', cls: 'vehicle--medical' },
  TOW: { glyph: 'T', cls: 'vehicle--tow' },
};

const PROPERTY_GLYPH: Record<PropertyType, { glyph: string; cls: string }> = {
  REGISTERED_HOME: { glyph: 'H', cls: 'property--home' },
  ALARM_ACTIVE: { glyph: '!', cls: 'property--alarm' },
  CCTV: { glyph: 'C', cls: 'property--cctv' },
  PANIC_EVENT: { glyph: 'P', cls: 'property--panic' },
  GUARDED_ESTATE: { glyph: 'G', cls: 'property--estate' },
};

const INCIDENT_GLYPH: Record<IncidentCategory, { glyph: string; cls: string; size: number }> = {
  PANIC: { glyph: '!', cls: 'incident--panic', size: 42 },
  SILENT_PANIC: { glyph: 'SP', cls: 'incident--silent', size: 34 },
  THEFT_RECOVERY: { glyph: 'TR', cls: 'incident--theft', size: 34 },
  MEDICAL: { glyph: '+', cls: 'incident--medical', size: 34 },
  FIRE: { glyph: 'F', cls: 'incident--fire', size: 34 },
  INTRUSION: { glyph: 'IA', cls: 'incident--intrusion', size: 34 },
  ESCORT: { glyph: 'ES', cls: 'incident--escort', size: 32 },
  WELLNESS: { glyph: 'W', cls: 'incident--wellness', size: 32 },
  SUSPICIOUS: { glyph: '?', cls: 'incident--suspicious', size: 32 },
  COMMUNITY: { glyph: 'CA', cls: 'incident--community', size: 32 },
};

export function clientIcon(type: ClientType | string) {
  const { glyph, cls } = CLIENT_GLYPH[(type as ClientType)] ?? CLIENT_GLYPH.STANDARD;
  return divIcon(
    `<div class="map-marker map-marker--client ${cls}">${glyph}</div>`,
    `map-marker-wrap--client ${cls}`,
  );
}

export function officerIcon(type: OfficerType | string, avatarUrl?: string | null) {
  const { glyph, cls } = OFFICER_GLYPH[resolveOfficerType(type)];
  const hasPhoto = Boolean(avatarUrl);
  const inner = hasPhoto
    ? `<img class="map-marker-photo" src="${escapeAttr(avatarUrl!)}" alt="" />`
    : glyph;
  return divIcon(
    `<div class="map-marker map-marker--officer ${cls}${hasPhoto ? ' map-marker--photo' : ''}">${inner}</div>`,
    `map-marker-wrap--officer ${cls}${hasPhoto ? ' map-marker-wrap--photo' : ''}`,
    hasPhoto ? 38 : 34,
  );
}

export function vehicleIcon(type: VehicleType | string) {
  const { glyph, cls } = VEHICLE_GLYPH[(type as VehicleType)] ?? VEHICLE_GLYPH.CLIENT;
  return divIcon(
    `<div class="map-marker map-marker--vehicle ${cls}">${glyph}</div>`,
    `map-marker-wrap--vehicle ${cls}`,
    type === 'STOLEN' ? 36 : 32,
    type === 'STOLEN',
  );
}

export function fleetIcon(vehicleType: string, crewCount: number) {
  const glyph =
    vehicleType === 'MOTORCYCLE'
      ? 'M'
      : vehicleType === 'MEDICAL'
        ? 'MD'
        : vehicleType === 'FIRE_TRUCK'
          ? 'FT'
          : vehicleType === 'ARMED_RESPONSE'
            ? 'AR'
            : vehicleType === 'TACTICAL'
              ? 'TX'
              : 'FV';
  const badge =
    crewCount > 1
      ? `<span class="map-marker-crew-badge">${crewCount}</span>`
      : '';
  return divIcon(
    `<div class="map-marker map-marker--fleet">${glyph}${badge}</div>`,
    'map-marker-wrap--fleet',
    36,
    vehicleType === 'ARMED_RESPONSE' || vehicleType === 'FIRE_TRUCK',
  );
}

export function propertyIcon(type: PropertyType | string) {
  const { glyph, cls } = PROPERTY_GLYPH[(type as PropertyType)] ?? PROPERTY_GLYPH.REGISTERED_HOME;
  return divIcon(
    `<div class="map-marker map-marker--property ${cls}">${glyph}</div>`,
    `map-marker-wrap--property ${cls}`,
    30,
    type === 'ALARM_ACTIVE' || type === 'PANIC_EVENT',
  );
}

export function incidentIcon(category: IncidentCategory | string) {
  const { glyph, cls, size } = INCIDENT_GLYPH[(category as IncidentCategory)] ?? INCIDENT_GLYPH.SUSPICIOUS;
  const pulse = category === 'PANIC' || category === 'SILENT_PANIC' || category === 'THEFT_RECOVERY';
  return divIcon(
    `<div class="map-marker map-marker--incident ${cls}">${glyph}</div>`,
    `map-marker-wrap--incident ${cls}`,
    size,
    pulse,
  );
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

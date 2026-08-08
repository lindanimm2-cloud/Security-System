import type { MapCommandData } from '@/components/maps/map-types';

/** Fixed clock for live-map screenshots (SAST). */
export const MAP_SCREENSHOT_FROZEN_AT = new Date('2050-12-18T10:43:04+02:00');

const FROZEN_ISO = MAP_SCREENSHOT_FROZEN_AT.toISOString();
const SCREENSHOT_YEAR = String(MAP_SCREENSHOT_FROZEN_AT.getFullYear());

/** Alias date label for screenshots — e.g. "2050 Dec" (no real calendar day). */
export function formatScreenshotAliasDate(date: Date = MAP_SCREENSHOT_FROZEN_AT): string {
  const year = date.getFullYear();
  const month = date
    .toLocaleDateString('en-ZA', { month: 'short' })
    .replace(/\.$/, '')
    .toUpperCase();
  return `${year} ${month}`;
}


function screenshotId(value: string): string {
  return value.replace(/\b2026\b/g, SCREENSHOT_YEAR);
}

function maskPhone(): string {
  return '+27 ** *** ****';
}

function clientAlias(membershipNumber: string | null | undefined, index: number): string {
  const alias = membershipNumber ?? `CLT-${String(index + 1).padStart(3, '0')}`;
  return screenshotId(alias);
}

export function maskMapDataForScreenshot(data: MapCommandData): MapCommandData {
  const clientNameToAlias = new Map(
    data.clients.map((c, i) => [c.name, clientAlias(c.membershipNumber, i)]),
  );
  const clientIdToAlias = new Map(
    data.clients.map((c, i) => [c.id, clientAlias(c.membershipNumber, i)]),
  );

  const officerNameToUnit = new Map(data.officers.map((o) => [o.name, o.unitNumber]));
  const officerIdToUnit = new Map(data.officers.map((o) => [o.id, o.unitNumber]));

  const clients = data.clients.map((c, i) => ({
    ...c,
    name: clientAlias(c.membershipNumber, i),
    membershipNumber: c.membershipNumber ? screenshotId(c.membershipNumber) : null,
    validUntil: c.validUntil ? screenshotId(c.validUntil) : null,
    phone: maskPhone(),
    emergencyContacts: c.emergencyContacts.map((ec, j) => ({
      name: `Contact ${j + 1}`,
      phone: maskPhone(),
    })),
    updatedAt: FROZEN_ISO,
  }));

  const officers = data.officers.map((o) => ({
    ...o,
    name: o.unitNumber,
    avatarUrl: null,
    phone: maskPhone(),
    crewMates: o.crewMates?.map((m, i) => ({
      ...m,
      name: `Crew ${i + 1}`,
    })),
  }));

  const incidents = data.incidents.map((inc, i) => ({
    ...inc,
    name:
      (inc.clientUserId && clientIdToAlias.get(inc.clientUserId)) ||
      `INC-${String(i + 1).padStart(3, '0')}`,
    clientPhone: maskPhone(),
    assignedOfficer: inc.assignedOfficer
      ? (officerNameToUnit.get(inc.assignedOfficer) ?? inc.assignedOfficer)
      : null,
    createdAt: FROZEN_ISO,
  }));

  const vehicles = data.vehicles.map((v) => ({
    ...v,
    owner: clientNameToAlias.get(v.owner) ?? 'Client vehicle',
    updatedAt: FROZEN_ISO,
  }));

  const fleet = data.fleet?.map((v) => ({
    ...v,
    crew: v.crew.map((c) => ({
      ...c,
      name: officerIdToUnit.get(c.officerId) ?? c.role.replace(/_/g, ' '),
    })),
    updatedAt: FROZEN_ISO,
  }));

  const properties = data.properties.map((p, i) => ({
    ...p,
    name: p.name.startsWith('Home') || p.name.startsWith('Property') ? `Property ${i + 1}` : p.name,
    owner: clientNameToAlias.get(p.owner) ?? 'Subscriber',
  }));

  return {
    ...data,
    clients,
    officers,
    incidents,
    vehicles,
    fleet,
    properties,
  };
}

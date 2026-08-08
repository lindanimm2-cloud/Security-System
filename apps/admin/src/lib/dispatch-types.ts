export type DispatchOfficerOption = {
  id: string;
  name: string;
  status: string;
  zone: string | null;
  available: boolean;
  distanceKm: number | null;
  eta: string;
  unitCallSign?: string | null;
  vehicleType?: string | null;
  registration?: string | null;
  unitLabel?: string | null;
};

export type DispatchVolunteerOption = {
  id: string;
  name: string;
  status: string;
  zone: string | null;
  distanceKm: number | null;
  eta: string | null;
  signalledAt: string;
  unitCallSign?: string | null;
  vehicleType?: string | null;
  registration?: string | null;
  unitLabel?: string | null;
};

export type DispatchOptionsData = {
  incident: {
    id: string;
    type: string;
    status: string;
    priority: string;
    address: string | null;
    client: string;
  };
  canDispatch: boolean;
  assignedOfficer: string | null;
  availableCount: number;
  officers: DispatchOfficerOption[];
  volunteers: DispatchVolunteerOption[];
  emergencyRaisedRecently: boolean;
};

export function formatVehicleType(type: string | null | undefined): string | null {
  if (!type) return null;
  return type.replace(/_/g, ' ');
}

export function officerUnitLabel(officer: {
  unitCallSign?: string | null;
  vehicleType?: string | null;
  registration?: string | null;
  unitLabel?: string | null;
}): string | null {
  if (officer.unitLabel) return officer.unitLabel;
  const parts = [
    officer.unitCallSign,
    formatVehicleType(officer.vehicleType),
    officer.registration,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

const BUSY_NEARBY = new Set(['EN_ROUTE', 'ON_SCENE', 'DISPATCHED', 'ASSIGNED']);

export function officerSortTier(officer: DispatchOfficerOption): number {
  if (officer.available) return 0;
  if (BUSY_NEARBY.has(officer.status)) return 1;
  return 2;
}

export function splitOfficersByTier(officers: DispatchOfficerOption[]) {
  const available = officers.filter((o) => o.available);
  const nearbyBusy = officers.filter((o) => !o.available && BUSY_NEARBY.has(o.status));
  const other = officers.filter((o) => !o.available && !BUSY_NEARBY.has(o.status));
  return { available, nearbyBusy, other };
}

export const VEHICLE_FOCUS_EVENT = '4ds-vehicle-focus';
export const VEHICLE_FOCUS_KEY = '4ds-vehicle-focus';

export const VEHICLE_REMOTE_ACTIONS = [
  'lock',
  'unlock',
  'immobilise',
  'release',
  'horn',
  'panic',
] as const;

export type VehicleRemoteAction = (typeof VEHICLE_REMOTE_ACTIONS)[number];

export type VehicleRemoteState = {
  doorsLocked: boolean;
  immobiliserOn: boolean;
  theftRecovery: boolean;
  hornActive?: boolean;
};

export type VehicleFocusDetail = {
  vehicleId: string;
  registration: string;
  make?: string;
  model?: string;
  owner?: string;
  action: VehicleRemoteAction;
  incidentId?: string | null;
  doorsLocked: boolean;
  immobiliserOn: boolean;
  theftRecovery: boolean;
  cameras?: {
    id: string;
    name: string;
    locationLabel: string;
    channel: number;
    status: string;
    snapshotUrl?: string | null;
    isLiveCapable?: boolean;
    isInterior?: boolean;
  }[];
};

export function dispatchVehicleFocus(detail: VehicleFocusDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VEHICLE_FOCUS_EVENT, { detail }));
  try {
    localStorage.setItem(VEHICLE_FOCUS_KEY, JSON.stringify({ ...detail, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function subscribeVehicleFocus(handler: (detail: VehicleFocusDetail) => void) {
  if (typeof window === 'undefined') return () => undefined;

  function onCustom(e: Event) {
    const detail = (e as CustomEvent<VehicleFocusDetail>).detail;
    if (detail?.vehicleId) handler(detail);
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== VEHICLE_FOCUS_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as VehicleFocusDetail;
      if (parsed?.vehicleId) handler(parsed);
    } catch {
      /* ignore */
    }
  }

  window.addEventListener(VEHICLE_FOCUS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(VEHICLE_FOCUS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

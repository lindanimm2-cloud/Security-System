import type { VehicleRemoteState } from '@/lib/vehicle-remote';

/** Semantic door ids used by the security system. */
export type VehicleDoorId = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight';

export type VehiclePartOpenState = {
  open: boolean;
  locked?: boolean;
};

/**
 * Canonical vehicle visual state — security system is the source of truth.
 * The GLB is only the visual layer.
 */
export type Vehicle3DComponentState = {
  panic: boolean;
  online: boolean;
  locked: boolean;
  immobiliserOn: boolean;
  theftRecovery: boolean;
  moving: boolean;
  doors: Record<VehicleDoorId, VehiclePartOpenState>;
  boot: VehiclePartOpenState;
  bonnet: VehiclePartOpenState;
};

export const VEHICLE_DOOR_IDS: VehicleDoorId[] = [
  'frontLeft',
  'frontRight',
  'rearLeft',
  'rearRight',
];

/** Visual status tokens for highlightComponent(). */
export type VehicleHighlightStatus =
  | 'normal'
  | 'open'
  | 'locked'
  | 'unlocked'
  | 'tamper'
  | 'panic'
  | 'offline';

export const VEHICLE_VISUAL = {
  openBlue: 0x67e8f9,
  unlockAmber: 0xfbbf24,
  lockGreen: 0x4ade80,
  panicRed: 0xe23b35,
  tamperRed: 0xdc2626,
  recoveryAmber: 0xd97706,
  offlineGrey: 0x6b7280,
} as const;

function doorDefault(locked: boolean, open = false): VehiclePartOpenState {
  return { open, locked };
}

/**
 * Map remote / API security state → component visual state.
 * Missing per-door detail falls back to global lock flags.
 */
export function deriveVehicle3DState(
  remote: VehicleRemoteState,
  opts?: { speedKph?: number | null; online?: boolean },
): Vehicle3DComponentState {
  const locked = Boolean(remote.doorsLocked);
  const online = opts?.online ?? remote.online !== false;
  const speed = opts?.speedKph ?? 0;
  const doors = remote.doors;

  return {
    panic: Boolean(remote.panicActive),
    online,
    locked,
    immobiliserOn: Boolean(remote.immobiliserOn),
    theftRecovery: Boolean(remote.theftRecovery),
    moving: typeof speed === 'number' && speed >= 5,
    doors: {
      frontLeft: {
        open: Boolean(doors?.frontLeft?.open),
        locked: doors?.frontLeft?.locked ?? locked,
      },
      frontRight: {
        open: Boolean(doors?.frontRight?.open),
        locked: doors?.frontRight?.locked ?? locked,
      },
      rearLeft: {
        open: Boolean(doors?.rearLeft?.open),
        locked: doors?.rearLeft?.locked ?? locked,
      },
      rearRight: {
        open: Boolean(doors?.rearRight?.open),
        locked: doors?.rearRight?.locked ?? locked,
      },
    },
    boot: {
      open: Boolean(remote.boot?.open),
      locked: remote.boot?.locked ?? locked,
    },
    bonnet: {
      open: Boolean(remote.bonnet?.open),
      locked: remote.bonnet?.locked ?? locked,
    },
  };
}

/** Human-readable alerts for the HUD (open panels, panic, etc.). */
export function vehicleStateAlerts(state: Vehicle3DComponentState): string[] {
  const alerts: string[] = [];
  if (state.panic) alerts.push('PANIC ACTIVE');
  if (state.theftRecovery && !state.panic) alerts.push('RECOVERY MODE');
  if (state.immobiliserOn) alerts.push('IGNITION CUT');
  if (!state.online) alerts.push('OFFLINE');
  if (state.doors.frontLeft.open) alerts.push('FRONT LEFT DOOR OPEN');
  if (state.doors.frontRight.open) alerts.push('FRONT RIGHT DOOR OPEN');
  if (state.doors.rearLeft.open) alerts.push('REAR LEFT DOOR OPEN');
  if (state.doors.rearRight.open) alerts.push('REAR RIGHT DOOR OPEN');
  if (state.boot.open) alerts.push('BOOT OPEN');
  if (state.bonnet.open) alerts.push('BONNET OPEN');
  return alerts;
}

export function setDoorState(
  state: Vehicle3DComponentState,
  doorId: VehicleDoorId,
  next: Partial<VehiclePartOpenState>,
): Vehicle3DComponentState {
  return {
    ...state,
    doors: {
      ...state.doors,
      [doorId]: { ...state.doors[doorId], ...next },
    },
  };
}

export function setBootState(
  state: Vehicle3DComponentState,
  next: Partial<VehiclePartOpenState>,
): Vehicle3DComponentState {
  return { ...state, boot: { ...state.boot, ...next } };
}

export function setBonnetState(
  state: Vehicle3DComponentState,
  next: Partial<VehiclePartOpenState>,
): Vehicle3DComponentState {
  return { ...state, bonnet: { ...state.bonnet, ...next } };
}

export function setVehiclePanic(
  state: Vehicle3DComponentState,
  active: boolean,
): Vehicle3DComponentState {
  return { ...state, panic: active };
}

export function setVehicleOnline(
  state: Vehicle3DComponentState,
  online: boolean,
): Vehicle3DComponentState {
  return { ...state, online };
}

/** Empty closed/locked baseline for demos. */
export function createDefaultVehicle3DState(): Vehicle3DComponentState {
  return {
    panic: false,
    online: true,
    locked: true,
    immobiliserOn: false,
    theftRecovery: false,
    moving: false,
    doors: {
      frontLeft: doorDefault(true),
      frontRight: doorDefault(true),
      rearLeft: doorDefault(true),
      rearRight: doorDefault(true),
    },
    boot: doorDefault(true),
    bonnet: doorDefault(true),
  };
}

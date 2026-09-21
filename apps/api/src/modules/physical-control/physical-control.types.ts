/** Physical Control Engine — canonical access-point commands and state. */

export type AccessPointKind =
  | 'VEHICLE_GATE'
  | 'PEDESTRIAN_GATE'
  | 'DOOR'
  | 'BARRIER'
  | 'PARKING_GATE';

export type AccessPointState =
  | 'CLOSED'
  | 'OPEN'
  | 'LOCKED'
  | 'UNLOCKED'
  | 'MOVING'
  | 'FORCED'
  | 'HELD_OPEN'
  | 'OFFLINE'
  | 'UNKNOWN';

export type AccessPointHealth = 'HEALTHY' | 'DEGRADED' | 'OFFLINE';

export type AccessCommandType =
  | 'OPEN'
  | 'CLOSE'
  | 'HOLD_OPEN'
  | 'UNLOCK'
  | 'LOCK'
  | 'EMERGENCY_RELEASE';

export type AccessCommandPhase =
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'MOVING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMEOUT';

export type AccessAdapterId = 'generic' | 'onvif-profile-c' | 'hid' | 'gallagher' | 'demo';

/** Command lifecycle: SENT → ACKNOWLEDGED → MOVING → SUCCEEDED|FAILED|TIMEOUT */
export const COMMAND_PHASE_ORDER: AccessCommandPhase[] = [
  'SENT',
  'ACKNOWLEDGED',
  'MOVING',
  'SUCCEEDED',
];

export function targetStateForCommand(
  command: AccessCommandType,
  kind: AccessPointKind,
): AccessPointState {
  if (command === 'HOLD_OPEN') return 'HELD_OPEN';
  if (command === 'OPEN' || command === 'EMERGENCY_RELEASE') {
    return kind === 'PEDESTRIAN_GATE' || kind === 'DOOR' ? 'UNLOCKED' : 'OPEN';
  }
  if (command === 'UNLOCK') return 'UNLOCKED';
  if (command === 'LOCK') return 'LOCKED';
  return kind === 'PEDESTRIAN_GATE' || kind === 'DOOR' ? 'LOCKED' : 'CLOSED';
}

export function uiStatusFromState(state: AccessPointState): 'SECURE' | 'OPEN' | 'FORCED' | 'OFFLINE' {
  if (state === 'FORCED') return 'FORCED';
  if (state === 'OFFLINE') return 'OFFLINE';
  if (state === 'OPEN' || state === 'UNLOCKED' || state === 'HELD_OPEN' || state === 'MOVING') {
    return 'OPEN';
  }
  return 'SECURE';
}

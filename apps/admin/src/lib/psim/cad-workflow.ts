/** Full CAD lifecycle per PSIM spec — alarm receipt through closure. */
export const CAD_STATES = [
  'NEW',
  'ALARM_RECEIVED',
  'ACK',
  'VERIFY',
  'DISPATCH',
  'EN_ROUTE',
  'ON_SCENE',
  'RESOLVED',
  'REPORT',
  'CLOSED',
] as const;

export type CadState = (typeof CAD_STATES)[number];

/** Simplified ops-board timeline (matches legacy UI). */
export const OPS_TIMELINE_STEPS = [
  'ACK',
  'VERIFY',
  'DISPATCHED',
  'EN_ROUTE',
  'ON_SCENE',
  'RESOLVED',
  'CLOSED',
] as const;

export type OpsTimelineStep = (typeof OPS_TIMELINE_STEPS)[number];

const CAD_LABELS: Record<CadState, string> = {
  NEW: 'New',
  ALARM_RECEIVED: 'Alarm received',
  ACK: 'Acknowledged',
  VERIFY: 'Verify',
  DISPATCH: 'Dispatch',
  EN_ROUTE: 'En route',
  ON_SCENE: 'On scene',
  RESOLVED: 'Resolved',
  REPORT: 'Report',
  CLOSED: 'Closed',
};

const TERMINAL_STATUSES = new Set(['CLOSED', 'CANCELLED', 'RESOLVED']);

export function cadStateLabel(state: CadState | string): string {
  const key = (state ?? '').toUpperCase() as CadState;
  return CAD_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function isTerminalCadState(state: string): boolean {
  const s = (state ?? '').toUpperCase();
  return s === 'CLOSED' || s === 'CANCELLED' || s === 'RESOLVED';
}

/** Map incident API status → CAD state. */
export function mapIncidentStatusToCadState(status?: string): CadState {
  const s = (status ?? '').toUpperCase();
  if (s === 'CLOSED') return 'CLOSED';
  if (s === 'RESOLVED') return 'RESOLVED';
  if (s === 'ON_SCENE') return 'ON_SCENE';
  if (s === 'EN_ROUTE' || s === 'IN_PROGRESS') return 'EN_ROUTE';
  if (s === 'DISPATCHED' || s === 'ASSIGNED') return 'DISPATCH';
  if (s === 'VERIFY' || s === 'VERIFYING') return 'VERIFY';
  if (s === 'ACK' || s === 'ACKNOWLEDGED') return 'ACK';
  if (s === 'ALARM_RECEIVED') return 'ALARM_RECEIVED';
  if (s === 'REPORT' || s === 'REPORTING') return 'REPORT';
  return 'NEW';
}

/** Map incident status → ops-board timeline index. */
export function mapIncidentStatusToTimelineIndex(status?: string, priority?: string): number {
  const s = (status ?? '').toUpperCase();
  if (s === 'CLOSED') return OPS_TIMELINE_STEPS.indexOf('CLOSED');
  if (s === 'RESOLVED') return OPS_TIMELINE_STEPS.indexOf('RESOLVED');
  if (s === 'ON_SCENE') return OPS_TIMELINE_STEPS.indexOf('ON_SCENE');
  if (s === 'EN_ROUTE' || s === 'IN_PROGRESS') return OPS_TIMELINE_STEPS.indexOf('EN_ROUTE');
  if (s === 'DISPATCHED' || s === 'ASSIGNED') return OPS_TIMELINE_STEPS.indexOf('DISPATCHED');
  if (s === 'VERIFY' || s === 'VERIFYING') return OPS_TIMELINE_STEPS.indexOf('VERIFY');
  if (s === 'ACK' || s === 'ACKNOWLEDGED') return OPS_TIMELINE_STEPS.indexOf('ACK');
  if (s === 'OPEN' || s === 'NEW') {
    return ['CRITICAL', 'HIGH'].includes((priority ?? '').toUpperCase())
      ? OPS_TIMELINE_STEPS.indexOf('ACK')
      : OPS_TIMELINE_STEPS.indexOf('VERIFY');
  }
  return OPS_TIMELINE_STEPS.indexOf('ACK');
}

/** Valid manual transitions from a CAD state (demo / UI). */
export function nextCadTransitions(state: CadState | string): CadState[] {
  const s = mapIncidentStatusToCadState(String(state));
  const idx = CAD_STATES.indexOf(s);
  if (idx < 0 || idx >= CAD_STATES.length - 1) return [];
  const next = CAD_STATES[idx + 1];
  if (TERMINAL_STATUSES.has(s)) return [];
  return [next];
}

export function cadStateIndex(state: CadState | string): number {
  const s = mapIncidentStatusToCadState(String(state));
  const idx = CAD_STATES.indexOf(s);
  return idx >= 0 ? idx : 0;
}

/** Shared contracts for Uber-style live emergency response + future native push. */

export type LiveResponseStage =
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'NEARBY'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CLOSED';

export const LIVE_RESPONSE_PIPELINE: { id: LiveResponseStage; label: string }[] = [
  { id: 'RECEIVED', label: 'Received' },
  { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'EN_ROUTE', label: 'En route' },
  { id: 'NEARBY', label: 'Nearby' },
  { id: 'ON_SCENE', label: 'On scene' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export type EmergencyPushTemplate =
  | 'emergency_panic'
  | 'emergency_silent'
  | 'emergency_medical'
  | 'emergency_fire'
  | 'emergency_vehicle'
  | 'emergency_officer_update'
  | 'emergency_family'
  | 'response_status';

export type EmergencyPushPayload = {
  id: string;
  userId: string;
  tenantId?: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  incidentId: string | null;
  deepLink: string | null;
  publicRef?: string | null;
  status?: string | null;
  dispatchStatus?: string | null;
  stage?: LiveResponseStage | null;
  etaSeconds?: number | null;
  unitLabel?: string | null;
  template: EmergencyPushTemplate;
  /** High-priority / time-sensitive hint for native OS channels */
  urgency: 'critical' | 'high' | 'normal';
  sound?: string;
  vibrate?: boolean;
  requireInteraction?: boolean;
  testMode?: boolean;
};

export function stageFromIncidentStatus(
  status?: string | null,
  opts?: { ackedAt?: string | null; dispatchStatus?: string | null; etaSeconds?: number | null },
): LiveResponseStage {
  const s = (status ?? '').toUpperCase();
  const d = (opts?.dispatchStatus ?? '').toUpperCase();
  if (s === 'CLOSED') return 'CLOSED';
  if (s === 'RESOLVED' || s === 'CANCELLED') return 'RESOLVED';
  if (s === 'ON_SCENE' || d === 'ON_SCENE' || d === 'ARRIVED') return 'ON_SCENE';
  if (
    (s === 'EN_ROUTE' || d === 'EN_ROUTE' || d === 'ACCEPTED') &&
    opts?.etaSeconds != null &&
    opts.etaSeconds <= 120
  ) {
    return 'NEARBY';
  }
  if (s === 'EN_ROUTE' || d === 'EN_ROUTE' || d === 'ACCEPTED') return 'EN_ROUTE';
  if (s === 'DISPATCHED' || s === 'ASSIGNED' || d === 'ASSIGNED') return 'DISPATCHED';
  if (opts?.ackedAt || s === 'ACKNOWLEDGED') return 'ACKNOWLEDGED';
  return 'RECEIVED';
}

export function stageIndex(stage: LiveResponseStage) {
  const i = LIVE_RESPONSE_PIPELINE.findIndex((p) => p.id === stage);
  return i < 0 ? 0 : i;
}

export function formatEtaClock(sec: number | null | undefined) {
  if (sec == null) return null;
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function responseHref(incidentId: string) {
  return `/portal/response/${incidentId}`;
}

export function pushTemplateForIncidentType(type?: string | null, silent?: boolean): EmergencyPushTemplate {
  const t = (type ?? '').toUpperCase();
  if (silent || t.includes('SILENT')) return 'emergency_silent';
  if (t.includes('MEDICAL')) return 'emergency_medical';
  if (t.includes('FIRE')) return 'emergency_fire';
  if (t.includes('THEFT') || t.includes('VEHICLE')) return 'emergency_vehicle';
  if (t.includes('PANIC')) return 'emergency_panic';
  return 'response_status';
}

export function buildClientPushCopy(input: {
  template: EmergencyPushTemplate;
  publicRef?: string | null;
  unitLabel?: string | null;
  stage?: LiveResponseStage | null;
  etaSeconds?: number | null;
}): { title: string; body: string } {
  const eta = formatEtaClock(input.etaSeconds);
  switch (input.template) {
    case 'emergency_panic':
      return {
        title: '4DS SECURITY ALERT',
        body: 'Emergency response activated. Your security team has been notified.',
      };
    case 'emergency_silent':
      return {
        title: '4DS SILENT ALERT',
        body: 'Covert distress received. Response team notified discreetly.',
      };
    case 'emergency_medical':
      return {
        title: 'MEDICAL RESPONSE',
        body: 'Medical assistance has been requested. View live response.',
      };
    case 'emergency_fire':
      return {
        title: 'FIRE EMERGENCY',
        body: 'Fire response has been initiated. View incident.',
      };
    case 'emergency_vehicle':
      return {
        title: 'VEHICLE PANIC',
        body: 'Your vehicle emergency alert was received. Track response.',
      };
    case 'emergency_officer_update':
      return {
        title: 'OFFICER RESPONSE',
        body: input.unitLabel
          ? `${input.unitLabel} update · ${input.stage?.replace(/_/g, ' ') ?? 'in progress'}`
          : 'Response unit status updated.',
      };
    case 'emergency_family':
      return {
        title: 'FAMILY ALERT',
        body: 'A family safety event needs your attention.',
      };
    case 'response_status':
    default:
      return {
        title: '4DS RESPONSE ACTIVE',
        body: [
          input.unitLabel ? `${input.unitLabel} is responding` : 'Security response in progress',
          input.stage ? input.stage.replace(/_/g, ' ') : null,
          eta ? `ETA ${eta}` : null,
          input.publicRef ? input.publicRef : null,
        ]
          .filter(Boolean)
          .join(' · '),
      };
  }
}

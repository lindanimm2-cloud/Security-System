export type DispatchPhase =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING';

export type OfficerTaskAction =
  | 'accept'
  | 'enroute'
  | 'scene'
  | 'complete'
  | 'backup'
  | 'navigate'
  | 'report';

const PHASE_ORDER: DispatchPhase[] = [
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'ON_SCENE',
  'COMPLETED',
];

export function normalizeDispatchPhase(status: string): DispatchPhase {
  const upper = status.toUpperCase().replace(/-/g, '_') as DispatchPhase;
  if (PHASE_ORDER.includes(upper)) return upper;
  return 'ASSIGNED';
}

export function formatDispatchPhase(status: string): string {
  return normalizeDispatchPhase(status).replace(/_/g, ' ');
}

export function incidentTypeSlug(type: string): string {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Card + status strip theming from dispatch phase and incident type */
export function officerTaskCardClass(status: string, incidentType: string): string {
  const phase = normalizeDispatchPhase(status);
  const type = incidentTypeSlug(incidentType);
  return `officer-task-card officer-task-card--${phase.toLowerCase().replace(/_/g, '-')} officer-task-card--${type}`;
}

export function officerTaskStatusClass(status: string): string {
  const phase = normalizeDispatchPhase(status);
  return `officer-task-status officer-task-status--${phase.toLowerCase().replace(/_/g, '-')}`;
}

/** Primary action for the current dispatch phase */
export function primaryTaskAction(status: string): OfficerTaskAction | null {
  switch (normalizeDispatchPhase(status)) {
    case 'ASSIGNED':
      return 'accept';
    case 'ACCEPTED':
      return 'enroute';
    case 'EN_ROUTE':
      return 'scene';
    case 'ON_SCENE':
      return 'complete';
    default:
      return null;
  }
}

export function officerTaskButtonClass(
  action: OfficerTaskAction,
  status: string,
  variant: 'button' | 'link' = 'button',
): string {
  const phase = normalizeDispatchPhase(status);
  const phaseSlug = phase.toLowerCase().replace(/_/g, '-');
  const isPrimary = primaryTaskAction(status) === action;
  const base = variant === 'link' ? 'officer-task-link' : 'officer-task-btn';

  if (isPrimary) {
    return `${base} ${base}--primary ${base}--phase-${phaseSlug}`;
  }

  return `${base} ${base}--${action}`;
}

export function officerQueueRowClass(status: string, incidentType: string): string {
  const phase = normalizeDispatchPhase(status);
  const type = incidentTypeSlug(incidentType);
  return `officer-queue-row officer-queue-row--${phase.toLowerCase().replace(/_/g, '-')} officer-queue-row--${type}`;
}

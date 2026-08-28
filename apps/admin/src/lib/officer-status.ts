export const OFFICER_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', hint: 'Ready for new dispatch' },
  { value: 'EN_ROUTE', label: 'En route', hint: 'Travelling to incident' },
  { value: 'BUSY', label: 'On scene', hint: 'Busy handling incident' },
  { value: 'RETURNING', label: 'Returning', hint: 'Clearing scene, heading back' },
  { value: 'OFF_DUTY', label: 'Off duty', hint: 'Not on shift' },
] as const;

export type OfficerStatusValue = (typeof OFFICER_STATUSES)[number]['value'];

const STATUS_ALIASES: Record<string, OfficerStatusValue> = {
  AVAILABLE: 'AVAILABLE',
  ON_DUTY: 'AVAILABLE',
  IDLE: 'AVAILABLE',
  READY: 'AVAILABLE',
  EN_ROUTE: 'EN_ROUTE',
  RESPONDING: 'EN_ROUTE',
  IN_TRANSIT: 'EN_ROUTE',
  BUSY: 'BUSY',
  ON_SCENE: 'BUSY',
  SCENE: 'BUSY',
  RETURNING: 'RETURNING',
  CLEARING: 'RETURNING',
  OFF_DUTY: 'OFF_DUTY',
  OFFDUTY: 'OFF_DUTY',
};

export function normalizeOfficerStatus(status: string): string {
  const key = (status ?? '').toUpperCase().replace(/\s+/g, '_');
  return STATUS_ALIASES[key] ?? key;
}

export function officerStatusSlug(status: string): string {
  return normalizeOfficerStatus(status).toLowerCase().replace(/_/g, '-');
}

export function officerStatusLabel(status: string): string {
  const normalized = normalizeOfficerStatus(status);
  return (
    OFFICER_STATUSES.find((s) => s.value === normalized)?.label ??
    (status || 'Unknown').replace(/_/g, ' ')
  );
}

export function isSameOfficerStatus(current: string, next: string): boolean {
  return normalizeOfficerStatus(current) === normalizeOfficerStatus(next);
}

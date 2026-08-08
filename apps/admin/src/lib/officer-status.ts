export const OFFICER_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', hint: 'Ready for new dispatch' },
  { value: 'EN_ROUTE', label: 'En route', hint: 'Travelling to incident' },
  { value: 'BUSY', label: 'On scene', hint: 'Busy handling incident' },
  { value: 'RETURNING', label: 'Returning', hint: 'Clearing scene, heading back' },
  { value: 'OFF_DUTY', label: 'Off duty', hint: 'Not on shift' },
] as const;

export type OfficerStatusValue = (typeof OFFICER_STATUSES)[number]['value'];

export function officerStatusSlug(status: string): string {
  return status.toLowerCase().replace(/_/g, '-');
}

export function officerStatusLabel(status: string): string {
  return OFFICER_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ');
}

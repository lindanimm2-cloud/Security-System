/** Statuses that still need an officer assigned. */
export function isAwaitingDispatch(status: string, assigned?: string | null) {
  if (assigned) return false;
  const s = (status ?? '').toUpperCase();
  return s === 'OPEN' || s === 'ACTIVE' || s === 'PENDING' || s === 'NEW';
}

export function isResolvedIncidentStatus(status: string) {
  const s = (status ?? '').toUpperCase();
  return s === 'RESOLVED' || s === 'CLOSED' || s === 'CANCELLED';
}

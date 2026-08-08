const STORAGE_KEY = '4ds_active_incident';

export function setActiveIncidentId(incidentId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, incidentId);
}

export function getActiveIncidentId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearActiveIncidentId() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

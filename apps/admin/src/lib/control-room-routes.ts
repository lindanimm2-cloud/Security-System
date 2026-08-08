export const CONTROL_ROOM_ROUTES = {
  overview: '/control-room',
  map: '/control-room/map',
  incidents: '/control-room/incidents',
  dispatch: '/control-room/dispatch',
  customers: '/control-room/customers',
  officers: '/control-room/officers',
  fleet: '/control-room/fleet',
  documents: '/control-room/documents',
  communications: '/control-room/communications',
  chat: '/control-room/chat',
  teams: '/control-room/teams',
  analytics: '/control-room/analytics',
  surveillance: '/control-room/surveillance',
} as const;

export function customerHref(userId?: string): string {
  return userId
    ? `${CONTROL_ROOM_ROUTES.customers}?customer=${userId}`
    : CONTROL_ROOM_ROUTES.customers;
}

export function documentsHref(opts?: {
  incidentId?: string;
  folderId?: string;
  category?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.incidentId) params.set('incident', opts.incidentId);
  if (opts?.folderId) params.set('folder', opts.folderId);
  if (opts?.category) params.set('category', opts.category);
  const q = params.toString();
  return q ? `${CONTROL_ROOM_ROUTES.documents}?${q}` : CONTROL_ROOM_ROUTES.documents;
}

export function incidentHref(id?: string): string {
  return id ? `${CONTROL_ROOM_ROUTES.incidents}?id=${id}` : CONTROL_ROOM_ROUTES.incidents;
}

export function dispatchIncidentHref(incidentId?: string): string {
  return incidentId
    ? `${CONTROL_ROOM_ROUTES.dispatch}?incident=${incidentId}`
    : CONTROL_ROOM_ROUTES.dispatch;
}

export function dispatchHref(incidentId?: string): string {
  return incidentId
    ? `${CONTROL_ROOM_ROUTES.dispatch}?incident=${incidentId}`
    : CONTROL_ROOM_ROUTES.dispatch;
}

export function mapHref(focus?: 'users' | 'officers' | 'incidents'): string {
  return focus ? `${CONTROL_ROOM_ROUTES.map}?focus=${focus}` : CONTROL_ROOM_ROUTES.map;
}

export function officerHref(): string {
  return CONTROL_ROOM_ROUTES.officers;
}

export function analyticsMetricHref(metric: string): string {
  const m = metric.toLowerCase();
  if (m.includes('panic') || m.includes('theft') || m.includes('incident') || m.includes('resolved')) {
    return CONTROL_ROOM_ROUTES.incidents;
  }
  if (m.includes('officer') || m.includes('response')) return CONTROL_ROOM_ROUTES.officers;
  if (m.includes('user')) return CONTROL_ROOM_ROUTES.map;
  return CONTROL_ROOM_ROUTES.analytics;
}

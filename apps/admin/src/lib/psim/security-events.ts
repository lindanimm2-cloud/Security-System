/** Normalized security event bus — alarm, video, access, fleet, patrol. */

export type SecurityEventSource =
  | 'ALARM'
  | 'VIDEO'
  | 'ACCESS'
  | 'FLEET'
  | 'PATROL'
  | 'APP'
  | 'MANUAL';

export type SecurityEventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type NormalizedSecurityEvent = {
  id: string;
  source: SecurityEventSource;
  type: string;
  severity: SecurityEventSeverity;
  title: string;
  site?: string;
  zone?: string;
  deviceId?: string;
  incidentId?: string | null;
  receivedAt: string;
  acknowledged?: boolean;
  raw?: Record<string, unknown>;
};

export type SecurityEventTone = 'danger' | 'warning' | 'accent' | 'success' | 'muted';

export function severityTone(severity: SecurityEventSeverity | string): SecurityEventTone {
  const s = (severity ?? '').toUpperCase();
  if (s === 'CRITICAL') return 'danger';
  if (s === 'HIGH') return 'warning';
  if (s === 'MEDIUM') return 'accent';
  if (s === 'LOW') return 'muted';
  return 'muted';
}

export function sourceLabel(source: SecurityEventSource | string): string {
  const labels: Record<string, string> = {
    ALARM: 'Alarm panel',
    VIDEO: 'CCTV / VMS',
    ACCESS: 'Access control',
    FLEET: 'Fleet telematics',
    PATROL: 'Guard tour',
    APP: 'Mobile app',
    MANUAL: 'Manual entry',
  };
  return labels[(source ?? '').toUpperCase()] ?? source;
}

export function normalizeSecurityEvent(
  raw: Partial<NormalizedSecurityEvent> & { id: string },
): NormalizedSecurityEvent {
  return {
    id: raw.id,
    source: (raw.source ?? 'MANUAL') as SecurityEventSource,
    type: raw.type ?? 'EVENT',
    severity: (raw.severity ?? 'MEDIUM') as SecurityEventSeverity,
    title: raw.title ?? 'Security event',
    site: raw.site,
    zone: raw.zone,
    deviceId: raw.deviceId,
    incidentId: raw.incidentId ?? null,
    receivedAt: raw.receivedAt ?? new Date().toISOString(),
    acknowledged: raw.acknowledged ?? false,
    raw: raw.raw,
  };
}

/** Sort events: unacked critical first, then by time. */
export function sortSecurityEvents(events: NormalizedSecurityEvent[]): NormalizedSecurityEvent[] {
  const rank = (e: NormalizedSecurityEvent) => {
    let score = 0;
    if (!e.acknowledged) score += 100;
    if (e.severity === 'CRITICAL') score += 40;
    else if (e.severity === 'HIGH') score += 30;
    else if (e.severity === 'MEDIUM') score += 10;
    return score;
  };
  return [...events].sort((a, b) => {
    const dr = rank(b) - rank(a);
    if (dr !== 0) return dr;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });
}

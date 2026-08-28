import { incidentPriorityBand, type IncidentPriorityBand } from '@/lib/portal-priority';

export type OpsIncident = {
  id: string;
  type: string;
  user: string;
  location: string;
  time: string;
  priority: string;
  status?: string;
  slaBreached?: boolean;
  createdAt?: string;
  officer?: string | null;
  unit?: string | null;
  etaDueAt?: string | null;
  cameraCount?: number | null;
  camerasOnline?: number | null;
  gpsAvailable?: boolean;
  distanceKm?: number | null;
  userPhone?: string | null;
  officerPhone?: string | null;
  slaTargetSec?: number | null;
  isSilent?: boolean;
  /** Only set when the originating system provided a real source. Never invent NATIVE SOS. */
  source?: string | null;
  ackedAt?: string | null;
};

export type OpsAlertKind =
  | 'panic'
  | 'medical'
  | 'fire'
  | 'theft'
  | 'intrusion'
  | 'alarm'
  | 'technical';

export type OpsCardDensity = 'panic' | 'p1' | 'p2' | 'p3';

export function opsAlertKind(type: string): OpsAlertKind {
  const t = type.toUpperCase();
  if (t.includes('PANIC')) return 'panic';
  if (t === 'MEDICAL') return 'medical';
  if (t === 'FIRE') return 'fire';
  if (t === 'THEFT') return 'theft';
  if (t === 'INTRUSION') return 'intrusion';
  if (t === 'ALARM' || t === 'ASSAULT') return 'alarm';
  return 'technical';
}

export function isPanicIncident(type: string) {
  return opsAlertKind(type) === 'panic';
}

export function opsResponseStatus(status?: string, officer?: string | null): string {
  const s = (status ?? 'OPEN').toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED') return 'RESOLVED';
  if (s === 'CANCELLED') return 'CANCELLED';
  if (s === 'ON_SCENE') return 'ON SCENE';
  if (s === 'EN_ROUTE' || s === 'IN_PROGRESS' || s === 'RESPONDING') return 'RESPONDING';
  if (s === 'DISPATCHED' || s === 'ASSIGNED' || Boolean(officer)) return 'DISPATCHED';
  if (s === 'ACKNOWLEDGED' || s === 'ACK' || s === 'VERIFY') return 'ACKNOWLEDGED';
  if (s === 'CALLING' || s === 'CALLING_CLIENT') return 'CALLING CLIENT';
  if (s === 'NEW' || s === 'OPEN' || s === 'ACTIVE' || s === 'PENDING') return 'NEW';
  return s.replace(/_/g, ' ');
}

export function opsIsDispatched(status?: string, officer?: string | null) {
  const label = opsResponseStatus(status, officer);
  return ['DISPATCHED', 'RESPONDING', 'ON SCENE'].includes(label);
}

export function opsCardDensity(priority: string, type: string): OpsCardDensity {
  if (isPanicIncident(type)) return 'panic';
  const band = incidentPriorityBand(priority, type);
  if (band === 'P0' || band === 'P1') return 'p1';
  if (band === 'P2') return 'p2';
  return 'p3';
}

export function opsPriorityLabel(priority: string, type: string): IncidentPriorityBand {
  if (isPanicIncident(type)) return 'P1';
  const band = incidentPriorityBand(priority, type);
  return band === 'P0' ? 'P1' : band;
}

export function formatOpsClock(totalSec: number): string {
  const sec = Math.abs(Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function openedAtMs(incident: OpsIncident, now = Date.now()): number {
  if (incident.createdAt) {
    const t = new Date(incident.createdAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  const min = incident.time.match(/(\d+)\s*min/);
  if (min) return now - Number(min[1]) * 60_000;
  const hr = incident.time.match(/(\d+)\s*h/);
  if (hr) return now - Number(hr[1]) * 3_600_000;
  const sec = incident.time.match(/(\d+)\s*s/);
  if (sec) return now - Number(sec[1]) * 1000;
  return now;
}

export function slaTargetSecFor(incident: OpsIncident): number {
  if (incident.slaTargetSec) return incident.slaTargetSec;
  const band = opsPriorityLabel(incident.priority, incident.type);
  if (band === 'P1') return 180;
  if (band === 'P2') return 480;
  return 900;
}

export function slaSnapshot(incident: OpsIncident, now = Date.now()) {
  const elapsedSec = Math.max(0, Math.floor((now - openedAtMs(incident, now)) / 1000));
  const target = slaTargetSecFor(incident);
  const delta = elapsedSec - target;
  const overdue = delta > 0 || Boolean(incident.slaBreached);
  return {
    overdue,
    elapsed: formatOpsClock(elapsedSec),
    clock: overdue ? `+${formatOpsClock(delta)}` : formatOpsClock(target - elapsedSec),
  };
}

export function etaSnapshot(etaDueAt?: string | null, now = Date.now()) {
  if (!etaDueAt) return null;
  const due = new Date(etaDueAt).getTime();
  if (!Number.isFinite(due)) return null;
  const delta = Math.floor((due - now) / 1000);
  if (delta <= 0) return { overdue: true, clock: 'DUE' };
  return { overdue: false, clock: formatOpsClock(delta) };
}

export function cctvLabel(incident: OpsIncident) {
  const total = incident.cameraCount;
  if (total == null) return { text: 'CCTV', tone: 'muted' as const };
  const online = incident.camerasOnline ?? total;
  const offline = Math.max(0, total - online);
  if (offline > 0) return { text: `CCTV · ${offline} OFFLINE`, tone: 'warn' as const };
  if (online > 0) return { text: `CCTV · ${online} LIVE`, tone: 'ok' as const };
  return { text: 'CCTV · NONE', tone: 'muted' as const };
}

export function mapLabel(incident: OpsIncident) {
  if (incident.gpsAvailable === false) return { text: 'Map · GPS unavailable', tone: 'warn' as const };
  if (typeof incident.distanceKm === 'number') {
    return { text: `Map · ${incident.distanceKm.toFixed(1)} km`, tone: 'ok' as const };
  }
  return { text: 'Map · Client location', tone: 'ok' as const };
}

export const OPS_KIND_META: Record<OpsAlertKind, { label: string; glyph: string }> = {
  panic: { label: 'PANIC', glyph: '!' },
  medical: { label: 'MEDICAL', glyph: '+' },
  fire: { label: 'FIRE', glyph: 'F' },
  theft: { label: 'THEFT', glyph: 'T' },
  intrusion: { label: 'INTRUSION', glyph: 'I' },
  alarm: { label: 'ALARM', glyph: 'A' },
  technical: { label: 'TECHNICAL', glyph: '⚙' },
};

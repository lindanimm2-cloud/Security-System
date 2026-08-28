import {
  isPanicIncident,
  opsAlertKind,
  opsIsDispatched,
  opsPriorityLabel,
  opsResponseStatus,
  slaSnapshot,
  type OpsIncident,
} from '@/lib/ops-incident';
import {
  loadCrSettings,
  saveCrSettings,
  shouldPlayPanicSound,
  withAudit,
  type CrSettings,
} from '@/lib/control-room-settings';

export type LensAutoCollapse = CrSettings['lens']['autoCollapse'];
export type LensDockEdge = CrSettings['lens']['dockEdge'];
export type CrLensSettings = CrSettings['lens'];

/** Company policy: Panic and P1 cannot be hidden by an operator. */
export const LENS_POLICY = {
  panicRequired: true,
  p1Required: true,
} as const;

export const DEFAULT_LENS_SETTINGS: CrLensSettings = {
  enabled: true,
  showP1: true,
  showPanic: true,
  showSla: true,
  showOpsAlerts: true,
  autoPeek: true,
  soundPanic: true,
  autoCollapse: 'never',
  dockEdge: 'bottom',
};

export function effectiveLensSettings(raw?: Partial<CrLensSettings> | null): CrLensSettings {
  const merged = { ...DEFAULT_LENS_SETTINGS, ...raw };
  return {
    ...merged,
    showPanic: LENS_POLICY.panicRequired ? true : merged.showPanic,
    showP1: LENS_POLICY.p1Required ? true : merged.showP1,
  };
}

export function loadLensSettings(): CrLensSettings {
  return effectiveLensSettings(loadCrSettings().lens);
}

export function saveLensSettings(next: CrLensSettings, actor = 'Control room') {
  const current = loadCrSettings();
  const withLog = withAudit(
    { ...current, lens: effectiveLensSettings(next) },
    'Lens',
    'Critical Quick Actions Lens updated',
    `Show lens ${next.enabled ? 'on' : 'off'} · auto-collapse ${next.autoCollapse} · dock ${next.dockEdge}`,
    actor,
  );
  saveCrSettings(withLog);
}

export function recordLensAudit(title: string, detail: string, actor = 'Control room') {
  try {
    const current = loadCrSettings();
    saveCrSettings(withAudit(current, 'Lens', title, detail, actor));
  } catch {
    /* local audit is best-effort */
  }
}

function isResolved(status?: string) {
  const s = (status ?? '').toUpperCase();
  return s === 'RESOLVED' || s === 'CLOSED' || s === 'CANCELLED';
}

function isP1Type(incident: OpsIncident) {
  const kind = opsAlertKind(incident.type);
  return (
    kind === 'intrusion' ||
    kind === 'theft' ||
    kind === 'fire' ||
    kind === 'medical' ||
    opsPriorityLabel(incident.priority, incident.type) === 'P1'
  );
}

export function isDuressIncident(incident: OpsIncident) {
  if (incident.isSilent) return true;
  const src = (incident.source ?? '').toUpperCase();
  return src.includes('DURESS') || src.includes('SILENT');
}

export function isActivePanic(incident: OpsIncident) {
  return isPanicIncident(incident.type) && !isResolved(incident.status);
}

/**
 * Badge / queue membership: items requiring operator attention.
 * Does not count routine notifications, messages, or resolved work.
 */
export function incidentNeedsLensAttention(
  incident: OpsIncident,
  settings: CrLensSettings,
  locallyAcked = false,
): boolean {
  if (isResolved(incident.status)) return false;
  const panic = isActivePanic(incident);
  const duress = panic && isDuressIncident(incident);
  const sla = slaSnapshot(incident).overdue || Boolean(incident.slaBreached);
  const p1 = isP1Type(incident);
  const status = opsResponseStatus(incident.status, incident.officer);
  const acked = locallyAcked || status === 'ACKNOWLEDGED' || Boolean(incident.ackedAt);

  if (panic && settings.showPanic) return true;
  if (duress && settings.showPanic) return true;
  if (settings.showSla && sla) return true;
  if (settings.showP1 && p1 && !acked) return true;
  if (settings.showP1 && p1 && sla) return true;
  return false;
}

export function lensPriorityRank(incident: OpsIncident): number {
  if (isActivePanic(incident) && isDuressIncident(incident)) return 1;
  if (isActivePanic(incident)) return 0;
  if (opsPriorityLabel(incident.priority, incident.type) === 'P1') return 2;
  if (opsPriorityLabel(incident.priority, incident.type) === 'P2') return 3;
  if (slaSnapshot(incident).overdue || incident.slaBreached) return 4;
  return 5;
}

export function sortLensIncidents(incidents: OpsIncident[]): OpsIncident[] {
  return [...incidents].sort((a, b) => {
    const ra = lensPriorityRank(a);
    const rb = lensPriorityRank(b);
    if (ra !== rb) return ra - rb;
    const ta = new Date(a.createdAt ?? a.time ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.time ?? 0).getTime();
    return tb - ta;
  });
}

export function criticalLensQueue(
  incidents: OpsIncident[],
  settings: CrLensSettings,
  ackedIds: ReadonlySet<string> = new Set(),
): OpsIncident[] {
  return sortLensIncidents(
    incidents.filter((incident) =>
      incidentNeedsLensAttention(incident, settings, ackedIds.has(incident.id)),
    ),
  );
}

export function panicQueue(incidents: OpsIncident[]): OpsIncident[] {
  return incidents.filter(isActivePanic);
}

/** Eye badge: panic count when panic is live, otherwise items needing attention. */
export function lensBadge(queue: OpsIncident[]): { count: number; panic: boolean } {
  const panics = panicQueue(queue);
  if (panics.length > 0) return { count: panics.length, panic: true };
  return { count: queue.length, panic: false };
}

export function typeMixSummary(incidents: OpsIncident[]): string {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    const label = isDuressIncident(incident)
      ? 'Duress'
      : opsAlertKind(incident.type) === 'panic'
        ? 'Panic'
        : opsAlertKind(incident.type) === 'intrusion'
          ? 'Intrusion'
          : opsAlertKind(incident.type) === 'theft'
            ? 'Theft'
            : opsAlertKind(incident.type) === 'fire'
              ? 'Fire'
              : opsAlertKind(incident.type) === 'medical'
                ? 'Medical'
                : incident.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, n]) => `${n} ${label}`).join(' · ');
}

export function primaryLensAction(incident: OpsIncident): { label: string; kind: 'respond' | 'open' | 'sla' | 'review' } {
  if (isActivePanic(incident)) return { label: 'Respond now', kind: 'respond' };
  if (slaSnapshot(incident).overdue || incident.slaBreached) return { label: 'Review SLA', kind: 'sla' };
  const kind = opsAlertKind(incident.type);
  if (kind === 'intrusion' || kind === 'theft' || kind === 'fire' || kind === 'medical') {
    return { label: 'Open incident', kind: 'open' };
  }
  return { label: 'Review', kind: 'review' };
}

/**
 * Panic source label. Never returns NATIVE SOS unless the event carried that source.
 */
export function panicSourceLabel(incident: OpsIncident): string | null {
  if (!isPanicIncident(incident.type)) return null;
  const raw = (incident.source ?? '').trim().toUpperCase().replace(/[_-]/g, ' ');
  if (raw === 'NATIVE SOS' || raw === 'NATIVEOS' || raw === 'IOS SOS' || raw === 'ANDROID SOS') {
    return 'NATIVE SOS';
  }
  if (raw === 'WEB EMERGENCY ACCESS' || raw === 'WEB EMERGENCY' || raw === 'EMERGENCY ACCESS') {
    return 'WEB EMERGENCY ACCESS';
  }
  if (raw === 'TEST') return 'TEST';
  if (raw === 'DURESS' || incident.isSilent) return 'DURESS';
  if (raw === 'APP PANIC' || raw === 'APP' || raw === '' || raw === 'CLIENT') return 'APP PANIC';
  return incident.source ? incident.source.toUpperCase() : 'APP PANIC';
}

export function threadLabel(incident: OpsIncident, locallyAcked: boolean): {
  key: string;
  title: string;
  detail: string;
} {
  const status = opsResponseStatus(incident.status, incident.officer);
  const unit = incident.unit?.trim() || null;
  const officer = incident.officer?.trim() || null;
  const who = [unit, officer].filter(Boolean).join(' · ');

  if (status === 'RESOLVED') return { key: 'resolved', title: 'Resolved', detail: incident.user };
  if (status === 'ON SCENE') return { key: 'on-scene', title: 'On scene', detail: who || incident.user };
  if (status === 'RESPONDING') return { key: 'responding', title: 'Responding', detail: who || incident.user };
  if (status === 'DISPATCHED' || opsIsDispatched(incident.status, incident.officer)) {
    return { key: 'dispatched', title: 'Dispatched', detail: who || incident.user };
  }
  if (locallyAcked || status === 'ACKNOWLEDGED') {
    return { key: 'acked', title: 'Acknowledged', detail: incident.user };
  }
  if (isActivePanic(incident)) return { key: 'panic', title: 'Panic', detail: incident.user };
  return { key: 'active', title: status, detail: incident.user };
}

export type LensRouteContext = 'map' | 'cctv' | 'fleet' | 'incident' | 'other';

export function lensRouteContext(pathname: string): LensRouteContext {
  if (pathname.includes('/control-room/map')) return 'map';
  if (pathname.includes('/control-room/surveillance')) return 'cctv';
  if (pathname.includes('/control-room/fleet')) return 'fleet';
  if (pathname.includes('/control-room/incidents')) return 'incident';
  return 'other';
}

export function playLensAlertTone() {
  if (typeof window === 'undefined') return;
  if (!shouldPlayPanicSound()) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.stop(ctx.currentTime + 0.24);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* browsers may block audio until a gesture */
  }
}

/** Keep CrSettings.lens optional-safe for older localStorage payloads. */
export function withLensDefaults(settings: CrSettings): CrSettings {
  return {
    ...settings,
    lens: effectiveLensSettings(settings.lens),
  };
}

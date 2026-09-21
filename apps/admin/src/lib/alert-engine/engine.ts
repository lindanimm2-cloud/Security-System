import type { PriorityAlert } from '@/lib/alert-priority';
import { adminApi } from '@/lib/api-client';
import { loadCrSettings, type CrSettings } from '@/lib/control-room-settings';
import { getSession } from '@/lib/auth';
import { clearAttentionTitle, setAttentionTitle, setScreenFlash, showDesktopNotification } from './attention';
import { recordAlertHistory } from './history';
import { isAlertSuppressed } from './mute';
import { startAlertSound, startAckReminder, stopAckReminder, stopAlertSound } from './sounds';
import {
  alertFromPriority,
  DEFAULT_ESCALATION,
  type AlertCategoryKey,
  type AlertEngineEvent,
  type CategoryPref,
} from './types';
import { playHaptic } from '@/lib/ops-audio';

type Listener = (event: AlertEngineEvent | null) => void;

const activeCritical = new Map<string, { event: AlertEngineEvent; timers: number[]; startedAt: number }>();
const listeners = new Set<Listener>();

function actorName() {
  return getSession('admin')?.user.name ?? 'Control Room';
}

function prefsFor(category: AlertCategoryKey): CategoryPref {
  const settings = loadCrSettings();
  const map = settings.alertPrefs ?? {};
  const fallback: CategoryPref = {
    sound: true,
    push: true,
    email: false,
  };
  return { ...fallback, ...(map[category] ?? {}) };
}

function soundAllowed(event: AlertEngineEvent, settings: CrSettings): boolean {
  if (event.soundId === 'silent') return false;
  // P1 / critical: panicOverride keeps them audible even if master panicSound is off
  const isP1 = event.level === 'critical' || event.category === 'panic' || event.category === 'silent';
  if (isP1 && settings.notifications.panicOverride !== false) {
    return event.channels.includes('sound') || event.soundId !== 'silent';
  }
  if (!settings.general.panicSound && isP1) {
    if (!event.force) return false;
  }
  if (event.level === 'critical' && !settings.lens.soundPanic && !event.force) return false;
  const pref = prefsFor(event.category);
  if (!pref.sound && !event.force) return false;
  return event.channels.includes('sound');
}

function emit(event: AlertEngineEvent | null) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* ignore */
    }
  });
}

function clearEscalation(alertId: string) {
  const row = activeCritical.get(alertId);
  if (!row) return;
  row.timers.forEach((t) => window.clearTimeout(t));
  activeCritical.delete(alertId);
}

function scheduleEscalation(event: AlertEngineEvent) {
  if (!event.requiresAck || typeof window === 'undefined') return;
  clearEscalation(event.id);
  const timers: number[] = [];
  const startedAt = Date.now();

  for (const step of DEFAULT_ESCALATION) {
    if (step.afterMs === 0) continue;
    const timer = window.setTimeout(() => {
      if (!activeCritical.has(event.id)) return;
      recordAlertHistory(event.id, event.title, `Escalation · ${step.label}`, 'AlertEngine', step.action);
      if (step.action === 'visual') {
        setScreenFlash(true);
        setAttentionTitle(event);
      }
      if (step.action === 'supervisor' || step.action === 'manager') {
        // Local attention + server fan-out (email/SMS stubs + in-app to supervisors)
        setScreenFlash(true);
        if (soundAllowed(event, loadCrSettings())) {
          startAlertSound(`${event.id}-escalation`, event.soundId, { loop: true });
        }
        if (!event.testMode && event.incidentId) {
          void adminApi
            .post('/alerts/escalate', {
              incidentId: event.incidentId,
              level: step.action,
              title: `Unacked · ${event.title}`,
              body: `${step.label} — ${event.body}`,
            })
            .catch(() => {
              /* offline / demo — local escalation still ran */
            });
        }
      }
    }, step.afterMs);
    timers.push(timer);
  }

  activeCritical.set(event.id, { event, timers, startedAt });
}

/**
 * Central Control Room alert ingress.
 * EVENT → severity → recipients/channels → sound/push/in-app → escalation → ACK → audit
 */
export function ingestAlert(alert: PriorityAlert, opts?: { testMode?: boolean }): AlertEngineEvent | null {
  const event = alertFromPriority(alert, opts?.testMode);
  const settings = loadCrSettings();

  if (
    isAlertSuppressed(event.id, event.category, event.level, { force: event.force }) &&
    !event.force
  ) {
    recordAlertHistory(event.id, event.title, 'Suppressed (mute/snooze)', 'AlertEngine');
    return null;
  }

  recordAlertHistory(
    event.id,
    event.testMode ? `[TEST] ${event.title}` : event.title,
    event.testMode ? 'Test alert fired' : 'Created / received',
    event.testMode ? actorName() : 'System',
  );

  // Attention channels
  if (event.channels.includes('title')) setAttentionTitle(event);
  if (
    event.channels.includes('desktop') &&
    settings.notifications.desktopPush !== false &&
    prefsFor(event.category).push
  ) {
    showDesktopNotification(event);
  }
  if (event.level === 'critical') setScreenFlash(true);

  // Sound
  if (soundAllowed(event, settings)) {
    startAlertSound(event.id, event.soundId, { loop: event.requiresAck });
  } else if (event.soundId === 'silent') {
    playHaptic('sos_stealth');
  }

  // Extra haptic for high when sound path already vibrates via playCue; ensure high gets critical haptic
  if (event.level === 'high' && event.soundId !== 'silent') {
    playHaptic('critical');
  }

  // Cross-device routing matrix (phone / watch / desktop) — native clients consume same incident id
  if (event.level === 'critical') {
    recordAlertHistory(
      event.id,
      event.title,
      `Routed P1 → desktop full alert · phone push+sound+vib · watch haptic`,
      'AlertEngine',
      'supervisor',
    );
  }

  if (event.requiresAck) scheduleEscalation(event);

  emit(event);
  return event;
}

export function acknowledgeAlert(
  alertId: string,
  alertLabel?: string,
  opts?: { quietReminder?: boolean },
) {
  const active = activeCritical.get(alertId);
  stopAlertSound(alertId);
  stopAlertSound(`${alertId}-escalation`);
  stopAckReminder(alertId);
  clearEscalation(alertId);
  setScreenFlash(false);
  const wantReminder = opts?.quietReminder !== false;
  if (wantReminder && active?.event.requiresAck && active.event.soundId !== 'silent') {
    startAckReminder(alertId, active.event.soundId);
  }
  if (getActiveCriticalAlerts().length === 0) {
    clearAttentionTitle();
  }
  recordAlertHistory(
    alertId,
    alertLabel ?? alertId,
    wantReminder ? 'ACK · quiet reminder' : 'ACK',
    actorName(),
  );
  emit(null);
}

export function clearAckReminder(alertId: string) {
  stopAckReminder(alertId);
}

export function dismissAlertChannels(alertId: string, alertLabel?: string) {
  acknowledgeAlert(alertId, alertLabel, { quietReminder: false });
  recordAlertHistory(alertId, alertLabel ?? alertId, 'Dismissed', actorName());
}

export function subscribeAlertEngine(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveCriticalAlerts(): AlertEngineEvent[] {
  return [...activeCritical.values()].map((r) => r.event);
}

export { DEFAULT_ESCALATION };

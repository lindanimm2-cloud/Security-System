/**
 * Client / future native push helpers.
 * Web: Notification API + optional service worker + vibration.
 * Native: reuse EmergencyPushPayload shape without rebuilding AlertEngine.
 */

import type { EmergencyPushPayload } from '@/lib/live-response';
import { loadHapticPrefs, type EmergencyAlertKind } from '@/lib/emergency-vibration';
import { playHaptic } from '@/lib/ops-audio';

const SW_PATH = '/sw-emergency.js';

export async function ensureEmergencyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch {
    return null;
  }
}

export async function requestClientPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function vibrateForUrgency(urgency?: 'critical' | 'high' | 'normal', kind?: EmergencyAlertKind) {
  const prefs = loadHapticPrefs();
  if (!prefs.vibrationEnabled) return;
  if (kind === 'panic' || urgency === 'critical') playHaptic('sos');
  else if (kind === 'officer' || urgency === 'high') playHaptic('critical');
  else playHaptic('tap');
}

export async function showClientEmergencyNotification(input: {
  title: string;
  body: string;
  tag?: string;
  deepLink?: string;
  urgency?: 'critical' | 'high' | 'normal';
  kind?: EmergencyAlertKind;
  vibratePattern?: number[];
}) {
  if (typeof window === 'undefined') return;

  const prefs = loadHapticPrefs();
  vibrateForUrgency(input.urgency, input.kind);

  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await requestClientPushPermission();
  }
  if (Notification.permission !== 'granted') return;

  const reg = await ensureEmergencyServiceWorker();
  const vibrate =
    prefs.vibrationEnabled && input.urgency !== 'normal'
      ? input.vibratePattern ?? (input.urgency === 'critical' ? [200, 100, 200, 100, 200] : [100, 50, 100])
      : undefined;

  const opts: NotificationOptions & { vibrate?: number[] } = {
    body: input.body,
    tag: input.tag ?? '4ds-emergency',
    requireInteraction: input.urgency === 'critical',
    silent: !prefs.soundEnabled,
    data: { deepLink: input.deepLink ?? '/portal', urgency: input.urgency ?? 'high' },
  };
  if (vibrate) opts.vibrate = vibrate;

  try {
    if (reg?.showNotification) {
      await reg.showNotification(input.title, opts);
      return;
    }
    const n = new Notification(input.title, opts);
    n.onclick = () => {
      window.focus();
      if (input.deepLink) window.location.href = input.deepLink;
      n.close();
    };
  } catch {
    /* blocked by browser policy */
  }
}

/** Maps API/socket notification into a future FCM/APNs-compatible payload. */
export function toEmergencyPushPayload(
  row: Partial<EmergencyPushPayload> & {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
  },
): EmergencyPushPayload {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    type: row.type,
    priority: row.priority ?? 'P1',
    title: row.title,
    body: row.body,
    incidentId: row.incidentId ?? null,
    deepLink: row.deepLink ?? (row.incidentId ? `/portal/response/${row.incidentId}` : '/portal'),
    publicRef: row.publicRef ?? null,
    status: row.status ?? null,
    dispatchStatus: row.dispatchStatus ?? null,
    stage: row.stage ?? null,
    etaSeconds: row.etaSeconds ?? null,
    unitLabel: row.unitLabel ?? null,
    template: row.template ?? 'response_status',
    urgency: row.urgency ?? (row.priority === 'P0' || row.priority === 'CRITICAL' ? 'critical' : 'high'),
    sound: row.sound ?? 'emergency',
    vibrate: row.vibrate ?? true,
    requireInteraction: row.requireInteraction ?? true,
    testMode: row.testMode,
  };
}

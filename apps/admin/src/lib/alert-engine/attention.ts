import type { AlertEngineEvent } from './types';

const TITLE_BASE_KEY = '4ds_doc_title_base';
let flashTimer: number | null = null;
let originalTitle = '';

function ensureBaseTitle() {
  if (typeof document === 'undefined') return;
  if (!originalTitle) {
    originalTitle = document.title.replace(/^[🚨⚠●]\s*[^—]*—\s*/, '') || document.title;
    try {
      sessionStorage.setItem(TITLE_BASE_KEY, originalTitle);
    } catch {
      /* ignore */
    }
  }
}

export function setAttentionTitle(event: AlertEngineEvent | null) {
  if (typeof document === 'undefined') return;
  ensureBaseTitle();
  const base =
    originalTitle ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TITLE_BASE_KEY) : null) ||
    'Control Panel — 4DS Nexus';

  if (flashTimer) {
    window.clearInterval(flashTimer);
    flashTimer = null;
  }

  if (!event) {
    document.title = base;
    return;
  }

  const tag =
    event.level === 'critical'
      ? `🚨 ${event.kind === 'panic' ? 'P1 PANIC' : event.title.slice(0, 24)}`
      : event.level === 'high'
        ? `⚠ ${event.title.slice(0, 28)}`
        : `● ${event.title.slice(0, 28)}`;

  let flip = false;
  document.title = `${tag} — 4DS`;
  if (event.level === 'critical') {
    flashTimer = window.setInterval(() => {
      flip = !flip;
      document.title = flip ? `🚨 ALERT — 4DS` : `${tag} — 4DS`;
    }, 1200);
  }
}

export function clearAttentionTitle() {
  setAttentionTitle(null);
}

export async function requestDesktopPermission(): Promise<NotificationPermission | 'unsupported'> {
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

export function showDesktopNotification(event: AlertEngineEvent) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && event.level !== 'critical') return;

  try {
    const n = new Notification(event.testMode ? `[TEST] ${event.title}` : event.title, {
      body: event.subtitle,
      tag: `4ds-alert-${event.id}`,
      requireInteraction: event.requiresAck,
      silent: true, // we own audio via AlertEngine sounds
    });
    n.onclick = () => {
      window.focus();
      if (event.link) window.location.href = event.link;
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** Subtle screen attention for critical unacked alerts. */
export function setScreenFlash(on: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('ops-alert-flash', on);
}

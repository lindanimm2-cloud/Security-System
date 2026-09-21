import { hapticSupported } from './haptic-manager';
import { loadOpsAudioPrefs } from './profiles';

export type ReadinessItem = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export function getSoundHapticReadiness(): {
  items: ReadinessItem[];
  ready: boolean;
  statusLabel: string;
} {
  const prefs = loadOpsAudioPrefs();
  const notif =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false;
  const audioOk =
    typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const geo = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const items: ReadinessItem[] = [
    {
      id: 'notifications',
      label: 'Notifications',
      ok: notif,
      detail: notif ? 'Granted' : 'Enable in Emergency Permissions',
    },
    {
      id: 'sound',
      label: 'Sound',
      ok: audioOk && prefs.masterVolume > 0,
      detail: audioOk ? `Profile · ${prefs.profile}` : 'Web Audio unavailable',
    },
    {
      id: 'vibration',
      label: 'Vibration',
      ok: prefs.hapticsEnabled && (hapticSupported() || true),
      detail: hapticSupported()
        ? prefs.hapticsEnabled
          ? 'Enabled'
          : 'Disabled in prefs'
        : 'No vibrate API (desktop OK — audio/visual used)',
    },
    {
      id: 'background',
      label: 'Background operation',
      ok: sw,
      detail: sw ? 'Service worker capable' : 'Limited on this runtime',
    },
    {
      id: 'location',
      label: 'Location',
      ok: geo,
      detail: geo ? 'API present' : 'Unavailable',
    },
    {
      id: 'internet',
      label: 'Internet connection',
      ok: online,
      detail: online ? 'Online' : 'Offline',
    },
    {
      id: 'p1',
      label: 'P1 always audible',
      ok: prefs.p1AlwaysAudible,
      detail: prefs.p1AlwaysAudible
        ? 'Critical SOS cannot be permanently muted'
        : 'Warning — P1 override off',
    },
  ];

  const ready = items.filter((i) => i.id !== 'vibration').every((i) => i.ok) && prefs.p1AlwaysAudible;
  return {
    items,
    ready,
    statusLabel: ready ? 'READY FOR EMERGENCY ALERTS' : 'COMPLETE SETUP FOR FULL READINESS',
  };
}

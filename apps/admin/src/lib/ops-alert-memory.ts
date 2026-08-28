/** Session memory so the same non-critical briefing isn't re-announced. */
import { isNotificationQuietHours } from '@/lib/control-room-settings';

const KEY = '4ds_ops_alert_memory';

type MemoryEntry = {
  lastShownAt: number;
  acknowledgedAt?: number;
};

function readAll(): Record<string, MemoryEntry> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, MemoryEntry>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, MemoryEntry>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function shouldAnnounce(eventId: string, minIntervalMs = 10 * 60 * 1000): boolean {
  const map = readAll();
  const prev = map[eventId];
  if (!prev) return true;
  if (prev.acknowledgedAt) return false;
  return Date.now() - prev.lastShownAt > minIntervalMs;
}

export function markAnnounced(eventId: string) {
  const map = readAll();
  map[eventId] = { ...map[eventId], lastShownAt: Date.now() };
  writeAll(map);
}

export function acknowledgeAnnouncement(eventId: string) {
  const map = readAll();
  map[eventId] = {
    lastShownAt: map[eventId]?.lastShownAt ?? Date.now(),
    acknowledgedAt: Date.now(),
  };
  writeAll(map);
}

/** Quiet mode: non-critical alerts stay badge-only during configured quiet hours. */
export function isOpsQuietMode(): boolean {
  if (typeof window === 'undefined') return false;
  return isNotificationQuietHours();
}

export function setOpsQuietMode(on: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('4ds_ops_quiet', on ? 'true' : 'false');
}

import type { AlertCategoryKey, AlertLevel } from './types';

const MUTE_KEY = '4ds_alert_mutes';
const SNOOZE_KEY = '4ds_alert_snooze';

export type MuteScope = 'alert' | 'category' | 'shift';

type MuteEntry = {
  scope: MuteScope;
  key: string;
  until: number | null; // null = until cleared; never permanent for critical categories
  createdAt: number;
};

type SnoozeEntry = {
  key: string;
  until: number;
};

/** Categories that cannot be permanently muted. */
export const CRITICAL_PROTECTED: AlertCategoryKey[] = ['panic', 'silent'];

function readMutes(): MuteEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MUTE_KEY) ?? '[]') as MuteEntry[];
  } catch {
    return [];
  }
}

function writeMutes(entries: MuteEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, JSON.stringify(entries.slice(0, 80)));
}

function readSnoozes(): SnoozeEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(SNOOZE_KEY) ?? '[]') as SnoozeEntry[];
  } catch {
    return [];
  }
}

function writeSnoozes(entries: SnoozeEntry[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(entries.slice(0, 80)));
}

function prune() {
  const now = Date.now();
  writeMutes(readMutes().filter((m) => m.until === null || m.until > now));
  writeSnoozes(readSnoozes().filter((s) => s.until > now));
}

export function isCategoryProtected(category: AlertCategoryKey) {
  return CRITICAL_PROTECTED.includes(category);
}

export function canMutePermanently(category: AlertCategoryKey, level: AlertLevel) {
  if (level === 'critical' || isCategoryProtected(category)) return false;
  return true;
}

export function muteAlert(alertId: string, minutes: number) {
  prune();
  const entries = readMutes().filter((m) => !(m.scope === 'alert' && m.key === alertId));
  entries.unshift({
    scope: 'alert',
    key: alertId,
    until: Date.now() + minutes * 60_000,
    createdAt: Date.now(),
  });
  writeMutes(entries);
}

export function muteCategory(category: AlertCategoryKey, minutes: number | null) {
  prune();
  if (isCategoryProtected(category) && minutes === null) {
    // Policy: never permanent mute for panic/silent — force shift-length max 8h
    minutes = 8 * 60;
  }
  const entries = readMutes().filter((m) => !(m.scope === 'category' && m.key === category));
  entries.unshift({
    scope: 'category',
    key: category,
    until: minutes === null ? null : Date.now() + minutes * 60_000,
    createdAt: Date.now(),
  });
  writeMutes(entries);
}

export function muteUntilShiftEnd(hours = 8) {
  prune();
  const entries = readMutes().filter((m) => m.scope !== 'shift');
  entries.unshift({
    scope: 'shift',
    key: 'shift',
    until: Date.now() + hours * 60_000,
    createdAt: Date.now(),
  });
  writeMutes(entries);
}

export function snoozeAlert(alertId: string, minutes: 5 | 15) {
  prune();
  const entries = readSnoozes().filter((s) => s.key !== alertId);
  entries.unshift({ key: alertId, until: Date.now() + minutes * 60_000 });
  writeSnoozes(entries);
}

export function clearMute(scope: MuteScope, key: string) {
  writeMutes(readMutes().filter((m) => !(m.scope === scope && m.key === key)));
}

export function isAlertSuppressed(
  alertId: string,
  category: AlertCategoryKey,
  level: AlertLevel,
  opts?: { force?: boolean },
): boolean {
  if (opts?.force) return false;
  prune();
  const now = Date.now();

  // Critical panic/silent always break through category mute and shift mute for sound/overlay
  // — but snooze on THIS alert id is still allowed briefly after ACK UX
  const snooze = readSnoozes().find((s) => s.key === alertId && s.until > now);
  if (snooze) return true;

  const mutes = readMutes();
  if (mutes.some((m) => m.scope === 'alert' && m.key === alertId && (m.until === null || m.until > now))) {
    return true;
  }

  const protectedCritical = level === 'critical' || isCategoryProtected(category);
  if (protectedCritical) return false;

  if (mutes.some((m) => m.scope === 'category' && m.key === category && (m.until === null || m.until > now))) {
    return true;
  }
  if (mutes.some((m) => m.scope === 'shift' && (m.until === null || m.until > now))) {
    return true;
  }
  return false;
}

export function listActiveMutes() {
  prune();
  return readMutes();
}

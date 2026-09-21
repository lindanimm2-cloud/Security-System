import type { AlertHistoryEntry } from './types';

const KEY = '4ds_alert_history';
const MAX = 200;

function read(): AlertHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as AlertHistoryEntry[];
  } catch {
    return [];
  }
}

function write(entries: AlertHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
}

function stamp() {
  return new Date().toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function recordAlertHistory(
  alertId: string,
  alertLabel: string,
  action: string,
  actor = 'Control Room',
  detail?: string,
) {
  const entry: AlertHistoryEntry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    alertId,
    time: stamp(),
    alert: alertLabel,
    actor,
    action,
    detail,
  };
  write([entry, ...read()]);
  return entry;
}

export function listAlertHistory(limit = 80): AlertHistoryEntry[] {
  return read().slice(0, limit);
}

export function clearAlertHistory() {
  write([]);
}

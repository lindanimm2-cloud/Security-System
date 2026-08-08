export type ClockDisplayMode = 'futurist' | 'standard' | 'utc';

const STORAGE_KEY = '4ds-clock-mode';

export const CLOCK_MODE_LABELS: Record<ClockDisplayMode, string> = {
  futurist: 'Futurist',
  standard: 'Local',
  utc: 'UTC',
};

export function getClockMode(): ClockDisplayMode {
  if (typeof window === 'undefined') return 'futurist';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'standard' || stored === 'utc' || stored === 'futurist') return stored;
  return 'futurist';
}

export function setClockMode(mode: ClockDisplayMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function nextClockMode(current: ClockDisplayMode): ClockDisplayMode {
  const order: ClockDisplayMode[] = ['futurist', 'standard', 'utc'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

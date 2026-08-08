export type Theme = 'light' | 'dark';

export type ThemePreference = 'light' | 'dark' | 'system' | 'schedule';

export const THEME_STORAGE_KEY = '4ds-theme';
export const THEME_PREFERENCE_KEY = '4ds-theme-preference';

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  schedule: 'Automatic',
};

export const THEME_PREFERENCE_HINTS: Record<ThemePreference, string> = {
  light: 'Always use light mode.',
  dark: 'Always use dark mode.',
  system: 'Match your device appearance setting.',
  schedule: 'Dark from 6:00 PM to 6:00 AM, light during the day.',
};

const SCHEDULE_DARK_START_HOUR = 18;
const SCHEDULE_DARK_END_HOUR = 6;

export function isScheduleDarkHour(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= SCHEDULE_DARK_START_HOUR || hour < SCHEDULE_DARK_END_HOUR;
}

export function resolveTheme(preference: ThemePreference, date = new Date()): Theme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (preference === 'schedule') return isScheduleDarkHour(date) ? 'dark' : 'light';
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
  if (
    stored === 'light' ||
    stored === 'dark' ||
    stored === 'system' ||
    stored === 'schedule'
  ) {
    return stored;
  }

  const legacy = localStorage.getItem(THEME_STORAGE_KEY);
  if (legacy === 'light' || legacy === 'dark') return legacy;

  // Light is the primary default for first-time visitors (especially the public site).
  return 'light';
}

export function getPreferredTheme(): Theme {
  return resolveTheme(getStoredPreference());
}

export function applyThemePreference(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  localStorage.removeItem(THEME_STORAGE_KEY);
}

/** @deprecated Use applyThemePreference */
export function applyTheme(theme: Theme) {
  applyThemePreference(theme);
}

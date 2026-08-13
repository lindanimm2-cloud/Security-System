export type Theme = 'light' | 'dark';

export type ThemePreference = 'light' | 'dark' | 'system' | 'schedule';

export const THEME_STORAGE_KEY = '4ds-theme';
export const THEME_PREFERENCE_KEY = '4ds-theme-preference';
/** Set when the user explicitly chooses a theme (toggle or settings). */
export const THEME_USER_SET_KEY = '4ds-theme-user-set';

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  schedule: 'Automatic',
};

export const THEME_PREFERENCE_HINTS: Record<ThemePreference, string> = {
  light: 'Always use light mode.',
  dark: 'Default for ops — always use dark mode.',
  system: 'Match your device appearance setting.',
  schedule: 'Dark from 6:00 PM to 6:00 AM, light during the day.',
};

const SCHEDULE_DARK_START_HOUR = 18;
const SCHEDULE_DARK_END_HOUR = 6;
const DEFAULT_PREFERENCE: ThemePreference = 'dark';

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
  return 'dark';
}

function isValidPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' || value === 'schedule';
}

export function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE;

  // Until the user explicitly picks a theme, dark is primary everywhere.
  if (localStorage.getItem(THEME_USER_SET_KEY) !== '1') {
    return DEFAULT_PREFERENCE;
  }

  const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
  if (isValidPreference(stored)) return stored;

  const legacy = localStorage.getItem(THEME_STORAGE_KEY);
  if (legacy === 'light' || legacy === 'dark') return legacy;

  return DEFAULT_PREFERENCE;
}

export function getPreferredTheme(): Theme {
  return resolveTheme(getStoredPreference());
}

export function applyThemePreference(
  preference: ThemePreference,
  options?: { persist?: boolean },
) {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  if (options?.persist === false) return;
  localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  localStorage.setItem(THEME_USER_SET_KEY, '1');
  localStorage.removeItem(THEME_STORAGE_KEY);
}

/** Apply theme for first paint / sync without treating it as a user choice. */
export function applyThemePreview(preference: ThemePreference) {
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
}

/** @deprecated Use applyThemePreference */
export function applyTheme(theme: Theme) {
  applyThemePreference(theme);
}

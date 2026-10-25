export type Theme = 'light' | 'dark';

export type ThemePreference = 'light' | 'dark' | 'system' | 'schedule';

/** App-wide vs control-panel scoped theme storage. */
export type ThemeScope = 'app' | 'control';

export const THEME_STORAGE_KEY = '4ds-theme';
export const THEME_PREFERENCE_KEY = '4ds-theme-preference';
/** Set when the user explicitly chooses a theme (toggle or settings). */
export const THEME_USER_SET_KEY = '4ds-theme-user-set';
export const THEME_CONTROL_PREFERENCE_KEY = '4ds-theme-preference-control';
export const THEME_CONTROL_USER_SET_KEY = '4ds-theme-user-set-control';
export const THEME_SCHEDULE_LIGHT_KEY = '4ds-theme-schedule-light';
export const THEME_SCHEDULE_DARK_KEY = '4ds-theme-schedule-dark';
export const THEME_SCHEDULE_CHANGED_EVENT = '4ds-theme-schedule-changed';

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

const DEFAULT_SCHEDULE_LIGHT = '06:00';
const DEFAULT_SCHEDULE_DARK = '18:00';
/** Control panel always opens dark until the operator picks another mode. */
const DEFAULT_CONTROL_PREFERENCE: ThemePreference = 'dark';
/** Marketing / portals keep the shared default. */
const DEFAULT_APP_PREFERENCE: ThemePreference = 'dark';

function parseScheduleHour(time: string): number {
  const [h] = time.split(':').map((part) => parseInt(part, 10));
  return Number.isFinite(h) ? h : 0;
}

export function getThemeScope(pathname?: string | null): ThemeScope {
  if (!pathname) return 'app';
  return pathname.startsWith('/control-room') ? 'control' : 'app';
}

function preferenceKey(scope: ThemeScope): string {
  return scope === 'control' ? THEME_CONTROL_PREFERENCE_KEY : THEME_PREFERENCE_KEY;
}

function userSetKey(scope: ThemeScope): string {
  return scope === 'control' ? THEME_CONTROL_USER_SET_KEY : THEME_USER_SET_KEY;
}

function defaultPreference(scope: ThemeScope): ThemePreference {
  return scope === 'control' ? DEFAULT_CONTROL_PREFERENCE : DEFAULT_APP_PREFERENCE;
}

export function getScheduleHours(): { lightFrom: string; darkFrom: string } {
  if (typeof window === 'undefined') {
    return { lightFrom: DEFAULT_SCHEDULE_LIGHT, darkFrom: DEFAULT_SCHEDULE_DARK };
  }
  return {
    lightFrom: localStorage.getItem(THEME_SCHEDULE_LIGHT_KEY) ?? DEFAULT_SCHEDULE_LIGHT,
    darkFrom: localStorage.getItem(THEME_SCHEDULE_DARK_KEY) ?? DEFAULT_SCHEDULE_DARK,
  };
}

export function setScheduleHours(lightFrom: string, darkFrom: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_SCHEDULE_LIGHT_KEY, lightFrom);
  localStorage.setItem(THEME_SCHEDULE_DARK_KEY, darkFrom);
  window.dispatchEvent(new CustomEvent(THEME_SCHEDULE_CHANGED_EVENT));
}

export function isScheduleDarkHour(date = new Date()): boolean {
  const { lightFrom, darkFrom } = getScheduleHours();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const nowMins = hour * 60 + minute;
  const darkStart = parseScheduleHour(darkFrom) * 60;
  const lightStart = parseScheduleHour(lightFrom) * 60;

  if (darkStart > lightStart) {
    return nowMins >= darkStart || nowMins < lightStart;
  }
  return nowMins >= darkStart && nowMins < lightStart;
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

export function getStoredPreference(scope: ThemeScope = 'app'): ThemePreference {
  const fallback = defaultPreference(scope);
  if (typeof window === 'undefined') return fallback;

  // Until the user explicitly picks a theme for this scope, use the scope default.
  if (localStorage.getItem(userSetKey(scope)) !== '1') {
    return fallback;
  }

  const stored = localStorage.getItem(preferenceKey(scope));
  if (isValidPreference(stored)) return stored;

  // Legacy global key only applies to the app scope.
  if (scope === 'app') {
    const legacy = localStorage.getItem(THEME_STORAGE_KEY);
    if (legacy === 'light' || legacy === 'dark') return legacy;
  }

  return fallback;
}

export function getPreferredTheme(scope: ThemeScope = 'app'): Theme {
  return resolveTheme(getStoredPreference(scope));
}

export function applyThemePreference(
  preference: ThemePreference,
  options?: { persist?: boolean; scope?: ThemeScope },
) {
  const scope = options?.scope ?? 'app';
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  if (options?.persist === false) return;
  localStorage.setItem(preferenceKey(scope), preference);
  localStorage.setItem(userSetKey(scope), '1');
  if (scope === 'app') {
    localStorage.removeItem(THEME_STORAGE_KEY);
  }
}

/** Apply theme for first paint / sync without treating it as a user choice. */
export function applyThemePreview(preference: ThemePreference) {
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
}

/** @deprecated Use applyThemePreference */
export function applyTheme(theme: Theme) {
  applyThemePreference(theme);
}

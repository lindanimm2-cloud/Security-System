'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  applyThemePreference,
  applyThemePreview,
  getStoredPreference,
  resolveTheme,
  THEME_SCHEDULE_CHANGED_EVENT,
  type Theme,
  type ThemePreference,
} from '@/lib/theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  const syncResolvedTheme = useCallback(
    (nextPreference: ThemePreference, persist: boolean) => {
      const resolved = resolveTheme(nextPreference);
      setThemeState(resolved);
      if (persist) {
        applyThemePreference(nextPreference);
      } else {
        applyThemePreview(nextPreference);
      }
    },
    [],
  );

  useEffect(() => {
    const initialPreference = getStoredPreference();
    setPreferenceState(initialPreference);
    // Preview only — do not lock light/dark until the user toggles or picks settings.
    syncResolvedTheme(initialPreference, false);
    setMounted(true);
  }, [syncResolvedTheme]);

  useEffect(() => {
    if (!mounted) return;

    if (preference === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => syncResolvedTheme('system', false);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    if (preference === 'schedule') {
      const tick = () => syncResolvedTheme('schedule', false);
      tick();
      const id = window.setInterval(tick, 60_000);
      const onScheduleChange = () => tick();
      window.addEventListener(THEME_SCHEDULE_CHANGED_EVENT, onScheduleChange);
      return () => {
        window.clearInterval(id);
        window.removeEventListener(THEME_SCHEDULE_CHANGED_EVENT, onScheduleChange);
      };
    }

    return undefined;
  }, [mounted, preference, syncResolvedTheme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    syncResolvedTheme(next, true);
  }

  function toggleTheme() {
    const next: ThemePreference = theme === 'light' ? 'dark' : 'light';
    setPreference(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

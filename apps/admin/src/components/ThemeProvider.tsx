'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  applyThemePreference,
  getStoredPreference,
  resolveTheme,
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
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const syncResolvedTheme = useCallback((nextPreference: ThemePreference) => {
    const resolved = resolveTheme(nextPreference);
    setThemeState(resolved);
    applyThemePreference(nextPreference);
  }, []);

  useEffect(() => {
    const initialPreference = getStoredPreference();
    setPreferenceState(initialPreference);
    syncResolvedTheme(initialPreference);
    setMounted(true);
  }, [syncResolvedTheme]);

  useEffect(() => {
    if (!mounted) return;

    if (preference === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => syncResolvedTheme('system');
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    if (preference === 'schedule') {
      const tick = () => syncResolvedTheme('schedule');
      tick();
      const id = window.setInterval(tick, 60_000);
      return () => window.clearInterval(id);
    }

    return undefined;
  }, [mounted, preference, syncResolvedTheme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    syncResolvedTheme(next);
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

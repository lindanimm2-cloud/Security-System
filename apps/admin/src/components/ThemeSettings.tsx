'use client';

import { useTheme } from '@/components/ThemeProvider';
import {
  THEME_PREFERENCE_HINTS,
  THEME_PREFERENCE_LABELS,
  type ThemePreference,
} from '@/lib/theme';

const OPTIONS: ThemePreference[] = ['light', 'dark', 'system', 'schedule'];

export function ThemeSettings({ compact = false }: { compact?: boolean }) {
  const { theme, preference, setPreference } = useTheme();

  return (
    <section className={`theme-settings ${compact ? 'theme-settings--compact' : ''}`}>
      {!compact && (
        <div className="theme-settings__header">
          <h2>Appearance</h2>
          <p className="text-muted">
            Choose light or dark mode, follow your system, or switch automatically by time of day.
          </p>
        </div>
      )}

      <div className="theme-settings__options" role="radiogroup" aria-label="Theme preference">
        {OPTIONS.map((option) => {
          const selected = preference === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-settings__option ${selected ? 'theme-settings__option--active' : ''}`}
              onClick={() => setPreference(option)}
            >
              <span className="theme-settings__option-main">
                <span className="theme-settings__option-label">{THEME_PREFERENCE_LABELS[option]}</span>
                <span className="theme-settings__option-hint">{THEME_PREFERENCE_HINTS[option]}</span>
              </span>
              <span className={`theme-settings__check ${selected ? 'theme-settings__check--on' : ''}`} />
            </button>
          );
        })}
      </div>

      <p className="theme-settings__status text-muted">
        Currently showing <strong>{theme === 'dark' ? 'dark' : 'light'}</strong> mode
        {preference === 'system' && ' (from system)'}
        {preference === 'schedule' && ' (from schedule)'}
        .
      </p>
    </section>
  );
}

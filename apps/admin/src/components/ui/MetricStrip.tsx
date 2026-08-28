'use client';

import type { ReactNode } from 'react';

export type MetricItem = {
  id: string;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'active' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
};

function DefaultIcon({ tone }: { tone: MetricItem['tone'] }) {
  if (tone === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.4 2.4 4.6-5" />
      </svg>
    );
  }
  if (tone === 'active') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3 3.5 20h17L12 3z" />
        <path d="M12 9v5" />
        <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="ds-metric-strip" role="list">
      {items.map((item) => (
        <div key={item.id} className={`ds-metric ds-metric--${item.tone ?? 'neutral'}`} role="listitem">
          <span className="ds-metric__icon">{item.icon ?? <DefaultIcon tone={item.tone} />}</span>
          <div className="ds-metric__copy">
            <span className="ds-metric__label">{item.label}</span>
            <strong className="ds-metric__value">{item.value}</strong>
            {item.hint ? <span className="ds-metric__hint">{item.hint}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

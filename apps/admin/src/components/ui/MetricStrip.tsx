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

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="ds-metric-strip" role="list">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`ds-metric ds-metric--${item.tone ?? 'neutral'}${index === 0 ? ' ds-metric--primary' : ''}`}
          role="listitem"
          title={item.hint ? `${item.label}: ${item.hint}` : item.label}
        >
          {item.icon ? <span className="ds-metric__icon">{item.icon}</span> : null}
          <span className="ds-metric__label">{item.label}</span>
          <strong className="ds-metric__value">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

'use client';

import type { ChartTone } from './chart-helpers';

export type BarItem = {
  label: string;
  value: number;
  tone?: ChartTone;
  hint?: string;
};

type HorizontalBarsProps = {
  items: BarItem[];
  max?: number;
  compact?: boolean;
};

export function HorizontalBars({ items, max, compact }: HorizontalBarsProps) {
  const peak = max ?? Math.max(1, ...items.map((item) => item.value));

  return (
    <div className={`ds-hbars ${compact ? 'ds-hbars--compact' : ''}`.trim()}>
      {items.map((item) => {
        const pct = Math.round((item.value / peak) * 100);
        return (
          <div key={item.label} className="ds-hbars__row" title={item.hint}>
            <span className="ds-hbars__label">{item.label}</span>
            <div className="ds-hbars__track">
              <div
                className={`ds-hbars__fill ds-hbars__fill--${item.tone ?? 'accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="ds-hbars__value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

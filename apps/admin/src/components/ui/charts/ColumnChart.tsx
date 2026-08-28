'use client';

import type { ChartTone } from './chart-helpers';

export type ColumnItem = {
  label: string;
  value: number;
  tone?: ChartTone;
};

type ColumnChartProps = {
  items: ColumnItem[];
  height?: number;
  emptyLabel?: string;
};

export function ColumnChart({ items, height = 120, emptyLabel = 'No activity' }: ColumnChartProps) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="ds-column-chart" style={{ ['--ds-column-height' as string]: `${height}px` }}>
      {items.length === 0 || items.every((item) => item.value === 0) ? (
        <p className="ds-chart-empty">{emptyLabel}</p>
      ) : (
        <div className="ds-column-chart__bars" role="list">
          {items.map((item) => {
            const pct = Math.max(6, Math.round((item.value / max) * 100));
            return (
              <div key={item.label} className="ds-column-chart__item" role="listitem">
                <div className="ds-column-chart__bar-wrap" title={`${item.label}: ${item.value}`}>
                  <div
                    className={`ds-column-chart__bar ds-column-chart__bar--${item.tone ?? 'accent'}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="ds-column-chart__label">{item.label}</span>
                <span className="ds-column-chart__value">{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

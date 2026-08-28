'use client';

import { sliceColor, sumSlices, type ChartSlice } from './chart-helpers';

type DonutChartProps = {
  slices: ChartSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  emptyLabel?: string;
};

export function DonutChart({
  slices,
  size = 148,
  thickness = 18,
  centerLabel,
  centerValue,
  emptyLabel = 'No data',
}: DonutChartProps) {
  const total = sumSlices(slices);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs =
    total > 0
      ? slices.map((slice, index) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const strokeDasharray = `${dash} ${gap}`;
          const strokeDashoffset = -offset;
          offset += dash;
          return {
            slice,
            index,
            strokeDasharray,
            strokeDashoffset,
          };
        })
      : [];

  return (
    <div className="ds-donut">
      <div className="ds-donut__ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--surface-3, var(--border))"
            strokeWidth={thickness}
          />
          {arcs.map(({ slice, index, strokeDasharray, strokeDashoffset }) => (
            <circle
              key={`${slice.label}-${index}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={sliceColor(slice, index)}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="ds-donut__arc"
            />
          ))}
        </svg>
        <div className="ds-donut__center">
          {total > 0 ? (
            <>
              <strong>{centerValue ?? total}</strong>
              {centerLabel ? <span>{centerLabel}</span> : null}
            </>
          ) : (
            <span className="ds-donut__empty">{emptyLabel}</span>
          )}
        </div>
      </div>
      <ul className="ds-chart-legend">
        {slices.map((slice, index) => (
          <li key={`${slice.label}-${index}`}>
            <span className="ds-chart-legend__swatch" style={{ background: sliceColor(slice, index) }} />
            <span className="ds-chart-legend__label">{slice.label}</span>
            <span className="ds-chart-legend__value">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

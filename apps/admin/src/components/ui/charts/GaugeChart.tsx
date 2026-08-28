'use client';

type GaugeChartProps = {
  value: number;
  max?: number;
  label?: string;
  hint?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
};

const TONE_STOPS: Record<NonNullable<GaugeChartProps['tone']>, [string, string]> = {
  accent: ['#7f1d1d', 'var(--accent)'],
  success: ['#14532d', 'var(--success)'],
  warning: ['#78350f', 'var(--warning)'],
  danger: ['#450a0a', 'var(--danger)'],
};

export function GaugeChart({ value, max = 100, label, hint, tone = 'accent' }: GaugeChartProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? clamped / max : 0;
  const width = 200;
  const height = 112;
  const stroke = 14;
  const radius = 78;
  const cx = width / 2;
  const cy = height - 8;
  const arcLength = Math.PI * radius;
  const dash = arcLength * pct;
  const [start, end] = TONE_STOPS[tone];
  const gradientId = `gauge-${tone}-${Math.round(pct * 100)}`;

  return (
    <div className="ds-gauge">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--surface-3, var(--border))"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLength}`}
          className="ds-gauge__fill"
        />
      </svg>
      <div className="ds-gauge__readout">
        <strong>{Math.round(pct * 100)}%</strong>
        {label ? <span>{label}</span> : null}
        {hint ? <small>{hint}</small> : null}
      </div>
    </div>
  );
}

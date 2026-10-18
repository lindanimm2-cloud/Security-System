'use client';

type SparklineProps = {
  points: number[];
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  height?: number;
  width?: number;
  compact?: boolean;
};

export function Sparkline({
  points,
  tone = 'accent',
  height,
  width,
  compact = false,
}: SparklineProps) {
  if (points.length === 0) return null;

  const h = height ?? (compact ? 14 : 36);
  const w = width ?? (compact ? 42 : 120);
  const pad = compact ? 1 : 2;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((value, index) => {
    const x = pad + index * step;
    const y = h - pad - ((value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const area = `${pad},${h - pad} ${coords.join(' ')} ${w - pad},${h - pad}`;
  const line = coords.join(' ');

  return (
    <svg
      className={`ds-sparkline ds-sparkline--${tone}${compact ? ' ds-sparkline--compact' : ''}`}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polygon points={area} className="ds-sparkline__area" />
      <polyline points={line} className="ds-sparkline__line" />
    </svg>
  );
}

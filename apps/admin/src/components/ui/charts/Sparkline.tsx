'use client';

type SparklineProps = {
  points: number[];
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  height?: number;
};

export function Sparkline({ points, tone = 'accent', height = 36 }: SparklineProps) {
  if (points.length === 0) return null;

  const width = 120;
  const pad = 2;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const area = `${pad},${height - pad} ${coords.join(' ')} ${width - pad},${height - pad}`;
  const line = coords.join(' ');

  return (
    <svg className={`ds-sparkline ds-sparkline--${tone}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polygon points={area} className="ds-sparkline__area" />
      <polyline points={line} className="ds-sparkline__line" />
    </svg>
  );
}

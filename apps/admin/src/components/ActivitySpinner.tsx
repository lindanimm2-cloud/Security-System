'use client';

const SPOKES = 12;

export function ActivitySpinner({
  size = 'md',
  className = '',
  label,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`ios-spinner ios-spinner--${size} ${className}`.trim()}
      role="status"
      aria-label={label ?? 'Loading'}
      aria-live="polite"
    >
      <svg className="ios-spinner__svg" viewBox="0 0 40 40" aria-hidden>
        {Array.from({ length: SPOKES }, (_, i) => (
          <line
            key={i}
            className="ios-spinner__spoke"
            x1="20"
            y1="4"
            x2="20"
            y2="12"
            transform={`rotate(${i * (360 / SPOKES)} 20 20)`}
            style={{
              animationDelay: `${-((SPOKES - 1 - i) / SPOKES).toFixed(4)}s`,
            }}
          />
        ))}
      </svg>
    </span>
  );
}

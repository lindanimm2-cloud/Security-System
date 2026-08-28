'use client';

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: 'accent' | 'success' | 'warning';
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="ds-progress">
      {label ? <div className="ds-progress__label">{label}</div> : null}
      <div
        className="ds-progress__track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <span className={`ds-progress__fill ds-progress__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

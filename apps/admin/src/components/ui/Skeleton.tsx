'use client';

export function Skeleton({
  lines = 3,
  cards = 0,
  label = 'Loading',
}: {
  lines?: number;
  cards?: number;
  label?: string;
}) {
  return (
    <div className="ds-skeleton" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      {cards > 0 ? (
        <div className="ds-metric-strip ds-metric-strip--skeleton">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="ds-metric ds-skeleton__block" />
          ))}
        </div>
      ) : null}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="ds-skeleton__card">
          <span className="ds-skeleton__line ds-skeleton__line--lg" />
          <span className="ds-skeleton__line" />
          <span className="ds-skeleton__line ds-skeleton__line--sm" />
        </div>
      ))}
    </div>
  );
}

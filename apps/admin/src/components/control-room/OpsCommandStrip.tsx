'use client';

export type OpsQueueFilter = 'all' | 'p1' | 'p2' | 'p3' | 'unassigned';

export function OpsCommandStrip({
  live = true,
  active,
  p1,
  slaBreaches,
  filter,
  onFilter,
}: {
  live?: boolean;
  active: number;
  p1: number;
  slaBreaches: number;
  filter: OpsQueueFilter;
  onFilter: (value: OpsQueueFilter) => void;
}) {
  const chips: { id: OpsQueueFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'p1', label: 'P1' },
    { id: 'p2', label: 'P2' },
    { id: 'p3', label: 'P3' },
    { id: 'unassigned', label: 'Unassigned' },
  ];

  return (
    <section className="ops-strip" aria-label="Control room status">
      <div className="ops-strip__brand">
        <strong>
          <span className={`ops-strip__live ${live ? 'ops-strip__live--on' : ''}`} aria-hidden />
          Live
        </strong>
      </div>
      <dl className="ops-strip__stats">
        <div>
          <dt>Active</dt>
          <dd>{active}</dd>
        </div>
        <div className={p1 > 0 ? 'ops-strip__hot' : undefined}>
          <dt>P1</dt>
          <dd>{p1}</dd>
        </div>
        <div className={slaBreaches > 0 ? 'ops-strip__hot' : undefined}>
          <dt>SLA breaches</dt>
          <dd>{slaBreaches}</dd>
        </div>
      </dl>
      <div className="ops-strip__filters" role="tablist" aria-label="Queue filter">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={filter === chip.id}
            className={`ops-strip__chip ${filter === chip.id ? 'ops-strip__chip--on' : ''}`}
            onClick={() => onFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}

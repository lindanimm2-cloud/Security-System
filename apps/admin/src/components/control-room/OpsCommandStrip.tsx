'use client';

export type OpsQueueFilter = 'all' | 'p1' | 'p2' | 'p3' | 'unassigned';

export function OpsCommandStrip({
  filter,
  onFilter,
}: {
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
    <section className="ops-strip ops-strip--command" aria-label="Queue filter">
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

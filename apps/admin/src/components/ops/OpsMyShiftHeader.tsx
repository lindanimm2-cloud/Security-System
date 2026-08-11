'use client';

type Chip = {
  id: string;
  label: string;
  count: number;
  tone?: 'urgent' | 'warn' | 'ok' | 'neutral';
};

export function OpsMyShiftHeader({
  title,
  subtitle,
  chips,
  activeChip,
  onChip,
}: {
  title: string;
  subtitle: string;
  chips: Chip[];
  activeChip: string;
  onChip: (id: string) => void;
}) {
  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="ops-shift">
      <p className="ops-shift__date">{today}</p>
      <h1 className="ops-shift__title">{title}</h1>
      <p className="ops-shift__sub">{subtitle}</p>
      <div className="ops-shift__chips" role="tablist" aria-label="Filter priorities">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activeChip === c.id}
            className={`ops-shift__chip ops-shift__chip--${c.tone ?? 'neutral'} ${
              activeChip === c.id ? 'is-active' : ''
            }`}
            onClick={() => onChip(c.id)}
          >
            <strong>{c.count}</strong>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

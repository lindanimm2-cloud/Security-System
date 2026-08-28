'use client';

type Chip = {
  id: string;
  label: string;
  count: number | string;
  tone?: 'urgent' | 'warn' | 'ok' | 'neutral';
};

export function OpsMyShiftHeader({
  title,
  subtitle,
  chips,
  activeChip,
  onChip,
  urgent = false,
}: {
  title: string;
  subtitle: string;
  chips: Chip[];
  activeChip: string;
  onChip: (id: string) => void;
  urgent?: boolean;
}) {
  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className={`ops-shift ${urgent ? 'ops-shift--urgent' : ''}`}>
      <p className="ops-shift__date">{today}</p>
      <div className="ops-shift__intro">
        <h1 className="ops-shift__title">{title}</h1>
        <p className={`ops-shift__sub ${urgent ? 'ops-shift__sub--alert' : ''}`}>{subtitle}</p>
      </div>
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
            <span className="ops-shift__chip-label">{c.label}</span>
            <strong>{c.count}</strong>
          </button>
        ))}
      </div>
    </header>
  );
}

'use client';

import type { LayoutView } from '@/hooks/useLayoutView';

type LayoutViewToggleProps = {
  value: LayoutView;
  onChange: (view: LayoutView) => void;
  className?: string;
  label?: string;
};

export function LayoutViewToggle({
  value,
  onChange,
  className = '',
  label = 'Layout',
}: LayoutViewToggleProps) {
  return (
    <div
      className={`layout-view-toggle ${className}`.trim()}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={`layout-view-toggle__btn ${value === 'grid' ? 'layout-view-toggle__btn--on' : ''}`}
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        aria-label="Grid view"
        title="Grid view"
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className={`layout-view-toggle__btn ${value === 'list' ? 'layout-view-toggle__btn--on' : ''}`}
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
        aria-label="List view"
        title="List view"
      >
        <ListIcon />
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

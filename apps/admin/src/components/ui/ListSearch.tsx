'use client';

type ListSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
  resultCount?: number;
  totalCount?: number;
};

export function ListSearch({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  id = 'list-search',
  className = '',
  resultCount,
  totalCount,
}: ListSearchProps) {
  const showCount =
    value.trim().length > 0 && typeof resultCount === 'number' && typeof totalCount === 'number';

  return (
    <label className={`list-search ${className}`.trim()} htmlFor={id}>
      <span className="list-search__icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <span className="sr-only">{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {showCount ? (
        <span className="list-search__count">
          {resultCount} / {totalCount}
        </span>
      ) : null}
      {value ? (
        <button
          type="button"
          className="list-search__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      ) : null}
    </label>
  );
}

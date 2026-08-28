'use client';

export type PageTab = {
  id: string;
  label: string;
};

export function PageTabs({
  tabs,
  active,
  onChange,
  ariaLabel = 'Page sections',
}: {
  tabs: PageTab[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="page-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`page-tabs__tab ${selected ? 'page-tabs__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

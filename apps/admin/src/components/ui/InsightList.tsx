'use client';

export type InsightRow = {
  id: string;
  title: string;
  detail?: string;
  meta?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
};

export function InsightList({
  items,
  emptyTitle = 'Nothing to show',
  emptyBody,
}: {
  items: InsightRow[];
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="ds-insight-empty" role="status">
        <strong>{emptyTitle}</strong>
        {emptyBody ? <p>{emptyBody}</p> : null}
      </div>
    );
  }

  return (
    <ul className="ds-insight-list">
      {items.map((item) => (
        <li key={item.id} className={`ds-insight-row ds-insight-row--${item.tone ?? 'neutral'}`}>
          <div className="ds-insight-row__copy">
            <strong>{item.title}</strong>
            {item.detail ? <span>{item.detail}</span> : null}
          </div>
          {item.meta ? <span className="ds-insight-row__meta">{item.meta}</span> : null}
        </li>
      ))}
    </ul>
  );
}

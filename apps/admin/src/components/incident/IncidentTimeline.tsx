'use client';

export type TimelineItem = {
  id: string;
  kind: 'event' | 'note';
  type: string;
  source: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

function labelFor(type: string) {
  return type.replace(/\./g, ' · ').replace(/_/g, ' ');
}

export function IncidentTimeline({
  items,
  compact = false,
}: {
  items: TimelineItem[];
  compact?: boolean;
}) {
  if (!items.length) {
    return <p className="text-muted incident-timeline__empty">No timeline events yet.</p>;
  }
  const shown = compact ? items.slice(-3) : items;
  return (
    <ol className={`incident-timeline ${compact ? 'incident-timeline--compact' : ''}`}>
      {shown.map((item) => {
        const time = new Date(item.createdAt).toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <li key={item.id} className="incident-timeline__item">
            <span className="incident-timeline__dot" aria-hidden />
            <div className="incident-timeline__body">
              <span className="incident-timeline__time">{time}</span>
              <span className="incident-timeline__type">{labelFor(item.type)}</span>
              {item.source ? <span className="incident-timeline__actor">{item.source}</span> : null}
              {item.kind === 'note' && item.payload?.content ? (
                <p className="incident-timeline__note">{String(item.payload.content)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

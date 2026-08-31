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

export type TimelineTone =
  | 'critical'
  | 'warning'
  | 'progress'
  | 'arrived'
  | 'success'
  | 'info'
  | 'medical';

const TONE_BY_TYPE: Record<string, TimelineTone> = {
  'panic.created': 'critical',
  'panic.cancelled': 'success',
  'duress.created': 'critical',
  'alarm.triggered': 'critical',
  'security.lockdown': 'critical',
  'device.stolen': 'critical',
  'device.lost': 'warning',
  'incident.created': 'warning',
  'incident.updated': 'info',
  'incident.assigned': 'progress',
  'incident.acknowledged': 'arrived',
  'incident.escalated': 'critical',
  'incident.resolved': 'success',
  'dispatch.created': 'warning',
  'dispatch.accepted': 'progress',
  'dispatch.en_route': 'progress',
  'dispatch.arrived': 'arrived',
  'dispatch.completed': 'success',
  'unit.location.updated': 'progress',
  'unit.status.updated': 'progress',
  'call.started': 'progress',
  'call.ended': 'success',
  'note.added': 'info',
  'message.created': 'info',
};

export function toneForTimelineItem(item: TimelineItem): TimelineTone {
  const t = item.type.toLowerCase();
  const kind = String(item.payload?.kind ?? '').toLowerCase();

  if (item.kind === 'note' || t.includes('note') || t.includes('message')) return 'info';

  const mapped = TONE_BY_TYPE[t];
  if (mapped) {
    if (mapped === 'warning' && (kind === 'panic' || kind === 'silent' || kind === 'home-panic')) {
      return 'critical';
    }
    if (mapped === 'warning' && kind === 'medical') return 'medical';
    return mapped;
  }

  if (t.includes('medical')) return 'medical';
  if (t.includes('cancelled') || t.includes('resolved') || t.includes('completed') || t.includes('call.ended')) {
    return 'success';
  }
  if (t.includes('arrived') || t.includes('on_scene') || t.includes('acknowledged')) return 'arrived';
  if (t.includes('en_route') || t.includes('accepted') || t.includes('location') || t.includes('call.started')) {
    return 'progress';
  }
  if (
    t.includes('panic') ||
    t.includes('escalat') ||
    t.includes('duress') ||
    t.includes('stolen') ||
    t.includes('lockdown')
  ) {
    return 'critical';
  }
  if (t.includes('created') || t.includes('assigned') || t.includes('alarm') || t.includes('fire')) {
    return 'warning';
  }
  return 'info';
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
      {shown.map((item, index) => {
        const time = new Date(item.createdAt).toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const tone = toneForTimelineItem(item);
        const current = index === shown.length - 1;
        return (
          <li
            key={item.id}
            className={`incident-timeline__item incident-timeline__item--${tone}${
              current ? ' incident-timeline__item--current' : ''
            }`}
            data-tone={tone}
          >
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

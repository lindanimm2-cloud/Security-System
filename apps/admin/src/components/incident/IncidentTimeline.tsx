'use client';

export type TimelineItem = {
  id: string;
  kind: 'event' | 'note';
  type: string;
  source: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

const LABEL_BY_TYPE: Record<string, string> = {
  'panic.created': 'Panic initiated',
  'panic.cancelled': 'Panic cancelled',
  'duress.created': 'Silent alert sent',
  'alarm.triggered': 'Alarm triggered',
  'security.lockdown': 'Lockdown started',
  'device.stolen': 'Device marked stolen',
  'device.lost': 'Device marked lost',
  'incident.created': 'Alert opened',
  'incident.updated': 'Update received',
  'incident.assigned': 'Responder assigned',
  'incident.acknowledged': 'Control room acknowledged',
  'incident.escalated': 'Alert escalated',
  'incident.resolved': 'All clear',
  'incident.open': 'Alert open',
  'incident.active': 'Response in progress',
  'incident.dispatched': 'Response underway',
  'dispatch.created': 'Response started',
  'dispatch.accepted': 'Responder accepted',
  'dispatch.en_route': 'Responder on the way',
  'dispatch.arrived': 'Responder arrived',
  'dispatch.completed': 'Response complete',
  'unit.location.updated': 'Responder moving',
  'unit.status.updated': 'Responder update',
  'call.started': 'Call connected',
  'call.ended': 'Call ended',
  'note.added': 'Note added',
  'message.created': 'Message sent',
};

const WORD: Record<string, string> = {
  incident: 'alert',
  dispatch: 'response',
  panic: 'panic',
  created: 'started',
  updated: 'updated',
  assigned: 'assigned',
  acknowledged: 'acknowledged',
  escalated: 'escalated',
  resolved: 'cleared',
  accepted: 'accepted',
  en_route: 'on the way',
  enroute: 'on the way',
  arrived: 'arrived',
  completed: 'complete',
  triggered: 'triggered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

const SOURCE_LABEL: Record<string, string> = {
  portal: 'You',
  app: 'You',
  client: 'You',
  'control-room': 'Control room',
  controlroom: 'Control room',
  cr: 'Control room',
  officer: 'Responder',
  unit: 'Responder',
  site: 'Property',
  vehicle: 'Vehicle',
};

function labelFor(item: TimelineItem) {
  const t = String(item?.type ?? '').toLowerCase();
  const kind = String(item.payload?.kind ?? '').toLowerCase();

  if (kind === 'panic' || kind === 'home-panic') return 'Panic initiated';
  if (kind === 'silent' || kind === 'duress') return 'Silent alert sent';
  if (kind === 'medical') return 'Medical help requested';
  if (kind === 'fire') return 'Fire response requested';
  if (kind === 'vehicle-panic') return 'Vehicle panic initiated';

  if (LABEL_BY_TYPE[t]) return LABEL_BY_TYPE[t];

  const parts = t.split(/[._]/).filter(Boolean);
  if (parts.length === 0) return 'Update';
  return parts.map((p) => WORD[p] ?? p.replace(/-/g, ' ')).join(' ');
}

function sourceLabel(source: string) {
  const key = source.trim().toLowerCase();
  if (SOURCE_LABEL[key]) return SOURCE_LABEL[key];
  return source.replace(/[-_]/g, ' ');
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
  const t = String(item?.type ?? '').toLowerCase();
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
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return <p className="text-muted incident-timeline__empty">No updates yet.</p>;
  }
  const shown = compact ? list.slice(-3) : list;
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
              <span className="incident-timeline__type">{labelFor(item)}</span>
              {item.source ? <span className="incident-timeline__actor">{sourceLabel(item.source)}</span> : null}
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

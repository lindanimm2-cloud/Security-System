'use client';

import type { CrossDeviceIncidentView } from '@/lib/platform';
import { DEMO_WATCH_SOS_INCIDENT } from '@/lib/platform';

export function CrossDeviceIncidentCard({
  incident = DEMO_WATCH_SOS_INCIDENT,
  compact = false,
}: {
  incident?: CrossDeviceIncidentView;
  compact?: boolean;
}) {
  return (
    <article className={`xd-incident ${compact ? 'xd-incident--compact' : ''}`}>
      <header className="xd-incident__head">
        <p className="xd-incident__ref">{incident.publicRef}</p>
        <h3>{incident.title}</h3>
        <p className="xd-incident__source">
          <span aria-hidden>{incident.sourceIcon}</span> SOURCE · {incident.sourceLabel}
          {incident.unitLabel ? ` · Officer: ${incident.unitLabel}` : ''}
        </p>
        <p className={`xd-incident__status ${incident.status === 'ACTIVE' ? 'xd-incident__status--active' : ''}`}>
          🚨 {incident.status}
        </p>
      </header>

      <section>
        <p className="dash-ops__eyebrow">Connected devices</p>
        <ul className="xd-incident__devices">
          {incident.connected.map((d) => (
            <li key={d.id}>
              <span aria-hidden>{d.icon}</span> {d.label}
            </li>
          ))}
        </ul>
      </section>

      {!compact ? (
        <section>
          <p className="dash-ops__eyebrow">Timeline</p>
          <ol className="xd-incident__timeline">
            {incident.timeline.map((row) => (
              <li key={`${row.at}-${row.label}`}>
                <time>{row.at}</time>
                <span>{row.label}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { useNow } from '@/hooks/useNow';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import {
  cctvLabel,
  etaSnapshot,
  isPanicIncident,
  mapLabel,
  OPS_KIND_META,
  opsAlertKind,
  opsCardDensity,
  opsIsDispatched,
  opsPriorityLabel,
  opsResponseStatus,
  slaSnapshot,
  type OpsIncident,
} from '@/lib/ops-incident';

type Props = {
  incident: OpsIncident;
  focused?: boolean;
  canCctv?: boolean;
  canMap?: boolean;
  resolveBusy?: boolean;
  onSelect: () => void;
  onResolve: () => void;
  onAssigned?: () => void;
};

function ActionIcon({ name }: { name: 'dispatch' | 'call' | 'cctv' | 'map' | 'resolve' | 'track' }) {
  const paths: Record<typeof name, ReactNode> = {
    dispatch: (
      <>
        <circle cx="12" cy="12" r="2" />
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
      </>
    ),
    call: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    cctv: (
      <>
        <rect x="2" y="6" width="13" height="11" rx="2" />
        <path d="m15 10 6-3v9l-6-3" />
      </>
    ),
    map: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    resolve: <path d="M20 6 9 17l-5-5" />,
    track: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export function OpsIncidentCard({
  incident,
  focused,
  canCctv = true,
  canMap = true,
  resolveBusy,
  onSelect,
  onResolve,
  onAssigned,
}: Props) {
  const now = useNow();
  const density = opsCardDensity(incident.priority, incident.type);
  const kind = opsAlertKind(incident.type);
  const meta = OPS_KIND_META[kind];
  const band = opsPriorityLabel(incident.priority, incident.type);
  const status = opsResponseStatus(incident.status, incident.officer);
  const dispatched = opsIsDispatched(incident.status, incident.officer);
  const sla = slaSnapshot(incident, now);
  const eta = etaSnapshot(incident.etaDueAt, now);
  const cctv = cctvLabel(incident);
  const map = mapLabel(incident);
  const panic = isPanicIncident(incident.type);
  const phone = dispatched
    ? incident.officerPhone ?? incident.userPhone ?? '+27820000000'
    : incident.userPhone ?? '+27820000000';
  const compact = density === 'p3' && !focused && !panic;

  return (
    <article
      className={[
        'ops-inc',
        `ops-inc--${density}`,
        `ops-inc--${kind}`,
        focused ? 'ops-inc--on' : '',
        sla.overdue ? 'ops-inc--sla' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button type="button" className="ops-inc__hit" onClick={onSelect}>
        <header className="ops-inc__head">
          <span className={`ops-inc__pri ops-inc__pri--${band}`}>{band}</span>
          <span className="ops-inc__kind">
            <span className="ops-inc__glyph" aria-hidden>
              {meta.glyph}
            </span>
            {panic ? 'PANIC ALERT' : meta.label}
          </span>
          <span className={`ops-inc__state ops-inc__state--${status.replace(/\s+/g, '-').toLowerCase()}`}>
            {status}
          </span>
        </header>

        <strong className="ops-inc__who">{incident.user}</strong>
        {panic ? <p className="ops-inc__device">Primary device panic</p> : null}

        <p className="ops-inc__where">
          {incident.location}
          <span>
            ACTIVE · {sla.elapsed}
          </span>
        </p>

        {sla.overdue ? (
          <p className="ops-inc__sla">SLA {sla.clock} OVERDUE</p>
        ) : compact ? null : (
          <p className="ops-inc__sla ops-inc__sla--ok">SLA {sla.clock}</p>
        )}

        {dispatched && !compact ? (
          <div className="ops-inc__unit">
            <span className="ops-inc__unit-kicker">{incident.unit ?? 'Unit'} dispatched</span>
            <span>
              {incident.officer ?? 'Officer assigned'}
              {eta ? ` · ETA ${eta.overdue ? 'DUE' : eta.clock}` : ''}
            </span>
          </div>
        ) : null}
      </button>

      {compact ? null : (
        <>
          <div className="ops-inc__acts ops-inc__acts--primary">
            {dispatched ? (
              canMap ? (
                <Link
                  className="ops-act"
                  href={`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionIcon name="track" />
                  Track
                </Link>
              ) : null
            ) : (
              <DispatchMenuButton
                incidentId={incident.id}
                className="ops-act ops-act--dispatch"
                label={
                  <>
                    <ActionIcon name="dispatch" />
                    Dispatch
                  </>
                }
                onAssigned={onAssigned}
              />
            )}
            <a
              className="ops-act"
              href={`tel:${phone}`}
              title={`Call ${incident.user}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ActionIcon name="call" />
              Call
            </a>
            {canCctv ? (
              <Link
                className={`ops-act ${cctv.tone === 'warn' ? 'ops-act--warn' : ''}`}
                href={CONTROL_ROOM_ROUTES.surveillance}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon name="cctv" />
                {cctv.text}
              </Link>
            ) : null}
          </div>
          <div className="ops-inc__acts ops-inc__acts--secondary">
            {canMap ? (
              <Link
                className={`ops-act ${map.tone === 'warn' ? 'ops-act--warn' : ''}`}
                href={`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon name="map" />
                {map.text}
              </Link>
            ) : null}
            <button
              type="button"
              className="ops-act ops-act--resolve"
              disabled={resolveBusy}
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              title="Mark incident resolved"
            >
              <ActionIcon name="resolve" />
              {resolveBusy ? '…' : 'Done'}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

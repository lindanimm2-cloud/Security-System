'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { IncidentChat } from '@/components/incident/IncidentChat';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { useNow } from '@/hooks/useNow';
import { CONTROL_ROOM_ROUTES, incidentHref } from '@/lib/control-room-routes';
import {
  cctvLabel,
  etaSnapshot,
  isPanicIncident,
  OPS_KIND_META,
  opsAlertKind,
  opsCardDensity,
  opsIsDispatched,
  opsPriorityLabel,
  opsResponseStatus,
  slaSnapshot,
  type OpsIncident,
} from '@/lib/ops-incident';

const DashboardLiveMap = dynamic(
  () =>
    import('@/components/control-room/DashboardLiveMap').then((m) => m.DashboardLiveMap),
  { ssr: false },
);

type Props = {
  incident: OpsIncident;
  focused?: boolean;
  canCctv?: boolean;
  canMap?: boolean;
  canChat?: boolean;
  resolveBusy?: boolean;
  onSelect: () => void;
  onResolve: () => void;
  onAssigned?: () => void;
};

type MobileDrawer = 'cctv' | 'track' | 'call' | 'chat' | null;

function ActionIcon({
  name,
}: {
  name: 'dispatch' | 'call' | 'cctv' | 'chat' | 'resolve' | 'track';
}) {
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
    chat: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function useIsMobileOps(maxWidth = 900) {
  // null = unknown (SSR / first paint). Prefer drawer controls until we know it's desktop
  // so mobile taps don't briefly hit Links and navigate away.
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [maxWidth]);
  return mobile;
}

export function OpsIncidentCard({
  incident,
  focused,
  canCctv = true,
  canMap = true,
  canChat = true,
  resolveBusy,
  onSelect,
  onResolve,
  onAssigned,
}: Props) {
  const now = useNow();
  const isMobile = useIsMobileOps();
  const useDrawer = isMobile !== false;
  const [drawer, setDrawer] = useState<MobileDrawer>(null);
  const density = opsCardDensity(incident.priority, incident.type);
  const kind = opsAlertKind(incident.type);
  const meta = OPS_KIND_META[kind];
  const band = opsPriorityLabel(incident.priority, incident.type);
  const status = opsResponseStatus(incident.status, incident.officer);
  const dispatched = opsIsDispatched(incident.status, incident.officer);
  const sla = slaSnapshot(incident, now);
  const eta = etaSnapshot(incident.etaDueAt, now);
  const cctv = cctvLabel(incident);
  const panic = isPanicIncident(incident.type);
  const clientPhone = incident.userPhone ?? '+27820000000';
  const officerPhone = incident.officerPhone ?? null;
  const phone = dispatched ? officerPhone ?? clientPhone : clientPhone;
  const compact = density === 'p3' && !focused && !panic;
  const cameras = (incident.previewCameras ?? []).slice(0, 4);
  const feedTitle =
    incident.cctvKind === 'dash' ? 'Dash cams' : 'Property CCTV';
  const callTargets = [
    {
      id: 'client',
      role: 'Client',
      name: incident.user,
      number: clientPhone,
    },
    ...(dispatched && incident.officer
      ? [
          {
            id: 'officer',
            role: 'Unit',
            name: incident.officer,
            number: officerPhone ?? '+27820000000',
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (isMobile === false) setDrawer(null);
  }, [isMobile]);

  useEffect(() => {
    setDrawer(null);
  }, [incident.id]);

  function toggleDrawer(next: MobileDrawer) {
    setDrawer((prev) => (prev === next ? null : next));
  }

  return (
    <article
      className={[
        'ops-inc',
        `ops-inc--${density}`,
        `ops-inc--${kind}`,
        focused ? 'ops-inc--on' : '',
        sla.overdue ? 'ops-inc--sla' : '',
        drawer ? `ops-inc--drawer-${drawer}` : '',
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
                useDrawer ? (
                  <button
                    type="button"
                    className={`ops-act ${drawer === 'track' ? 'ops-act--open' : ''}`}
                    aria-expanded={drawer === 'track'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDrawer('track');
                    }}
                  >
                    <ActionIcon name="track" />
                    Track
                  </button>
                ) : (
                  <Link
                    className="ops-act"
                    href={`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionIcon name="track" />
                    Track
                  </Link>
                )
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
            {useDrawer ? (
              <button
                type="button"
                className={`ops-act ${drawer === 'call' ? 'ops-act--open' : ''}`}
                aria-expanded={drawer === 'call'}
                title={`Call ${incident.user}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDrawer('call');
                }}
              >
                <ActionIcon name="call" />
                Call
              </button>
            ) : (
              <a
                className="ops-act"
                href={`tel:${phone}`}
                title={`Call ${incident.user}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon name="call" />
                Call
              </a>
            )}
            {canCctv ? (
              useDrawer ? (
                <button
                  type="button"
                  className={`ops-act ${cctv.tone === 'warn' ? 'ops-act--warn' : ''} ${drawer === 'cctv' ? 'ops-act--open' : ''}`}
                  aria-expanded={drawer === 'cctv'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDrawer('cctv');
                  }}
                >
                  <ActionIcon name="cctv" />
                  {cctv.text}
                </button>
              ) : (
                <Link
                  className={`ops-act ${cctv.tone === 'warn' ? 'ops-act--warn' : ''}`}
                  href={CONTROL_ROOM_ROUTES.surveillance}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionIcon name="cctv" />
                  {cctv.text}
                </Link>
              )
            ) : null}
          </div>
          <div className="ops-inc__acts ops-inc__acts--secondary">
            {canChat ? (
              useDrawer ? (
                <button
                  type="button"
                  className={`ops-act ${drawer === 'chat' ? 'ops-act--open' : ''}`}
                  aria-expanded={drawer === 'chat'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDrawer('chat');
                  }}
                >
                  <ActionIcon name="chat" />
                  Chat
                </button>
              ) : (
                <Link
                  className="ops-act"
                  href={incidentHref(incident.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionIcon name="chat" />
                  Chat
                </Link>
              )
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

          {useDrawer && drawer === 'call' ? (
            <div className="ops-inc__drawer ops-inc__drawer--call" onClick={(e) => e.stopPropagation()}>
              <div className="ops-inc__drawer-head">
                <strong>Call</strong>
              </div>
              <div className="ops-inc__call-list">
                {callTargets.map((target) => (
                  <a
                    key={target.id}
                    className="ops-inc__call-row"
                    href={`tel:${target.number}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="ops-inc__call-icon" aria-hidden>
                      <ActionIcon name="call" />
                    </span>
                    <span className="ops-inc__call-meta">
                      <strong>{target.name}</strong>
                      <span>
                        {target.role} · {target.number}
                      </span>
                    </span>
                    <span className="ops-inc__call-dial">Dial</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {useDrawer && drawer === 'cctv' ? (
            <div className="ops-inc__drawer ops-inc__drawer--cctv" onClick={(e) => e.stopPropagation()}>
              <div className="ops-inc__drawer-head">
                <strong>{feedTitle}</strong>
                <Link href={CONTROL_ROOM_ROUTES.surveillance} className="link-sm">
                  Open wall
                </Link>
              </div>
              {cameras.length > 0 ? (
                <div className="ops-inc__drawer-grid">
                  {cameras.map((cam) => (
                    <CctvLiveFeed key={cam.id} camera={cam} compact />
                  ))}
                </div>
              ) : (
                <p className="ops-inc__drawer-empty">No live cameras linked to this incident.</p>
              )}
            </div>
          ) : null}

          {useDrawer && drawer === 'chat' ? (
            <div className="ops-inc__drawer ops-inc__drawer--chat" onClick={(e) => e.stopPropagation()}>
              <div className="ops-inc__drawer-head">
                <strong>Incident chat</strong>
                <Link href={incidentHref(incident.id)} className="link-sm">
                  Open
                </Link>
              </div>
              <div className="ops-inc__mini-chat">
                <IncidentChat
                  incidentId={incident.id}
                  portal="admin"
                  compact
                  parties={[
                    {
                      id: 'client',
                      label: incident.user,
                      hint: 'Client',
                    },
                    ...(dispatched && incident.officer
                      ? [
                          {
                            id: 'officer',
                            label: incident.officer,
                            hint: incident.unit ? `Unit · ${incident.unit}` : 'Responding unit',
                          },
                        ]
                      : []),
                    {
                      id: 'room',
                      label: 'Incident room',
                      hint: 'Everyone on this job',
                    },
                  ]}
                />
              </div>
            </div>
          ) : null}

          {useDrawer && drawer === 'track' ? (
            <div className="ops-inc__drawer ops-inc__drawer--map" onClick={(e) => e.stopPropagation()}>
              <div className="ops-inc__drawer-head">
                <strong>Unit tracking</strong>
                <Link
                  href={`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`}
                  className="link-sm"
                >
                  Full map
                </Link>
              </div>
              <div className="ops-inc__mini-map">
                <DashboardLiveMap focusIncidentId={incident.id} className="ops-inc__mini-map-inner" />
              </div>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}

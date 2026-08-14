'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { DashboardLiveMap } from '@/components/control-room/DashboardLiveMap';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { officerStatusLabel } from '@/lib/officer-status';
import { sortIncidentsForOps } from '@/lib/alert-priority';
import { CONTROL_ROOM_ROUTES, dispatchHref, incidentHref, officerHref } from '@/lib/control-room-routes';
import { getSession } from '@/lib/auth';
import { navForRole } from '@/lib/control-room-nav';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { OpsQuickWork, OpsCompactStats } from '@/components/ops/OpsQuickWork';
import { OpsKpi } from '@/components/ops/OpsKpi';
import { incidentPriorityBand, PORTAL_HOME_PRIORITIES } from '@/lib/portal-priority';

type Dashboard = {
  stats: {
    activeUsers: number;
    activeIncidents: number;
    criticalIncidents: number;
    availableOfficers: number;
    totalOfficers: number;
    avgResponseFormatted: string;
    avgResponseSec?: number;
    vehiclesAvailable?: number;
    ambulancesAvailable?: number;
  };
  incidents: {
    id: string;
    type: string;
    user: string;
    location: string;
    time: string;
    priority: string;
    status?: string;
    slaBreached?: boolean;
  }[];
  officers: { id: string; name: string; status: string; zone: string }[];
  system: Record<string, string>;
};

const TIMELINE = [
  'ACK',
  'VERIFY',
  'DISPATCHED',
  'EN_ROUTE',
  'ON_SCENE',
  'RESOLVED',
  'CLOSED',
] as const;

const CLIENT_PHONES: Record<string, string> = {
  'Nomsa Client': '+27821234567',
  'James Demo': '+27820000001',
};

function isActiveIncident(status?: string): boolean {
  const s = (status ?? '').toUpperCase();
  return s !== 'RESOLVED' && s !== 'CLOSED' && s !== 'CANCELLED';
}

function statusLabel(status?: string): string {
  return (status ?? 'OPEN').replace(/_/g, ' ');
}

function mapStatusToTimeline(status?: string, priority?: string): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'CLOSED') return 'CLOSED';
  if (s === 'RESOLVED') return 'RESOLVED';
  if (s === 'ON_SCENE') return 'ON_SCENE';
  if (s === 'EN_ROUTE') return 'EN_ROUTE';
  if (s === 'DISPATCHED' || s === 'ASSIGNED') return 'DISPATCHED';
  if (s === 'OPEN' || s === 'NEW') {
    return priority && ['CRITICAL', 'HIGH'].includes(priority.toUpperCase()) ? 'ACK' : 'VERIFY';
  }
  return 'ACK';
}

export default function ControlRoomPage() {
  return (
    <ControlRoomLayout title="Live Ops Board">
      <OverviewContent />
    </ControlRoomLayout>
  );
}

function OverviewContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Dashboard>>('/control-room/dashboard'),
    [],
  );
  const [focusIncidentId, setFocusIncidentId] = useState<string | null>(null);
  const [timelineNote, setTimelineNote] = useState('');
  const [resolveBusyId, setResolveBusyId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

  const role = getSession('admin')?.user.role ?? '';
  const allowedNav = new Set(navForRole(role).map((item) => item.href));
  const canAccess = (href: string) => allowedNav.has(href);
  const priorities = PORTAL_HOME_PRIORITIES['control-room'];

  const d = data?.data;

  const prioritizedIncidents = useMemo(
    () => (d ? sortIncidentsForOps(d.incidents.filter((i) => isActiveIncident(i.status))) : []),
    [d],
  );

  useEffect(() => {
    if (focusIncidentId && !prioritizedIncidents.some((i) => i.id === focusIncidentId)) {
      setFocusIncidentId(prioritizedIncidents[0]?.id ?? null);
    } else if (!focusIncidentId && prioritizedIncidents[0]) {
      setFocusIncidentId(prioritizedIncidents[0].id);
    }
  }, [focusIncidentId, prioritizedIncidents]);

  const focus =
    prioritizedIncidents.find((i) => i.id === focusIncidentId) ?? prioritizedIncidents[0] ?? null;
  const focusBand = focus ? incidentPriorityBand(focus.priority, focus.type) : 'P4';
  const focusStep = mapStatusToTimeline(focus?.status, focus?.priority);
  const focusIdx = TIMELINE.indexOf(focusStep as (typeof TIMELINE)[number]);

  async function softTimeline(step: string) {
    if (!focus) return;
    setTimelineNote(`${step} noted for ${focus.type} · ${focus.user}`);
    try {
      await adminApi.post(`/control-room/incidents/${focus.id}/notes`, {
        body: `Ops timeline: ${step}`,
      });
    } catch {
      /* demo soft state */
    }
    void reload({ silent: true });
  }

  async function resolveIncident(falseAlarm: boolean, incidentId?: string) {
    const id = incidentId ?? focus?.id;
    if (!id) return;
    setResolveBusyId(id);
    try {
      await adminApi.patch(`/control-room/incidents/${id}`, {
        status: 'RESOLVED',
        falseAlarm,
        resolution: falseAlarm ? 'FALSE_ALARM' : 'RESOLVED',
      });
      const resolved = prioritizedIncidents.find((i) => i.id === id);
      setTimelineNote(
        falseAlarm
          ? `${resolved?.type ?? 'Incident'} marked false alarm`
          : `${resolved?.type ?? 'Incident'} resolved`,
      );
      if (focusIncidentId === id) {
        setFocusIncidentId(null);
      }
      await reload();
    } finally {
      setResolveBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading live ops board..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!d) return null;

  const vehicles = d.stats.vehiclesAvailable ?? Math.max(1, Math.floor(d.stats.availableOfficers / 2));
  const ambulances = d.stats.ambulancesAvailable ?? 2;
  const systemOk =
    d.system.api === 'up' || d.system.api === 'Demo mode' || Boolean(d.system.realtime);

  return (
    <div className="dash-ops dash-ops--ops-board">
      <p className="text-muted" style={{ margin: '0 0 0.65rem', fontSize: '0.8rem' }}>
        Priority · {priorities.p1} → {priorities.p2} → {priorities.p3} → {priorities.p4}
        {role === 'OWNER' ? ' · Owner home' : ''}
        {role === 'TENANT_ADMIN' ? ' · Tenant admin home' : ''}
        {role === 'DISPATCHER' ? ' · Dispatcher · queue & map' : ''}
        {role === 'DEVELOPER' || role === 'SUPER_ADMIN' ? ' · System desk' : ''}
      </p>
      {(role === 'OWNER' || role === 'TENANT_ADMIN' || role === 'DEVELOPER' || role === 'SUPER_ADMIN') && (
        <div className="queue-card__actions" style={{ marginBottom: '0.75rem' }}>
          {role === 'OWNER' && (
            <>
              <Link href={CONTROL_ROOM_ROUTES.incidents} className="btn-sm btn-primary">Emergencies</Link>
              <Link href={CONTROL_ROOM_ROUTES.analytics} className="btn-sm">Business KPIs</Link>
              <Link href={CONTROL_ROOM_ROUTES.customers} className="btn-sm">Branches / clients</Link>
            </>
          )}
          {role === 'TENANT_ADMIN' && (
            <>
              <Link href={CONTROL_ROOM_ROUTES.officers} className="btn-sm">Staff</Link>
              <Link href={CONTROL_ROOM_ROUTES.customers} className="btn-sm">Clients</Link>
              <Link href="/control-room/sales" className="btn-sm">Finance</Link>
            </>
          )}
          {(role === 'DEVELOPER' || role === 'SUPER_ADMIN') && (
            <>
              <Link href="/control-room/developer" className="btn-sm btn-primary">System health</Link>
              <Link href="/control-room/settings" className="btn-sm">Config</Link>
            </>
          )}
        </div>
      )}

      <div className="ops-board">
        <div className="ops-board__kpi" aria-label="Ops KPIs">
          <OpsKpi
            label="Active"
            value={d.stats.activeIncidents}
            href={canAccess(CONTROL_ROOM_ROUTES.incidents) ? CONTROL_ROOM_ROUTES.incidents : undefined}
          />
          <OpsKpi
            label="Critical"
            value={d.stats.criticalIncidents}
            hot={d.stats.criticalIncidents > 0}
            href={canAccess(CONTROL_ROOM_ROUTES.incidents) ? `${CONTROL_ROOM_ROUTES.incidents}?priority=CRITICAL` : undefined}
          />
          <OpsKpi
            label="Officers"
            value={`${d.stats.availableOfficers}/${d.stats.totalOfficers}`}
            href={canAccess(CONTROL_ROOM_ROUTES.officers) ? CONTROL_ROOM_ROUTES.officers : undefined}
          />
          <OpsKpi
            label="Vehicles"
            value={vehicles}
            href={canAccess(CONTROL_ROOM_ROUTES.fleet) ? CONTROL_ROOM_ROUTES.fleet : undefined}
          />
          <OpsKpi
            label="Ambulances"
            value={ambulances}
            href="/medical"
          />
          <OpsKpi
            label="System"
            value={systemOk ? 'OK' : 'Check'}
            hot={!systemOk}
            href="/control-room/developer"
          />
        </div>

        <aside className="ops-board__queue" aria-label="Emergency queue">
          <div className="panel-header" style={{ padding: '0.75rem 0.85rem 0.35rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Emergency queue</h2>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem' }}>
                P0–P4 · nearest unit via DISPATCH
              </p>
            </div>
            {canAccess(CONTROL_ROOM_ROUTES.incidents) && (
              <Link href={CONTROL_ROOM_ROUTES.incidents} className="link-sm">
                All
              </Link>
            )}
          </div>
          {prioritizedIncidents.length === 0 ? (
            <div className="dash-clear" style={{ padding: '1rem' }}>
              <strong>Board clear</strong>
              <p className="text-muted">No active emergencies.</p>
            </div>
          ) : (
            prioritizedIncidents.slice(0, 12).map((i) => {
              const band = incidentPriorityBand(i.priority, i.type);
              const clientPhone = CLIENT_PHONES[i.user] ?? '+27820000000';
              return (
                <article
                  key={i.id}
                  className={`queue-card ${focusIncidentId === i.id ? 'queue-card--focused' : ''}`}
                >
                  <button
                    type="button"
                    className="incident-row-body incident-row-body--button"
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: 0 }}
                    onClick={() => setFocusIncidentId(i.id)}
                  >
                    <div className="card-header-row">
                      <span className={`priority-chip priority-chip--${band}`}>{band}</span>
                      {i.slaBreached ? (
                        <span className="priority-chip priority-chip--P0">SLA</span>
                      ) : null}
                      <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>
                        {i.type}
                      </span>
                      <span className="status-pill status-pill--open">{statusLabel(i.status)}</span>
                    </div>
                    <div className="queue-card__summary">
                      <strong>{i.user}</strong>
                      <span className="text-muted queue-card__location">
                        {i.location} · {i.time}
                        {i.slaBreached ? ' · SLA breach' : ''}
                      </span>
                    </div>
                  </button>
                  <div className="queue-card__actions">
                    <DispatchMenuButton
                      incidentId={i.id}
                      className="btn-sm btn-primary"
                      onAssigned={() => void reload({ silent: true })}
                    />
                    <a
                      className="btn-sm"
                      href={`tel:${clientPhone}`}
                      title={`Call ${i.user}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      CALL
                    </a>
                    {canAccess(CONTROL_ROOM_ROUTES.surveillance) && (
                      <Link
                        href={CONTROL_ROOM_ROUTES.surveillance}
                        className="btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        CCTV
                      </Link>
                    )}
                    {canAccess(CONTROL_ROOM_ROUTES.map) && (
                      <Link
                        href={`${CONTROL_ROOM_ROUTES.map}?incident=${i.id}`}
                        className="btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusIncidentId(i.id);
                        }}
                      >
                        MAP
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn-sm btn-primary"
                      disabled={resolveBusyId === i.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void resolveIncident(false, i.id);
                      }}
                    >
                      {resolveBusyId === i.id ? '…' : 'Resolve'}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </aside>

        <section className="ops-board__map" aria-label="Live map">
          {canAccess(CONTROL_ROOM_ROUTES.map) ? (
            <DashboardLiveMap focusIncidentId={focusIncidentId} />
          ) : (
            <div className="empty-state">Map access not available for this role.</div>
          )}
        </section>

        <aside className="ops-board__detail" aria-label="Incident detail">
          <div style={{ padding: '0.85rem' }}>
            {focus ? (
              <>
                <div className="card-header-row">
                  <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                    <span className={`priority-chip priority-chip--${focusBand}`}>{focusBand}</span>{' '}
                    {focus.type}
                  </h2>
                  <Link href={incidentHref(focus.id)} className="link-sm">
                    Full file
                  </Link>
                </div>
                <p style={{ margin: '0.35rem 0' }}>
                  <strong>{focus.user}</strong>
                </p>
                <p className="text-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.82rem' }}>
                  {focus.location} · {focus.time}
                  {' · '}
                  <span className="status-pill status-pill--open">{statusLabel(focus.status)}</span>
                </p>

                {canAccess(CONTROL_ROOM_ROUTES.dispatch) && (
                  <OpsQuickWork
                    hint="Dispatch & response"
                    lead={
                      <DispatchMenuButton
                        incidentId={focus.id}
                        className="ops-quick-work__btn ops-quick-work__btn--primary"
                        onAssigned={() => void reload({ silent: true })}
                      />
                    }
                    actions={[
                      {
                        id: 'ack',
                        label: 'ACK',
                        onClick: () => void softTimeline('ACK'),
                      },
                      {
                        id: 'verify',
                        label: 'VERIFY',
                        onClick: () => void softTimeline('VERIFY'),
                      },
                      {
                        id: 'open',
                        label: 'Open',
                        href: dispatchHref(focus.id),
                      },
                    ]}
                  />
                )}

                <div className="workflow-steps" aria-label="Incident timeline">
                  {TIMELINE.map((step, idx) => (
                    <span
                      key={step}
                      className={`workflow-step ${
                        idx < focusIdx
                          ? 'workflow-step--done'
                          : idx === focusIdx
                            ? 'workflow-step--current'
                            : ''
                      }`}
                    >
                      {step.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                {timelineNote ? (
                  <p className="alert alert--success" role="status" style={{ fontSize: '0.82rem' }}>
                    {timelineNote}
                  </p>
                ) : null}

                <div className="queue-card__actions" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    disabled={resolveBusyId === focus.id}
                    onClick={() => void resolveIncident(false, focus.id)}
                  >
                    {resolveBusyId === focus.id ? '…' : 'Resolve'}
                  </button>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={resolveBusyId === focus.id}
                    onClick={() => void resolveIncident(true, focus.id)}
                  >
                    False alarm
                  </button>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={resolveBusyId === focus.id}
                    onClick={async () => {
                      if (!focus) return;
                      await adminApi.post(`/control-room/incidents/${focus.id}/request-medical`);
                      setTimelineNote('Medical requested · dual ticket opened');
                    }}
                  >
                    Request medical
                  </button>
                  {canAccess(CONTROL_ROOM_ROUTES.map) && (
                    <Link href={`${CONTROL_ROOM_ROUTES.map}?incident=${focus.id}`} className="btn-sm">
                      Full map
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div className="dash-clear">
                <strong>Select an incident</strong>
                <p className="text-muted">Queue cards drive the map and dispatch pane.</p>
              </div>
            )}
          </div>
        </aside>

        <section className="ops-board__avail" aria-label="Officer availability">
          <div className="panel-header" style={{ padding: '0.65rem 0.85rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem' }}>Availability</h2>
            {canAccess(CONTROL_ROOM_ROUTES.officers) && (
              <Link href={CONTROL_ROOM_ROUTES.officers} className="link-sm">
                Manage
              </Link>
            )}
          </div>
          <ul className="officer-list officer-list--managed" style={{ padding: '0 0.65rem 0.65rem' }}>
            {d.officers.slice(0, 8).map((o) => (
              <li key={o.id} className="officer-row officer-row--managed">
                <div className="officer-row-body">
                  <OfficerStatusDot status={o.status} />
                  <div>
                    <div className="officer-name">{o.name}</div>
                    <div className="officer-meta">
                      {officerStatusLabel(o.status)} · {o.zone}
                    </div>
                  </div>
                </div>
                {role !== 'SALES' && canAccess(CONTROL_ROOM_ROUTES.officers) && (
                  <OfficerStatusControl
                    officerId={o.id}
                    status={o.status}
                    variant="select"
                    onUpdated={reload}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <OpsCompactStats
        items={[
          ...(canAccess(CONTROL_ROOM_ROUTES.incidents)
            ? [
                {
                  label: 'Incidents',
                  value: String(d.stats.activeIncidents),
                  href: CONTROL_ROOM_ROUTES.incidents,
                  warn: d.stats.criticalIncidents > 0,
                },
              ]
            : []),
          ...(canAccess(officerHref())
            ? [
                {
                  label: 'Available',
                  value: String(d.stats.availableOfficers),
                  href: officerHref(),
                },
              ]
            : []),
          {
            label: 'Avg response',
            value: d.stats.avgResponseFormatted,
            href: canAccess(CONTROL_ROOM_ROUTES.analytics)
              ? CONTROL_ROOM_ROUTES.analytics
              : undefined,
          },
        ]}
      />
    </div>
  );
}

'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { DashboardCctvWall } from '@/components/control-room/DashboardCctvWall';
import { DashboardFleetStrip } from '@/components/control-room/DashboardFleetStrip';
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
import { OpsIncidentCard } from '@/components/control-room/OpsIncidentCard';
import {
  CadLifecycleStepper,
  mapIncidentStatusToTimelineIndex,
  OPS_TIMELINE_STEPS,
} from '@/components/psim/CadLifecycleStepper';
import { RecommendedUnitsPanel } from '@/components/psim/RecommendedUnitsPanel';
import { OpsCommandStrip, type OpsQueueFilter } from '@/components/control-room/OpsCommandStrip';
import { OpsQuickWork, OpsCompactStats } from '@/components/ops/OpsQuickWork';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { IncidentKernelPanels } from '@/components/incident/IncidentKernelPanels';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import {
  opsIsDispatched,
  opsPriorityLabel,
  opsResponseStatus,
  type OpsIncident,
} from '@/lib/ops-incident';
import { useNow } from '@/hooks/useNow';

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
  incidents: OpsIncident[];
  officers: { id: string; name: string; status: string; zone: string }[];
  system: Record<string, string>;
};

const CLIENT_PHONES: Record<string, string> = {
  'Nomsa Client': '+27821234567',
  'James Demo': '+27820000001',
  'Sarah Client': '+27820001111',
};

function isActiveIncident(status?: string): boolean {
  const s = (status ?? '').toUpperCase();
  return s !== 'RESOLVED' && s !== 'CLOSED' && s !== 'CANCELLED';
}

export default function ControlRoomPage() {
  return (
    <ControlRoomLayout title="Live Ops Board">
      <OverviewContent />
    </ControlRoomLayout>
  );
}

type MobileOpsPane = 'queue' | 'cctv' | 'map' | 'more' | 'detail';

function OverviewContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Dashboard>>('/control-room/dashboard'),
    [],
  );
  const [focusIncidentId, setFocusIncidentId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobileOpsPane>('queue');
  const [timelineNote, setTimelineNote] = useState('');
  const [resolveBusyId, setResolveBusyId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<OpsQueueFilter>('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Desktop side-rails are unused on mobile — always render real panes.
  const showQueuePane = queueOpen || isNarrow;
  const showDetailPane = detailOpen || isNarrow;

  const role = getSession('admin')?.user.role ?? '';
  const allowedNav = new Set(navForRole(role).map((item) => item.href));
  const canAccess = (href: string) => allowedNav.has(href);

  const d = data?.data;
  const incidents = Array.isArray(d?.incidents) ? d.incidents : [];
  const officers = Array.isArray(d?.officers) ? d.officers : [];
  const stats = d?.stats;

  const prioritizedIncidents = useMemo(
    () => sortIncidentsForOps(incidents.filter((i) => isActiveIncident(i.status))),
    [incidents],
  );

  const filteredIncidents = useMemo(() => {
    return prioritizedIncidents.filter((i) => {
      const band = opsPriorityLabel(i.priority, i.type);
      if (queueFilter === 'p1') return band === 'P1';
      if (queueFilter === 'p2') return band === 'P2';
      if (queueFilter === 'p3') return band === 'P3' || band === 'P4';
      if (queueFilter === 'unassigned') return !opsIsDispatched(i.status, i.officer);
      return true;
    });
  }, [prioritizedIncidents, queueFilter]);

  const hasActiveIncidents = prioritizedIncidents.length > 0;

  useEffect(() => {
    if (hasActiveIncidents) {
      setQueueOpen(true);
      setDetailOpen(true);
    } else {
      setQueueOpen(false);
      setDetailOpen(false);
      setFocusIncidentId(null);
    }
  }, [hasActiveIncidents]);

  useEffect(() => {
    if (focusIncidentId && !prioritizedIncidents.some((i) => i.id === focusIncidentId)) {
      setFocusIncidentId(prioritizedIncidents[0]?.id ?? null);
    } else if (!focusIncidentId && prioritizedIncidents[0]) {
      setFocusIncidentId(prioritizedIncidents[0].id);
    }
  }, [focusIncidentId, prioritizedIncidents]);

  const focus =
    prioritizedIncidents.find((i) => i.id === focusIncidentId) ?? prioritizedIncidents[0] ?? null;
  const focusIdx = mapIncidentStatusToTimelineIndex(focus?.status, focus?.priority);

  function selectIncident(id: string) {
    setFocusIncidentId(id);
    setDetailOpen(true);
    setQueueOpen(true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      setMobilePane('detail');
    }
  }

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
  if (!d || !stats) return null;

  return (
    <div className="dash-ops dash-ops--ops-board dash-ops--command">
      <header className="ops-board-hero">
        <div>
          <h1 className="ops-board-hero__title">Live Ops Board</h1>
          <p className="ops-board-hero__sub">Real-time incidents, units &amp; field activity</p>
        </div>
        <div className="ops-board-hero__meta">
          <span className="ops-board-hero__live">
            <span className="ops-board-hero__pulse" aria-hidden />
            Live
          </span>
          <time dateTime={new Date(now).toISOString()} className="ops-board-hero__clock">
            {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </header>

      <OpsCommandStrip
        filter={queueFilter}
        onFilter={setQueueFilter}
      />
      {(role === 'OWNER' || role === 'TENANT_ADMIN' || role === 'DEVELOPER' || role === 'SUPER_ADMIN') && (
        <div className="ops-strip__owner">
          {role === 'OWNER' && (
            <>
              <Link href={CONTROL_ROOM_ROUTES.incidents} className="btn-sm">Incident file</Link>
              <Link href={CONTROL_ROOM_ROUTES.analytics} className="btn-sm">KPIs</Link>
              <Link href={CONTROL_ROOM_ROUTES.customers} className="btn-sm">Clients</Link>
            </>
          )}
          {role === 'TENANT_ADMIN' && (
            <>
              <Link href={CONTROL_ROOM_ROUTES.officers} className="btn-sm">Staff</Link>
              <Link href={CONTROL_ROOM_ROUTES.customers} className="btn-sm">Clients</Link>
            </>
          )}
          {role === 'DEVELOPER' && (
            <>
              <Link href="/control-room/developer" className="btn-sm">System health</Link>
              <Link href="/control-room/settings" className="btn-sm">Config</Link>
            </>
          )}
        </div>
      )}

      <nav className="ops-mobile-tabs" aria-label="Ops board views">
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'queue' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('queue')}
        >
          Queue ({filteredIncidents.length})
        </button>
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'cctv' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('cctv')}
        >
          CCTV
        </button>
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'map' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'more' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('more')}
        >
          Units
        </button>
      </nav>

      <div
        className={[
          'ops-board ops-board--console ops-board--v2',
          !hasActiveIncidents ? 'ops-board--dash-main' : '',
          showQueuePane ? 'ops-board--queue-open' : 'ops-board--queue-collapsed',
          showDetailPane ? 'ops-board--detail-open' : 'ops-board--detail-collapsed',
        ]
          .filter(Boolean)
          .join(' ')}
        data-mobile-pane={mobilePane}
      >
        {showQueuePane ? (
          <aside className="ops-board__queue" aria-label="Incident queue">
            <div className="ops-board__pane-head">
              <div>
                <h2>Incidents</h2>
                <p className="text-muted">
                  {filteredIncidents.length} in view · {stats.availableOfficers} units available
                </p>
              </div>
              {!isNarrow ? (
                <button
                  type="button"
                  className="ops-board__pane-collapse"
                  onClick={() => setQueueOpen(false)}
                  title="Collapse incidents"
                >
                  Collapse
                </button>
              ) : null}
            </div>
            <div className="ops-board__queue-list">
              {filteredIncidents.length === 0 ? (
                <div className="dash-clear" style={{ padding: '1rem' }}>
                  <strong>Board clear</strong>
                  <p className="text-muted">
                    {hasActiveIncidents
                      ? 'No incidents match this filter.'
                      : 'No active incidents — map & cameras are the main dash.'}
                  </p>
                </div>
              ) : (
                filteredIncidents.map((i) => (
                  <OpsIncidentCard
                    key={i.id}
                    incident={{ ...i, userPhone: i.userPhone ?? CLIENT_PHONES[i.user] ?? '+27820000000' }}
                    focused={focusIncidentId === i.id}
                    canCctv={canAccess(CONTROL_ROOM_ROUTES.surveillance)}
                    canMap={canAccess(CONTROL_ROOM_ROUTES.map)}
                    canChat={canAccess(CONTROL_ROOM_ROUTES.incidents)}
                    resolveBusy={resolveBusyId === i.id}
                    onSelect={() => selectIncident(i.id)}
                    onResolve={() => void resolveIncident(false, i.id)}
                    onAssigned={() => void reload({ silent: true })}
                  />
                ))
              )}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            className="ops-board__rail ops-board__rail--queue"
            onClick={() => {
              setQueueOpen(true);
              setMobilePane('queue');
            }}
            aria-label="Open incidents queue"
            title="Incidents"
          >
            <span className="ops-board__rail-label">Incidents</span>
            <span className={`ops-board__rail-count ${hasActiveIncidents ? 'is-hot' : ''}`}>
              {prioritizedIncidents.length}
            </span>
          </button>
        )}

        <div className="ops-board__center">
          <div className="ops-live-head">
            <span className="ops-live-head__live">
              <span className="ops-board-hero__pulse" aria-hidden />
              Live
            </span>
            <span className="ops-live-head__counts">
              {prioritizedIncidents.length} incidents · {stats.availableOfficers} officers · {stats.activeUsers}{' '}
              users
            </span>
            {canAccess(CONTROL_ROOM_ROUTES.map) ? (
              <Link href={CONTROL_ROOM_ROUTES.map} className="ops-live-head__map">
                Full map
              </Link>
            ) : null}
          </div>

          <section className="ops-board__map" aria-label="Live map">
            {canAccess(CONTROL_ROOM_ROUTES.map) ? (
              <SectionErrorBoundary label="Live map">
                <DashboardLiveMap focusIncidentId={focusIncidentId} />
              </SectionErrorBoundary>
            ) : (
              <div className="empty-state">Map access not available for this role.</div>
            )}
          </section>

          {canAccess(CONTROL_ROOM_ROUTES.surveillance) ? (
            <SectionErrorBoundary label="CCTV">
              <DashboardCctvWall />
            </SectionErrorBoundary>
          ) : null}
        </div>

        {canAccess(CONTROL_ROOM_ROUTES.fleet) ? (
          <SectionErrorBoundary label="Vehicles">
            <DashboardFleetStrip />
          </SectionErrorBoundary>
        ) : null}

        {showDetailPane ? (
          <aside className="ops-board__detail ops-board__detail--command" aria-label="Incident detail">
            <div className="ops-board__pane-head">
              <h2 className="ops-board__pane-title">Incident details</h2>
              <div className="ops-board__pane-head-actions">
                {focus ? (
                  <Link href={incidentHref(focus.id)} className="link-sm">
                    Full file
                  </Link>
                ) : null}
                {!isNarrow ? (
                  <button
                    type="button"
                    className="ops-board__pane-collapse"
                    onClick={() => setDetailOpen(false)}
                    title="Collapse details"
                  >
                    Collapse
                  </button>
                ) : null}
              </div>
            </div>
            <div className="ops-board__detail-body">
              {focus ? (
                <>
                  <div className="ops-detail-hero">
                    <div className="cmd-drawer__badges">
                      <span
                        className={`cmd-drawer__pri cmd-drawer__pri--${opsPriorityLabel(focus.priority, focus.type)}`}
                      >
                        {opsPriorityLabel(focus.priority, focus.type)}
                      </span>
                      <span className="cmd-drawer__type">{focus.type}</span>
                    </div>
                    <p className="cmd-drawer__client">{focus.user}</p>
                    <span className="cmd-drawer__status">
                      {opsResponseStatus(focus.status, focus.officer)}
                    </span>
                  </div>

                  <dl className="ops-detail-facts">
                    <div>
                      <dt>Location</dt>
                      <dd>{focus.location || '—'}</dd>
                    </div>
                    <div>
                      <dt>Unit</dt>
                      <dd>{focus.unit || '—'}</dd>
                    </div>
                    <div>
                      <dt>Responder</dt>
                      <dd>{focus.officer || 'Unassigned'}</dd>
                    </div>
                  </dl>

                  {canAccess(CONTROL_ROOM_ROUTES.dispatch) && !opsIsDispatched(focus.status, focus.officer) && (
                    <OpsQuickWork
                      hint="Dispatch & response"
                      lead={
                        <DispatchMenuButton
                          incidentId={focus.id}
                          className="ops-act ops-act--dispatch"
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

                  <section className="ops-response" aria-label="Response timeline">
                    <h3 className="ops-response__title">Response timeline</h3>
                    <div className="workflow-steps workflow-steps--ops" aria-hidden>
                      {OPS_TIMELINE_STEPS.map((step, idx) => (
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
                    <CadLifecycleStepper status={focus.status} priority={focus.priority} />
                  </section>

                  {focus.unit || focus.officer ? (
                    <section className="ops-responder" aria-label="Responding unit">
                      <h3 className="ops-response__title">Responding unit</h3>
                      <strong className="ops-responder__unit">{focus.unit ?? 'Unit'}</strong>
                      <p className="ops-responder__driver">
                        Driver: {focus.officer ?? '—'}
                        <span className="ops-responder__status">
                          {opsResponseStatus(focus.status, focus.officer)}
                        </span>
                      </p>
                      {canAccess(CONTROL_ROOM_ROUTES.map) ? (
                        <Link
                          href={`${CONTROL_ROOM_ROUTES.map}?incident=${focus.id}`}
                          className="btn-sm btn-secondary"
                        >
                          View on map
                        </Link>
                      ) : null}
                    </section>
                  ) : null}

                  {!opsIsDispatched(focus.status, focus.officer) && canAccess(CONTROL_ROOM_ROUTES.command) ? (
                    <RecommendedUnitsPanel
                      incidentId={focus.id}
                      incidentType={focus.type}
                      priority={focus.priority}
                      location={focus.location}
                      officers={officers.map((o) => ({
                        id: o.id,
                        name: o.name,
                        status: o.status,
                        zone: o.zone,
                        skills: ['armed'],
                      }))}
                      assignedOfficer={focus.officer}
                      onAssigned={() => void reload({ silent: true })}
                      compact
                    />
                  ) : null}

                  {timelineNote ? (
                    <p className="alert alert--success" role="status" style={{ fontSize: '0.82rem' }}>
                      {timelineNote}
                    </p>
                  ) : null}

                  <IncidentKernelPanels incidentId={focus.id} portal="admin" compact showChat={false} />

                  <p className="ops-safety-note ops-safety-note--board">
                    <strong>Keep everyone safe</strong>
                    Always follow security protocols and confirm the scene is safe before arrival.
                  </p>
                </>
              ) : (
                <div className="dash-clear">
                  <strong>Board clear</strong>
                  <p className="text-muted">No active incident selected. Map &amp; cameras fill the dash.</p>
                </div>
              )}
            </div>
            {focus ? (
              <div className="ops-board__detail-foot">
                <button
                  type="button"
                  className="ops-act ops-act--resolve"
                  disabled={resolveBusyId === focus.id}
                  onClick={() => void resolveIncident(false, focus.id)}
                >
                  {resolveBusyId === focus.id ? '…' : 'Resolve'}
                </button>
                <button
                  type="button"
                  className="ops-act ops-act--danger"
                  disabled={resolveBusyId === focus.id}
                  onClick={() => void resolveIncident(true, focus.id)}
                >
                  False alarm
                </button>
                <button
                  type="button"
                  className="ops-act"
                  disabled={resolveBusyId === focus.id}
                  onClick={async () => {
                    if (!focus) return;
                    await adminApi.post(`/control-room/incidents/${focus.id}/request-medical`);
                    setTimelineNote('Medical requested · dual ticket opened');
                  }}
                >
                  Medical
                </button>
                {canAccess(CONTROL_ROOM_ROUTES.map) && (
                  <Link href={`${CONTROL_ROOM_ROUTES.map}?incident=${focus.id}`} className="ops-act">
                    Map
                  </Link>
                )}
              </div>
            ) : null}
          </aside>
        ) : (
          <button
            type="button"
            className="ops-board__rail ops-board__rail--detail"
            onClick={() => {
              setDetailOpen(true);
              setMobilePane('detail');
            }}
            aria-label="Open incident details"
            title="Incident details"
          >
            <span className="ops-board__rail-label">Details</span>
            {focus ? <span className="ops-board__rail-count is-hot">1</span> : null}
          </button>
        )}

        <section className="ops-board__avail" aria-label="Officer availability">
          <div className="ops-board__pane-head">
            <div>
              <h2>Availability</h2>
              <p className="text-muted">{officers.length} officers</p>
            </div>
            {canAccess(CONTROL_ROOM_ROUTES.officers) && (
              <Link href={CONTROL_ROOM_ROUTES.officers} className="link-sm">
                Manage
              </Link>
            )}
          </div>
          <ul className="ops-board__avail-list officer-list officer-list--managed">
            {officers.map((o) => (
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
                  value: String(stats.activeIncidents),
                  href: CONTROL_ROOM_ROUTES.incidents,
                  warn: stats.criticalIncidents > 0,
                },
              ]
            : []),
          ...(canAccess(officerHref())
            ? [
                {
                  label: 'Available',
                  value: String(stats.availableOfficers),
                  href: officerHref(),
                },
              ]
            : []),
          {
            label: 'Avg response',
            value: stats.avgResponseFormatted,
            href: canAccess(CONTROL_ROOM_ROUTES.analytics)
              ? CONTROL_ROOM_ROUTES.analytics
              : undefined,
          },
        ]}
      />
    </div>
  );
}

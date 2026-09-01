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
  slaSnapshot,
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

type MobileOpsPane = 'queue' | 'map' | 'detail' | 'more';

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
  const now = useNow(1000);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

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

  const p1Count = prioritizedIncidents.filter((i) => opsPriorityLabel(i.priority, i.type) === 'P1').length;
  const slaCount = prioritizedIncidents.filter((i) => slaSnapshot(i, now).overdue).length;

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
    <div className="dash-ops dash-ops--ops-board">
      <OpsCommandStrip
        active={prioritizedIncidents.length}
        p1={p1Count}
        slaBreaches={slaCount}
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
          className={`ops-mobile-tabs__btn ${mobilePane === 'map' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'detail' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('detail')}
        >
          Detail
        </button>
        <button
          type="button"
          className={`ops-mobile-tabs__btn ${mobilePane === 'more' ? 'ops-mobile-tabs__btn--on' : ''}`}
          onClick={() => setMobilePane('more')}
        >
          Units
        </button>
      </nav>

      <div className="ops-board ops-board--console" data-mobile-pane={mobilePane}>
        <aside className="ops-board__queue" aria-label="Incident queue">
          <div className="ops-board__pane-head">
            <h2>Incidents</h2>
            <p className="text-muted">
              {filteredIncidents.length} in view · {stats.availableOfficers} units available
            </p>
          </div>
          <div className="ops-board__queue-list">
            {filteredIncidents.length === 0 ? (
              <div className="dash-clear" style={{ padding: '1rem' }}>
                <strong>Board clear</strong>
                <p className="text-muted">No incidents match this filter.</p>
              </div>
            ) : (
              filteredIncidents.map((i) => (
                <OpsIncidentCard
                  key={i.id}
                  incident={{ ...i, userPhone: i.userPhone ?? CLIENT_PHONES[i.user] ?? '+27820000000' }}
                  focused={focusIncidentId === i.id}
                  canCctv={canAccess(CONTROL_ROOM_ROUTES.surveillance)}
                  canMap={canAccess(CONTROL_ROOM_ROUTES.map)}
                  resolveBusy={resolveBusyId === i.id}
                  onSelect={() => selectIncident(i.id)}
                  onResolve={() => void resolveIncident(false, i.id)}
                  onAssigned={() => void reload({ silent: true })}
                />
              ))
            )}
          </div>
        </aside>

        <div className="ops-board__center">
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

        <aside className="ops-board__detail ops-board__detail--command" aria-label="Incident detail">
          <div className="ops-board__pane-head">
            {focus ? (
              <div className="ops-board__detail-title">
                <div className="cmd-drawer__badges">
                  <span className={`cmd-drawer__pri cmd-drawer__pri--${opsPriorityLabel(focus.priority, focus.type)}`}>
                    {opsPriorityLabel(focus.priority, focus.type)}
                  </span>
                  <span className="cmd-drawer__type">{focus.type}</span>
                </div>
                <p className="cmd-drawer__client">{focus.user}</p>
                <span className="cmd-drawer__status">{opsResponseStatus(focus.status, focus.officer)}</span>
              </div>
            ) : (
              <h2>Incident details</h2>
            )}
            {focus ? (
              <Link href={incidentHref(focus.id)} className="link-sm">
                Full file
              </Link>
            ) : null}
          </div>
          <div className="ops-board__detail-body">
            {focus ? (
              <>
                <p className="ops-board__detail-meta">
                  {focus.location}
                  {focus.unit ? ` · ${focus.unit}` : ''}
                  {focus.officer ? ` · ${focus.officer}` : ''}
                </p>

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
              </>
            ) : (
              <div className="dash-clear">
                <strong>Select an incident</strong>
                <p className="text-muted">Queue cards drive the map and dispatch pane.</p>
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

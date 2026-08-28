'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { IncidentReportForm } from '@/components/control-room/IncidentReportForm';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { AvailableOfficersButton } from '@/components/control-room/AvailableOfficersButton';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { officerStatusLabel } from '@/lib/officer-status';
import { CONTROL_ROOM_ROUTES, incidentHref, mapHref, officerHref } from '@/lib/control-room-routes';
import { ListSearch } from '@/components/ui/ListSearch';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ChartCard, countBy, DonutChart, GaugeChart, HorizontalBars, type ChartTone } from '@/components/ui/charts';
import { isAwaitingDispatch } from '@/lib/incident-status';
import { matchesSearch } from '@/lib/list-search';

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
  avatarUrl?: string | null;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  subscription?: {
    planName: string;
    tierCode: string;
    status: string;
    memberId?: string;
  } | null;
};

type Dashboard = {
  incidents: {
    id: string;
    type: string;
    user: string;
    location: string;
    status: string;
    officer: string | null;
    priority: string;
  }[];
  dispatches: {
    id: string;
    status: string;
    officer: { firstName: string; lastName: string };
    incident: { id: string; type: string; user: { firstName: string } };
  }[];
};

type DispatchRow = {
  id: string;
  status: string;
  officer: { id: string; name: string; status: string };
  incident: {
    id: string;
    type: string;
    status: string;
    priority?: string;
    client: string;
    address: string | null;
    latestReport: string | null;
  };
};

function dispatchStatusClass(status: string) {
  const s = status.toUpperCase().replace(/\s+/g, '_');
  if (s === 'ON_SCENE') return 'on-scene';
  if (s === 'EN_ROUTE') return 'en-route';
  if (s === 'ACCEPTED' || s === 'ASSIGNED') return 'assigned';
  return 'default';
}

function incidentPriorityClass(priority?: string, type?: string) {
  const p = (priority ?? '').toUpperCase();
  if (p === 'CRITICAL' || type === 'PANIC' || type === 'FIRE' || type === 'MEDICAL') return 'critical';
  if (p === 'HIGH') return 'high';
  if (p === 'MEDIUM') return 'medium';
  return 'medium';
}

export default function DispatchPage() {
  return (
    <ControlRoomLayout title="Dispatch">
      <DispatchContent />
    </ControlRoomLayout>
  );
}

function DispatchContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('incident');

  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Dashboard>>('/control-room/dashboard'),
    [],
  );
  const { data: clientsData } = useApi(
    () => adminApi.get<ApiResponse<Client[]>>('/control-room/clients'),
    [],
  );
  const { data: dispatchesData, reload: reloadDispatches } = useApi(
    () => adminApi.get<ApiResponse<DispatchRow[]>>('/control-room/dispatches'),
    [],
  );
  const { data: officersData, reload: reloadOfficers } = useApi(
    () => adminApi.get<ApiResponse<Officer[]>>('/control-room/officers'),
    [],
  );

  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [search, setSearch] = useState('');

  const allUnassigned = useMemo(
    () => (data?.data.incidents ?? []).filter((i) => isAwaitingDispatch(i.status, i.officer)),
    [data],
  );
  const allDispatches = dispatchesData?.data ?? [];
  const allOfficers = officersData?.data ?? [];

  const unassigned = useMemo(
    () =>
      allUnassigned.filter((i) =>
        matchesSearch(search, i.user, i.location, i.type, i.officer, i.status),
      ),
    [allUnassigned, search],
  );
  const dispatches = useMemo(
    () =>
      allDispatches.filter((d) =>
        matchesSearch(
          search,
          d.incident.client,
          d.incident.address,
          d.incident.type,
          d.officer.name,
          d.status,
          d.incident.latestReport,
        ),
      ),
    [allDispatches, search],
  );
  const officers = useMemo(
    () =>
      allOfficers.filter((o) =>
        matchesSearch(search, o.firstName, o.lastName, o.status, o.zone),
      ),
    [allOfficers, search],
  );
  const officerStatusSlices = useMemo(
    () =>
      countBy(allOfficers, (o) => o.status, (status) => officerStatusLabel(status)).map(
        (slice, index): { label: string; value: number; tone: ChartTone } => ({
          ...slice,
          tone: index === 0 ? 'success' : index === 1 ? 'warning' : 'accent',
        }),
      ),
    [allOfficers],
  );
  const dispatchStatusBars = useMemo(
    () =>
      countBy(allDispatches, (d) => d.status, (status) => status.replaceAll('_', ' ')).map(
        (slice, index): { label: string; value: number; tone: ChartTone } => ({
          label: slice.label,
          value: slice.value,
          tone: index === 0 ? 'accent' : index === 1 ? 'warning' : 'info',
        }),
      ),
    [allDispatches],
  );
  const availableOfficers = allOfficers.filter((o) => o.status.toUpperCase() === 'AVAILABLE').length;
  const coverageScore =
    allOfficers.length > 0 ? Math.round((availableOfficers / allOfficers.length) * 100) : 0;

  async function autoAssign(incidentId: string) {
    setAssigning(incidentId);
    try {
      await adminApi.post('/control-room/dispatch/assign', { incidentId });
      refreshAll();
    } finally {
      setAssigning(null);
    }
  }

  useEffect(() => {
    if (highlightId) {
      setExpandedIncidentId(highlightId);
      setActiveIncidentId(highlightId);
      document.getElementById(`incident-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, data]);

  function refreshAll() {
    reload();
    reloadDispatches();
    reloadOfficers();
  }

  if (loading) return <LoadingSpinner label="Loading dispatch..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="interactive-text">Incidents</Link>
            {' · '}
            <Link href={officerHref()} className="interactive-text">Officers</Link>
            {' · '}
            <Link href={mapHref('incidents')} className="interactive-text">Live map</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.customers} className="interactive-text">Customers</Link>
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowReport(true)}>
          Report incident
        </button>
      </div>

      <div className="ds-chart-grid">
        <ChartCard title="Officer availability" subtitle="Live roster status" className="ds-chart-card--span-4">
          <DonutChart
            slices={officerStatusSlices}
            centerValue={allOfficers.length}
            centerLabel="officers"
          />
        </ChartCard>
        <ChartCard title="Field coverage" subtitle="Units ready to dispatch" className="ds-chart-card--span-4">
          <GaugeChart
            value={coverageScore}
            label="Available capacity"
            hint={`${availableOfficers} of ${allOfficers.length} ready`}
            tone={coverageScore >= 50 ? 'success' : coverageScore >= 30 ? 'warning' : 'danger'}
          />
        </ChartCard>
        <ChartCard title="Dispatch pipeline" subtitle="Active assignment states" className="ds-chart-card--span-4">
          <HorizontalBars
            items={
              dispatchStatusBars.length > 0
                ? dispatchStatusBars
                : [{ label: 'No active dispatches', value: 0, tone: 'neutral' }]
            }
            compact
          />
        </ChartCard>
      </div>

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search client, location, officer, status…"
          resultCount={unassigned.length + dispatches.length + officers.length}
          totalCount={allUnassigned.length + allDispatches.length + allOfficers.length}
        />
      </div>

      {showReport && (
        <OpsDialog
          title="Report new incident"
          subtitle="Log a caller report or operator-initiated incident from dispatch."
          onClose={() => setShowReport(false)}
          wide
        >
          <IncidentReportForm
            clients={clientsData?.data ?? []}
            onSuccess={() => {
              refreshAll();
              setShowReport(false);
            }}
          />
        </OpsDialog>
      )}

      <div className="page-header">
        <h2>Assign officers</h2>
        <span className="text-muted">{unassigned.length} awaiting dispatch</span>
      </div>
      <div className="list-card">
        {unassigned.length === 0 ? (
          <div className="empty-state empty-state--inline">
            {search.trim()
              ? 'No matching unassigned incidents.'
              : (
                <>
                  All active incidents dispatched.{' '}
                  <Link href={CONTROL_ROOM_ROUTES.incidents} className="interactive-text">View incidents</Link>
                </>
              )}
          </div>
        ) : (
          unassigned.map((i) => (
            <div
              key={i.id}
              id={`incident-${i.id}`}
              className={`list-row list-row--stack ${highlightId === i.id ? 'list-row--highlight' : ''}`}
            >
              <div className="dispatch-row-header">
                <Link href={incidentHref(i.id)} className="list-row-body list-row--interactive">
                  <div className="list-row-top">
                    <span className={`incident-type incident-type--${i.priority?.toLowerCase() ?? 'high'}`}>
                      {i.type}
                    </span>
                    <span className="badge badge--alert">Awaiting dispatch</span>
                  </div>
                  <strong>{i.user}</strong>
                  <span>{i.location}</span>
                </Link>
                <Link href={`/control-room/map?incident=${i.id}`} className="btn-sm btn-sm--link">Map</Link>
                <AvailableOfficersButton
                  incidentId={i.id}
                  active={expandedIncidentId === i.id}
                  onClick={() => {
                    setExpandedIncidentId((prev) => (prev === i.id ? null : i.id));
                    setActiveIncidentId(i.id);
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={assigning === i.id}
                  onClick={() => autoAssign(i.id)}
                >
                  {assigning === i.id ? <LoadingSpinner label="" size="sm" /> : 'Auto-assign'}
                </button>
              </div>
              {expandedIncidentId === i.id && (
                <QuickDispatchPanel
                  incidentId={i.id}
                  incidentLabel={`${i.type} · ${i.user}`}
                  defaultExpanded
                  onAssigned={refreshAll}
                />
              )}
            </div>
          ))
        )}
      </div>

      <div className="page-header page-section">
        <h2>Active dispatches</h2>
        <div className="dispatch-grid__meta">
          <span className="text-muted">{dispatches.length} active</span>
          <Link href={officerHref()} className="link-sm">
            Officer roster
          </Link>
        </div>
      </div>
      {dispatches.length === 0 ? (
        <div className="empty-state empty-state--inline">
          {search.trim() ? 'No matching dispatches.' : 'No active dispatches.'}
        </div>
      ) : (
        <div className="dispatch-grid">
          {dispatches.map((d) => (
            <article
              key={d.id}
              className={`dispatch-card dispatch-card--${dispatchStatusClass(d.status)}`}
            >
              <div className="dispatch-card__badges">
                <span
                  className={`incident-type incident-type--${incidentPriorityClass(
                    d.incident.priority,
                    d.incident.type,
                  )}`}
                >
                  {d.incident.type}
                </span>
                <span className={`dispatch-card__status dispatch-card__status--${dispatchStatusClass(d.status)}`}>
                  {d.status.replaceAll('_', ' ')}
                </span>
              </div>
              <Link href={incidentHref(d.incident.id)} className="dispatch-card__body">
                <strong>{d.incident.client}</strong>
                <span className="dispatch-card__officer">
                  {d.officer.name} · {d.officer.status.replaceAll('_', ' ')}
                </span>
                {d.incident.address ? (
                  <span className="dispatch-card__address">{d.incident.address}</span>
                ) : null}
                {d.incident.latestReport ? (
                  <span className="dispatch-card__report">{d.incident.latestReport}</span>
                ) : null}
              </Link>
              <div className="dispatch-card__actions">
                <OfficerStatusControl
                  officerId={d.officer.id}
                  status={d.officer.status}
                  variant="select"
                  onUpdated={refreshAll}
                />
                <Link href={`/control-room/map?incident=${d.incident.id}`} className="btn-sm btn-secondary">
                  Map
                </Link>
                <Link href={incidentHref(d.incident.id)} className="btn-sm btn-secondary">
                  Reports
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="page-header page-section">
        <h2>Officer availability</h2>
        <span className="text-muted">Override status if an officer is too busy or returning</span>
      </div>
      {officers.length === 0 ? (
        <div className="empty-state empty-state--inline">
          {search.trim() ? 'No matching officers.' : 'No officers on roster.'}
        </div>
      ) : (
        <div className="officer-roster officer-roster--compact">
          {officers.map((o) => (
            <article key={o.id} className="officer-roster-card officer-roster-card--compact">
              <div className="officer-roster-card__header">
                <div className="officer-roster-card__photo officer-roster-card__photo--static">
                  <UserAvatar
                    firstName={o.firstName}
                    lastName={o.lastName}
                    avatarUrl={o.avatarUrl}
                    size="sm"
                  />
                  <OfficerStatusDot status={o.status} />
                </div>
                <div>
                  <strong>{o.firstName} {o.lastName}</strong>
                  <span className="text-muted">{officerStatusLabel(o.status)} · {o.zone ?? 'Unassigned'}</span>
                </div>
              </div>
              <OfficerStatusControl officerId={o.id} status={o.status} onUpdated={refreshAll} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

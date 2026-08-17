'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { IncidentReportForm } from '@/components/control-room/IncidentReportForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { AvailableOfficersButton } from '@/components/control-room/AvailableOfficersButton';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { officerStatusLabel } from '@/lib/officer-status';
import { CONTROL_ROOM_ROUTES, incidentHref, mapHref, officerHref } from '@/lib/control-room-routes';
import { isAwaitingDispatch } from '@/lib/incident-status';

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
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
    client: string;
    address: string | null;
    latestReport: string | null;
  };
};

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

  const unassigned = data!.data.incidents.filter((i) =>
    isAwaitingDispatch(i.status, i.officer),
  );
  const dispatches = dispatchesData?.data ?? [];

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
        <button type="button" className="btn-primary" onClick={() => setShowReport((v) => !v)}>
          {showReport ? 'Hide report form' : 'Report incident'}
        </button>
      </div>

      {showReport && (
        <section className="portal-card dispatch-report-card">
          <h2>Report new incident</h2>
          <p className="text-muted">Log a caller report or operator-initiated incident directly from dispatch.</p>
          <IncidentReportForm
            clients={clientsData?.data ?? []}
            onSuccess={refreshAll}
          />
        </section>
      )}

      <div className="page-header">
        <h2>Assign officers</h2>
        <span className="text-muted">{unassigned.length} awaiting dispatch</span>
      </div>
      <div className="list-card">
        {unassigned.length === 0 ? (
          <div className="empty-state empty-state--inline">
            All active incidents dispatched.{' '}
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="interactive-text">View incidents</Link>
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
        <Link href={officerHref()} className="link-sm">Officer roster</Link>
      </div>
      <div className="list-card">
        {dispatches.length === 0 ? (
          <div className="empty-state empty-state--inline">No active dispatches.</div>
        ) : (
          dispatches.map((d) => (
            <div key={d.id} className="list-row list-row--stack">
              <Link
                href={incidentHref(d.incident.id)}
                className="list-row-body list-row--interactive"
              >
                <div className="list-row-top">
                  <span className="incident-type incident-type--high">{d.incident.type}</span>
                  <span className="badge">{d.status}</span>
                </div>
                <strong>{d.incident.client}</strong>
                <span className="text-muted">
                  Officer: {d.officer.name} ({d.officer.status.replace('_', ' ')})
                  {d.incident.address ? ` · ${d.incident.address}` : ''}
                </span>
                {d.incident.latestReport && (
                  <span className="dispatch-report-preview">
                    Latest report: {d.incident.latestReport.slice(0, 100)}
                    {d.incident.latestReport.length > 100 ? '…' : ''}
                  </span>
                )}
              </Link>
              <div className="entity-card-actions entity-card-actions--wrap">
                <OfficerStatusControl
                  officerId={d.officer.id}
                  status={d.officer.status}
                  variant="select"
                  onUpdated={refreshAll}
                />
                <Link href={`/control-room/map?incident=${d.incident.id}`} className="btn-sm btn-sm--link">
                  Map
                </Link>
                <Link href={incidentHref(d.incident.id)} className="btn-sm btn-sm--link">
                  Reports
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="page-header page-section">
        <h2>Officer availability</h2>
        <span className="text-muted">Override status if an officer is too busy or returning</span>
      </div>
      <div className="officer-roster officer-roster--compact">
        {(officersData?.data ?? []).map((o) => (
          <article key={o.id} className="officer-roster-card officer-roster-card--compact">
            <div className="officer-roster-card__header">
              <OfficerStatusDot status={o.status} />
              <div>
                <strong>{o.firstName} {o.lastName}</strong>
                <span className="text-muted">{officerStatusLabel(o.status)} · {o.zone ?? 'Unassigned'}</span>
              </div>
            </div>
            <OfficerStatusControl officerId={o.id} status={o.status} onUpdated={refreshAll} />
          </article>
        ))}
      </div>
    </div>
  );
}

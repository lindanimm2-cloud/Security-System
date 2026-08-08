'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { IncidentReportForm, IncidentReportPanel } from '@/components/control-room/IncidentReportForm';
import { IncidentMediaGallery } from '@/components/IncidentMediaGallery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { AvailableOfficersButton } from '@/components/control-room/AvailableOfficersButton';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { CONTROL_ROOM_ROUTES, dispatchHref, documentsHref, mapHref } from '@/lib/control-room-routes';
import { exportCsv } from '@/lib/export-csv';

type Incident = {
  id: string;
  type: string;
  status: string;
  priority: string;
  user: string;
  location: string;
  time: string;
  officer: string | null;
  reportCount?: number;
  latestReport?: string | null;
};

type Client = { id: string; firstName: string; lastName: string };

type IncidentDetail = {
  id: string;
  type: string;
  status: string;
  priority: string;
  user: string;
  location: string;
  description: string | null;
  notes: {
    id: string;
    authorRole: string;
    authorName: string;
    content: string;
    createdAt: string;
  }[];
  dispatches: { id: string; status: string; officer: string }[];
  media?: {
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    createdAt: string;
  }[];
};

export default function IncidentsPage() {
  return (
    <ControlRoomLayout title="Incidents">
      <IncidentsContent />
    </ControlRoomLayout>
  );
}

function IncidentsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Incident[]>>('/control-room/incidents'),
    [],
  );
  const { data: clientsData } = useApi(
    () => adminApi.get<ApiResponse<Client[]>>('/control-room/clients'),
    [],
  );
  const { data: detailData, reload: reloadDetail } = useApi(
    () => {
      if (!selectedId) {
        return Promise.resolve(null as unknown as ApiResponse<IncidentDetail>);
      }
      return adminApi.get<ApiResponse<IncidentDetail>>(`/control-room/incidents/${selectedId}`);
    },
    [selectedId],
  );

  const [updating, setUpdating] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [dispatchIncidentId, setDispatchIncidentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId) {
      document.getElementById('incident-detail')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedId, detailData]);

  async function resolve(id: string) {
    setUpdating(id);
    try {
      await adminApi.patch(`/control-room/incidents/${id}`, { status: 'RESOLVED' });
      reload();
      if (selectedId === id) reloadDetail();
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading incidents..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const detail = detailData?.data;
  const incidents = data!.data;
  const activeIncidents = incidents.filter((i) => isActiveIncident(i.status));
  const resolvedIncidents = incidents.filter((i) => !isActiveIncident(i.status));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Incidents</h1>
          <p className="text-muted">
            <Link href={CONTROL_ROOM_ROUTES.overview} className="interactive-text">Overview</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.dispatch} className="interactive-text">Dispatch</Link>
            {' · '}
            <Link href={mapHref('incidents')} className="interactive-text">Live map</Link>
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              exportCsv(
                'incidents.csv',
                incidents.map((i) => ({
                  id: i.id,
                  type: i.type,
                  status: i.status,
                  priority: i.priority,
                  client: i.user,
                  location: i.location,
                  time: i.time,
                  officer: i.officer ?? '',
                })),
              )
            }
          >
            Export CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowReport((v) => !v)}>
            {showReport ? 'Hide report form' : 'Report incident'}
          </button>
        </div>
      </div>

      {showReport && (
        <section className="portal-card dispatch-report-card">
          <h2>Report new incident</h2>
          <IncidentReportForm
            clients={clientsData?.data ?? []}
            onSuccess={() => {
              reload();
              setShowReport(false);
            }}
          />
        </section>
      )}

      {selectedId && detail && (
        <section id="incident-detail" className="portal-card incident-detail-card">
          <div className="card-header-row">
            <h2>
              {detail.type} — {detail.user}
            </h2>
            <span className={`incident-type incident-type--${detail.priority.toLowerCase()}`}>
              {detail.status}
            </span>
          </div>
          <p className="text-muted">{detail.location}</p>
          {detail.description && <p>{detail.description}</p>}
          {detail.dispatches.length > 0 && (
            <p className="text-muted">
              Dispatched: {detail.dispatches.map((d) => `${d.officer} (${d.status})`).join(', ')}
            </p>
          )}

          <h3>Incident reports</h3>
          {detail.notes.length === 0 ? (
            <p className="text-muted">No reports logged yet.</p>
          ) : (
            <ul className="incident-notes-list">
              {detail.notes.map((n) => (
                <li key={n.id} className="incident-note">
                  <div className="incident-note__meta">
                    <strong>{n.authorName}</strong>
                    <span>{n.authorRole}</span>
                    <time>{new Date(n.createdAt).toLocaleString('en-ZA')}</time>
                  </div>
                  <p>{n.content}</p>
                </li>
              ))}
            </ul>
          )}

          <IncidentReportPanel
            incidentId={detail.id}
            onSuccess={() => {
              reload();
              reloadDetail();
            }}
          />

          {detail.media && detail.media.length > 0 && (
            <>
              <h3>Evidence & attachments</h3>
              <p className="text-muted">Photos, videos, and documents submitted by officers.</p>
              <IncidentMediaGallery media={detail.media} />
            </>
          )}

          <h3>Documents</h3>
          <p className="text-muted">Evidence, reports, and files linked to this incident.</p>
          <Link href={documentsHref({ incidentId: detail.id })} className="btn-secondary btn-inline mb-1">
            View linked documents
          </Link>

          <div className="entity-card-actions mt-1">
            <Link href={dispatchHref(detail.id)} className="btn-sm btn-sm--link">Dispatch</Link>
            <Link href={`/control-room/map?incident=${detail.id}`} className="btn-sm btn-sm--link">Map</Link>
            <Link href={documentsHref({ incidentId: detail.id })} className="btn-sm btn-sm--link">Documents</Link>
          </div>
        </section>
      )}

      <IncidentSection
        title="Active"
        count={activeIncidents.length}
        variant="active"
        emptyMessage="No active incidents — all clear."
      >
        {activeIncidents.map((i) => (
          <IncidentRow
            key={i.id}
            incident={i}
            selected={selectedId === i.id}
            resolved={false}
            dispatchOpen={dispatchIncidentId === i.id}
            updating={updating === i.id}
            onToggleDispatch={() => {
              setDispatchIncidentId((prev) => (prev === i.id ? null : i.id));
              setActiveIncidentId(i.id);
            }}
            onResolve={() => resolve(i.id)}
            onAssigned={() => {
              reload();
              setDispatchIncidentId(null);
            }}
          />
        ))}
      </IncidentSection>

      <IncidentSection
        title="Resolved"
        count={resolvedIncidents.length}
        variant="resolved"
        emptyMessage="No resolved incidents yet."
      >
        {resolvedIncidents.map((i) => (
          <IncidentRow
            key={i.id}
            incident={i}
            selected={selectedId === i.id}
            resolved
            dispatchOpen={false}
            updating={false}
            onToggleDispatch={() => {}}
            onResolve={() => {}}
            onAssigned={() => {}}
          />
        ))}
      </IncidentSection>
    </div>
  );
}

function isActiveIncident(status: string) {
  return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(status);
}

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'incident-status-badge incident-status-badge--active';
  if (['DISPATCHED', 'EN_ROUTE', 'ON_SCENE'].includes(status)) {
    return 'incident-status-badge incident-status-badge--dispatched';
  }
  if (status === 'RESOLVED') return 'incident-status-badge incident-status-badge--resolved';
  return 'incident-status-badge incident-status-badge--closed';
}

function IncidentSection({
  title,
  count,
  variant,
  emptyMessage,
  children,
}: {
  title: string;
  count: number;
  variant: 'active' | 'resolved';
  emptyMessage: string;
  children: ReactNode;
}) {
  const hasItems = count > 0;

  return (
    <section className={`incidents-section incidents-section--${variant}`}>
      <div className="incidents-section__header">
        <h2 className="incidents-section__title">{title}</h2>
        <span className={`incidents-section__count incidents-section__count--${variant}`}>{count}</span>
      </div>
      {hasItems ? (
        <div className="incident-list">{children}</div>
      ) : (
        <div className="incidents-section__empty">{emptyMessage}</div>
      )}
    </section>
  );
}

function IncidentRow({
  incident: i,
  selected,
  resolved,
  dispatchOpen,
  updating,
  onToggleDispatch,
  onResolve,
  onAssigned,
}: {
  incident: Incident;
  selected: boolean;
  resolved: boolean;
  dispatchOpen: boolean;
  updating: boolean;
  onToggleDispatch: () => void;
  onResolve: () => void;
  onAssigned: () => void;
}) {
  return (
    <article
      className={`incident-card ${resolved ? 'incident-card--resolved' : 'incident-card--active'} ${
        selected ? 'incident-card--selected' : ''
      }`}
    >
      <Link href={`/control-room/incidents?id=${i.id}`} className="incident-card__main">
        <div className="incident-card__top">
          <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>{i.type}</span>
          <span className={statusBadgeClass(i.status)}>{i.status.replace(/_/g, ' ')}</span>
        </div>
        <strong className="incident-card__title">{i.user}</strong>
        <span className="incident-card__location">{i.location}</span>
        <div className="incident-card__meta">
          <span>{i.time}</span>
          {i.officer && <span>Officer: {i.officer}</span>}
          {(i.reportCount ?? 0) > 0 && <span>{i.reportCount} report{i.reportCount === 1 ? '' : 's'}</span>}
        </div>
        {i.latestReport && (
          <p className="incident-card__preview">{i.latestReport.slice(0, 100)}{i.latestReport.length > 100 ? '…' : ''}</p>
        )}
      </Link>
      <div className="incident-card__actions">
        {!resolved && i.status === 'ACTIVE' && !i.officer && (
          <AvailableOfficersButton
            incidentId={i.id}
            active={dispatchOpen}
            onClick={onToggleDispatch}
          />
        )}
        <Link href={`/control-room/map?incident=${i.id}`} className="btn-sm btn-sm--link">Map</Link>
        <Link href={`/control-room/incidents?id=${i.id}`} className="btn-sm btn-sm--link">Reports</Link>
        <Link href={documentsHref({ incidentId: i.id })} className="btn-sm btn-sm--link">Documents</Link>
        {!resolved && (
          <button type="button" className="btn-sm btn-sm--resolve" onClick={onResolve} disabled={updating}>
            {updating ? <LoadingSpinner label="" size="sm" /> : 'Resolve'}
          </button>
        )}
      </div>
      {dispatchOpen && (
        <QuickDispatchPanel
          incidentId={i.id}
          incidentLabel={`${i.type} · ${i.user}`}
          defaultExpanded
          onAssigned={onAssigned}
        />
      )}
    </article>
  );
}

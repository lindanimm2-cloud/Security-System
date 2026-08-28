'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { IncidentReportForm, IncidentReportPanel } from '@/components/control-room/IncidentReportForm';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { IncidentMediaGallery } from '@/components/IncidentMediaGallery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { AvailableOfficersButton } from '@/components/control-room/AvailableOfficersButton';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { IncidentKernelPanels } from '@/components/incident/IncidentKernelPanels';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { CONTROL_ROOM_ROUTES, dispatchHref, documentsHref, mapHref } from '@/lib/control-room-routes';
import { exportCsv } from '@/lib/export-csv';
import { openBrandedTableReport } from '@/lib/branded-document';
import { isAwaitingDispatch } from '@/lib/incident-status';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { ChartCard, countBy, DonutChart, HorizontalBars, type ChartTone } from '@/components/ui/charts';

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
  const priorityFilter = searchParams.get('priority');

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
  const [search, setSearch] = useState('');

  const incidents = data?.data ?? [];
  const searchedIncidents = useMemo(
    () =>
      incidents.filter((i) =>
        matchesSearch(
          search,
          i.id,
          i.type,
          i.status,
          i.priority,
          i.user,
          i.location,
          i.officer,
          i.latestReport,
        ),
      ),
    [incidents, search],
  );

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

  const detail = detailData?.data && !Array.isArray(detailData.data) ? detailData.data : null;
  const activeIncidents = searchedIncidents.filter((i) => {
    if (!isActiveIncident(i.status)) return false;
    if (!priorityFilter) return true;
    const p = (i.priority ?? '').toUpperCase();
    if (priorityFilter.toUpperCase() === 'CRITICAL') return ['CRITICAL', 'HIGH'].includes(p);
    return p === priorityFilter.toUpperCase();
  });
  const resolvedIncidents = searchedIncidents.filter((i) => !isActiveIncident(i.status));

  const criticalCount = activeIncidents.filter((i) => (i.priority ?? '').toUpperCase() === 'CRITICAL').length;
  const highCount = activeIncidents.filter((i) => (i.priority ?? '').toUpperCase() === 'HIGH').length;
  const dispatchedCount = activeIncidents.filter((i) =>
    ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE'].includes(i.status),
  ).length;
  const prioritySlices = countBy(activeIncidents, (i) => i.priority || 'MEDIUM').map(
    (slice, index): { label: string; value: number; tone: ChartTone } => ({
      ...slice,
      tone:
        slice.label.toUpperCase() === 'CRITICAL'
          ? 'danger'
          : slice.label.toUpperCase() === 'HIGH'
            ? 'warning'
            : index === 0
              ? 'accent'
              : 'neutral',
    }),
  );
  const statusBars = countBy(activeIncidents, (i) => i.status).map(
    (slice, index): { label: string; value: number; tone: ChartTone } => ({
      label: slice.label.replaceAll('_', ' '),
      value: slice.value,
      tone: index === 0 ? 'accent' : index === 1 ? 'warning' : 'success',
    }),
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>
            <Link href={CONTROL_ROOM_ROUTES.overview} className="interactive-text">Overview</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.dispatch} className="interactive-text">Dispatch</Link>
            {' · '}
            <Link href={mapHref('incidents')} className="interactive-text">Live map</Link>
          </p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              openBrandedTableReport({
                title: 'Incidents register',
                filenameStem: 'incidents',
                headers: ['ID', 'Type', 'Status', 'Priority', 'Client', 'Location', 'Time', 'Officer'],
                rows: incidents.map((i) => [
                  i.id,
                  i.type,
                  i.status,
                  i.priority,
                  i.user,
                  i.location,
                  i.time,
                  i.officer ?? '',
                ]),
              })
            }
          >
            Print report
          </button>
          <button
            type="button"
            className="btn-ghost"
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
                { title: 'Incidents register' },
              )
            }
          >
            Export CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowReport(true)}>
            + Report incident
          </button>
        </div>
      </div>

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search incidents, client, location, officer…"
          resultCount={searchedIncidents.length}
          totalCount={incidents.length}
        />
      </div>

      {/* Stats bar */}
      <div className="inc-stats-bar">
        <div className="inc-stat inc-stat--critical">
          <span className="inc-stat__value">{criticalCount}</span>
          <span className="inc-stat__label">Critical</span>
        </div>
        <div className="inc-stat inc-stat--high">
          <span className="inc-stat__value">{highCount}</span>
          <span className="inc-stat__label">High</span>
        </div>
        <div className="inc-stat inc-stat--dispatched">
          <span className="inc-stat__value">{dispatchedCount}</span>
          <span className="inc-stat__label">Dispatched</span>
        </div>
        <div className="inc-stat inc-stat--total">
          <span className="inc-stat__value">{activeIncidents.length}</span>
          <span className="inc-stat__label">Active total</span>
        </div>
        <div className="inc-stat inc-stat--resolved">
          <span className="inc-stat__value">{resolvedIncidents.length}</span>
          <span className="inc-stat__label">Resolved</span>
        </div>
      </div>

      <div className="ds-chart-grid">
        <ChartCard title="Active priority mix" subtitle="Open incidents by severity" className="ds-chart-card--span-6">
          <DonutChart
            slices={prioritySlices}
            centerValue={activeIncidents.length}
            centerLabel="active"
            emptyLabel="No active incidents"
          />
        </ChartCard>
        <ChartCard title="Workflow status" subtitle="Where active files sit" className="ds-chart-card--span-6">
          <HorizontalBars
            items={statusBars.length > 0 ? statusBars : [{ label: 'No active incidents', value: 0, tone: 'neutral' }]}
            compact
          />
        </ChartCard>
      </div>

      {showReport && (
        <OpsDialog
          title="Report new incident"
          subtitle="Log a caller report or operator-initiated ticket."
          onClose={() => setShowReport(false)}
          wide
        >
          <IncidentReportForm
            clients={clientsData?.data ?? []}
            onSuccess={() => {
              reload();
              setShowReport(false);
            }}
          />
        </OpsDialog>
      )}

      {selectedId && detail && (
        <section id="incident-detail" className="portal-card incident-detail-card">
          <div className="card-header-row">
            <h2>
              {detail.type} — {detail.user}
            </h2>
          <span className={`incident-type incident-type--${(detail.priority ?? 'medium').toLowerCase()}`}>
              {detail.status}
            </span>
          </div>
          <p className="text-muted">{detail.location}</p>
          {detail.description && <p>{detail.description}</p>}
          {detail.dispatches?.length ? (
            <p className="text-muted">
              Dispatched: {detail.dispatches.map((d) => `${d.officer} (${d.status})`).join(', ')}
            </p>
          ) : null}

          <IncidentKernelPanels incidentId={detail.id} portal="admin" />

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
        emptyMessage={search.trim() ? 'No matching active incidents.' : 'No active incidents — all clear.'}
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
        emptyMessage={search.trim() ? 'No matching resolved incidents.' : 'No resolved incidents yet.'}
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
  if (status === 'ACTIVE' || status === 'OPEN' || status === 'PENDING' || status === 'NEW') {
    return 'incident-status-badge incident-status-badge--active';
  }
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
  const priorityCls = i.priority.toLowerCase();

  return (
    <article
      className={`incident-card incident-card--v2 ${resolved ? 'incident-card--resolved' : `incident-card--active incident-card--pri-${priorityCls}`} ${
        selected ? 'incident-card--selected' : ''
      }`}
    >
      {/* Priority stripe */}
      <div className={`incident-card__stripe incident-card__stripe--${priorityCls}`} aria-hidden="true" />

      <div className="incident-card__body">
        <Link href={`/control-room/incidents?id=${i.id}`} className="incident-card__main">
          <div className="incident-card__top">
            <span className={`incident-type incident-type--${priorityCls}`}>{i.type}</span>
            <span className={statusBadgeClass(i.status)}>{i.status.replace(/_/g, ' ')}</span>
            {!resolved && i.priority.toUpperCase() === 'CRITICAL' && (
              <span className="inc-critical-pill">CRITICAL</span>
            )}
          </div>
          <strong className="incident-card__title">{i.user}</strong>
          <div className="incident-card__detail-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="incident-card__location">{i.location}</span>
          </div>
          <div className="incident-card__meta">
            <span>🕐 {i.time}</span>
            {i.officer && (
              <span className="inc-officer-pill">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {i.officer}
              </span>
            )}
            {(i.reportCount ?? 0) > 0 && (
              <span className="inc-reports-pill">{i.reportCount} report{i.reportCount === 1 ? '' : 's'}</span>
            )}
          </div>
          {i.latestReport && (
            <p className="incident-card__preview">"{i.latestReport.slice(0, 120)}{i.latestReport.length > 120 ? '…' : ''}"</p>
          )}
        </Link>

        <div className="incident-card__actions">
          {!resolved && isAwaitingDispatch(i.status, i.officer) && (
            <AvailableOfficersButton
              incidentId={i.id}
              active={dispatchOpen}
              onClick={onToggleDispatch}
            />
          )}
          <Link href={`/control-room/map?incident=${i.id}`} className="btn-sm btn-sm--link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Map
          </Link>
          <Link href={`/control-room/incidents?id=${i.id}`} className="btn-sm btn-sm--link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Reports
          </Link>
          <Link href={documentsHref({ incidentId: i.id })} className="btn-sm btn-sm--link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Docs
          </Link>
          {!resolved && (
            <button type="button" className="btn-sm btn-sm--resolve" onClick={onResolve} disabled={updating}>
              {updating ? <LoadingSpinner label="" size="sm" /> : '✓ Resolve'}
            </button>
          )}
        </div>
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

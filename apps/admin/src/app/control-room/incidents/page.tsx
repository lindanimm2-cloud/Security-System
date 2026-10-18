'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { IncidentReportForm, IncidentReportPanel } from '@/components/control-room/IncidentReportForm';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { IncidentMediaGallery } from '@/components/IncidentMediaGallery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { IncidentKernelPanels } from '@/components/incident/IncidentKernelPanels';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { CONTROL_ROOM_ROUTES, dispatchHref, documentsHref, mapHref } from '@/lib/control-room-routes';
import { exportCsv } from '@/lib/export-csv';
import { openBrandedTableReport } from '@/lib/branded-document';
import { isAwaitingDispatch } from '@/lib/incident-status';
import { ListSearch } from '@/components/ui/ListSearch';
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';
import { OpsMonActionsMenu, type OpsMonAction } from '@/components/ops/OpsMonActionsMenu';
import { matchesSearch } from '@/lib/list-search';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const priorityFilter = searchParams.get('priority');

  function closeIncidentFile() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('id');
    const qs = next.toString();
    router.replace(qs ? `${CONTROL_ROOM_ROUTES.incidents}?${qs}` : CONTROL_ROOM_ROUTES.incidents);
  }

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

  return (
    <div className="page-content inc-hud-page inc-hud-page--compact">
      <header className="inc-board-bar" aria-label="Live board">
        <div className="inc-board-bar__lead">
          <h1 className="inc-board-bar__title">
            <span className={`inc-hud-live ${activeIncidents.length > 0 ? 'is-hot' : ''}`} aria-hidden>
              <i />
            </span>
            Live board
          </h1>
          <p className="inc-board-bar__count" aria-live="polite">
            {activeIncidents.length} active · {resolvedIncidents.length} resolved
          </p>
          <nav className="inc-board-bar__tabs" aria-label="Incidents shortcuts">
            <Link href={CONTROL_ROOM_ROUTES.incidents} aria-current="page">
              Overview
            </Link>
            <Link href={CONTROL_ROOM_ROUTES.dispatch}>Dispatch</Link>
            <Link href={mapHref('incidents')}>Live map</Link>
          </nav>
        </div>
        <div className="inc-board-bar__tools">
          <div className="inc-board-bar__search">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Search incidents, client, location, officer…"
              resultCount={searchedIncidents.length}
              totalCount={incidents.length}
            />
          </div>
          <button
            type="button"
            className="btn-sm"
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
            Print
          </button>
          <button
            type="button"
            className="btn-sm"
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
            CSV
          </button>
          <button type="button" className="btn-sm btn-primary" onClick={() => setShowReport(true)}>
            Report
          </button>
        </div>
      </header>

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

      {selectedId && detail ? (
        <OpsDialog
          title={`${detail.type} — ${detail.user}`}
          subtitle={`${detail.location} · ${detail.status.replace(/_/g, ' ')}`}
          onClose={closeIncidentFile}
          wide
        >
          <div id="incident-detail" className="incident-detail-card incident-detail-card--dialog">
            {detail.description ? <p>{detail.description}</p> : null}
            {detail.dispatches?.length ? (
              <p className="text-muted">
                Dispatched: {detail.dispatches.map((d) => `${d.officer} (${d.status})`).join(', ')}
              </p>
            ) : null}

            <IncidentKernelPanels incidentId={detail.id} portal="admin" compact />

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

            {detail.media && detail.media.length > 0 ? (
              <>
                <h3>Evidence & attachments</h3>
                <p className="text-muted">Photos, videos, and documents submitted by officers.</p>
                <IncidentMediaGallery media={detail.media} />
              </>
            ) : null}

            <div className="inc-detail-rail">
              <div className="inc-detail-rail__copy">
                <h3>Linked files</h3>
                <p className="text-muted">Evidence, reports, and documents for this case.</p>
              </div>
              <div className="inc-detail-rail__actions">
                <Link href={dispatchHref(detail.id)} className="btn-sm">
                  Dispatch
                </Link>
                <Link href={`/control-room/map?incident=${detail.id}`} className="btn-sm">
                  Map
                </Link>
                <Link href={documentsHref({ incidentId: detail.id })} className="btn-sm btn-primary">
                  Documents
                </Link>
              </div>
            </div>
          </div>
        </OpsDialog>
      ) : null}

      <IncidentMonitorBoard
        title="Active incidents"
        rows={activeIncidents}
        emptyMessage={search.trim() ? 'No matching active incidents.' : 'No active incidents — all clear.'}
        selectedId={selectedId}
        dispatchIncidentId={dispatchIncidentId}
        updatingId={updating}
        onToggleDispatch={(id) => {
          setDispatchIncidentId((prev) => (prev === id ? null : id));
          setActiveIncidentId(id);
        }}
        onResolve={(id) => void resolve(id)}
        onAssigned={() => {
          reload();
          setDispatchIncidentId(null);
        }}
      />

      <IncidentMonitorBoard
        title="Resolved"
        rows={resolvedIncidents}
        emptyMessage={search.trim() ? 'No matching resolved incidents.' : 'No resolved incidents yet.'}
        selectedId={selectedId}
        resolved
        dispatchIncidentId={null}
        updatingId={null}
        onToggleDispatch={() => {}}
        onResolve={() => {}}
        onAssigned={() => {}}
      />
    </div>
  );
}

function isActiveIncident(status: string) {
  return !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(status);
}

type StatusTone = 'ok' | 'alert' | 'fault' | 'offline' | 'muted';

function incidentStatusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === 'NEW' || s === 'OPEN') return 'Needs response';
  if (s === 'ACKNOWLEDGED') return 'Acknowledged';
  if (s === 'DISPATCHED' || s === 'EN_ROUTE') return 'Dispatched';
  if (s === 'IN_PROGRESS' || s === 'RESPONDING' || s === 'ON_SCENE') return 'In progress';
  if (s === 'RESOLVED') return 'Resolved';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'Closed';
  return status.replace(/_/g, ' ');
}

function incidentStatusTone(status: string): StatusTone {
  const s = status.toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED' || s === 'CANCELLED') return 'ok';
  if (s === 'IN_PROGRESS' || s === 'RESPONDING' || s === 'ON_SCENE') return 'alert';
  if (s === 'DISPATCHED' || s === 'EN_ROUTE' || s === 'ACKNOWLEDGED') return 'fault';
  if (s === 'NEW' || s === 'OPEN') return 'offline';
  return 'muted';
}

function toneFill(tone: StatusTone) {
  switch (tone) {
    case 'ok':
      return 100;
    case 'alert':
      return 75;
    case 'fault':
      return 48;
    case 'offline':
      return 22;
    default:
      return 35;
  }
}

function IncidentTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes('panic') || t.includes('sos')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M12 3.2 21 19.5H3L12 3.2z" />
        <path d="M12 9.2v4.6M12 16.6h.01" />
      </svg>
    );
  }
  if (t.includes('medical')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20.2c1.2-3.2 3.5-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
      </svg>
    );
  }
  if (t.includes('fire')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M12 21c3.6 0 6-2.4 6-5.6 0-3.2-2.2-5.2-4.2-7.2-.4 2.2-1.6 3.2-1.6 3.2S10.4 8 10.2 5.4C8 7.4 6 10 6 15.4 6 18.6 8.4 21 12 21z" />
      </svg>
    );
  }
  if (t.includes('camera') || t.includes('cctv')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="3.5" y="7" width="12.5" height="10" rx="1.5" />
        <path d="m16 10.5 4.5-2.5v8L16 13.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 3.2c-2.8 1-5.2 1.3-7.4 1.5v6.4c0 4.2 3 7.6 7.4 9.2 4.4-1.6 7.4-5 7.4-9.2V4.7c-2.2-.2-4.6-.5-7.4-1.5z" />
    </svg>
  );
}

function OpsSignal({ fill }: { fill: number }) {
  const level = Math.max(1, Math.min(4, Math.ceil((fill / 100) * 4)));
  return (
    <span className="ops-mon__signal" title={`${fill}%`}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= level ? 'is-on' : undefined} />
      ))}
      <em>{fill}%</em>
    </span>
  );
}

function OpsStatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`ops-mon__status ops-mon__status--${tone}`}>
      <em aria-hidden />
      <OpsMarqueeText>{label}</OpsMarqueeText>
    </span>
  );
}

function controlRoomIncidentActions({
  incident: i,
  code,
  resolved,
  updating,
  onToggleDispatch,
  onResolve,
}: {
  incident: Incident;
  code: string;
  resolved: boolean;
  updating: boolean;
  onToggleDispatch: () => void;
  onResolve: () => void;
}): OpsMonAction[] {
  const items: OpsMonAction[] = [
    {
      id: 'open',
      label: 'Open incident file',
      description: `${i.type} · ${i.user}`,
      href: `/control-room/incidents?id=${i.id}`,
    },
    {
      id: 'map',
      label: 'Open live map',
      description: i.location,
      href: `/control-room/map?incident=${i.id}`,
    },
    {
      id: 'docs',
      label: 'Documents',
      href: documentsHref({ incidentId: i.id }),
    },
  ];

  if (!resolved && isAwaitingDispatch(i.status, i.officer)) {
    items.push({
      id: 'dispatch',
      label: 'Dispatch officers',
      description: 'Assign available units',
      onClick: onToggleDispatch,
    });
  }

  if (!resolved) {
    items.push({
      id: 'resolve',
      label: updating ? 'Resolving…' : 'Resolve incident',
      tone: 'ok',
      disabled: updating,
      onClick: onResolve,
    });
  }

  items.push({
    id: 'copy',
    label: 'Copy reference',
    description: code,
    onClick: () => {
      void navigator.clipboard?.writeText(i.id);
    },
  });

  return items;
}

function IncidentMonitorBoard({
  title,
  rows,
  emptyMessage,
  selectedId,
  resolved = false,
  dispatchIncidentId,
  updatingId,
  onToggleDispatch,
  onResolve,
  onAssigned,
}: {
  title: string;
  rows: Incident[];
  emptyMessage: string;
  selectedId: string | null;
  resolved?: boolean;
  dispatchIncidentId: string | null;
  updatingId: string | null;
  onToggleDispatch: (id: string) => void;
  onResolve: (id: string) => void;
  onAssigned: () => void;
}) {
  return (
    <section className="soc-history inc-monitor" aria-label={title}>
      <header className="soc-history__head">
        <div>
          <h2>{title}</h2>
          <p>{resolved ? 'Closed and cleared files.' : 'Open files needing desk or field response.'}</p>
        </div>
        <div className="soc-history__stats">
          <span>
            <strong>{rows.length}</strong> {resolved ? 'resolved' : 'open'}
          </span>
        </div>
      </header>

      <div className="soc-history__board ops-mon">
        <table className="ops-mon__table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Type</th>
              <th>Location</th>
              <th>Status</th>
              <th>Last seen</th>
              <th>Signal</th>
              <th className="ops-mon__actions-h">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="ops-mon__empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((i, index) => {
                const tone = incidentStatusTone(i.status);
                const fill = toneFill(tone);
                const code = `IN${String(index + 1).padStart(4, '0')}`;
                const selected = selectedId === i.id;
                const dispatchOpen = dispatchIncidentId === i.id;
                return (
                  <tr
                    key={i.id}
                    className={[
                      resolved ? 'is-void' : '',
                      selected || dispatchOpen ? 'is-selected' : '',
                      !resolved && (i.priority ?? '').toUpperCase() === 'CRITICAL' ? 'is-critical' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td>
                      <div className="ops-mon__device">
                        <span className="ops-mon__icon" aria-hidden>
                          <IncidentTypeIcon type={i.type} />
                        </span>
                        <span className="ops-mon__device-copy">
                          <strong>
                            <OpsMarqueeText>
                              {i.type} — {i.user}
                            </OpsMarqueeText>
                          </strong>
                          <em>
                            {code}
                            {i.officer ? ` · ${i.officer}` : ''}
                          </em>
                        </span>
                      </div>
                    </td>
                    <td className="ops-mon__muted">{i.type}</td>
                    <td className="ops-mon__muted">{i.location}</td>
                    <td>
                      <OpsStatusPill tone={tone} label={incidentStatusLabel(i.status)} />
                    </td>
                    <td className="ops-mon__muted">{i.time}</td>
                    <td>
                      <OpsSignal fill={fill} />
                    </td>
                    <td className="ops-mon__actions">
                      <div className="inc-monitor__actions">
                        <OpsMonActionsMenu
                          label={`Actions for ${i.type} — ${i.user}`}
                          items={controlRoomIncidentActions({
                            incident: i,
                            code,
                            resolved,
                            updating: updatingId === i.id,
                            onToggleDispatch: () => onToggleDispatch(i.id),
                            onResolve: () => onResolve(i.id),
                          })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <ul className="ops-mon__cards">
          {rows.length === 0 ? (
            <li className="ops-mon__empty">{emptyMessage}</li>
          ) : (
            rows.map((i, index) => {
              const tone = incidentStatusTone(i.status);
              const fill = toneFill(tone);
              const code = `IN${String(index + 1).padStart(4, '0')}`;
              const dispatchOpen = dispatchIncidentId === i.id;
              return (
                <li key={`card-${i.id}`} className={resolved ? 'is-void' : undefined}>
                  <div className="ops-mon__device">
                    <span className="ops-mon__icon" aria-hidden>
                      <IncidentTypeIcon type={i.type} />
                    </span>
                    <span className="ops-mon__device-copy">
                      <strong>
                        <OpsMarqueeText>
                          {i.type} — {i.user}
                        </OpsMarqueeText>
                      </strong>
                      <em>
                        {code}
                        {i.officer ? ` · ${i.officer}` : ''}
                      </em>
                    </span>
                    <OpsMonActionsMenu
                      label={`Actions for ${i.type} — ${i.user}`}
                      items={controlRoomIncidentActions({
                        incident: i,
                        code,
                        resolved,
                        updating: updatingId === i.id,
                        onToggleDispatch: () => onToggleDispatch(i.id),
                        onResolve: () => onResolve(i.id),
                      })}
                    />
                  </div>
                  <div className="ops-mon__card-meta">
                    <span>{i.type}</span>
                    <span>{i.location}</span>
                    <span>{i.time}</span>
                  </div>
                  <div className="ops-mon__card-foot">
                    <OpsStatusPill tone={tone} label={incidentStatusLabel(i.status)} />
                    <OpsSignal fill={fill} />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {rows.map((i) =>
        dispatchIncidentId === i.id && !resolved ? (
          <div key={`dispatch-${i.id}`} className="inc-monitor__dispatch-desk">
            <QuickDispatchPanel
              incidentId={i.id}
              incidentLabel={`${i.type} · ${i.user}`}
              defaultExpanded
              onAssigned={onAssigned}
            />
          </div>
        ) : null,
      )}
    </section>
  );
}

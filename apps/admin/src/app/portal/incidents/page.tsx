'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { IncidentKernelPanels } from '@/components/incident/IncidentKernelPanels';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { EmptyState } from '@/components/ui/EmptyState';

type Incident = {
  id: string;
  type: string;
  status: string;
  priority: string;
  title: string | null;
  isSilent: boolean;
  address: string | null;
  createdAt: string;
  media?: { id: string; fileName: string }[];
  hasResponse?: boolean;
};

function formatStatus(value: string) {
  const key = value.toUpperCase();
  const labels: Record<string, string> = {
    OPEN: 'Open',
    ACTIVE: 'In progress',
    DISPATCHED: 'Response underway',
    ASSIGNED: 'Responder assigned',
    EN_ROUTE: 'On the way',
    ON_SCENE: 'On scene',
    RESOLVED: 'All clear',
    COMPLETED: 'Complete',
    CANCELLED: 'Cancelled',
  };
  return labels[key] ?? value.replace(/_/g, ' ').toLowerCase();
}

export default function IncidentsPage() {
  return (
    <PortalLayout>
      <IncidentsContent />
    </PortalLayout>
  );
}

function IncidentsContent() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Incident[]>>('/client/incidents'),
    [],
  );

  const incidents = data?.data ?? [];
  const filtered = useMemo(
    () =>
      incidents.filter((i) =>
        matchesSearch(
          search,
          i.id,
          i.type,
          i.status,
          i.priority,
          i.title,
          i.address,
          i.isSilent ? 'silent' : '',
        ),
      ),
    [incidents, search],
  );

  if (loading) return <LoadingSpinner label="Loading alerts..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const selected = filtered.find((i) => i.id === openId) ?? incidents.find((i) => i.id === openId) ?? null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Response history</h1>
          <p className="text-muted">Alerts, who responded, and how it ended.</p>
        </div>
      </div>
      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search alerts, location, status…"
          resultCount={filtered.length}
          totalCount={incidents.length}
        />
      </div>
      <div className="list-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'No matches' : 'No alerts yet'}
            body={
              search.trim()
                ? 'Try a different type, status, or address.'
                : 'When you request help, it will show up here.'
            }
          />
        ) : (
          filtered.map((i) => (
            <button
              key={i.id}
              type="button"
              className="list-row list-row--stack list-row--interactive"
              onClick={() => setOpenId(i.id)}
            >
              <div className="list-row-top">
                <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>
                  {i.type === 'PANIC' ? 'Panic' : i.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </span>
                <span className="badge">{formatStatus(i.status)}</span>
                {i.isSilent ? <span className="badge">Silent</span> : null}
              </div>
              <strong>{i.title ?? i.address ?? 'Unknown location'}</strong>
              {i.media && i.media.length > 0 ? (
                <span className="text-muted">{i.media.length} evidence file(s)</span>
              ) : null}
              <span className="text-muted">
                {new Date(i.createdAt).toLocaleString()}
                {i.hasResponse ? ' · Response team assigned' : ''}
              </span>
              <span className="list-row__hint">View details</span>
            </button>
          ))
        )}
      </div>

      {selected ? (
        <OpsDialog
          title={selected.title ?? formatStatus(selected.type)}
          subtitle={`${formatStatus(selected.type)} · ${formatStatus(selected.status)}`}
          onClose={() => setOpenId(null)}
          wide
        >
          <IncidentHistoryDetail incident={selected} />
        </OpsDialog>
      ) : null}
    </div>
  );
}

function IncidentHistoryDetail({ incident }: { incident: Incident }) {
  return (
    <div className="incident-history-detail">
      <dl className="incident-history-detail__meta">
        <div>
          <dt>Status</dt>
          <dd>{formatStatus(incident.status)}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{formatStatus(incident.priority)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{incident.address ?? '—'}</dd>
        </div>
        <div>
          <dt>Reported</dt>
          <dd>{new Date(incident.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      {incident.isSilent ? (
        <p className="text-muted incident-history-detail__note">Silent alert — discreet response.</p>
      ) : null}
      {incident.hasResponse ? (
        <p className="text-muted incident-history-detail__note">Response team assigned.</p>
      ) : null}
      {incident.media && incident.media.length > 0 ? (
        <Link href="/portal/evidence" className="link-sm">
          View {incident.media.length} evidence file{incident.media.length === 1 ? '' : 's'}
        </Link>
      ) : null}
      <IncidentKernelPanels incidentId={incident.id} portal="client" />
    </div>
  );
}

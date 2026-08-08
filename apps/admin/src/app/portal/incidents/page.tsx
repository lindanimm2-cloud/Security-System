'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

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

export default function IncidentsPage() {
  return (
    <PortalLayout>
      <IncidentsContent />
    </PortalLayout>
  );
}

function IncidentsContent() {
  const { data, loading, error , reload } = useApi(
    () => clientApi.get<ApiResponse<Incident[]>>('/client/incidents'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading incidents..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Incident History</h1>
          <p className="text-muted">Complete record of alerts, responses, and outcomes.</p>
        </div>
      </div>
      <div className="list-card">
        {data!.data.length === 0 ? (
          <div className="empty-state">No incidents recorded. Stay safe.</div>
        ) : (
          data!.data.map((i) => (
            <Link
              key={i.id}
              href={i.media && i.media.length > 0 ? '/portal/evidence' : '/portal/incidents'}
              className="list-row list-row--stack list-row--interactive"
            >
              <div className="list-row-top">
                <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>{i.type}</span>
                <span className="badge">{i.status}</span>
                {i.isSilent && <span className="badge">Silent</span>}
              </div>
              <strong>{i.title ?? i.address ?? 'Unknown location'}</strong>
              {i.media && i.media.length > 0 && (
                <span className="text-muted">{i.media.length} evidence file(s) — view vault</span>
              )}
              <span className="text-muted">
                {new Date(i.createdAt).toLocaleString()}
                {i.hasResponse && ' · Response team assigned'}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

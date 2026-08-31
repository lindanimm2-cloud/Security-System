'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { SERVICE_REQUESTS } from '@/lib/service-requests';

type RequestRow = {
  id: string;
  publicRef?: string;
  kind: string;
  title: string;
  status: string;
  whenLabel: string;
  summary: string;
};

export default function ServiceRequestsPage() {
  return (
    <PortalLayout>
      <Suspense fallback={<LoadingSpinner label="Loading requests…" fullScreen />}>
        <RequestsContent />
      </Suspense>
    </PortalLayout>
  );
}

function RequestsContent() {
  const params = useSearchParams();
  const submitted = params.get('submitted') === '1';
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<RequestRow[]>>('/client/service-requests'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading requests…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const rows = data?.data ?? [];

  return (
    <div className="page-content svc-req">
      <p className="text-muted">
        <Link href="/portal/personal">← Personal security</Link>
      </p>
      <div className="page-header">
        <div>
          <p className="ec-kicker">4DS Protect</p>
          <h1>Service requests</h1>
          <p className="text-muted">Check-ins, journeys, escorts and wellness visits.</p>
        </div>
      </div>

      {submitted ? (
        <div className="alert alert--success" role="status">
          Request sent to control room. You can follow it under incidents.
        </div>
      ) : null}

      <div className="svc-req__quick">
        {Object.values(SERVICE_REQUESTS).map((def) => (
          <Link key={def.kind} href={`/portal/requests/${def.kind}`} className="svc-req__quick-card">
            <strong>{def.title}</strong>
            <span>New request</span>
          </Link>
        ))}
      </div>

      <section className="portal-card">
        <h2>Recent</h2>
        {rows.length === 0 ? (
          <p className="text-muted">No service requests yet.</p>
        ) : (
          <ul className="activity-list">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`activity-item ${
                  row.status !== 'COMPLETED' && row.status !== 'RESOLVED' ? 'activity-item--progress' : ''
                }`}
              >
                <Link href="/portal/incidents" className="activity-item-link">
                  <div>
                    <div className="activity-title">{row.title}</div>
                    <div className="activity-detail">{row.summary}</div>
                  </div>
                  <span className="activity-time">
                    {row.status.replace(/_/g, ' ')} · {row.whenLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import { workflowLabel } from '@/lib/tech-workflow';

type TechJob = {
  id: string;
  title: string;
  status: string;
  address: string;
  jobType?: string;
  clientName?: string;
  scheduledAt?: string;
};

export default function TechMapPage() {
  return (
    <TechLayout title="Job map">
      <TechMapContent />
    </TechLayout>
  );
}

function TechMapContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TechJob[]>>('/store/tech/jobs'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading job locations..." />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const jobs = (data?.data ?? []).filter((j) => !['COMPLETED', 'CANCELLED'].includes(j.status));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Today’s locations</h1>
          <p className="text-muted">Open a map pin for each install, then navigate from the job.</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">No open jobs to map yet.</div>
      ) : (
        <div className="card-stack">
          {jobs.map((job) => (
            <article key={job.id} className="card-panel">
              <div className="card-header-row">
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{job.title}</h2>
                <span className="badge">{workflowLabel(job.status)}</span>
              </div>
              <p className="text-muted" style={{ margin: '0.35rem 0 0.75rem' }}>
                {job.address}
                {job.clientName ? ` · ${job.clientName}` : ''}
              </p>
              <a
                className="btn-primary"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Navigate
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

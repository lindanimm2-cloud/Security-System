'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi } from '@/lib/api-client';
import { useState } from 'react';

type Job = {
  id: string;
  title: string;
  description: string | null;
  jobType: string;
  status: string;
  clientName: string;
  clientPhone: string | null;
  address: string;
  scheduledAt: string;
  equipmentNotes: string | null;
};

const STATUS_FLOW = ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'] as const;

export default function TechJobsPage() {
  return (
    <TechLayout title="Install Jobs">
      <TechJobsContent />
    </TechLayout>
  );
}

function TechJobsContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<{ success: boolean; data: Job[]; stats: Record<string, number> }>('/store/tech/jobs'),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  async function advance(job: Job) {
    const idx = STATUS_FLOW.indexOf(job.status as (typeof STATUS_FLOW)[number]);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    if (!next || next === job.status) return;
    setBusyId(job.id);
    setActionError('');
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/status`, { status: next });
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading jobs..." />;
  if (error || !data) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>My install jobs</h1>
          <p className="text-muted">
            Update status as you travel, work on site, and complete camera / alarm installs.
          </p>
        </div>
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-label">Scheduled</span>
          <strong className="stat-value">{data.stats.scheduled}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">In progress</span>
          <strong className="stat-value">{data.stats.inProgress}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value">{data.stats.completed}</strong>
        </div>
      </div>

      <div className="card-stack">
        {data.data.map((job) => (
          <article key={job.id} className="card-panel">
            <div className="page-header" style={{ marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{job.title}</h2>
                <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
                  {job.jobType} · {job.clientName}
                </p>
              </div>
              <span className="badge">{job.status.replace(/_/g, ' ')}</span>
            </div>
            <p>{job.description}</p>
            <p>
              <strong>Address:</strong> {job.address}
            </p>
            <p>
              <strong>When:</strong> {new Date(job.scheduledAt).toLocaleString()}
            </p>
            {job.clientPhone && (
              <p>
                <strong>Phone:</strong> {job.clientPhone}
              </p>
            )}
            {job.equipmentNotes && (
              <p>
                <strong>Equipment:</strong> {job.equipmentNotes}
              </p>
            )}
            {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === job.id}
                onClick={() => advance(job)}
              >
                {busyId === job.id
                  ? 'Updating...'
                  : job.status === 'SCHEDULED'
                    ? 'Mark en route'
                    : job.status === 'EN_ROUTE'
                      ? 'Start work'
                      : 'Mark completed'}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type TechProfile = {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  stats: { scheduled: number; active: number; completed: number };
  jobs: {
    id: string;
    title: string;
    status: string;
    scheduledAt: string;
    address: string;
    jobType: string;
  }[];
};

const STATUS_FLOW = ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'] as const;

function statusRank(status: string) {
  if (status === 'IN_PROGRESS') return 0;
  if (status === 'EN_ROUTE') return 1;
  if (status === 'SCHEDULED') return 2;
  return 9;
}

export default function TechDashboardPage() {
  return (
    <TechLayout title="Technician Dashboard">
      <TechDashboardContent />
    </TechLayout>
  );
}

function TechDashboardContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TechProfile>>('/store/tech/me'),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const profile = data?.data;

  const queue = useMemo(() => {
    if (!profile) return [];
    return profile.jobs
      .filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
      .slice()
      .sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }, [profile]);

  const focusJob = queue[0] ?? null;
  const restQueue = queue.slice(1);

  async function advance(job: NonNullable<typeof focusJob>) {
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
  if (error || !profile) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  const nextLabel =
    focusJob &&
    (() => {
      const idx = STATUS_FLOW.indexOf(focusJob.status as (typeof STATUS_FLOW)[number]);
      const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
      if (!next || next === focusJob.status) return null;
      return next.replace(/_/g, ' ');
    })();

  return (
    <div className="page-content dash-ops dash-ops--tech">
      {/* Priority 1: active / next job */}
      <section
        className={`tech-focus-job ${focusJob ? `tech-focus-job--${focusJob.status.toLowerCase()}` : 'tech-focus-job--clear'}`}
      >
        <div className="tech-focus-job__head">
          <p className="dash-ops__eyebrow">
            <span className="ops-live-chip__dot" aria-hidden />
            Your work queue
          </p>
          <h1>
            {profile.firstName},{' '}
            {focusJob
              ? focusJob.status === 'IN_PROGRESS'
                ? 'finish this job'
                : focusJob.status === 'EN_ROUTE'
                  ? 'you are en route'
                  : 'next up'
              : 'you are clear'}
          </h1>
        </div>

        {actionError && <ErrorAlert message={actionError} />}

        {focusJob ? (
          <div className="tech-focus-job__card">
            <div className="tech-focus-job__meta">
              <span className="badge">{focusJob.status.replace(/_/g, ' ')}</span>
              <span className="text-muted">{focusJob.jobType}</span>
            </div>
            <h2>{focusJob.title}</h2>
            <p className="tech-focus-job__address">{focusJob.address}</p>
            <p className="text-muted">
              Scheduled {new Date(focusJob.scheduledAt).toLocaleString()}
            </p>
            <div className="tech-focus-job__actions">
              {nextLabel && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === focusJob.id}
                  onClick={() => void advance(focusJob)}
                >
                  {busyId === focusJob.id ? 'Updating…' : `Mark ${nextLabel}`}
                </button>
              )}
              <Link href="/tech/jobs" className="btn-secondary">
                Open job board
              </Link>
              <a
                className="btn-secondary"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(focusJob.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Navigate
              </a>
            </div>
          </div>
        ) : (
          <div className="dash-clear">
            <strong>No open installs</strong>
            <p className="text-muted">When jobs are assigned, they appear here first.</p>
            <Link href="/tech/jobs" className="btn-secondary btn-inline">
              Check job board
            </Link>
          </div>
        )}
      </section>

      {/* Priority 2: rest of queue */}
      {restQueue.length > 0 && (
        <section className="card-panel">
          <div className="card-header-row">
            <h2>Up next</h2>
            <Link href="/tech/jobs" className="link-sm">
              Full queue
            </Link>
          </div>
          <ul className="tech-queue-list">
            {restQueue.slice(0, 5).map((job) => (
              <li key={job.id} className="tech-queue-item">
                <div>
                  <strong>{job.title}</strong>
                  <div className="text-muted">{job.address}</div>
                </div>
                <div className="tech-queue-item__side">
                  <span className="badge">{job.status.replace(/_/g, ' ')}</span>
                  <span className="text-muted">
                    {new Date(job.scheduledAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Active now</span>
          <strong className="stat-value">{profile.stats.active}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Scheduled</span>
          <strong className="stat-value">{profile.stats.scheduled}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value">{profile.stats.completed}</strong>
        </div>
      </div>

      <div className="overview-shortcuts">
        <Link href="/tech/jobs" className="btn-primary">
          Job board
        </Link>
        <Link href="/tech/inventory" className="btn-secondary">
          Parts / inventory
        </Link>
        <Link href="/tech/cameras" className="btn-secondary">
          Commission cameras
        </Link>
        <Link href="/tech/chat" className="btn-secondary">
          Team chat
        </Link>
        <Link href="/tech/team" className="btn-secondary">
          My team
        </Link>
      </div>
    </div>
  );
}

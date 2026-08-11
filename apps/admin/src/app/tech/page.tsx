'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import {
  OpsCompactStats,
  OpsNeedsYou,
  OpsQuickWork,
  OpsSection,
} from '@/components/ops/OpsQuickWork';
import { OpsSwipeRow } from '@/components/ops/OpsSwipeRow';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';

type TechJob = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  address: string;
  jobType: string;
};

type TechProfile = {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  stats: { scheduled: number; active: number; completed: number };
  jobs: TechJob[];
};

const STATUS_FLOW = ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'] as const;

function statusRank(status: string) {
  if (status === 'IN_PROGRESS') return 0;
  if (status === 'EN_ROUTE') return 1;
  if (status === 'SCHEDULED') return 2;
  return 9;
}

function nextStatus(status: string) {
  const idx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  if (idx < 0) return null;
  const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
  if (!next || next === status) return null;
  return next;
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
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState<TechJob[] | null>(null);
  const undo = useUndoToast();

  const profile = data?.data;

  useEffect(() => {
    if (profile?.jobs) setJobs(profile.jobs);
  }, [profile]);

  const liveJobs = jobs ?? profile?.jobs ?? [];

  const queue = useMemo(() => {
    return liveJobs
      .filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
      .slice()
      .sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }, [liveJobs]);

  const focusJob = queue[0] ?? null;
  const restQueue = queue.slice(1);
  const activeCount = queue.filter((j) =>
    ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status),
  ).length;
  const dueSoon = queue.filter((j) => {
    const t = new Date(j.scheduledAt).getTime() - Date.now();
    return t < 4 * 3600000 && t > -3600000;
  }).length;

  async function advance(job: TechJob) {
    const next = nextStatus(job.status);
    if (!next) return;
    const prev = job.status;
    setBusyId(job.id);
    setActionError('');
    setJobs((list) =>
      (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, status: next } : j)),
    );
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/status`, { status: next });
      undo.show(`Marked ${next.replace(/_/g, ' ').toLowerCase()}`, async () => {
        await techApi.patch(`/store/tech/jobs/${job.id}/status`, { status: prev });
        void reload();
      });
      void reload({ silent: true });
    } catch (e) {
      setJobs((list) =>
        (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, status: prev } : j)),
      );
      setActionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading jobs..." />;
  if (error || !profile) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  const nextLabel = focusJob ? nextStatus(focusJob.status)?.replace(/_/g, ' ') : null;
  const filteredRest =
    filter === 'urgent'
      ? restQueue.filter((j) => ['EN_ROUTE', 'IN_PROGRESS'].includes(j.status))
      : restQueue;

  return (
    <div className="page-content dash-ops dash-ops--tech">
      <OpsMyShiftHeader
        title="My shift"
        subtitle={
          focusJob
            ? `${activeCount} active · ${queue.length} open`
            : 'No open installs'
        }
        chips={[
          { id: 'all', label: 'Everything', count: queue.length },
          { id: 'urgent', label: 'Due soon', count: dueSoon, tone: 'urgent' },
          { id: 'queue', label: 'Queue', count: restQueue.length, tone: 'warn' },
          {
            id: 'done',
            label: 'Done',
            count: profile.stats.completed,
            tone: 'ok',
          },
        ]}
        activeChip={filter}
        onChip={setFilter}
      />

      {focusJob && nextLabel && (
        <OpsQuickWork
          hint={focusJob.title}
          actions={[
            {
              id: 'advance',
              label: `Mark ${nextLabel}`,
              primary: true,
              loading: busyId === focusJob.id,
              disabled: !!busyId,
              onClick: () => void advance(focusJob),
            },
            {
              id: 'nav',
              label: 'Navigate',
              href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(focusJob.address)}`,
            },
            { id: 'board', label: 'Job board', href: '/tech/jobs' },
            { id: 'chat', label: 'Reply', href: '/tech/chat' },
          ]}
        />
      )}

      <section
        className={`tech-focus-job ${focusJob ? `tech-focus-job--${focusJob.status.toLowerCase()}` : 'tech-focus-job--clear'}`}
      >
        <div className="tech-focus-job__head">
          <p className="dash-ops__eyebrow">
            <span className="ops-live-chip__dot" aria-hidden />
            Focus job
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

      {filteredRest.length > 0 && (
        <OpsSection
          title="Up next"
          action={
            <Link href="/tech/jobs" className="link-sm">
              Full queue
            </Link>
          }
        >
          <div className="ops-queue-list">
            {filteredRest.slice(0, 5).map((job) => {
              const next = nextStatus(job.status);
              return (
                <OpsSwipeRow
                  key={job.id}
                  label={next ? next.replace(/_/g, ' ') : 'Open'}
                  disabled={!!busyId || !next}
                  onSwipePrimary={() => void advance(job)}
                >
                  <div className="ops-queue-card">
                    <div className="card-header-row">
                      <strong>{job.title}</strong>
                      <span className="badge">{job.status.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-muted">{job.address}</span>
                    <div className="ops-queue-card__actions">
                      {next && (
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          disabled={busyId === job.id}
                          onClick={() => void advance(job)}
                        >
                          Mark {next.replace(/_/g, ' ')}
                        </button>
                      )}
                      <a
                        className="btn-sm btn-secondary"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Navigate
                      </a>
                    </div>
                  </div>
                </OpsSwipeRow>
              );
            })}
          </div>
        </OpsSection>
      )}

      <OpsNeedsYou
        items={
          dueSoon > 0
            ? [
                {
                  id: 'due',
                  title: `${dueSoon} jobs due soon`,
                  detail: 'Advance status or navigate from Quick work',
                  href: '/tech/jobs',
                },
              ]
            : []
        }
        viewAllHref="/tech/jobs"
      />

      <OpsCompactStats
        items={[
          {
            label: 'Active',
            value: String(profile.stats.active),
            href: '/tech/jobs',
            warn: profile.stats.active > 0,
          },
          {
            label: 'Scheduled',
            value: String(profile.stats.scheduled),
            href: '/tech/jobs',
          },
          {
            label: 'Done',
            value: String(profile.stats.completed),
          },
        ]}
      />

      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}

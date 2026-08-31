'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import { OpsCompactStats, OpsSection } from '@/components/ops/OpsQuickWork';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkflowTracker } from '@/components/ui/WorkflowTracker';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  mapsUrl,
  mergeChecklist,
  nextWorkflowStatus,
  optionTone,
  stageActionLabel,
  TECH_WORKFLOW,
  whatsappUrl,
  workflowIndex,
  workflowLabel,
  workflowStageKey,
} from '@/lib/tech-workflow';

type TechJob = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  address: string;
  jobType: string;
  serial?: string;
  tests?: { id: string; label: string; done: boolean }[];
  overrideReason?: string;
  clientName?: string;
  clientPhone?: string;
};

type TechProfile = {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  stats: { scheduled: number; active: number; completed: number };
  jobs: TechJob[];
};

function isOpenJob(status: string) {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

function isDueSoon(job: TechJob) {
  const t = new Date(job.scheduledAt).getTime() - Date.now();
  return t < 4 * 3600000 && t > -3600000;
}

export default function TechDashboardPage() {
  return (
    <TechLayout title="Today’s jobs">
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
  const [overrideReason, setOverrideReason] = useState('');
  const [serialDraft, setSerialDraft] = useState('');
  const [serialNote, setSerialNote] = useState('');
  const [checkOpen, setCheckOpen] = useState(false);
  const undo = useUndoToast();

  const profile = data?.data;

  useEffect(() => {
    if (profile?.jobs && jobs === null) setJobs(profile.jobs);
  }, [profile, jobs]);

  const liveJobs = jobs ?? profile?.jobs ?? [];
  const openJobs = useMemo(
    () =>
      liveJobs
        .filter((j) => isOpenJob(j.status))
        .slice()
        .sort((a, b) => {
          const r = workflowIndex(a.status) - workflowIndex(b.status);
          if (r !== 0) return r;
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }),
    [liveJobs],
  );
  const completedJobs = liveJobs.filter((j) => j.status === 'COMPLETED');
  const dueSoonJobs = openJobs.filter(isDueSoon);

  const visibleOpen =
    filter === 'urgent' ? dueSoonJobs : filter === 'queue' ? openJobs.slice(1) : openJobs;
  const showCompleted = filter === 'done';
  const focusJob = showCompleted || filter === 'queue' ? null : visibleOpen[0] ?? null;
  const restJobs = showCompleted
    ? completedJobs
    : filter === 'queue'
      ? openJobs
      : visibleOpen.slice(focusJob ? 1 : 0);

  const focusChecks = focusJob ? mergeChecklist(focusJob.tests) : [];
  const focusDone = focusChecks.filter((t) => t.done).length;
  const checkTone = optionTone(focusDone, focusChecks.length);
  const stageKey = focusJob ? workflowStageKey(focusJob.status) : '';
  const stageBtn = stageKey ? `tech-stage tech-stage--${stageKey}` : '';
  const stageLabel = focusJob ? stageActionLabel(focusJob.status) : null;
  const completing = Boolean(focusJob && nextWorkflowStatus(focusJob.status) === 'COMPLETED');
  const phone = focusJob?.clientPhone?.trim() ?? '';

  useEffect(() => {
    setSerialDraft(focusJob?.serial ?? '');
    setSerialNote('');
    setOverrideReason(focusJob?.overrideReason ?? '');
  }, [focusJob?.id, focusJob?.serial, focusJob?.overrideReason]);

  async function advance(job: TechJob) {
    const next = nextWorkflowStatus(job.status);
    if (!next) return;
    const tests = mergeChecklist(job.tests);
    if (next === 'COMPLETED' && !tests.every((t) => t.done) && !overrideReason.trim()) {
      setCheckOpen(true);
      setActionError('Finish the site checklist, or enter an override reason.');
      return;
    }
    const prev = job.status;
    setBusyId(job.id);
    setActionError('');
    setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, status: next } : j)));
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/status`, {
        status: next,
        overrideReason: overrideReason || undefined,
      });
      undo.show(
        `Marked ${workflowLabel(next)}`,
        async () => {
          await techApi.patch(`/store/tech/jobs/${job.id}/status`, { status: prev });
          setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, status: prev } : j)));
        },
        next === 'COMPLETED'
          ? { kind: 'success', detail: 'Job closed · tap Undo to reopen' }
          : { kind: 'info', detail: 'Workflow updated · tap Undo to reverse' },
      );
    } catch (e) {
      setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, status: prev } : j)));
      setActionError(e instanceof Error ? e.message : 'Could not update this job. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleTest(job: TechJob, testId: string) {
    const prev = mergeChecklist(job.tests);
    const tests = prev.map((t) => (t.id === testId ? { ...t, done: !t.done } : t));
    setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, tests } : j)));
    setActionError('');
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/tests`, { tests });
    } catch {
      setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, tests: prev } : j)));
      setActionError('Could not save that checklist item. Try again.');
    }
  }

  async function saveSerial(job: TechJob) {
    const serial = serialDraft.trim() || job.serial || '';
    if (!serial) {
      setSerialNote('Enter a serial first.');
      return;
    }
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/serial`, { serial });
      setJobs((list) => (list ?? liveJobs).map((j) => (j.id === job.id ? { ...j, serial } : j)));
      setSerialDraft(serial);
      setSerialNote('Serial saved.');
    } catch {
      setSerialNote('Could not save serial. Try again.');
    }
  }

  if (loading) return <LoadingSpinner label="Loading jobs..." />;
  if (error || !profile) {
    return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reload} />;
  }

  return (
    <div className="page-content dash-ops dash-ops--tech">
      <OpsMyShiftHeader
        title="Today’s jobs"
        subtitle={
          focusJob
            ? `${profile.stats.active} active · ${openJobs.length} open`
            : showCompleted
              ? `${completedJobs.length} completed`
              : openJobs.length
                ? `${openJobs.length} open installs`
                : 'No open installs'
        }
        chips={[
          { id: 'all', label: 'Today', count: openJobs.length },
          { id: 'urgent', label: 'Due soon', count: dueSoonJobs.length, tone: 'urgent' },
          { id: 'queue', label: 'Up next', count: Math.max(0, openJobs.length - 1), tone: 'warn' },
          { id: 'done', label: 'Done', count: completedJobs.length || profile.stats.completed, tone: 'ok' },
        ]}
        activeChip={filter}
        onChip={setFilter}
      />

      {actionError ? <ErrorAlert error={actionError} /> : null}

      {focusJob ? (
        <section className={`tech-focus-job tech-focus-job--${focusJob.status.toLowerCase()}`}>
          <div className="tech-focus-job__head">
            <p className="dash-ops__eyebrow">
              <span className="ops-live-chip__dot" aria-hidden />
              Current job
            </p>
            <h2>
              {profile.firstName}, {workflowLabel(focusJob.status).toLowerCase() === 'install' ? 'keep going' : 'this one first'}
            </h2>
          </div>

          <div className="tech-focus-job__card">
            <div className="tech-focus-job__meta">
              <StatusBadge status={focusJob.status} label={workflowLabel(focusJob.status)} pulse />
              <span className="text-muted">{focusJob.jobType}</span>
              {focusJob.clientName ? <span className="text-muted">{focusJob.clientName}</span> : null}
            </div>
            <h3>{focusJob.title}</h3>
            <p className="tech-focus-job__address">{focusJob.address}</p>
            <p className="text-muted">
              {new Date(focusJob.scheduledAt).toLocaleString('en-ZA', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            <WorkflowTracker steps={[...TECH_WORKFLOW]} currentIndex={workflowIndex(focusJob.status)} />

            <div className="tech-focus-job__actions">
              {stageLabel ? (
                <button
                  type="button"
                  className={`btn-primary ds-btn-block ${stageBtn}`}
                  disabled={busyId === focusJob.id}
                  onClick={() => void advance(focusJob)}
                >
                  {busyId === focusJob.id ? 'Updating…' : stageLabel}
                </button>
              ) : null}
              <div className="tech-job-tools">
                <a className="btn-secondary" href={mapsUrl(focusJob.address)} target="_blank" rel="noreferrer">
                  Navigate
                </a>
                {phone ? (
                  <>
                    <a className="btn-secondary" href={`tel:${phone}`}>
                      Call
                    </a>
                    <a className="btn-secondary" href={whatsappUrl(phone)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </>
                ) : null}
                <Link className="btn-secondary" href="/tech/chat">
                  Team chat
                </Link>
              </div>
            </div>

            <label className="ds-field">
              <span>Equipment serial</span>
              <div className="tech-serial-row">
                <input
                  className="input"
                  value={serialDraft}
                  onChange={(e) => {
                    setSerialDraft(e.target.value);
                    setSerialNote('');
                  }}
                  placeholder="Scan or type serial"
                />
                <button type="button" className="btn-secondary" onClick={() => void saveSerial(focusJob)}>
                  Save
                </button>
              </div>
              {serialNote ? (
                <small className={serialNote.includes('saved') ? 'tech-note--ok' : 'tech-note--warn'}>{serialNote}</small>
              ) : null}
            </label>

            <button
              type="button"
              className={`tech-check-trigger tech-opt tech-opt--${checkTone}`}
              onClick={() => setCheckOpen(true)}
            >
              <span className="tech-check-trigger__copy">
                <strong>Site checklist</strong>
                <span>
                  {focusDone} of {focusChecks.length} done
                </span>
              </span>
              <span className="tech-check-trigger__open">Open</span>
            </button>
            <ProgressBar
              value={focusDone}
              max={focusChecks.length || 1}
              tone={checkTone === 'ok' ? 'success' : checkTone === 'hot' ? 'warning' : 'accent'}
              label=""
            />

            {completing && checkTone !== 'ok' ? (
              <label className="ds-field">
                <span>Override reason</span>
                <input
                  className="input"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Required if the checklist is not finished"
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : showCompleted && completedJobs.length === 0 ? (
        <EmptyState title="Nothing completed yet" kicker="Installs" body="Finished jobs will land here." />
      ) : filter === 'urgent' && dueSoonJobs.length === 0 ? (
        <EmptyState title="Nothing due soon" kicker="Installs" body="No jobs in the next four hours." />
      ) : !showCompleted && openJobs.length === 0 ? (
        <EmptyState
          kicker="Installs"
          title="No open installs"
          body="When jobs are assigned, they appear here first."
          action={
            <Link href="/tech/jobs" className="btn-secondary">
              Check job board
            </Link>
          }
        />
      ) : null}

      {checkOpen && focusJob ? (
        <OpsDialog
          title="Site checklist"
          subtitle={`${focusDone} of ${focusChecks.length} complete`}
          onClose={() => setCheckOpen(false)}
        >
          <ul className="ds-check">
            {focusChecks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`ds-check__row ${t.done ? 'ds-check__row--done' : 'ds-check__row--todo'}`}
                  data-check={t.id}
                  onClick={() => void toggleTest(focusJob, t.id)}
                >
                  <span className="ds-check__mark" aria-hidden>
                    {t.done ? '✓' : '○'}
                  </span>
                  <span>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {stageLabel ? (
            <button
              type="button"
              className={`btn-primary ds-btn-block ${stageBtn}`}
              disabled={busyId === focusJob.id}
              onClick={() => void advance(focusJob)}
            >
              {busyId === focusJob.id ? 'Updating…' : stageLabel}
            </button>
          ) : null}
        </OpsDialog>
      ) : null}

      {restJobs.length > 0 && (
        <OpsSection
          title={showCompleted ? 'Completed' : 'Up next'}
          action={
            <Link href="/tech/jobs" className="link-sm">
              Full board
            </Link>
          }
        >
          <div className="ops-queue-list">
            {restJobs.slice(0, 6).map((job) => {
              const next = nextWorkflowStatus(job.status);
              const label = stageActionLabel(job.status);
              return (
                <article key={job.id} className="ops-queue-card">
                  <div className="card-header-row">
                    <strong>{job.title}</strong>
                    <StatusBadge status={job.status} label={workflowLabel(job.status)} />
                  </div>
                  <span className="text-muted">{job.address}</span>
                  <div className="ops-queue-card__actions">
                    {next && label ? (
                      <button
                        type="button"
                        className="btn-sm btn-primary"
                        disabled={busyId === job.id}
                        onClick={() => void advance(job)}
                      >
                        {busyId === job.id ? '…' : label}
                      </button>
                    ) : null}
                    <a className="btn-sm btn-secondary" href={mapsUrl(job.address)} target="_blank" rel="noreferrer">
                      Navigate
                    </a>
                    {job.clientPhone ? (
                      <a className="btn-sm btn-secondary" href={`tel:${job.clientPhone}`}>
                        Call
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </OpsSection>
      )}

      <OpsCompactStats
        items={[
          { label: 'Active', value: String(profile.stats.active), href: '/tech/jobs', warn: profile.stats.active > 0 },
          { label: 'Scheduled', value: String(profile.stats.scheduled), href: '/tech/jobs' },
          { label: 'Done', value: String(completedJobs.length || profile.stats.completed) },
        ]}
      />

      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}

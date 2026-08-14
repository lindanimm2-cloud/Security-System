'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi } from '@/lib/api-client';
import { useState } from 'react';
import {
  DEFAULT_TECH_TESTS,
  nextWorkflowStatus,
  TECH_WORKFLOW,
  workflowIndex,
  workflowLabel,
} from '@/lib/tech-workflow';

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
  serial?: string;
  tests?: { id: string; label: string; done: boolean }[];
};

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
  const [overrideReason, setOverrideReason] = useState('');
  const [serialByJob, setSerialByJob] = useState<Record<string, string>>({});

  async function advance(job: Job) {
    const next = nextWorkflowStatus(job.status);
    if (!next) return;
    if (next === 'COMPLETED') {
      const tests = job.tests ?? DEFAULT_TECH_TESTS.map((t) => ({ ...t, done: false }));
      if (!tests.every((t) => t.done) && !overrideReason.trim()) {
        setActionError('Complete tests or enter an override reason.');
        return;
      }
    }
    setBusyId(job.id);
    setActionError('');
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/status`, {
        status: next,
        overrideReason: overrideReason || undefined,
      });
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
            Accept → En route → Arrived → Site check → Install → Testing → Client approval → Complete
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
              <span className="badge">{workflowLabel(job.status)}</span>
            </div>
            <div className="workflow-steps">
              {TECH_WORKFLOW.map((step, idx) => (
                <span
                  key={step.id}
                  className={`workflow-step ${
                    idx < workflowIndex(job.status)
                      ? 'workflow-step--done'
                      : idx === workflowIndex(job.status)
                        ? 'workflow-step--current'
                        : ''
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>
            <p>{job.description}</p>
            <p>
              <strong>Address:</strong> {job.address}
            </p>
            {job.equipmentNotes && (
              <p>
                <strong>Equipment:</strong> {job.equipmentNotes}
              </p>
            )}
            <input
              className="input"
              value={serialByJob[job.id] ?? job.serial ?? ''}
              onChange={(e) => setSerialByJob((s) => ({ ...s, [job.id]: e.target.value }))}
              placeholder="Serial / scan"
            />
            <button
              type="button"
              className="btn-sm"
              style={{ margin: '0.35rem 0 0.65rem' }}
              onClick={() =>
                void techApi.patch(`/store/tech/jobs/${job.id}/serial`, {
                  serial: serialByJob[job.id] ?? job.serial,
                })
              }
            >
              Save serial
            </button>
            {nextWorkflowStatus(job.status) === 'COMPLETED' && (
              <input
                className="input"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Override reason if tests incomplete"
              />
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
                  : `Mark ${workflowLabel(nextWorkflowStatus(job.status) ?? job.status)}`}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

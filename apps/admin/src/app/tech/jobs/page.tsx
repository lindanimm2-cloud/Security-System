'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { InstallJobCard, InstallJobsEmpty, type InstallJob } from '@/components/tech/InstallJobCard';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/hooks/useApi';
import { techApi } from '@/lib/api-client';
import { mergeChecklist, nextWorkflowStatus, type ChecklistItem } from '@/lib/tech-workflow';
import { useMemo, useState } from 'react';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TechJobsPage() {
  return (
    <TechLayout title="Install Jobs">
      <TechJobsContent />
    </TechLayout>
  );
}

function TechJobsContent() {
  const { data, loading, error, reload } = useApi(
    () =>
      techApi.get<{ success: boolean; data: InstallJob[]; stats: Record<string, number> }>(
        '/store/tech/jobs',
      ),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [jobs, setJobs] = useState<InstallJob[] | null>(null);
  const [search, setSearch] = useState('');

  const liveJobs = jobs ?? data?.data ?? [];

  const ordered = useMemo(() => {
    const rank = (status: string) => {
      if (status === 'COMPLETED' || status === 'CANCELLED') return 99;
      return 0;
    };
    return [...liveJobs]
      .filter((job) =>
        matchesSearch(
          search,
          job.title,
          job.status,
          job.clientName,
          job.clientPhone,
          job.address,
          job.jobType,
          job.technicianName,
          job.serial,
        ),
      )
      .sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }, [liveJobs, search]);

  async function advance(job: InstallJob) {
    const next = nextWorkflowStatus(job.status);
    if (!next) return;
    if (next === 'COMPLETED') {
      const tests = mergeChecklist(job.tests);
      if (!tests.every((t) => t.done) && !overrideReason.trim()) {
        setActionError('Complete the installation checklist, or enter an override reason.');
        return;
      }
    }
    const prev = job.status;
    setBusyId(job.id);
    setActionError('');
    setJobs((list) => (list ?? liveJobs).map((row) => (row.id === job.id ? { ...row, status: next } : row)));
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/status`, {
        status: next,
        overrideReason: overrideReason || undefined,
      });
      void reload({ silent: true });
    } catch (e) {
      setJobs((list) => (list ?? liveJobs).map((row) => (row.id === job.id ? { ...row, status: prev } : row)));
      setActionError(e instanceof Error ? e.message : 'Unable to update this job. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCheck(job: InstallJob, item: ChecklistItem) {
    const prev = mergeChecklist(job.tests);
    const tests = prev.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row));
    setJobs((list) => (list ?? liveJobs).map((row) => (row.id === job.id ? { ...row, tests } : row)));
    setActionError('');
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/tests`, { tests });
    } catch {
      setJobs((list) => (list ?? liveJobs).map((row) => (row.id === job.id ? { ...row, tests: prev } : row)));
      setActionError('Could not save that checklist item. Try again.');
    }
  }

  async function saveSerial(job: InstallJob, serial: string) {
    try {
      await techApi.patch(`/store/tech/jobs/${job.id}/serial`, { serial });
      setJobs((list) => (list ?? liveJobs).map((row) => (row.id === job.id ? { ...row, serial } : row)));
      setActionError('');
    } catch {
      setActionError('Could not save that serial. Try again.');
    }
  }

  if (loading && !data) return <Skeleton cards={3} lines={2} label="Loading installation jobs" />;
  if (error || !data) {
    return (
      <ErrorAlert
        message={error ?? 'Unable to load installation jobs. Check your connection and try again.'}
        onRetry={reload}
      />
    );
  }

  const stats = data.stats;
  const scheduled = stats.scheduled ?? 0;
  const inProgress = stats.inProgress ?? 0;
  const completed = stats.completed ?? 0;

  return (
    <div className="page-content ds-page">
      <header className="ds-page-head">
        <div>
          <p className="ds-kicker">Technician</p>
          <h1>My install jobs</h1>
          <p className="ds-page-head__meta">
            {scheduled} scheduled · {inProgress} active · {completed} completed
          </p>
        </div>
      </header>

      {actionError && <ErrorAlert message={actionError} />}

      <MetricStrip
        items={[
          { id: 'scheduled', label: 'Scheduled', value: scheduled, hint: 'Today', tone: 'warning' },
          { id: 'active', label: 'In progress', value: inProgress, hint: 'Active now', tone: 'active' },
          { id: 'done', label: 'Completed', value: completed, hint: 'This week', tone: 'success' },
        ]}
      />

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search jobs, client, address…"
          resultCount={ordered.length}
          totalCount={liveJobs.length}
        />
      </div>

      <div className="ds-job-stack">
        {ordered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches" body="Try a different client, address, or status." />
          ) : (
            <InstallJobsEmpty />
          )
        ) : (
          ordered.map((job) => (
            <InstallJobCard
              key={job.id}
              job={job}
              busy={busyId === job.id}
              overrideReason={overrideReason}
              onOverrideReason={setOverrideReason}
              onAdvance={() => void advance(job)}
              onToggleCheck={(item) => void toggleCheck(job, item)}
              onSaveSerial={(serial) => void saveSerial(job, serial)}
            />
          ))
        )}
      </div>
    </div>
  );
}

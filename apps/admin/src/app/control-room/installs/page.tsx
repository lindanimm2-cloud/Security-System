'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { UiSelect } from '@/components/ui/UiSelect';
import { workflowLabel } from '@/lib/tech-workflow';
import { matchesSearch } from '@/lib/list-search';
import { TechProfileCard } from '@/components/ui/TechProfileCard';

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
  technicianId: string | null;
  technicianName: string;
};

type Tech = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  teams: string[];
};

const JOB_TYPES = [
  'CCTV Installation',
  'Alarm Systems',
  'Access Control',
  'Maintenance',
  'Site Survey',
];

const JOB_STATUSES = [
  'SCHEDULED',
  'EN_ROUTE',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default function InstallsPage() {
  return (
    <ControlRoomLayout title="Install Jobs">
      <InstallsContent />
    </ControlRoomLayout>
  );
}

function InstallsContent() {
  const { data, loading, error, reload } = useApi(
    () =>
      adminApi.get<{ success: boolean; data: Job[]; stats: Record<string, number> }>(
        '/store/installs',
      ),
    [],
  );
  const { data: techsRes } = useApi(
    () => adminApi.get<ApiResponse<Tech[]>>('/store/technicians'),
    [],
  );

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    jobType: 'CCTV Installation',
    status: 'SCHEDULED',
    clientName: '',
    clientPhone: '',
    address: '',
    scheduledAt: '',
    equipmentNotes: '',
    technicianId: '',
  });

  function editJob(job: Job) {
    setForm({
      id: job.id,
      title: job.title,
      description: job.description ?? '',
      jobType: job.jobType,
      status: job.status,
      clientName: job.clientName,
      clientPhone: job.clientPhone ?? '',
      address: job.address,
      scheduledAt: job.scheduledAt.slice(0, 16),
      equipmentNotes: job.equipmentNotes ?? '',
      technicianId: job.technicianId ?? '',
    });
    setFormOpen(true);
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function closeFormDialog() {
    resetForm();
    setFormOpen(false);
    setFormError('');
  }

  function resetForm() {
    setForm({
      id: '',
      title: '',
      description: '',
      jobType: 'CCTV Installation',
      status: 'SCHEDULED',
      clientName: '',
      clientPhone: '',
      address: '',
      scheduledAt: '',
      equipmentNotes: '',
      technicianId: '',
    });
  }

  async function saveJob(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await adminApi.post('/store/installs', {
        ...(form.id ? { id: form.id } : {}),
        title: form.title,
        description: form.description || null,
        jobType: form.jobType,
        status: form.status,
        clientName: form.clientName,
        clientPhone: form.clientPhone || null,
        address: form.address,
        scheduledAt: form.scheduledAt,
        equipmentNotes: form.equipmentNotes || null,
        technicianId: form.technicianId || null,
      });
      closeFormDialog();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const jobs = data?.data ?? [];
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) =>
        matchesSearch(
          search,
          job.title,
          job.clientName,
          job.clientPhone,
          job.address,
          job.jobType,
          job.technicianName,
          job.status,
        ),
      ),
    [jobs, search],
  );

  if (loading) return <LoadingSpinner label="Loading installs..." />;
  if (error || !data) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  const techs = techsRes?.data ?? [];
  const canManageInstalls = getSession('admin')?.user.role !== 'SALES';

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            Schedule CCTV, alarm, and access-control installs for the 3-tech Install Tech Unit.
          </p>
        </div>
      </div>

      <MetricStrip
        items={[
          { id: 'scheduled', label: 'Scheduled', value: data.stats.scheduled, hint: 'Queued', tone: 'warning' },
          { id: 'active', label: 'In progress', value: data.stats.inProgress, hint: 'Active now', tone: 'active' },
          { id: 'done', label: 'Completed', value: data.stats.completed, hint: 'This week', tone: 'success' },
          { id: 'techs', label: 'Technicians', value: techs.length, hint: 'Install unit', tone: 'neutral' },
        ]}
      />

      <section className="card-panel page-section">
        <div className="card-header-row card-header-row--panel">
          <div>
            <h2>Install tech unit</h2>
            <p className="text-muted">{techs.length} technicians on the roster</p>
          </div>
        </div>
        {techs.length === 0 ? (
          <EmptyState title="No technicians" body="Add technicians in Teams & Users to assign install jobs." />
        ) : (
          <div className="tech-profile-grid">
            {techs.map((t) => (
              <TechProfileCard
                key={t.id}
                firstName={t.firstName}
                lastName={t.lastName}
                jobTitle={t.jobTitle}
                email={t.email}
                phone={t.phone}
                teams={t.teams}
                badge={
                  t.teams.length ? (
                    <span className="status-pill status-pill--ok">Assigned</span>
                  ) : (
                    <span className="status-pill status-pill--pending">Available</span>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="card-panel page-section">
          <div className="card-header-row card-header-row--panel">
            <h2>Job board ({filteredJobs.length})</h2>
            {canManageInstalls && (
              <button type="button" className="btn-primary btn-sm" onClick={openCreateForm}>
                + Schedule install
              </button>
            )}
          </div>
          <div className="list-search-bar">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Search jobs, client, tech, status…"
              resultCount={filteredJobs.length}
              totalCount={jobs.length}
            />
          </div>
          {jobs.length === 0 ? (
            <EmptyState title="No install jobs" body="Schedule a job to assign it to the install tech unit." />
          ) : filteredJobs.length === 0 ? (
            <EmptyState title="No matches" body="Try another title, client, address, or technician." />
          ) : (
          <div className="table-wrap">
            <table className="data-table data-table--cards">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Tech</th>
                  <th>When</th>
                  <th>Status</th>
                  {canManageInstalls && <th />}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td data-label="Job">
                      <div>{job.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {job.jobType} · {job.clientName}
                      </div>
                    </td>
                    <td data-label="Tech">{job.technicianName}</td>
                    <td data-label="When">{new Date(job.scheduledAt).toLocaleString()}</td>
                    <td data-label="Status">
                      <StatusBadge status={job.status} label={workflowLabel(job.status)} />
                    </td>
                    {canManageInstalls && (
                    <td data-label="Actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => editJob(job)}
                      >
                        Edit
                      </button>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
      </section>

      {formOpen && canManageInstalls && (
        <OpsDialog
          title={form.id ? 'Edit job' : 'Schedule install'}
          subtitle="Assign CCTV, alarm, or access-control work to the install tech unit."
          onClose={closeFormDialog}
          wide
        >
          {formError && <ErrorAlert message={formError} />}
          <form className="stack-form" onSubmit={saveJob}>
            <label>
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Job type
              <UiSelect
                compact={false}
                ariaLabel="Job type"
                value={form.jobType}
                onChange={(jobType) => setForm({ ...form, jobType })}
                options={JOB_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </label>
            <label>
              Technician
              <UiSelect
                compact={false}
                ariaLabel="Technician"
                value={form.technicianId}
                onChange={(technicianId) => setForm({ ...form, technicianId })}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...techs.map((t) => ({
                    value: t.id,
                    label: `${t.firstName} ${t.lastName}`,
                    meta: t.jobTitle ?? undefined,
                  })),
                ]}
              />
            </label>
            <label>
              Client name
              <input
                required
                value={form.clientName}
                onChange={(e) =>
                  setForm({ ...form, clientName: e.target.value })
                }
              />
            </label>
            <label>
              Client phone
              <input
                value={form.clientPhone}
                onChange={(e) =>
                  setForm({ ...form, clientPhone: e.target.value })
                }
              />
            </label>
            <label>
              Address
              <textarea
                required
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label>
              Scheduled
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
            </label>
            <label>
              Status
              <UiSelect
                compact={false}
                ariaLabel="Install status"
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
                options={JOB_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </label>
            <label>
              Description
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              Equipment notes
              <textarea
                rows={2}
                value={form.equipmentNotes}
                onChange={(e) =>
                  setForm({ ...form, equipmentNotes: e.target.value })
                }
              />
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={closeFormDialog}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Update job' : 'Create job'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}
    </div>
  );
}

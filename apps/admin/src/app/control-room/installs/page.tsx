'use client';

import { FormEvent, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { UiSelect } from '@/components/ui/UiSelect';

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
      resetForm();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

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

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Scheduled</span>
          <strong className="stat-value">{data.stats.scheduled}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <strong className="stat-value">{data.stats.inProgress}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value">{data.stats.completed}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Technicians</span>
          <strong className="stat-value">{techs.length}</strong>
        </div>
      </div>

      <div className="card-panel" style={{ marginTop: '1.25rem' }}>
        <h2>Technician profiles</h2>
        <div className="tech-profile-grid">
          {techs.map((t) => (
            <article key={t.id} className="tech-profile-card">
              <div className="avatar avatar--admin">
                {t.firstName[0]}
                {t.lastName[0]}
              </div>
              <div>
                <strong>
                  {t.firstName} {t.lastName}
                </strong>
                <div className="text-muted">{t.jobTitle}</div>
                <div style={{ fontSize: '0.85rem' }}>{t.email}</div>
                <div style={{ fontSize: '0.85rem' }}>{t.phone}</div>
                <div className="badge" style={{ marginTop: 6 }}>
                  {t.teams.join(', ') || 'Unassigned'}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className={`split-panels${canManageInstalls ? '' : ' split-panels--single'}`} style={{ marginTop: '1.25rem' }}>
        {canManageInstalls && (
        <div className="card-panel">
          <h2>{form.id ? 'Edit job' : 'Schedule install'}</h2>
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Update job' : 'Create job'}
              </button>
              {form.id && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        )}

        <div className="card-panel">
          <h2>Job board</h2>
          <div className="table-wrap">
            <table className="data-table">
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
                {data.data.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div>{job.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {job.jobType} · {job.clientName}
                      </div>
                    </td>
                    <td>{job.technicianName}</td>
                    <td>{new Date(job.scheduledAt).toLocaleString()}</td>
                    <td>
                      <span className="badge">
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {canManageInstalls && (
                    <td>
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
        </div>
      </div>
    </div>
  );
}

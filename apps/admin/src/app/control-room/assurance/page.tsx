'use client';

import { FormEvent, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';

type AssuranceProfile = {
  id: 'STANDARD' | 'ENTERPRISE' | 'HIGH_ASSURANCE';
  label: string;
  description: string;
  retentionDaysMin: number;
  siemExportRequired: boolean;
  supplierPackRequired: boolean;
};

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
};

type Overview = {
  profile: AssuranceProfile;
  profiles: AssuranceProfile[];
  metrics: {
    openVulns: number;
    auditCount: number;
    evidenceHashed: number;
    mfaUsers: number;
  };
  checklist: ChecklistItem[];
  passkeys: { status: string; message: string };
};

type Vuln = {
  id: string;
  title: string;
  severity: string;
  status: string;
  cveId: string | null;
  discoveredAt: string;
};

const PROFILE_ROLES = ['OWNER', 'SUPER_ADMIN', 'TENANT_ADMIN', 'DEVELOPER'];

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical', tone: 'danger' as const },
  { value: 'HIGH', label: 'High', tone: 'danger' as const },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low', tone: 'ok' as const },
];

export default function AssurancePage() {
  return (
    <ControlRoomLayout title="Assurance">
      <AssuranceContent />
    </ControlRoomLayout>
  );
}

function AssuranceContent() {
  const session = getSession('admin');
  const canSetProfile = PROFILE_ROLES.includes(session?.user.role ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [vulnTitle, setVulnTitle] = useState('');
  const [vulnSeverity, setVulnSeverity] = useState('MEDIUM');

  const overview = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/assurance'),
    [],
  );
  const vulns = useApi(
    () => adminApi.get<ApiResponse<Vuln[]>>('/control-room/assurance/vulnerabilities'),
    [],
  );

  if (overview.loading) {
    return <LoadingSpinner label="Loading assurance…" fullScreen />;
  }
  if (overview.error || !overview.data?.data) {
    return <ErrorAlert error={overview.error ?? 'Could not load assurance'} onRetry={overview.reload} />;
  }

  const data = overview.data.data;

  async function setProfile(profile: AssuranceProfile['id']) {
    setBusy(true);
    setMsg('');
    try {
      await adminApi.patch('/control-room/assurance/profile', { profile });
      setMsg(`Profile set to ${profile}.`);
      overview.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function exportSiem() {
    setBusy(true);
    setMsg('');
    try {
      const res = await adminApi.get<ApiResponse<{ count: number; events: unknown[] }>>(
        '/control-room/assurance/siem-export?hours=24',
      );
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `4ds-siem-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${res.data.count} audit events.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function addVuln(e: FormEvent) {
    e.preventDefault();
    if (!vulnTitle.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      await adminApi.post('/control-room/assurance/vulnerabilities', {
        title: vulnTitle.trim(),
        severity: vulnSeverity,
      });
      setVulnTitle('');
      vulns.reload();
      overview.reload();
      setMsg('Finding added to register.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not add finding');
    } finally {
      setBusy(false);
    }
  }

  async function closeVuln(id: string) {
    try {
      await adminApi.patch(`/control-room/assurance/vulnerabilities/${id}`, { status: 'CLOSED' });
      vulns.reload();
      overview.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            Deployment posture across Phases 1–5 — controls and evidence, not certifications.
          </p>
        </div>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void exportSiem()}>
          Export SIEM JSON
        </button>
      </div>

      {msg && (
        <div className="alert alert--success" role="status">
          {msg}
        </div>
      )}

      <section className="portal-card">
        <h2>Active profile: {data.profile.label}</h2>
        <p className="text-muted">{data.profile.description}</p>
        <p className="text-muted">
          Retention floor {data.profile.retentionDaysMin} days · SIEM{' '}
          {data.profile.siemExportRequired ? 'required' : 'optional'} · Supplier pack{' '}
          {data.profile.supplierPackRequired ? 'required' : 'optional'}
        </p>
        {canSetProfile && (
          <div className="assurance-profile-row">
            {data.profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn-secondary${p.id === data.profile.id ? ' is-active' : ''}`}
                disabled={busy || p.id === data.profile.id}
                onClick={() => void setProfile(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="portal-card">
        <h2>Metrics</h2>
        <dl className="profile-summary-grid">
          <div className="profile-summary-item">
            <dt>MFA-enabled users</dt>
            <dd>{data.metrics.mfaUsers}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Audit events</dt>
            <dd>{data.metrics.auditCount}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Hashed evidence files</dt>
            <dd>{data.metrics.evidenceHashed}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Open vulnerabilities</dt>
            <dd>{data.metrics.openVulns}</dd>
          </div>
        </dl>
        <p className="text-muted" style={{ marginTop: '0.75rem' }}>
          {data.passkeys.message}
        </p>
      </section>

      <section className="portal-card">
        <h2>Phase checklist</h2>
        <ul className="assurance-checklist">
          {data.checklist.map((item) => (
            <li key={item.id}>
              <span className={item.done ? 'status-pill status-pill--ok' : 'status-pill'}>
                {item.done ? 'Done' : item.required ? 'Required' : 'Optional'}
              </span>{' '}
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="portal-card">
        <h2>Vulnerability register</h2>
        <form onSubmit={addVuln} className="assurance-vuln-form">
          <label className="assurance-field assurance-field--title">
            <span>Finding title</span>
            <input
              value={vulnTitle}
              onChange={(e) => setVulnTitle(e.target.value)}
              placeholder="e.g. Unpatched dependency on API host"
              required
            />
          </label>
          <label className="assurance-field assurance-field--severity">
            <span>Severity</span>
            <UiSelect
              compact={false}
              ariaLabel="Severity"
              value={vulnSeverity}
              onChange={setVulnSeverity}
              options={SEVERITY_OPTIONS}
            />
          </label>
          <div className="assurance-vuln-form__actions">
            <button type="submit" className="btn-primary" disabled={busy || !vulnTitle.trim()}>
              Add finding
            </button>
          </div>
        </form>
        {vulns.loading ? (
          <p className="text-muted">Loading findings…</p>
        ) : (
          <ul className="assurance-vuln-list">
            {(vulns.data?.data ?? []).map((v) => (
              <li key={v.id}>
                <span
                  className={`status-pill${
                    v.severity === 'CRITICAL' || v.severity === 'HIGH'
                      ? ' status-pill--new'
                      : v.status === 'CLOSED'
                        ? ' status-pill--ok'
                        : ''
                  }`}
                >
                  {v.severity}
                </span>
                <span className="assurance-vuln-list__title">{v.title}</span>
                <span className="text-muted">{v.status}</span>
                {v.status !== 'CLOSED' && (
                  <button type="button" className="link-sm" onClick={() => void closeVuln(v.id)}>
                    Close
                  </button>
                )}
              </li>
            ))}
            {(vulns.data?.data ?? []).length === 0 && (
              <li className="text-muted">No findings registered yet.</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

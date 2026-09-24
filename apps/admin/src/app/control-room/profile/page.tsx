'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ThemeSettings } from '@/components/ThemeSettings';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApi } from '@/hooks/useApi';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { clearSession, getSession, updateSessionUser, type AuthSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';
import { DEMO_PASSWORD } from '@/lib/demo/users';

type StaffProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle: string | null;
  phone: string | null;
  mfaEnabled?: boolean;
  tenant?: { name: string; slug: string };
};

type MfaStatus = {
  mfaEnabled: boolean;
  mfaEnrolledAt: string | null;
  required: boolean;
};

type DeveloperDesk = {
  canViewRevenue: boolean;
  revenueNote: string;
  openErrorReports: number;
};

const DEVELOPER_LINKS = [
  { label: 'Developer desk', href: '/control-room/developer', desc: 'Issue tickets & support chat' },
  { label: 'Ops Board', href: '/control-room', desc: 'Live alerts, CCTV wall, fleet strip' },
  { label: 'Live map', href: '/control-room/map', desc: 'Fleet & incident positions' },
  { label: 'Incidents', href: '/control-room/incidents', desc: 'Panic, medical, and dispatch queue' },
  { label: 'Customers', href: '/control-room/customers', desc: 'CRM, subscriptions, billing checks' },
  { label: 'Gear store', href: '/control-room/store', desc: 'Inventory & POS (revenue may be hidden)' },
  { label: 'Internal chat', href: '/control-room/chat', desc: 'Staff channels incl. dev-support' },
  { label: 'Settings', href: '/control-room/my-settings', desc: 'Personal preferences' },
];

const DEVELOPER_ACCESS = [
  { area: 'Operations', access: 'Full — map, dispatch, incidents, surveillance' },
  { area: 'Store & inventory', access: 'Full — catalog, stock, install jobs' },
  { area: 'Revenue & pipeline', access: 'Hidden until owner unlocks in Settings' },
  { area: 'Error desk', access: 'Receive & resolve staff error reports' },
  { area: 'Support chat', access: 'dev-support channel with owner & ops' },
  { area: 'User management', access: 'View teams; owner manages roles' },
];

export default function ControlRoomProfilePage() {
  return (
    <ControlRoomLayout title="My profile">
      <ProfileContent />
    </ControlRoomLayout>
  );
}

function ProfileContent() {
  const router = useRouter();
  const session = getSession('admin');
  const isDeveloper = session?.user.role === 'DEVELOPER';
  const handoff = useActionHandoff();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const profile = useApi(
    () => adminApi.get<ApiResponse<StaffProfile>>('/auth/me'),
    [],
  );

  const mfaStatus = useApi(
    () => adminApi.get<ApiResponse<MfaStatus>>('/auth/mfa/status'),
    [],
  );

  const desk = useApi(
    () =>
      isDeveloper
        ? adminApi.get<ApiResponse<DeveloperDesk>>('/developer/desk')
        : Promise.resolve({
            success: true as const,
            data: {
              canViewRevenue: false,
              revenueNote: '',
              openErrorReports: 0,
            },
          }),
    [isDeveloper],
  );

  useEffect(() => {
    if (profile.data?.data) {
      const p = profile.data.data;
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setPhone(p.phone ?? '');
      setJobTitle(p.jobTitle ?? '');
    }
  }, [profile.data]);

  if (profile.loading) {
    return <LoadingSpinner label="Loading profile…" fullScreen />;
  }

  if (profile.error || !profile.data?.data) {
    return <ErrorAlert error={profile.error ?? 'Could not load profile'} onRetry={profile.reload} />;
  }

  const p = profile.data.data;
  const fullName = `${p.firstName} ${p.lastName}`;
  const deskData = desk.data?.data;

  function cancelEdit() {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setPhone(p.phone ?? '');
    setJobTitle(p.jobTitle ?? '');
    setEditing(false);
    setSaveMsg('');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await adminApi.patch<ApiResponse<StaffProfile>>('/auth/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
      });
      updateSessionUser('admin', {
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        phone: res.data.phone,
        jobTitle: res.data.jobTitle,
      });
      setSaveMsg('Profile saved.');
      setEditing(false);
      profile.reload();
      router.refresh();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    handoff.begin('sign-out', () => {
      clearSession('admin');
      router.push(isDeveloper ? '/login?as=developer' : '/login');
    });
  }

  async function startMfaEnroll() {
    setMfaBusy(true);
    setMfaError('');
    setBackupCodes(null);
    try {
      const res = await adminApi.post<
        ApiResponse<{ secret: string; otpauthUrl: string; mfaToken: string }>
      >('/auth/mfa/setup/session-start');
      setMfaSecret(res.data.secret);
      setMfaUri(res.data.otpauthUrl);
      setMfaToken(res.data.mfaToken);
      setMfaCode('');
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Could not start MFA setup');
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmMfaEnroll(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      const res = await adminApi.post<
        ApiResponse<{
          backupCodes: string[];
          user: StaffProfile;
          tokens?: { accessToken: string };
        }>
      >('/auth/mfa/setup/confirm', { mfaToken, code: mfaCode });
      setBackupCodes(res.data.backupCodes ?? []);
      setMfaSecret(null);
      setMfaUri(null);
      setMfaToken(null);
      setMfaCode('');
      updateSessionUser('admin', { mfaEnabled: true });
      if (res.data.tokens?.accessToken) {
        const current = getSession('admin');
        if (current) {
          const next: AuthSession = {
            ...current,
            accessToken: res.data.tokens.accessToken,
            user: { ...current.user, mfaEnabled: true },
          };
          sessionStorage.setItem('4ds_admin_session', JSON.stringify(next));
        }
      }
      mfaStatus.reload();
      profile.reload();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setMfaBusy(false);
    }
  }

  return (
    <div className="page-content page-content--profile">
      {handoff.overlay}
      <div className="page-header">
        <div>
          <p className="text-muted">
            {isDeveloper
              ? 'Your developer account, toolkit, and sign-in details.'
              : 'Your control panel account and preferences.'}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Edit profile
        </button>
      </div>

      {saveMsg && (
        <div
          className={`alert ${saveMsg === 'Profile saved.' ? 'alert--success' : 'alert--error'}`}
          role="status"
        >
          {saveMsg}
        </div>
      )}

      <section className="profile-hero portal-card">
        <div className="profile-hero-main">
          <UserAvatar firstName={p.firstName} lastName={p.lastName} size="lg" />
          <div className="profile-hero-copy">
            <h2 className="profile-hero-name">{fullName}</h2>
            <p className="text-muted">{p.email}</p>
            <div className="profile-hero-badges">
              <span className="status-pill">{roleDisplayLabel(p.role)}</span>
              {p.jobTitle && <span className="status-pill status-pill--ok">{p.jobTitle}</span>}
              {isDeveloper && deskData && (
                <span
                  className={`status-pill ${deskData.canViewRevenue ? 'status-pill--ok' : ''}`}
                >
                  {deskData.canViewRevenue ? 'Revenue visible' : 'Revenue hidden'}
                </span>
              )}
              {isDeveloper && deskData && deskData.openErrorReports > 0 && (
                <span className="status-pill status-pill--new">
                  {deskData.openErrorReports} open ticket{deskData.openErrorReports === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </div>
        {p.tenant && (
          <div className="profile-hero-meta">
            <span className="text-muted">Organisation</span>
            <strong>{p.tenant.name}</strong>
          </div>
        )}
      </section>

      <section className="portal-card profile-section">
        <h2>Account details</h2>
        <dl className="profile-summary-grid">
          <div className="profile-summary-item">
            <dt>Email</dt>
            <dd>{p.email}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Phone</dt>
            <dd>{p.phone ?? '—'}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Job title</dt>
            <dd>{p.jobTitle ?? '—'}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Role</dt>
            <dd>{roleDisplayLabel(p.role)}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Tenant slug</dt>
            <dd>
              <code>{p.tenant?.slug ?? 'demo'}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="portal-card profile-section">
        <div className="card-header-row">
          <h2>Authenticator MFA</h2>
          {mfaStatus.data?.data?.mfaEnabled ? (
            <span className="status-pill status-pill--ok">Enabled</span>
          ) : mfaStatus.data?.data?.required ? (
            <span className="status-pill status-pill--new">Required</span>
          ) : (
            <span className="status-pill">Optional</span>
          )}
        </div>
        <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
          Privileged control-room roles must use an authenticator app at sign-in. Backup codes are
          shown once after enrolment.
        </p>
        {mfaError && (
          <div className="alert alert--error" role="alert">
            {mfaError}
          </div>
        )}
        {backupCodes && (
          <div className="alert alert--success" role="status">
            <p style={{ marginTop: 0 }}>Save these backup codes offline — each works once:</p>
            <ul className="login-mfa-backup-list">
              {backupCodes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-secondary" onClick={() => setBackupCodes(null)}>
              Done
            </button>
          </div>
        )}
        {!mfaSecret && !backupCodes && (
          <button
            type="button"
            className="btn-primary"
            disabled={mfaBusy}
            onClick={() => void startMfaEnroll()}
          >
            {mfaBusy
              ? 'Starting…'
              : mfaStatus.data?.data?.mfaEnabled
                ? 'Re-enrol authenticator'
                : 'Set up authenticator'}
          </button>
        )}
        {mfaSecret && (
          <form onSubmit={confirmMfaEnroll} className="profile-mfa-form">
            <p className="text-muted">
              Secret key: <code>{mfaSecret}</code>
            </p>
            {mfaUri && (
              <p className="text-muted">
                <a href={mfaUri}>Open in authenticator app</a>
              </p>
            )}
            <label className="form-field">
              <span>6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ''))}
                placeholder="123456"
                required
              />
            </label>
            <div className="profile-form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setMfaSecret(null);
                  setMfaUri(null);
                  setMfaToken(null);
                  setMfaCode('');
                  setMfaError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={mfaBusy || mfaCode.length < 6}>
                {mfaBusy ? 'Confirming…' : 'Confirm MFA'}
              </button>
            </div>
          </form>
        )}
      </section>

      {isDeveloper && (
        <>
          <section className="portal-card profile-section">
            <div className="card-header-row">
              <h2>Sign-in credentials</h2>
              <Link href="/login?as=developer" className="link-sm">
                Open login →
              </Link>
            </div>
            <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
              Use these for the control panel demo environment. Change your display name and phone
              above — email and password are managed by the owner.
            </p>
            <dl className="profile-summary-grid">
              <div className="profile-summary-item">
                <dt>Email</dt>
                <dd>
                  <code>developer@4ds.local</code>
                </dd>
              </div>
              <div className="profile-summary-item">
                <dt>Password</dt>
                <dd>
                  <code>{DEMO_PASSWORD}</code>
                </dd>
              </div>
              <div className="profile-summary-item">
                <dt>Organisation</dt>
                <dd>
                  <code>demo</code>
                </dd>
              </div>
              <div className="profile-summary-item">
                <dt>Portal</dt>
                <dd>Control Panel → Developer desk</dd>
              </div>
            </dl>
          </section>

          <section className="portal-card profile-section">
            <div className="card-header-row">
              <h2>Developer toolkit</h2>
              {deskData && (
                <Link href="/control-room/developer" className="link-sm">
                  Open desk →
                </Link>
              )}
            </div>
            {desk.error && <ErrorAlert error={desk.error} onRetry={desk.reload} />}
            {deskData && (
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                {deskData.revenueNote}
              </p>
            )}
            <ul className="status-list">
              {DEVELOPER_LINKS.map((link) => (
                <li key={link.href} className="status-list-item">
                  <div>
                    <Link href={link.href}>
                      <strong>{link.label}</strong>
                    </Link>
                    <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                      {link.desc}
                    </p>
                  </div>
                  <span className="link-sm">→</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="portal-card profile-section">
            <h2>Access summary</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Your access</th>
                  </tr>
                </thead>
                <tbody>
                  {DEVELOPER_ACCESS.map((row) => (
                    <tr key={row.area}>
                      <td>{row.area}</td>
                      <td className="text-muted">{row.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="portal-card profile-section">
        <ThemeSettings />
      </section>

      <section className="portal-card profile-section">
        <h2>Session</h2>
        <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
          Sign out of the control panel on this device.
        </p>
        <div className="entity-card-actions">
          <button type="button" className="btn-secondary" onClick={logout}>
            Sign out
          </button>
          <Link href="/control-room/settings" className="btn-ghost btn-sm">
            Organisation settings
          </Link>
        </div>
      </section>
      {editing && (
        <OpsDialog
          title="Edit profile"
          subtitle="Update your control room account details."
          onClose={cancelEdit}
        >
          <form onSubmit={(e) => void handleSave(e)} className="form-grid">
            <label className="form-field">
              <span>First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Last name</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 …"
              />
            </label>
            <label className="form-field">
              <span>Job title</span>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Platform Developer"
              />
            </label>
            <div className="profile-form-actions">
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}
    </div>
  );
}

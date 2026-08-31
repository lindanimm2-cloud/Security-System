'use client';

import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UiSelect } from '@/components/ui/UiSelect';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { canManageUserPasswords, validateNewPassword } from '@/lib/password-access';

export type RoleGuideRow = {
  role: string;
  portal: string;
  access: string;
  users: number;
  status: string;
  count: number;
  tone: string;
  tags: string[];
};

type ManagedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl?: string | null;
  jobTitle: string | null;
  role: string;
  status: string;
};

const ROLE_CODES: Record<string, string[]> = {
  Owner: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN'],
  Developer: ['DEVELOPER'],
  Manager: ['MANAGER'],
  Supervisor: ['SUPERVISOR', 'DISPATCHER'],
  Sales: ['SALES'],
  Client: ['USER', 'CLIENT', 'FAMILY_MEMBER'],
  Officer: ['OFFICER'],
  Technician: ['TECHNICIAN'],
};

const ACCESS_OPTIONS = [
  'Full Access',
  'Technical',
  'Operations',
  'Dispatch',
  'Sales',
  'Protected User',
  'Field',
  'Installation',
];

const STATUS_OPTIONS = ['Operational', 'Scoped'];
const USER_STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'];
const TAG_OPTIONS = [
  'Platform',
  'Billing',
  'Users',
  'Security',
  'Ops',
  'Logs',
  'Support',
  'Deployments',
  'Operations',
  'Sales',
  'Customers',
  'Fleet',
  'Dispatch',
  'Map',
  'Incidents',
  'Escalation',
  'Leads',
  'CRM',
  'Quotes',
  'Store',
  'Panic',
  'Tracking',
  'Family',
  'Subscription',
  'Assignments',
  'Navigation',
  'Reports',
  'Check-ins',
  'Installs',
  'CCTV',
  'Alarms',
  'Access Control',
];

export function RoleProfileDialog({
  row,
  modules,
  onClose,
  onSaveRole,
}: {
  row: RoleGuideRow;
  modules: { module: string; access: string }[];
  onClose: () => void;
  onSaveRole: (next: RoleGuideRow) => void;
}) {
  const [editingRole, setEditingRole] = useState(false);
  const [draft, setDraft] = useState(row);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [userBusy, setUserBusy] = useState(false);
  const [userError, setUserError] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userDraft, setUserDraft] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    status: 'ACTIVE',
  });

  const canSetPasswords = canManageUserPasswords(getSession('admin')?.user?.role);

  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<ManagedUser[]>>('/control-room/users'),
    [],
  );

  const people = useMemo(() => {
    const codes = ROLE_CODES[row.role] ?? [row.role.toUpperCase()];
    return (data?.data ?? []).filter((user) => codes.includes(user.role));
  }, [data, row.role]);

  const selected = people.find((user) => user.id === selectedId) ?? null;

  function startEditUser(user: ManagedUser) {
    setSelectedId(user.id);
    setEditingUser(true);
    setUserError('');
    setPasswordError('');
    setPasswordNotice('');
    setNewPassword('');
    setConfirmPassword('');
    setUserDraft({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      jobTitle: user.jobTitle ?? '',
      status: user.status || 'ACTIVE',
    });
  }

  async function saveUser() {
    if (!selected) return;
    setUserBusy(true);
    setUserError('');
    try {
      await adminApi.patch(`/control-room/users/${selected.id}`, {
        firstName: userDraft.firstName.trim(),
        lastName: userDraft.lastName.trim(),
        phone: userDraft.phone.trim() || null,
        jobTitle: userDraft.jobTitle.trim() || null,
        status: userDraft.status,
      });
      setEditingUser(false);
      void reload();
    } catch (err) {
      setUserError(friendlyErrorMessage(err, 'save'));
    } finally {
      setUserBusy(false);
    }
  }

  async function changePassword() {
    if (!selected || !canSetPasswords) return;
    const passwordErrorMessage = validateNewPassword(newPassword);
    if (passwordErrorMessage) {
      setPasswordError(passwordErrorMessage);
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    setPasswordError('');
    setPasswordNotice('');
    try {
      await adminApi.patch(`/control-room/users/${selected.id}`, {
        password: newPassword.trim(),
      });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice(`Password updated for ${selected.firstName} ${selected.lastName}.`);
    } catch (err) {
      setPasswordError(friendlyErrorMessage(err, 'save'));
    } finally {
      setPasswordBusy(false);
    }
  }

  const tagChoices = Array.from(new Set([...TAG_OPTIONS, ...draft.tags]));

  return (
    <OpsDialog
      wide
      title={`${row.role} profile`}
      subtitle={`${row.portal} · ${people.length || row.users} assigned`}
      onClose={onClose}
    >
      <div className="role-profile">
        <div className="role-profile__hero">
          <span className={`settings-role-pill settings-role-pill--${row.tone}`}>{draft.role}</span>
          <StatusBadge status={draft.status} />
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setEditingRole((open) => !open);
              setDraft(row);
            }}
          >
            {editingRole ? 'Cancel role edit' : 'Edit role'}
          </button>
        </div>

        {editingRole ? (
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveRole({ ...draft, tags: draft.tags.filter(Boolean) });
              setEditingRole(false);
            }}
          >
            <label>
              Portal
              <input
                value={draft.portal}
                onChange={(e) => setDraft({ ...draft, portal: e.target.value })}
              />
            </label>
            <label>
              Access level
              <UiSelect
                compact={false}
                ariaLabel="Access level"
                value={draft.access}
                onChange={(access) => setDraft({ ...draft, access })}
                options={ACCESS_OPTIONS.map((value) => ({ value, label: value }))}
              />
            </label>
            <label>
              Status
              <UiSelect
                compact={false}
                ariaLabel="Role status"
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={STATUS_OPTIONS.map((value) => ({ value, label: value }))}
              />
            </label>
            <fieldset className="role-profile__tags">
              <legend>Scope</legend>
              <div className="settings-role-tags">
                {tagChoices.map((tag) => {
                  const on = draft.tags.includes(tag);
                  return (
                    <label key={tag} className={`role-profile__tag ${on ? 'role-profile__tag--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            tags: on ? draft.tags.filter((item) => item !== tag) : [...draft.tags, tag],
                          })
                        }
                      />
                      {tag}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="fleet-form__actions">
              <button type="submit" className="btn-ok">
                Save role
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-summary-grid">
            <div className="profile-summary-item">
              <dt>Portal</dt>
              <dd>{draft.portal}</dd>
            </div>
            <div className="profile-summary-item">
              <dt>Access level</dt>
              <dd>{draft.access}</dd>
            </div>
            <div className="profile-summary-item">
              <dt>Permissions</dt>
              <dd>{draft.count} permissions</dd>
            </div>
            <div className="profile-summary-item">
              <dt>Users</dt>
              <dd>{people.length || draft.users}</dd>
            </div>
          </dl>
        )}

        <div className="settings-role-tags">
          {!editingRole
            ? draft.tags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))
            : null}
        </div>

        {modules.length > 0 && !editingRole ? (
          <section>
            <h4 className="role-profile__section-title">Tool access</h4>
            <ul className="role-profile__modules">
              {modules.map((item) => (
                <li key={item.module}>
                  <span>{item.module}</span>
                  <strong>{item.access}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h4 className="role-profile__section-title">People in this role</h4>
          {loading ? <LoadingSpinner label="Loading people..." /> : null}
          {error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : null}
          {!loading && !error && people.length === 0 ? (
            <p className="text-muted">No assigned users yet.</p>
          ) : null}
          <ul className="role-profile__people">
            {people.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className={`role-profile__person ${selectedId === user.id ? 'role-profile__person--on' : ''}`}
                  onClick={() => {
                    setSelectedId(user.id);
                    setEditingUser(false);
                    setUserError('');
                    setPasswordError('');
                    setPasswordNotice('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <UserAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                  <span>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <span className="text-muted">{user.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected ? (
          <section className="role-profile__user">
            <div className="role-profile__hero">
              <UserAvatar
                firstName={selected.firstName}
                lastName={selected.lastName}
                avatarUrl={selected.avatarUrl}
                size="md"
              />
              <div>
                <strong>
                  {selected.firstName} {selected.lastName}
                </strong>
                <p className="text-muted" style={{ margin: 0 }}>
                  {selected.email}
                </p>
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => (editingUser ? setEditingUser(false) : startEditUser(selected))}
              >
                {editingUser ? 'View profile' : 'Edit profile'}
              </button>
            </div>

            {userError ? <ErrorAlert error={userError} /> : null}
            {passwordError ? <ErrorAlert error={passwordError} /> : null}
            {passwordNotice ? (
              <p className="text-muted" style={{ margin: 0 }}>
                {passwordNotice}
              </p>
            ) : null}

            {editingUser ? (
              <form
                className="stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveUser();
                }}
              >
                <div className="form-row-2">
                  <label>
                    First name
                    <input
                      value={userDraft.firstName}
                      onChange={(e) => setUserDraft({ ...userDraft, firstName: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      value={userDraft.lastName}
                      onChange={(e) => setUserDraft({ ...userDraft, lastName: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <label>
                  Phone
                  <input
                    value={userDraft.phone}
                    onChange={(e) => setUserDraft({ ...userDraft, phone: e.target.value })}
                  />
                </label>
                <label>
                  Job title
                  <input
                    value={userDraft.jobTitle}
                    onChange={(e) => setUserDraft({ ...userDraft, jobTitle: e.target.value })}
                  />
                </label>
                <label>
                  Status
                  <UiSelect
                    compact={false}
                    ariaLabel="User status"
                    value={userDraft.status}
                    onChange={(status) => setUserDraft({ ...userDraft, status })}
                    options={USER_STATUS_OPTIONS.map((value) => ({
                      value,
                      label: value.replace(/_/g, ' '),
                    }))}
                  />
                </label>
                <div className="fleet-form__actions">
                  <button type="submit" className="btn-ok" disabled={userBusy}>
                    {userBusy ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="profile-summary-grid">
                <div className="profile-summary-item">
                  <dt>Job title</dt>
                  <dd>{selected.jobTitle || '—'}</dd>
                </div>
                <div className="profile-summary-item">
                  <dt>Phone</dt>
                  <dd>{selected.phone || '—'}</dd>
                </div>
                <div className="profile-summary-item">
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={selected.status} />
                  </dd>
                </div>
              </dl>
            )}

            {canSetPasswords ? (
              <form
                className="stack-form"
                style={{ marginTop: '1rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void changePassword();
                }}
              >
                <h4 className="role-profile__section-title">Change password</h4>
                <label>
                  New password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError('');
                      setPasswordNotice('');
                    }}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError('');
                      setPasswordNotice('');
                    }}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <div className="fleet-form__actions">
                  <button type="submit" className="btn-primary" disabled={passwordBusy}>
                    {passwordBusy ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </OpsDialog>
  );
}

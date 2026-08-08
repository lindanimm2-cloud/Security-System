'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type TeamMember = {
  user: { id: string; firstName: string; lastName: string; role: string };
  isLead: boolean;
};

type Team = {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
  members: TeamMember[];
};

type Branch = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  teams: Team[];
  _count: { users: number; officers: number };
};

type ManagedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  role: string;
  status: string;
  branch: { id: string; name: string; code: string } | null;
  teams: { id: string; name: string; branchId: string; isLead: boolean }[];
  inviteToken?: string | null;
  inviteCode?: string | null;
  inviteExpiresAt?: string | null;
  inviteUrl?: string | null;
};

type UserFormState = {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  branch: { id: string; name: string; code: string } | null;
  teams: { id: string; name: string; branchId: string; isLead: boolean }[];
};

const ROLES = [
  'USER',
  'FAMILY_MEMBER',
  'OFFICER',
  'DISPATCHER',
  'SUPERVISOR',
  'MANAGER',
  'TENANT_ADMIN',
  'OWNER',
  'SUPER_ADMIN',
  'SALES',
  'TECHNICIAN',
  'DEVELOPER',
] as const;

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  USER: 'Client',
  FAMILY_MEMBER: 'Family Member',
  OFFICER: 'Officer',
  DISPATCHER: 'Dispatcher',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  TENANT_ADMIN: 'Tenant Admin',
  OWNER: 'Owner',
  SUPER_ADMIN: 'Super Admin',
  SALES: 'Sales',
  TECHNICIAN: 'Technician',
  DEVELOPER: 'Developer',
};

const STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] as const;

const POSITIONS = [
  'Owner',
  'Manager',
  'Supervisor',
  'Client',
  'Family Member',
  'Field Officer',
  'Senior Officer',
  'Dispatcher',
  'Control Room Operator',
  'Branch Manager',
  'Team Lead',
  'Tenant Administrator',
  'Security Consultant',
  'Sales Consultant',
  'CCTV Install Technician',
  'Alarm Systems Technician',
  'Access Control Technician',
];

const MAX_AVATAR_BYTES = 512_000;

export default function TeamsPage() {
  return (
    <ControlRoomLayout title="Teams & Users">
      <TeamsContent />
    </ControlRoomLayout>
  );
}

function TeamsContent() {
  const { data: branchesData, loading: branchesLoading, error: branchesError, reload: reloadBranches } =
    useApi(() => adminApi.get<ApiResponse<Branch[]>>('/control-room/branches'), []);
  const { data: usersData, loading: usersLoading, error: usersError, reload: reloadUsers } =
    useApi(() => adminApi.get<ApiResponse<ManagedUser[]>>('/control-room/users'), []);

  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamBranchId, setTeamBranchId] = useState('');
  const [userForm, setUserForm] = useState<UserFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{
    name: string;
    url: string;
    code: string;
  } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const branches = branchesData?.data ?? [];
  const users = usersData?.data ?? [];

  function openCreateUser() {
    setFormError('');
    setCreatedInvite(null);
    setInviteCopied(false);
    setUserForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      jobTitle: '',
      avatarUrl: null,
      role: 'USER',
      status: 'PENDING_VERIFICATION',
      branch: null,
      teams: [],
    });
  }

  function openEditUser(user: ManagedUser) {
    setFormError('');
    setCreatedInvite(null);
    setInviteCopied(false);
    setUserForm({
      id: user.id,
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      jobTitle: user.jobTitle ?? '',
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      branch: user.branch,
      teams: [...user.teams],
    });
  }

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) return;
    setSaving(true);
    try {
      await adminApi.post('/control-room/branches', {
        name: branchName.trim(),
        code: branchCode.trim(),
      });
      setBranchName('');
      setBranchCode('');
      reloadBranches();
    } finally {
      setSaving(false);
    }
  }

  async function createTeam(e: FormEvent) {
    e.preventDefault();
    if (!teamName.trim() || !teamBranchId) return;
    setSaving(true);
    try {
      await adminApi.post('/control-room/teams', {
        name: teamName.trim(),
        branchId: teamBranchId,
      });
      setTeamName('');
      reloadBranches();
    } finally {
      setSaving(false);
    }
  }

  async function saveUser() {
    if (!userForm) return;
    setSaving(true);
    setFormError('');
    try {
      const isClientRole = userForm.role === 'USER' || userForm.role === 'FAMILY_MEMBER';
      const payload = {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        phone: userForm.phone.trim() || null,
        jobTitle: userForm.jobTitle.trim() || null,
        avatarUrl: userForm.avatarUrl,
        role: userForm.role,
        status: userForm.status,
        branchId: userForm.branch?.id ?? null,
        teamIds: userForm.teams.map((t) => t.id),
      };

      if (userForm.id) {
        await adminApi.patch(`/control-room/users/${userForm.id}`, {
          ...payload,
          ...(userForm.password.trim() ? { password: userForm.password } : {}),
        });
        setUserForm(null);
        setCreatedInvite(null);
      } else {
        if (!userForm.email.trim()) {
          setFormError('Email is required for new users.');
          return;
        }
        if (!isClientRole && !userForm.password.trim()) {
          setFormError('Email and password are required for new users.');
          return;
        }
        const res = await adminApi.post<
          ApiResponse<ManagedUser & { inviteToken?: string | null; inviteUrl?: string | null }>
        >('/control-room/users', {
          ...payload,
          email: userForm.email.trim(),
          ...(userForm.password.trim() ? { password: userForm.password } : {}),
        });

        const invitePath = res.data?.inviteUrl;
        const token = res.data?.inviteToken ?? res.data?.inviteCode ?? null;
        if (invitePath || token) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3010';
          const url = invitePath?.startsWith('http')
            ? invitePath
            : `${origin}${invitePath ?? `/portal/register?token=${token}`}`;
          setCreatedInvite({
            name: `${res.data.firstName} ${res.data.lastName}`.trim() || res.data.email,
            url,
            code: token ?? '',
          });
          setInviteCopied(false);
          setUserForm(null);
        } else {
          setUserForm(null);
          setCreatedInvite(null);
        }
      }

      reloadUsers();
      reloadBranches();
    } catch (err) {
      setFormError(friendlyErrorMessage(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteLink() {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(createdInvite.code || createdInvite.url);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  async function copyInviteUrl() {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(createdInvite.url);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  if (branchesLoading || usersLoading) {
    return <LoadingSpinner label="Loading teams and users..." fullScreen />;
  }
  if (branchesError || usersError) {
    return <ErrorAlert error={branchesError ?? usersError} />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Branches, Teams & Users</h1>
          <p className="text-muted">
            Create users, upload profile photos, and assign roles, positions, branches, and teams
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateUser}>
          Create User
        </button>
      </div>

      <div className="teams-grid">
        <section className="card teams-card">
          <h2>Branches</h2>
          <form className="inline-form" onSubmit={createBranch}>
            <input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch name"
              disabled={saving}
            />
            <input
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="Code (e.g. DBN)"
              disabled={saving}
              maxLength={6}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              Add Branch
            </button>
          </form>

          <div className="branch-list">
            {branches.map((b) => (
              <div key={b.id} className="branch-item">
                <div className="branch-item-header">
                  <strong>{b.name}</strong>
                  <span className="badge">{b.code}</span>
                  <span className="text-muted">
                    {b._count.users} users · {b._count.officers} officers
                  </span>
                </div>
                <div className="team-list">
                  {b.teams.map((t) => (
                    <div key={t.id} className="team-chip">
                      <span>{t.name}</span>
                      <span className="text-muted">{t.members.length} members</span>
                    </div>
                  ))}
                  {b.teams.length === 0 && (
                    <span className="text-muted">No teams yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card teams-card">
          <h2>Create Team</h2>
          <form className="stack-form" onSubmit={createTeam}>
            <label>
              Branch
              <select
                value={teamBranchId}
                onChange={(e) => setTeamBranchId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Team name
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Alpha Response"
                disabled={saving}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={saving || !teamBranchId}>
              Create Team
            </button>
          </form>
        </section>
      </div>

      <section className="card teams-card teams-card--wide">
        <h2>User Management</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Role</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Teams</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <UserAvatar
                      firstName={u.firstName}
                      lastName={u.lastName}
                      avatarUrl={u.avatarUrl}
                      size="sm"
                    />
                  </td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>{u.jobTitle ?? '—'}</td>
                  <td><span className="badge">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</span></td>
                  <td>{u.status}</td>
                  <td>{u.branch?.code ?? '—'}</td>
                  <td>{u.teams.map((t) => t.name).join(', ') || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => openEditUser(u)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {userForm && (
        <UserFormModal
          form={userForm}
          branches={branches}
          saving={saving}
          error={formError}
          onChange={(next) => {
            const roleChanged = next.role !== userForm.role;
            if (!userForm.id && roleChanged) {
              const isClient = next.role === 'USER' || next.role === 'FAMILY_MEMBER';
              setUserForm({
                ...next,
                status: isClient ? 'PENDING_VERIFICATION' : 'ACTIVE',
              });
            } else {
              setUserForm(next);
            }
          }}
          onClose={() => setUserForm(null)}
          onSave={saveUser}
          onAvatarError={setFormError}
        />
      )}

      {createdInvite && (
        <div className="modal-overlay" onClick={() => setCreatedInvite(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Premium client invite ready</h3>
            <div className="invite-link-box">
              <h4>{createdInvite.name}</h4>
              <p>
                Share this invite code so they can activate the panic app. They
                cannot sign in until registration is complete.
              </p>
              {createdInvite.code && (
                <div className="invite-link-box__row" style={{ marginBottom: '0.75rem' }}>
                  <input
                    readOnly
                    value={createdInvite.code}
                    onFocus={(e) => e.target.select()}
                    style={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: '1.1rem' }}
                  />
                  <button type="button" className="btn-primary btn-sm" onClick={copyInviteLink}>
                    {inviteCopied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              )}
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Or share the full registration link:
              </p>
              <div className="invite-link-box__row">
                <input readOnly value={createdInvite.url} onFocus={(e) => e.target.select()} />
                <button type="button" className="btn-secondary btn-sm" onClick={copyInviteUrl}>
                  Copy link
                </button>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-primary" onClick={() => setCreatedInvite(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={`user-avatar user-avatar--${size}`}
      />
    );
  }
  return <div className={`user-avatar user-avatar--${size} user-avatar--initials`}>{initials}</div>;
}

function UserFormModal({
  form,
  branches,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onAvatarError,
}: {
  form: UserFormState;
  branches: Branch[];
  saving: boolean;
  error: string;
  onChange: (form: UserFormState) => void;
  onClose: () => void;
  onSave: () => void;
  onAvatarError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(form.id);
  const isClientRole = form.role === 'USER' || form.role === 'FAMILY_MEMBER';

  function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onAvatarError('Please choose a JPG or PNG image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      onAvatarError('Image must be 500 KB or smaller.');
      e.target.value = '';
      return;
    }
    onAvatarError('');
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...form, avatarUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? `Edit ${form.firstName} ${form.lastName}` : 'Create User'}</h3>

        {error && <ErrorAlert error={error} />}

        <div className="user-form-avatar-row">
          <UserAvatar
            firstName={form.firstName || '?'}
            lastName={form.lastName || '?'}
            avatarUrl={form.avatarUrl}
            size="lg"
          />
          <div className="user-form-avatar-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              Upload photo
            </button>
            {form.avatarUrl && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => onChange({ ...form, avatarUrl: null })}
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarFile}
            />
            <span className="text-muted">JPG or PNG, max 500 KB</span>
          </div>
        </div>

        <div className="stack-form">
          <div className="form-row-2">
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(e) => onChange({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(e) => onChange({ ...form, lastName: e.target.value })}
                required
              />
            </label>
          </div>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange({ ...form, email: e.target.value })}
              disabled={isEdit}
              required={!isEdit}
            />
          </label>

          <label>
            {isEdit
              ? 'New password (leave blank to keep)'
              : isClientRole
                ? 'Temporary password (optional)'
                : 'Password'}
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange({ ...form, password: e.target.value })}
              placeholder={
                isEdit
                  ? 'Optional'
                  : isClientRole
                    ? 'Leave blank — client sets via invite'
                    : 'Required'
              }
              required={!isEdit && !isClientRole}
            />
          </label>
          {!isEdit && isClientRole && (
            <p className="text-muted" style={{ margin: '-0.35rem 0 0', fontSize: '0.85rem' }}>
              Creates a premium protection client and generates an invite code
              (e.g. NX-XXXXXX) for the panic app registration.
            </p>
          )}

          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => onChange({ ...form, phone: e.target.value })}
              placeholder="+27 82 000 0000"
            />
          </label>

          <label>
            Position / job title
            <input
              list="position-options"
              value={form.jobTitle}
              onChange={(e) => onChange({ ...form, jobTitle: e.target.value })}
              placeholder="e.g. Field Officer, Dispatcher"
            />
            <datalist id="position-options">
              {POSITIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>

          <div className="form-row-2">
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => onChange({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Branch
            <select
              value={form.branch?.id ?? ''}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === e.target.value);
                onChange({
                  ...form,
                  branch: branch
                    ? { id: branch.id, name: branch.name, code: branch.code }
                    : null,
                  teams: form.teams.filter(
                    (t) => !e.target.value || t.branchId === e.target.value,
                  ),
                });
              }}
            >
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </label>

          <fieldset className="team-checkboxes">
            <legend>Teams</legend>
            {branches
              .filter((b) => !form.branch || b.id === form.branch.id)
              .flatMap((b) => b.teams)
              .map((t) => {
                const checked = form.teams.some((tm) => tm.id === t.id);
                return (
                  <label key={t.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange({
                            ...form,
                            teams: [
                              ...form.teams,
                              {
                                id: t.id,
                                name: t.name,
                                branchId: t.branchId,
                                isLead: false,
                              },
                            ],
                          });
                        } else {
                          onChange({
                            ...form,
                            teams: form.teams.filter((tm) => tm.id !== t.id),
                          });
                        }
                      }}
                    />
                    {t.name}
                  </label>
                );
              })}
            {branches.flatMap((b) => b.teams).length === 0 && (
              <span className="text-muted">Create a team first</span>
            )}
          </fieldset>

          <div className="btn-row">
            <button type="button" className="btn-primary" disabled={saving} onClick={onSave}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

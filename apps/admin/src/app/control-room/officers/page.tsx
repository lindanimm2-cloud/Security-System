'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { normalizeOfficerStatus, officerStatusLabel } from '@/lib/officer-status';
import { deviceLinkLabel } from '@/lib/officer-duty';
import { CONTROL_ROOM_ROUTES, mapHref } from '@/lib/control-room-routes';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { LayoutViewToggle } from '@/components/ui/LayoutViewToggle';
import { UiSelect } from '@/components/ui/UiSelect';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { matchesSearch } from '@/lib/list-search';
import { useLayoutView } from '@/hooks/useLayoutView';

const MAX_AVATAR_BYTES = 512_000;

type AssignedFleet = {
  id: string;
  callSign: string;
  registration: string;
  vehicleType: string;
  teamName: string;
  status: string;
  seatRole: string | null;
  crewCount: number;
  crewNames: string[];
};

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
  avgResponseSec: number;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  rank?: string | null;
  dutyModeActive?: boolean;
  dutyStartedAt?: string | null;
  lastHeartbeatAt?: string | null;
  deviceLabel?: string | null;
  batteryPct?: number | null;
  networkType?: string | null;
  appVersion?: string | null;
  deviceLink?: string | null;
  vehicle?: {
    id: string;
    callSign: string;
    registration: string;
    role: string;
    crewMates: { officerId: string; name: string; role: string; status?: string }[];
  } | null;
  assignedFleet?: AssignedFleet | null;
};

type OfficerDraft = {
  id?: string;
  firstName: string;
  lastName: string;
  zone: string;
  phone: string;
  email: string;
  rank: string;
  avatarUrl: string | null;
};

function formatAvgResponse(sec: number) {
  const avgMin = Math.floor(sec / 60);
  const avgSec = sec % 60;
  return `${avgMin}m ${String(avgSec).padStart(2, '0')}s`;
}

function isOnDuty(status: string) {
  const s = normalizeOfficerStatus(status);
  return s !== 'OFF_DUTY';
}

export default function OfficersPage() {
  return (
    <ControlRoomLayout title="Officers">
      <OfficersContent />
    </ControlRoomLayout>
  );
}

function OfficersContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Officer[]>>('/control-room/officers'),
    [],
  );
  const [draft, setDraft] = useState<OfficerDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [layoutView, setLayoutView] = useLayoutView('control-room-officers');

  const officers = data?.data ?? [];

  const zones = useMemo(
    () =>
      Array.from(new Set(officers.map((o) => o.zone).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [officers],
  );
  const ranks = useMemo(
    () =>
      Array.from(new Set(officers.map((o) => o.rank).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [officers],
  );

  const filteredOfficers = useMemo(
    () =>
      officers.filter((o) => {
        if (zoneFilter !== 'ALL' && (o.zone ?? '') !== zoneFilter) return false;
        if (roleFilter !== 'ALL' && (o.rank ?? 'Officer') !== roleFilter) return false;
        if (statusFilter !== 'ALL' && normalizeOfficerStatus(o.status) !== statusFilter) return false;
        return matchesSearch(
          search,
          o.firstName,
          o.lastName,
          o.phone,
          o.email,
          o.zone,
          o.rank,
          o.status,
          o.vehicle?.callSign,
          o.vehicle?.registration,
          o.assignedFleet?.callSign,
          o.assignedFleet?.teamName,
        );
      }),
    [officers, search, zoneFilter, roleFilter, statusFilter],
  );

  const metrics = useMemo(() => {
    const total = officers.length;
    const onDuty = officers.filter((o) => isOnDuty(o.status)).length;
    const available = officers.filter((o) => normalizeOfficerStatus(o.status) === 'AVAILABLE').length;
    const offDuty = officers.filter((o) => normalizeOfficerStatus(o.status) === 'OFF_DUTY').length;
    return { total, onDuty, available, offDuty };
  }, [officers]);

  function openAdd() {
    setFormError('');
    setDraft({
      firstName: '',
      lastName: '',
      zone: 'Zone A',
      phone: '',
      email: '',
      rank: 'Officer',
      avatarUrl: null,
    });
  }

  function openEdit(officer: Officer) {
    setFormError('');
    setDraft({
      id: officer.id,
      firstName: officer.firstName,
      lastName: officer.lastName,
      zone: officer.zone ?? 'Zone A',
      phone: officer.phone ?? '',
      email: officer.email ?? '',
      rank: officer.rank ?? 'Officer',
      avatarUrl: officer.avatarUrl ?? null,
    });
  }

  async function saveOfficer(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const body = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      zone: draft.zone.trim() || 'Zone A',
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      rank: draft.rank.trim() || 'Officer',
      avatarUrl: draft.avatarUrl,
    };
    try {
      const res = draft.id
        ? await adminApi.patch<{ success?: boolean; message?: string }>(
            `/control-room/officers/${draft.id}`,
            body,
          )
        : await adminApi.post<{ success?: boolean; message?: string }>('/control-room/officers', body);
      if (res && res.success === false) throw new Error(res.message ?? 'Officer could not be saved');
      setNotice(
        draft.id
          ? `${body.firstName} ${body.lastName} updated.`
          : `${body.firstName} ${body.lastName} added.`,
      );
      setDraft(null);
      reload();
    } catch (ex) {
      setFormError(friendlyErrorMessage(ex, 'save'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading officers..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content ops-page">
      <header className="ops-page-header">
        <div>
          <h1 className="ops-page-header__title">Officers</h1>
          <p className="ops-page-header__subtitle">Personnel, vehicles &amp; field status</p>
        </div>
        <div className="ops-page-header__actions">
          <button type="button" className="btn-primary" onClick={openAdd}>
            + Add Officer
          </button>
        </div>
      </header>

      {notice ? (
        <div className="alert alert--success" role="status">
          {notice}
        </div>
      ) : null}

      {draft && (
        <OfficerDialog
          draft={draft}
          saving={saving}
          error={formError}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={(e) => void saveOfficer(e)}
          onAvatarError={setFormError}
        />
      )}

      <div className="ops-metrics" aria-label="Officer summary">
        <article className="ops-metric">
          <strong className="ops-metric__value">{metrics.total}</strong>
          <span className="ops-metric__label">Total Officers</span>
        </article>
        <article className="ops-metric ops-status--ok">
          <strong className="ops-metric__value">{metrics.onDuty}</strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            On Duty
          </span>
        </article>
        <article className="ops-metric ops-status--ok">
          <strong className="ops-metric__value">{metrics.available}</strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            Available
          </span>
        </article>
        <article className="ops-metric ops-status--muted">
          <strong className="ops-metric__value">{metrics.offDuty}</strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            Off Duty
          </span>
        </article>
      </div>

      <div className="ops-toolbar">
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search officers by name, unit, or phone…"
            resultCount={filteredOfficers.length}
            totalCount={officers.length}
          />
        </div>
        <div className="ops-toolbar__filters">
          <UiSelect
            compact
            ariaLabel="Filter by zone"
            value={zoneFilter}
            onChange={setZoneFilter}
            options={[
              { value: 'ALL', label: 'Zone: All' },
              ...zones.map((z) => ({ value: z, label: z })),
            ]}
          />
          <UiSelect
            compact
            ariaLabel="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'ALL', label: 'Role: All' },
              ...ranks.map((r) => ({ value: r, label: r })),
            ]}
          />
          <UiSelect
            compact
            ariaLabel="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'Status: All' },
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'EN_ROUTE', label: 'En route' },
              { value: 'BUSY', label: 'On scene' },
              { value: 'RETURNING', label: 'Returning' },
              { value: 'OFF_DUTY', label: 'Off duty' },
            ]}
          />
        </div>
        <LayoutViewToggle value={layoutView} onChange={setLayoutView} label="Officer layout" />
      </div>

      {filteredOfficers.length === 0 ? (
        <EmptyState
          title={search.trim() || zoneFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No matches' : 'No officers'}
          body={
            search.trim() || zoneFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try a different name, zone, rank, or status.'
              : 'Add an officer to build the roster.'
          }
        />
      ) : layoutView === 'list' ? (
        <div className="table-wrap">
          <table className="ops-officer-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Role</th>
                <th>Zone</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Device</th>
                <th>Response</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="ops-officer-table__name">
                      <OfficerStatusDot status={o.status} />
                      <span>
                        {o.firstName} {o.lastName}
                      </span>
                    </div>
                  </td>
                  <td>{o.rank ?? 'Officer'}</td>
                  <td>{o.zone ?? '—'}</td>
                  <td>{o.assignedFleet?.callSign ?? '—'}</td>
                  <td>
                    <OfficerStatusControl
                      officerId={o.id}
                      status={o.status}
                      variant="select"
                      onUpdated={reload}
                    />
                  </td>
                  <td>
                    {o.deviceLink === 'OFFLINE' || o.deviceLink === 'NO_SIGNAL' ? (
                      <span className="ops-status ops-status--warn">
                        <span className="ops-status__dot" aria-hidden />
                        Offline
                      </span>
                    ) : o.dutyModeActive ? (
                      <span className="ops-status ops-status--ok">
                        <span className="ops-status__dot" aria-hidden />
                        Duty · {deviceLinkLabel(o.deviceLink ?? 'ONLINE')}
                      </span>
                    ) : (
                      <span className="text-muted">Standby</span>
                    )}
                  </td>
                  <td>{formatAvgResponse(o.avgResponseSec)}</td>
                  <td>
                    <div className="officer-table__actions">
                      <Link href={mapHref('officers')} className="btn-sm btn-secondary">
                        Map
                      </Link>
                      <Link href={CONTROL_ROOM_ROUTES.dispatch} className="btn-sm btn-secondary">
                        Dispatch
                      </Link>
                      {o.phone ? (
                        <a href={`tel:${o.phone}`} className="btn-sm btn-ghost">
                          Call
                        </a>
                      ) : null}
                      <button type="button" className="btn-sm btn-ghost" onClick={() => openEdit(o)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ops-officer-grid">
          {filteredOfficers.map((o) => (
            <OfficerCard key={o.id} officer={o} onEdit={() => openEdit(o)} onUpdated={reload} />
          ))}
        </div>
      )}

      <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
        Showing {filteredOfficers.length} of {officers.length} officers
      </p>
    </div>
  );
}

function OfficerCard({
  officer: o,
  onEdit,
  onUpdated,
}: {
  officer: Officer;
  onEdit: () => void;
  onUpdated: () => void;
}) {
  const fleet = o.assignedFleet;
  const onDuty = isOnDuty(o.status);

  return (
    <article className="ops-officer-card">
      <div className="ops-officer-card__top">
        <button
          type="button"
          className="ops-officer-card__avatar-btn"
          onClick={onEdit}
          aria-label={`Edit ${o.firstName} ${o.lastName}`}
        >
          <UserAvatar
            firstName={o.firstName}
            lastName={o.lastName}
            avatarUrl={o.avatarUrl}
            size="md"
          />
        </button>
        <div className="ops-officer-card__identity">
          <strong className="ops-officer-card__name">
            {o.firstName} {o.lastName}
          </strong>
          <span className="ops-officer-card__role">{o.rank ?? 'Officer'}</span>
          {o.zone ? <span className="ops-officer-card__zone">{o.zone}</span> : null}
        </div>
        <OfficerStatusControl
          officerId={o.id}
          status={o.status}
          variant="select"
          onUpdated={onUpdated}
        />
      </div>

      <div className="ops-officer-card__rows">
        {o.phone ? (
          <a href={`tel:${o.phone}`} className="ops-officer-card__row">
            <span aria-hidden>☎</span>
            <span>{o.phone}</span>
          </a>
        ) : (
          <span className="ops-officer-card__row text-muted">No phone on file</span>
        )}
        <span className="ops-officer-card__row">
          <span aria-hidden>◷</span>
          <span>Avg. response {formatAvgResponse(o.avgResponseSec)}</span>
        </span>
        {fleet ? (
          <span className="ops-officer-card__row">
            <span aria-hidden>🚙</span>
            <span>
              {fleet.callSign} · {fleet.registration}
              {fleet.teamName ? ` · ${fleet.teamName}` : ''}
            </span>
          </span>
        ) : (
          <span className="ops-officer-card__row text-muted">
            <span aria-hidden>🚙</span>
            <span>No vehicle assigned</span>
          </span>
        )}
      </div>

      <div className="ops-officer-card__duty">
        <span className={onDuty ? 'ops-status ops-status--ok' : 'ops-status ops-status--muted'}>
          <span className="ops-status__dot" aria-hidden />
          {o.dutyModeActive ? 'DUTY ACTIVE' : onDuty ? 'ON DUTY' : 'OFF DUTY'}
          {fleet?.seatRole ? ` · ${fleet.seatRole}` : ''}
        </span>
        {o.dutyModeActive || o.deviceLink === 'OFFLINE' || o.deviceLink === 'NO_SIGNAL' ? (
          <span
            className={
              o.deviceLink === 'ONLINE'
                ? 'ops-status ops-status--ok'
                : o.deviceLink === 'OFFLINE' || o.deviceLink === 'NO_SIGNAL'
                  ? 'ops-status ops-status--warn'
                  : 'ops-status ops-status--muted'
            }
            title={
              o.lastHeartbeatAt
                ? `Last heartbeat ${new Date(o.lastHeartbeatAt).toLocaleString()}`
                : 'No heartbeat yet'
            }
          >
            <span className="ops-status__dot" aria-hidden />
            {o.deviceLink === 'OFFLINE' || o.deviceLink === 'NO_SIGNAL'
              ? 'OFFICER DEVICE OFFLINE'
              : deviceLinkLabel(o.deviceLink ?? 'STANDBY')}
            {o.batteryPct != null ? ` · ${o.batteryPct}%` : ''}
          </span>
        ) : null}
      </div>

      <div className="ops-officer-card__actions">
        <Link href={mapHref('officers')} className="btn-sm btn-secondary">
          Map
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.dispatch} className="btn-sm btn-secondary">
          Dispatch
        </Link>
        {o.phone ? (
          <a href={`tel:${o.phone}`} className="btn-sm btn-ghost">
            Call
          </a>
        ) : (
          <button type="button" className="btn-sm btn-ghost" disabled>
            Call
          </button>
        )}
        <OpsMenuDropdown
          className="ops-officer-more"
          compact
          align="right"
          hideCaret
          ariaLabel="More officer actions"
          label="⋯"
          items={[
            { id: 'edit', label: 'Edit Officer', onClick: onEdit },
            { id: 'fleet', label: 'View Fleet', href: CONTROL_ROOM_ROUTES.fleet },
            { id: 'map', label: 'Open Live Map', href: mapHref('officers') },
            { id: 'dispatch', label: 'Open Dispatch', href: CONTROL_ROOM_ROUTES.dispatch },
          ]}
        />
      </div>
    </article>
  );
}

function OfficerDialog({
  draft,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onAvatarError,
}: {
  draft: OfficerDraft;
  saving: boolean;
  error: string;
  onChange: (draft: OfficerDraft) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onAvatarError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(draft.id);

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
    reader.onload = () => onChange({ ...draft, avatarUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <OpsDialog
      title={editing ? `Edit ${draft.firstName} ${draft.lastName}`.trim() : 'Add officer'}
      subtitle={
        editing
          ? 'Update profile, contact details, zone, and rank.'
          : "Fill in the officer's details to add them to the roster."
      }
      onClose={onClose}
      wide
    >
      {error ? <ErrorAlert error={error} /> : null}
      <form className="stack-form" onSubmit={onSave}>
        <div className="user-form-avatar-row">
          <UserAvatar
            firstName={draft.firstName || '?'}
            lastName={draft.lastName || '?'}
            avatarUrl={draft.avatarUrl}
            size="lg"
          />
          <div className="user-form-avatar-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              {draft.avatarUrl ? 'Change photo' : 'Add photo'}
            </button>
            {draft.avatarUrl && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => onChange({ ...draft, avatarUrl: null })}
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
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>
              JPG or PNG, max 500 KB
            </span>
          </div>
        </div>

        <div className="officer-form-grid">
          <label>
            First name
            <input
              value={draft.firstName}
              onChange={(e) => onChange({ ...draft, firstName: e.target.value })}
              required
              placeholder="e.g. Sipho"
            />
          </label>
          <label>
            Last name
            <input
              value={draft.lastName}
              onChange={(e) => onChange({ ...draft, lastName: e.target.value })}
              required
              placeholder="e.g. Ndlovu"
            />
          </label>
          <label>
            Rank / title
            <input
              value={draft.rank}
              onChange={(e) => onChange({ ...draft, rank: e.target.value })}
              placeholder="e.g. Senior Officer"
            />
          </label>
          <label>
            Zone
            <input
              value={draft.zone}
              onChange={(e) => onChange({ ...draft, zone: e.target.value })}
              placeholder="Zone A"
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => onChange({ ...draft, phone: e.target.value })}
              placeholder="+27 83 111 0001"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => onChange({ ...draft, email: e.target.value })}
              placeholder="officer@4ds.local"
            />
          </label>
        </div>

        <div className="fleet-form__actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-ok" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save officer' : 'Add officer'}
          </button>
        </div>
      </form>
    </OpsDialog>
  );
}

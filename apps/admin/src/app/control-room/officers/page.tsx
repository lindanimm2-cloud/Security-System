'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { OfficerStatusControl } from '@/components/control-room/OfficerStatusControl';
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
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';
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
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | null;
  idNumber?: string | null;
  psiraNumber?: string | null;
  psiraGrade?: string | null;
  certifications?: string | null;
  certificationExpiry?: string | null;
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

type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

type OfficerDraft = {
  id?: string;
  firstName: string;
  lastName: string;
  zone: string;
  phone: string;
  email: string;
  rank: string;
  employmentType: EmploymentType;
  idNumber: string;
  psiraNumber: string;
  psiraGrade: string;
  certifications: string;
  certificationExpiry: string;
  avatarUrl: string | null;
};

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
];

const PSIRA_GRADES = ['A', 'B', 'C', 'D', 'E'];

function employmentLabel(value?: string | null) {
  return EMPLOYMENT_OPTIONS.find((option) => option.value === value)?.label ?? 'Full-time';
}

function employmentTypeOf(value?: string | null): EmploymentType {
  if (value === 'PART_TIME' || value === 'CONTRACT' || value === 'FULL_TIME') return value;
  return 'FULL_TIME';
}

function emptyCompliance() {
  return {
    employmentType: 'FULL_TIME' as EmploymentType,
    idNumber: '',
    psiraNumber: '',
    psiraGrade: '',
    certifications: '',
    certificationExpiry: '',
  };
}

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
          o.idNumber,
          o.psiraNumber,
          o.psiraGrade,
          o.certifications,
          employmentLabel(o.employmentType),
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
      ...emptyCompliance(),
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
      employmentType: employmentTypeOf(officer.employmentType),
      idNumber: officer.idNumber ?? '',
      psiraNumber: officer.psiraNumber ?? '',
      psiraGrade: officer.psiraGrade ?? '',
      certifications: officer.certifications ?? '',
      certificationExpiry: officer.certificationExpiry ?? '',
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
      employmentType: draft.employmentType,
      idNumber: draft.idNumber.trim() || null,
      psiraNumber: draft.psiraNumber.trim() || null,
      psiraGrade: draft.psiraGrade.trim() || null,
      certifications: draft.certifications.trim() || null,
      certificationExpiry: draft.certificationExpiry.trim() || null,
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
    <div className="page-content ops-page officers-page">
      <header className="ops-page-header ops-page-header--compact">
        <div>
          <h1 className="ops-page-header__title">Officers</h1>
          <p className="ops-page-header__subtitle">Personnel, vehicles &amp; field status</p>
        </div>
        <div className="ops-page-header__actions">
          <button type="button" className="btn-primary btn-sm" onClick={openAdd}>
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

      <div className="ops-metrics ops-metrics--compact" aria-label="Officer summary">
        <article className="ops-metric">
          <strong className="ops-metric__value">{metrics.total}</strong>
          <span className="ops-metric__label">Total</span>
        </article>
        <article className="ops-metric ops-status--ok">
          <strong className="ops-metric__value">{metrics.onDuty}</strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            On duty
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
            Off duty
          </span>
        </article>
      </div>

      <div className="ops-toolbar ops-toolbar--compact">
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search officers…"
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
        <div className="ops-officer-panel">
          <div className="table-wrap ops-officer-panel__scroll">
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
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="ops-officer-table__name">
                        <strong>
                          <OpsMarqueeText>
                            {o.firstName} {o.lastName}
                          </OpsMarqueeText>
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div className="ops-officer-table__role">
                        <span>{o.rank ?? 'Officer'}</span>
                        <span>{employmentLabel(o.employmentType)}</span>
                        {o.psiraNumber ? <span>PSIRA {o.psiraNumber}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className="ops-officer-table__muted">{o.zone ?? '—'}</span>
                    </td>
                    <td>
                      <span className="ops-officer-table__unit">
                        {o.assignedFleet?.callSign ?? '—'}
                      </span>
                    </td>
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
                        <span className="ops-status ops-status--warn ops-status--sm">
                          <span className="ops-status__dot" aria-hidden />
                          Offline
                        </span>
                      ) : o.dutyModeActive ? (
                        <span className="ops-status ops-status--ok ops-status--sm">
                          <span className="ops-status__dot" aria-hidden />
                          Duty
                        </span>
                      ) : (
                        <span className="ops-officer-table__standby">Standby</span>
                      )}
                    </td>
                    <td>
                      <span className="ops-officer-table__response">
                        {formatAvgResponse(o.avgResponseSec)}
                      </span>
                    </td>
                    <td>
                      <div className="officer-table__actions">
                        <Link href={mapHref('officers')} className="btn-sm btn-secondary">
                          Map
                        </Link>
                        <OpsMenuDropdown
                          className="ops-officer-more"
                          compact
                          align="right"
                          hideCaret
                          ariaLabel={`Actions for ${o.firstName} ${o.lastName}`}
                          label={
                            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                              <circle cx="3.2" cy="8" r="1.15" fill="currentColor" />
                              <circle cx="8" cy="8" r="1.15" fill="currentColor" />
                              <circle cx="12.8" cy="8" r="1.15" fill="currentColor" />
                            </svg>
                          }
                          items={[
                            {
                              id: 'dispatch',
                              label: 'Dispatch',
                              href: CONTROL_ROOM_ROUTES.dispatch,
                            },
                            ...(o.phone
                              ? ([{ id: 'call', label: 'Call', href: `tel:${o.phone}` }] as const)
                              : []),
                            { id: 'edit', label: 'Edit', onClick: () => openEdit(o) },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ops-officer-panel__meta">
            Showing {filteredOfficers.length} of {officers.length} officers
          </p>
        </div>
      ) : (
        <div className="ops-officer-panel ops-officer-panel--grid">
          <div className="ops-officer-grid">
            {filteredOfficers.map((o) => (
              <OfficerCard key={o.id} officer={o} onEdit={() => openEdit(o)} onUpdated={reload} />
            ))}
          </div>
          <p className="ops-officer-panel__meta">
            Showing {filteredOfficers.length} of {officers.length} officers
          </p>
        </div>
      )}
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
  const deviceOffline = o.deviceLink === 'OFFLINE' || o.deviceLink === 'NO_SIGNAL';

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
            size="sm"
          />
        </button>
        <div className="ops-officer-card__identity">
          <strong className="ops-officer-card__name">
            {o.firstName} {o.lastName}
          </strong>
          <span className="ops-officer-card__meta">
            {o.rank ?? 'Officer'}
            {` · ${employmentLabel(o.employmentType)}`}
            {o.zone ? ` · ${o.zone}` : ''}
            {fleet?.callSign ? ` · ${fleet.callSign}` : ''}
          </span>
          {o.psiraNumber || o.idNumber ? (
            <span className="ops-officer-card__meta">
              {o.psiraNumber
                ? `PSIRA ${o.psiraNumber}${o.psiraGrade ? ` · Grade ${o.psiraGrade}` : ''}`
                : ''}
              {o.psiraNumber && o.idNumber ? ' · ' : ''}
              {o.idNumber ? `ID ${o.idNumber}` : ''}
            </span>
          ) : null}
        </div>
        <OfficerStatusControl
          officerId={o.id}
          status={o.status}
          variant="select"
          onUpdated={onUpdated}
        />
      </div>

      <div className="ops-officer-card__footer">
        <div className="ops-officer-card__facts">
          <span className="ops-officer-card__fact">
            <span className="ops-officer-card__fact-label">Response</span>
            <strong>{formatAvgResponse(o.avgResponseSec)}</strong>
          </span>
          <span className="ops-officer-card__fact">
            <span className="ops-officer-card__fact-label">Device</span>
            {deviceOffline ? (
              <span className="ops-status ops-status--warn ops-status--sm">
                <span className="ops-status__dot" aria-hidden />
                Offline
              </span>
            ) : o.dutyModeActive ? (
              <span className="ops-status ops-status--ok ops-status--sm">
                <span className="ops-status__dot" aria-hidden />
                Duty
              </span>
            ) : (
              <span className="ops-officer-table__standby">Standby</span>
            )}
          </span>
        </div>
        <div className="ops-officer-card__actions">
          <Link href={mapHref('officers')} className="btn-sm btn-secondary">
            Map
          </Link>
          <OpsMenuDropdown
            className="ops-officer-more"
            compact
            align="right"
            hideCaret
            ariaLabel={`More actions for ${o.firstName} ${o.lastName}`}
            label={
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <circle cx="3.2" cy="8" r="1.15" fill="currentColor" />
                <circle cx="8" cy="8" r="1.15" fill="currentColor" />
                <circle cx="12.8" cy="8" r="1.15" fill="currentColor" />
              </svg>
            }
            items={[
              { id: 'dispatch', label: 'Dispatch', href: CONTROL_ROOM_ROUTES.dispatch },
              ...(o.phone ? ([{ id: 'call', label: 'Call', href: `tel:${o.phone}` }] as const) : []),
              { id: 'edit', label: 'Edit Officer', onClick: onEdit },
              { id: 'fleet', label: 'View Fleet', href: CONTROL_ROOM_ROUTES.fleet },
            ]}
          />
        </div>
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
          ? 'Update profile, employment, ID, PSIRA, and certifications.'
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
          <label>
            Employment
            <select
              value={draft.employmentType}
              onChange={(e) =>
                onChange({ ...draft, employmentType: employmentTypeOf(e.target.value) })
              }
            >
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            ID number
            <input
              value={draft.idNumber}
              onChange={(e) => onChange({ ...draft, idNumber: e.target.value })}
              placeholder="South African ID number"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <label>
            PSIRA number
            <input
              value={draft.psiraNumber}
              onChange={(e) => onChange({ ...draft, psiraNumber: e.target.value })}
              placeholder="e.g. 3018824"
              autoComplete="off"
            />
          </label>
          <label>
            PSIRA grade
            <select
              value={draft.psiraGrade}
              onChange={(e) => onChange({ ...draft, psiraGrade: e.target.value })}
            >
              <option value="">Not set</option>
              {PSIRA_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </label>
          <label className="officer-form-grid__span">
            Certifications
            <input
              value={draft.certifications}
              onChange={(e) => onChange({ ...draft, certifications: e.target.value })}
              placeholder="First aid, firearm competency, HPCSA"
            />
          </label>
          <label>
            Certification expiry
            <input
              type="date"
              value={draft.certificationExpiry}
              onChange={(e) => onChange({ ...draft, certificationExpiry: e.target.value })}
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

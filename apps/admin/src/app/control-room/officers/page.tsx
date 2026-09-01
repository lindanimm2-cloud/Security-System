'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { officerStatusLabel } from '@/lib/officer-status';
import { CONTROL_ROOM_ROUTES, mapHref } from '@/lib/control-room-routes';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { LayoutViewToggle } from '@/components/ui/LayoutViewToggle';
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
  const [layoutView, setLayoutView] = useLayoutView('control-room-officers');

  const officers = data?.data ?? [];
  const filteredOfficers = useMemo(
    () =>
      officers.filter((o) =>
        matchesSearch(
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
        ),
      ),
    [officers, search],
  );

  function openAdd() {
    setFormError('');
    setDraft({ firstName: '', lastName: '', zone: 'Zone A', phone: '', email: '', rank: 'Officer', avatarUrl: null });
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
        ? await adminApi.patch<{ success?: boolean; message?: string }>(`/control-room/officers/${draft.id}`, body)
        : await adminApi.post<{ success?: boolean; message?: string }>('/control-room/officers', body);
      if (res && res.success === false) throw new Error(res.message ?? 'Officer could not be saved');
      setNotice(draft.id ? `${body.firstName} ${body.lastName} updated.` : `${body.firstName} ${body.lastName} added.`);
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

  const available = officers.filter((o) => o.status === 'AVAILABLE').length;
  const active = officers.filter((o) => ['EN_ROUTE', 'BUSY', 'RETURNING'].includes(o.status)).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>
            Manage roster, set status, and view current assignments.
          </p>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>
            <Link href={CONTROL_ROOM_ROUTES.overview} className="interactive-text">Overview</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.dispatch} className="interactive-text">Dispatch</Link>
            {' · '}
            <Link href={mapHref('officers')} className="interactive-text">Live map</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.fleet} className="interactive-text">Fleet</Link>
          </p>
        </div>
        <div className="page-header__actions">
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>
            {available} available · {active} active · {officers.length} total
          </span>
          <button type="button" className="btn-ok" onClick={openAdd}>
            + Add officer
          </button>
        </div>
      </div>

      {notice ? <div className="alert alert--success" role="status">{notice}</div> : null}

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

      <div className="list-toolbar">
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search officers, zone, vehicle…"
            resultCount={filteredOfficers.length}
            totalCount={officers.length}
          />
        </div>
        <LayoutViewToggle value={layoutView} onChange={setLayoutView} label="Officer layout" />
      </div>

      {filteredOfficers.length === 0 ? (
        <EmptyState
          title={search.trim() ? 'No matches' : 'No officers'}
          body={search.trim() ? 'Try a different name, zone, rank, or vehicle.' : 'Add an officer to build the roster.'}
        />
      ) : (
        <div className={`officer-roster ${layoutView === 'list' ? 'officer-roster--list' : ''}`}>
          {filteredOfficers.map((o) => (
            <OfficerCard key={o.id} officer={o} onEdit={() => openEdit(o)} onUpdated={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function OfficerCard({ officer: o, onEdit, onUpdated }: { officer: Officer; onEdit: () => void; onUpdated: () => void }) {
  const avgMin = Math.floor(o.avgResponseSec / 60);
  const avgSec = o.avgResponseSec % 60;
  const fleet = o.assignedFleet;

  return (
    <article className="officer-roster-card">
      {/* Header row */}
      <div className="officer-roster-card__header">
        <button
          type="button"
          className="officer-roster-card__photo"
          onClick={onEdit}
          aria-label={`Edit ${o.firstName} ${o.lastName}`}
        >
          <UserAvatar firstName={o.firstName} lastName={o.lastName} avatarUrl={o.avatarUrl} size="md" />
          <OfficerStatusDot status={o.status} />
        </button>
        <div className="officer-roster-card__info">
          <strong className="officer-roster-card__name">{o.firstName} {o.lastName}</strong>
          <span className="officer-roster-card__rank text-muted">{o.rank ?? 'Officer'}</span>
          <div className="officer-roster-card__meta">
            {o.zone && <span>{o.zone}</span>}
            <span>Avg {avgMin}m {avgSec}s</span>
            {o.phone && <a href={`tel:${o.phone}`} className="interactive-text">{o.phone}</a>}
          </div>
        </div>
        <span className={`badge badge--status badge--status-${o.status.toLowerCase().replace(/_/g, '-')}`}>
          {officerStatusLabel(o.status)}
        </span>
      </div>

      {/* Assignment info */}
      {fleet ? (
        <div className="officer-assignment-bar">
          <div className="officer-assignment-bar__vehicle">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 11h13l4 4v4H3z"/><path d="M5 11V8a2 2 0 0 1 2-2h6l3 5"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/></svg>
            <strong>{fleet.callSign}</strong>
            <code className="site-detail__code">{fleet.registration}</code>
            <span className="text-muted">{fleet.teamName}</span>
          </div>
          <div className="officer-assignment-bar__right">
            <span className={`badge badge--${fleet.status === 'ON_DUTY' ? 'ok' : fleet.status === 'MAINTENANCE' ? 'warn' : 'info'}`}>
              {fleet.status.replace(/_/g, ' ')}
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {fleet.seatRole ?? 'Crew'}
              {fleet.crewNames.length > 0 ? ` · with ${fleet.crewNames.slice(0, 2).join(', ')}${fleet.crewNames.length > 2 ? ` +${fleet.crewNames.length - 2}` : ''}` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="officer-assignment-bar officer-assignment-bar--none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
          <span className="text-muted">No vehicle assigned</span>
        </div>
      )}

      {/* Status controls */}
      <OfficerStatusControl officerId={o.id} status={o.status} onUpdated={onUpdated} />

      {/* Actions */}
      <div className="officer-roster-card__links">
        <button type="button" className="btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>
        <Link href={mapHref('officers')} className="btn-sm btn-sm--link">Map</Link>
        <Link href={CONTROL_ROOM_ROUTES.dispatch} className="btn-sm btn-sm--link">Dispatch</Link>
        {o.phone && (
          <a href={`tel:${o.phone}`} className="btn-sm btn-sm--link">Call</a>
        )}
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
    if (!file.type.startsWith('image/')) { onAvatarError('Please choose a JPG or PNG image.'); e.target.value = ''; return; }
    if (file.size > MAX_AVATAR_BYTES) { onAvatarError('Image must be 500 KB or smaller.'); e.target.value = ''; return; }
    onAvatarError('');
    const reader = new FileReader();
    reader.onload = () => onChange({ ...draft, avatarUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <OpsDialog
      title={editing ? `Edit ${draft.firstName} ${draft.lastName}`.trim() : 'Add officer'}
      subtitle={editing ? 'Update profile, contact details, zone, and rank.' : 'Fill in the officer\'s details to add them to the roster.'}
      onClose={onClose}
      wide
    >
      {error ? <ErrorAlert error={error} /> : null}
      <form className="stack-form" onSubmit={onSave}>

        {/* Avatar row */}
        <div className="user-form-avatar-row">
          <UserAvatar
            firstName={draft.firstName || '?'}
            lastName={draft.lastName || '?'}
            avatarUrl={draft.avatarUrl}
            size="lg"
          />
          <div className="user-form-avatar-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              {draft.avatarUrl ? 'Change photo' : 'Add photo'}
            </button>
            {draft.avatarUrl && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => onChange({ ...draft, avatarUrl: null })}>
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} />
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>JPG or PNG, max 500 KB</span>
          </div>
        </div>

        <div className="officer-form-grid">
          <label>
            First name
            <input value={draft.firstName} onChange={(e) => onChange({ ...draft, firstName: e.target.value })} required placeholder="e.g. Sipho" />
          </label>
          <label>
            Last name
            <input value={draft.lastName} onChange={(e) => onChange({ ...draft, lastName: e.target.value })} required placeholder="e.g. Ndlovu" />
          </label>
          <label>
            Rank / title
            <input value={draft.rank} onChange={(e) => onChange({ ...draft, rank: e.target.value })} placeholder="e.g. Senior Officer" />
          </label>
          <label>
            Zone
            <input value={draft.zone} onChange={(e) => onChange({ ...draft, zone: e.target.value })} placeholder="Zone A" />
          </label>
          <label>
            Phone
            <input type="tel" value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} placeholder="+27 83 111 0001" />
          </label>
          <label>
            Email
            <input type="email" value={draft.email} onChange={(e) => onChange({ ...draft, email: e.target.value })} placeholder="officer@4ds.local" />
          </label>
        </div>

        <div className="fleet-form__actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-ok" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save officer' : 'Add officer'}
          </button>
        </div>
      </form>
    </OpsDialog>
  );
}

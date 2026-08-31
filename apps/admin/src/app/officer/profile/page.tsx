'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { ChangeEvent, useRef, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { ThemeSettings } from '@/components/ThemeSettings';
import { OfficerStatusPicker } from '@/components/officer/OfficerStatusPicker';
import { OfficerStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

const MAX_AVATAR_BYTES = 500 * 1024;

type OfficerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  zone: string | null;
  status: string;
  avgResponseSec: number;
  avatarUrl?: string | null;
};

type DashboardStats = {
  completedToday: number;
  avgResponseFormatted: string;
};

export default function OfficerProfilePage() {
  return (
    <OfficerLayout title="Profile & Shift">
      <ProfileContent />
    </OfficerLayout>
  );
}

function fmt(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ProfileContent() {
  const { data: profileData, loading: profileLoading, error: profileError, reload: reloadProfile } = useApi(
    () => officerApi.get<ApiResponse<OfficerProfile>>('/officer/profile'),
    [],
  );
  const { data: dashData } = useApi(
    () => officerApi.get<ApiResponse<{ stats: DashboardStats }>>('/officer/dashboard'),
    [],
  );
  const [editOpen, setEditOpen] = useState(false);

  if (profileLoading) return <LoadingSpinner label="Loading profile…" fullScreen />;
  if (profileError) return <ErrorAlert error={profileError} onRetry={reloadProfile} />;

  const o = profileData!.data;
  const stats = dashData?.data?.stats;
  const empId = o.email.split('@')[0].toUpperCase();

  return (
    <>
      {/* Profile hero */}
      <section className="portal-card profile-section">
        <div className="profile-hero-main">
          <div className="officer-profile-avatar">
            <UserAvatar
              firstName={o.firstName}
              lastName={o.lastName}
              avatarUrl={o.avatarUrl}
              size="lg"
            />
            <span className={`officer-dot officer-dot--${o.status.toLowerCase().replace(/_/g, '-')}`} aria-label={o.status} />
          </div>
          <div className="profile-hero-copy">
            <h2 className="profile-hero-name">{o.firstName} {o.lastName}</h2>
            <p className="text-muted">{o.email}</p>
            {o.phone && (
              <a href={`tel:${o.phone}`} className="text-muted profile-hero-phone">
                {o.phone}
              </a>
            )}
            <p className="text-muted">Zone: {o.zone ?? 'Unassigned'}</p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
            Edit profile
          </button>
        </div>

        <dl className="profile-summary-grid" style={{ marginTop: '1rem' }}>
          <div className="profile-summary-item">
            <dt>Status</dt>
            <dd><OfficerStatusBadge status={o.status} /></dd>
          </div>
          <div className="profile-summary-item">
            <dt>Completed today</dt>
            <dd>{stats?.completedToday ?? '—'}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Avg response</dt>
            <dd>{fmt(o.avgResponseSec)}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Employee ID</dt>
            <dd>{empId}</dd>
          </div>
        </dl>
      </section>

      {/* Shift status */}
      <section id="shift" className="portal-card profile-section">
        <div className="card-header-row">
          <h2>Shift status</h2>
          <OfficerStatusBadge status={o.status} />
        </div>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Update your availability for dispatch assignment.
        </p>
        <OfficerStatusPicker status={o.status} onUpdated={reloadProfile} />
      </section>

      {/* Theme */}
      <section className="portal-card profile-section">
        <ThemeSettings />
      </section>

      {/* Edit profile dialog */}
      {editOpen && (
        <EditProfileDialog
          officer={o}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); reloadProfile(); }}
        />
      )}
    </>
  );
}

function EditProfileDialog({
  officer,
  onClose,
  onSaved,
}: {
  officer: OfficerProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState(officer.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(officer.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPG or PNG image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image must be 500 KB or smaller.');
      e.target.value = '';
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await officerApi.patch('/officer/profile', {
        phone: phone.trim() || null,
        avatarUrl,
      });
      onSaved();
    } catch (ex) {
      setError(friendlyErrorMessage(ex, 'save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OpsDialog
      title="Edit profile"
      subtitle="Update your contact details and photo."
      onClose={onClose}
    >
      {error && <ErrorAlert error={error} />}

      <div className="user-form-avatar-row">
        <div className="officer-profile-avatar officer-profile-avatar--md">
          <UserAvatar
            firstName={officer.firstName}
            lastName={officer.lastName}
            avatarUrl={avatarUrl}
            size="md"
          />
        </div>
        <div className="user-form-avatar-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            Upload photo
          </button>
          {avatarUrl && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAvatarUrl(null)}>
              Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} />
          <span className="text-muted">JPG or PNG · max 500 KB</span>
        </div>
      </div>

      <div className="stack-form">
        <label className="form-field">
          <span>Name</span>
          <input value={`${officer.firstName} ${officer.lastName}`} readOnly />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input value={officer.email} readOnly />
        </label>
        <label className="form-field">
          <span>Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 000 0000"
          />
        </label>
      </div>

      <div className="profile-form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </OpsDialog>
  );
}

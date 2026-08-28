'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemeSettings } from '@/components/ThemeSettings';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { updateSessionUser } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type StaffProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle: string | null;
  phone: string | null;
  tenant?: { name: string };
};

export function StaffSelfProfile({
  heading,
  homeHref,
  homeLabel,
}: {
  heading: string;
  homeHref: string;
  homeLabel: string;
}) {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<StaffProfile>>('/auth/me'),
    [],
  );
  const [editOpen, setEditOpen] = useState(false);

  if (loading) return <LoadingSpinner label="Loading profile..." />;
  if (error || !data?.data) {
    return <ErrorAlert error={error ?? 'Failed to load profile'} onRetry={reload} />;
  }

  const p = data.data;

  return (
    <div className="page-content">
      <section className="portal-card profile-section">
        <div className="profile-hero-main">
          <div className="officer-profile-avatar">
            <UserAvatar firstName={p.firstName} lastName={p.lastName} size="lg" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 0.15rem' }}>
              {p.firstName} {p.lastName}
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {heading}
            </p>
            <p className="text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }}>
              {p.email}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
            Edit profile
          </button>
        </div>
        <dl className="profile-summary-grid" style={{ marginTop: '1rem' }}>
          <div className="profile-summary-item">
            <dt>Role</dt>
            <dd>{roleDisplayLabel(p.role)}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Job title</dt>
            <dd>{p.jobTitle || '—'}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Phone</dt>
            <dd>{p.phone || '—'}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Organisation</dt>
            <dd>{p.tenant?.name || '4DS'}</dd>
          </div>
        </dl>
      </section>

      <section className="portal-card profile-section">
        <div className="entity-card-actions">
          <Link href={homeHref} className="btn-primary">
            {homeLabel}
          </Link>
          <a href="tel:+27110000000" className="btn-secondary">
            Call control room
          </a>
        </div>
      </section>

      <section className="portal-card profile-section">
        <ThemeSettings />
      </section>

      {editOpen ? (
        <OpsDialog title="Edit profile" onClose={() => setEditOpen(false)}>
          <StaffEditForm
            profile={p}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              void reload();
            }}
          />
        </OpsDialog>
      ) : null}
    </div>
  );
}

function StaffEditForm({
  profile,
  onClose,
  onSaved,
}: {
  profile: StaffProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      await adminApi.patch('/auth/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
      });
      updateSessionUser('admin', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error ? <ErrorAlert error={error} /> : null}
      <label>
        First name
        <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </label>
      <label>
        Last name
        <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </label>
      <label>
        Phone
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Job title
        <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </label>
      <div className="entity-card-actions" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemeSettings } from '@/components/ThemeSettings';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import { getSession, updateSessionUser } from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type TechJob = {
  id: string;
  title: string;
  status: string;
  address?: string;
};

type TechProfile = {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
  jobTitle?: string | null;
  branch?: { name: string; code: string } | null;
  teams?: { id: string; name: string; isLead: boolean }[];
  stats?: { scheduled: number; active: number; completed: number };
  jobs?: TechJob[];
};

export default function TechProfilePage() {
  return (
    <TechLayout title="My Profile">
      <TechProfileContent />
    </TechLayout>
  );
}

function TechProfileContent() {
  const session = getSession('technician');
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TechProfile>>('/store/tech/me'),
    [],
  );
  const [editOpen, setEditOpen] = useState(false);

  if (loading) return <LoadingSpinner label="Loading profile..." />;
  if (error && !data?.data) {
    return <ErrorAlert message={error} onRetry={reload} />;
  }

  const p = data?.data;
  const firstName = p?.firstName || session?.user.firstName || 'Technician';
  const lastName = p?.lastName || session?.user.lastName || '';
  const email = p?.email || session?.user.email || '—';
  const phone = p?.phone || session?.user.phone || null;
  const jobTitle = p?.jobTitle || session?.user.jobTitle || 'Technician';
  const teams = p?.teams ?? [];
  const stats = p?.stats ?? { scheduled: 0, active: 0, completed: 0 };
  const initials = `${firstName[0] ?? 'T'}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="page-content">
      <section className="portal-card profile-section">
        <div className="profile-hero-main">
          <div className="officer-profile-avatar">
            <div className="officer-profile-avatar__initials">{initials}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 0.15rem' }}>
              {firstName} {lastName}
            </h2>
            <p className="text-muted" style={{ margin: '0 0 0.1rem', fontSize: '0.85rem' }}>
              {email}
            </p>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="text-muted"
                style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.1rem' }}
              >
                {phone}
              </a>
            ) : null}
            <p className="text-muted" style={{ fontSize: '0.82rem', margin: 0 }}>
              {jobTitle}
              {p?.branch ? ` · ${p.branch.name} (${p.branch.code})` : ''}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
            Edit profile
          </button>
        </div>

        <dl className="profile-summary-grid" style={{ marginTop: '1rem' }}>
          <div className="profile-summary-item">
            <dt>Active jobs</dt>
            <dd>{stats.active}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Scheduled</dt>
            <dd>{stats.scheduled}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Completed</dt>
            <dd>{stats.completed}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Team</dt>
            <dd>
              {teams.length
                ? teams.map((t) => `${t.name}${t.isLead ? ' · Lead' : ''}`).join(', ')
                : 'Unassigned'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="portal-card profile-section">
        <div className="card-header-row">
          <h2>Shortcuts</h2>
        </div>
        <div className="entity-card-actions" style={{ marginTop: '0.75rem' }}>
          <Link href="/tech/jobs" className="btn-primary">
            Open jobs
          </Link>
          <Link href="/tech/team" className="btn-secondary">
            My team
          </Link>
          <Link href="/tech/chat" className="btn-secondary">
            Team chat
          </Link>
          <a href="tel:+27110000000" className="btn-secondary">
            Call control room
          </a>
        </div>
      </section>

      <section className="portal-card profile-section">
        <ThemeSettings />
      </section>

      {editOpen && (
        <TechEditDialog
          firstName={firstName}
          lastName={lastName}
          phone={phone ?? ''}
          jobTitle={jobTitle}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function TechEditDialog({
  firstName,
  lastName,
  phone,
  jobTitle,
  onClose,
  onSaved,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nextFirst, setNextFirst] = useState(firstName);
  const [nextLast, setNextLast] = useState(lastName);
  const [nextPhone, setNextPhone] = useState(phone);
  const [nextTitle, setNextTitle] = useState(jobTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      await techApi.patch('/auth/me', {
        firstName: nextFirst.trim(),
        lastName: nextLast.trim(),
        phone: nextPhone.trim() || null,
        jobTitle: nextTitle.trim() || null,
      });
      updateSessionUser('technician', {
        firstName: nextFirst.trim(),
        lastName: nextLast.trim(),
        phone: nextPhone.trim() || null,
        jobTitle: nextTitle.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OpsDialog title="Edit profile" subtitle="Update how control room sees you." onClose={onClose}>
      {error ? <ErrorAlert message={error} /> : null}
      <label>
        First name
        <input className="input" value={nextFirst} onChange={(e) => setNextFirst(e.target.value)} />
      </label>
      <label>
        Last name
        <input className="input" value={nextLast} onChange={(e) => setNextLast(e.target.value)} />
      </label>
      <label>
        Phone
        <input className="input" value={nextPhone} onChange={(e) => setNextPhone(e.target.value)} />
      </label>
      <label>
        Job title
        <input className="input" value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} />
      </label>
      <div className="entity-card-actions" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </OpsDialog>
  );
}

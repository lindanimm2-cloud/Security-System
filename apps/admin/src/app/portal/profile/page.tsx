'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  type LoyaltySummary,
} from '@/components/loyalty/LoyaltySummaryCard';
import { ThemeSettings } from '@/components/ThemeSettings';
import { PortalPermissionsSection } from '@/components/portal/PortalPermissions';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { FamilyProfilePopup, type FamilyProfilePerson } from '@/components/portal/FamilyProfilePopup';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Profile = {
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role?: string;
  roleLabel?: string;
  trackingEnabled: boolean;
  lastLocationAt: string | null;
  createdAt: string;
  tenant: { name: string; slug: string };
};

type Family = {
  id: string;
  name: string;
  owner: string;
  members: FamilyProfilePerson[];
};

type Subscription = {
  planName?: string;
  tierName?: string;
  status: string;
  memberId: string;
  validUntil: string;
  access?: Record<string, boolean>;
  isOverdue?: boolean;
} | null;

export default function ProfilePage() {
  return (
    <PortalLayout>
      <ProfileContent />
    </PortalLayout>
  );
}

function ProfileContent() {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [phone, setPhone] = useState('');
  const [tracking, setTracking] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<FamilyProfilePerson | null>(null);

  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Profile>>('/client/profile'),
    [],
  );
  const { data: familyData } = useApi(
    () => clientApi.get<ApiResponse<Family | null>>('/client/family'),
    [],
  );
  const { data: subData } = useApi(
    () => clientApi.get<ApiResponse<Subscription>>('/client/subscription'),
    [],
  );
  const { data: loyaltyRes } = useApi(
    () => clientApi.get<ApiResponse<LoyaltySummary>>('/client/loyalty'),
    [],
  );

  useEffect(() => {
    if (data?.data) {
      setPhone(data.data.phone ?? '');
      setTracking(data.data.trackingEnabled);
    }
  }, [data]);

  if (loading) return <LoadingSpinner label="Loading profile..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const p = data!.data;
  const family = familyData?.data ?? null;
  const subscription = subData?.data ?? null;
  const loyalty = loyaltyRes?.data ?? null;
  const fullName = `${p.firstName} ${p.lastName}`;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await clientApi.patch('/client/profile', { phone, trackingEnabled: tracking });
      setSaveMsg('Profile saved.');
      setEditing(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setPhone(p.phone ?? '');
    setTracking(p.trackingEnabled);
    setEditing(false);
    setSaveMsg('');
  }

  return (
    <div className="page-content page-content--profile">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="text-muted">Your account, family, and protection settings.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Edit profile
        </button>
      </div>

      {saveMsg && (
        <div className="alert alert--success" role="status">
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
              <span className={`status-pill ${p.trackingEnabled ? 'status-pill--ok' : ''}`}>
                {p.trackingEnabled ? 'Tracking on' : 'Tracking off'}
              </span>
              <span className="status-pill">
                {p.roleLabel ?? (p.role === 'FAMILY_MEMBER' ? 'Family member' : 'Primary subscriber')}
              </span>
              {subscription?.status === 'ACTIVE' && (
                <span className="status-pill status-pill--ok">Protected</span>
              )}
              {subscription?.isOverdue && (
                <span className="status-pill status-pill--past_due">Past due</span>
              )}
              {loyalty && (
                <span className="status-pill">
                  {loyalty.tierName} · {loyalty.effectiveDiscountPercent}% off
                </span>
              )}
            </div>
          </div>
        </div>
        {subscription && (
          <div className="profile-hero-meta">
            <span className="text-muted">Plan</span>
            <strong>{subscription.planName ?? subscription.tierName}</strong>
            <Link href="/portal/subscription" className="link-sm">
              Manage plan
            </Link>
          </div>
        )}
      </section>

      {loyalty && (
        <section className="portal-card profile-section" style={{ padding: '0.85rem 1.1rem' }}>
          <div className="card-header-row" style={{ marginBottom: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Loyalty</h2>
              <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
                {loyalty.points.toLocaleString()} pts · {loyalty.tierName} ·{' '}
                {loyalty.effectiveDiscountPercent}% off cover &amp; store
              </p>
            </div>
            <Link href="/portal/subscription" className="link-sm">
              Manage →
            </Link>
          </div>
        </section>
      )}

      {subscription?.access && (
        <section className="portal-card profile-section">
          <div className="card-header-row">
            <h2>Your cover</h2>
            <Link href="/portal/subscription" className="link-sm">Manage plan →</Link>
          </div>
          <p className="text-muted">
            Coverage included on your plan
            {p.role === 'FAMILY_MEMBER' ? ' as a family member' : ' as the primary subscriber'}.
          </p>
          <ul className="status-list">
            {(['home', 'vehicle', 'family', 'medical'] as const)
              .filter((key) => subscription.access?.[key])
              .map((key) => (
                <li key={key} className="status-list-item">
                  <span className="status-list-link" style={{ textTransform: 'capitalize' }}>
                    {key}
                  </span>
                  <span className="status-pill status-pill--ok">Included</span>
                </li>
              ))}
          </ul>
          {!(['home', 'vehicle', 'family', 'medical'] as const).some(
            (key) => subscription.access?.[key],
          ) && (
            <p className="text-muted">
              Personal emergency cover is always available. Add home, vehicle, family, or medical modules from Subscription.
            </p>
          )}
        </section>
      )}

      <div className="profile-layout">
        <section className="portal-card profile-section">
          <div className="card-header-row">
            <h2>Saved profile</h2>
            <button type="button" className="link-sm profile-inline-edit" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
          <dl className="profile-summary-grid">
            <ProfileField label="Full name" value={fullName} />
            <ProfileField label="Email" value={p.email} />
            <ProfileField label="Phone" value={p.phone ?? 'Not set'} />
            <ProfileField label="Organization" value={p.tenant.name} />
            <ProfileField
              label="GPS tracking"
              value={p.trackingEnabled ? 'Enabled' : 'Disabled'}
            />
            <ProfileField
              label="Member since"
              value={
                p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'
              }
            />
            {subscription && (
              <ProfileField label="Member ID" value={subscription.memberId} full />
            )}
          </dl>
        </section>

        <section className="portal-card profile-section">
          <div className="card-header-row">
            <h2>Family</h2>
            <Link href="/portal/family" className="btn-secondary btn-sm">
              Add family member
            </Link>
          </div>
          {family && family.members.length > 0 ? (
            <ul className="profile-family-list">
              {family.members.map((m) => (
                <li key={m.id} className="profile-family-item">
                  <button
                    type="button"
                    className="profile-family-link"
                    onClick={() => setSelectedFamily(m)}
                  >
                    <div className="avatar avatar--admin">
                      {(m.nickname ?? m.name)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <strong>{m.nickname ?? m.name}</strong>
                      <span className="text-muted">{m.name}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`status-dot ${m.trackingEnabled ? 'status-dot--on' : ''}`}
                    onClick={() => setSelectedFamily(m)}
                  >
                    {m.trackingEnabled ? 'Tracking' : 'Offline'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted profile-empty">
              No family members linked yet. Add members to share location and receive alerts together.
            </p>
          )}
          <Link href="/portal/family" className="link-sm profile-section-link">
            Manage family safety →
          </Link>
        </section>

        <PortalPermissionsSection />

        <section className="portal-card profile-section">
          <ThemeSettings />
        </section>

        <section className="portal-card profile-section">
          <h2>Account &amp; protection</h2>
          <div className="profile-links-grid">
            <Link href="/portal/medical" className="profile-link-card">
              <span className="profile-link-icon">🏥</span>
              <span className="profile-link-label">Medical profile</span>
              <span className="text-muted">Emergency health info</span>
            </Link>
            <Link href="/portal/contacts" className="profile-link-card">
              <span className="profile-link-icon">📞</span>
              <span className="profile-link-label">Emergency contacts</span>
              <span className="text-muted">People to notify</span>
            </Link>
            <Link href="/portal/security/devices" className="profile-link-card">
              <span className="profile-link-icon">📱</span>
              <span className="profile-link-label">Trusted devices</span>
              <span className="text-muted">Primary, lock, mark lost</span>
            </Link>
            <Link href="/portal/security/lockdown" className="profile-link-card">
              <span className="profile-link-icon">🔒</span>
              <span className="profile-link-label">Lockdown</span>
              <span className="text-muted">Revoke sessions</span>
            </Link>
            <Link href="/portal/security/activity" className="profile-link-card">
              <span className="profile-link-icon">📋</span>
              <span className="profile-link-label">Security activity</span>
              <span className="text-muted">Audited events</span>
            </Link>
            <Link href="/portal/subscription" className="profile-link-card">
              <span className="profile-link-icon">🛡️</span>
              <span className="profile-link-label">Subscription</span>
              <span className="text-muted">
                {subscription ? (subscription.planName ?? subscription.tierName) : 'View plan'}
              </span>
            </Link>
            <Link href="/portal/vehicles" className="profile-link-card">
              <span className="profile-link-icon">🚗</span>
              <span className="profile-link-label">Vehicles</span>
              <span className="text-muted">Registered assets</span>
            </Link>
            <Link href="/portal/home" className="profile-link-card">
              <span className="profile-link-icon">🏠</span>
              <span className="profile-link-label">Properties</span>
              <span className="text-muted">Home security</span>
            </Link>
            <Link href="/portal/family/chat" className="profile-link-card">
              <span className="profile-link-icon">💬</span>
              <span className="profile-link-label">Family chat</span>
              <span className="text-muted">Opt-in family only</span>
            </Link>
            <Link href="/portal/emergency" className="profile-link-card">
              <span className="profile-link-icon">🚨</span>
              <span className="profile-link-label">Emergency Hub</span>
              <span className="text-muted">Control room always on</span>
            </Link>
          </div>
        </section>
      </div>
      {editing && (
        <OpsDialog
          title="Edit profile"
          subtitle="Update your contact details and tracking preferences."
          onClose={cancelEdit}
        >
          <form className="profile-edit-form" onSubmit={handleSave}>
            <label className="form-field">
              <span>Full name</span>
              <input value={fullName} disabled />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input value={p.email} disabled />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 000 0000"
              />
            </label>
            <label className="form-field">
              <span>Organization</span>
              <input value={p.tenant.name} disabled />
            </label>
            <label className="checkbox-label profile-checkbox">
              <input
                type="checkbox"
                checked={tracking}
                onChange={(e) => setTracking(e.target.checked)}
              />
              Enable GPS tracking
            </label>
            <div className="profile-form-actions">
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <LoadingSpinner label="" size="sm" /> : 'Save changes'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}
      {selectedFamily ? (
        <FamilyProfilePopup person={selectedFamily} onClose={() => setSelectedFamily(null)} />
      ) : null}
    </div>
  );
}

function ProfileField({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={`profile-summary-item ${full ? 'profile-summary-item--full' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

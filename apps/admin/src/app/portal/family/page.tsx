'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import {
  FamilyProfilePopup,
  type FamilyProfilePerson,
} from '@/components/portal/FamilyProfilePopup';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Family = {
  id: string;
  name: string;
  owner: string;
  familyMessagingEnabled?: boolean;
  members: FamilyProfilePerson[];
};

export default function FamilyPage() {
  return (
    <PortalLayout>
      <FamilyContent />
    </PortalLayout>
  );
}

function FamilyContent() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Family | null>>('/client/family'),
    [],
  );
  const [selected, setSelected] = useState<FamilyProfilePerson | null>(null);

  if (loading || accessLoading) return <LoadingSpinner label="Loading family..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const family = data!.data;
  if (!family) return <div className="empty-state">No family group linked yet.</div>;

  const hasFamily = access?.family ?? false;

  return (
    <div className="page-content">
      {!hasFamily && <UpgradeBanner addon="FAMILY" title="Family Safety Pack" price="R 150" />}
      <div className="page-header">
        <div>
          <h1>{family.name}</h1>
          <p className="text-muted">Family safety, live tracking, and welfare monitoring. Owner: {family.owner}</p>
        </div>
        <Link href="/portal/safe-zones" className="btn-secondary">Safe Zones</Link>
        <Link href="/portal/family/chat" className="btn-secondary">Family Chat</Link>
        <Link href="/portal/family#add-member" className="btn-ghost btn-sm">+ Add member</Link>
      </div>

      <section className="portal-card mb-2">
        <h2>Family messaging</h2>
        <p className="text-muted">
          Messaging is <strong>off by default</strong>. When enabled, you can only chat with linked family
          members who have the app and have also turned messaging on. Control room contact is always
          available through the <Link href="/portal/emergency">Emergency Hub</Link> — no outside communication.
        </p>
        <p className="text-muted">
          Status: {family.familyMessagingEnabled ? 'Enabled' : 'Disabled'} ·{' '}
          {family.members.filter((m) => m.familyMessagingEnabled).length} of {family.members.length} members active
        </p>
        <Link href="/portal/family/chat" className="btn-secondary">
          {family.familyMessagingEnabled ? 'Open family chat' : 'Enable family messaging'}
        </Link>
      </section>
      <div className="member-grid">
        {family.members.map((m) => (
          <button
            key={m.id}
            type="button"
            className="member-card member-card--safety member-card--link"
            onClick={() => setSelected(m)}
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
              <span className={`status-dot ${m.trackingEnabled ? 'status-dot--on' : ''}`}>
                {m.trackingEnabled ? 'Protected · tracking on' : 'Tracking off'}
              </span>
              {m.lastLocationAt ? <span className="text-muted">Last seen: recently</span> : null}
              <span className="member-card__hint">View profile</span>
            </div>
          </button>
        ))}
      </div>
      {selected ? <FamilyProfilePopup person={selected} onClose={() => setSelected(null)} /> : null}
      <section id="add-member" className="portal-card profile-section page-section">
        <h2>Add family member</h2>
        <p className="text-muted">
          Invite a spouse, child, or dependent to your family group. They will appear on your family map and receive shared alerts.
        </p>
        <div className="profile-form-actions profile-form-actions--flat">
          <Link href="/portal/emergency" className="btn-secondary">
            Emergency Hub
          </Link>
          <Link href="/portal/contacts" className="btn-ghost">
            + Add emergency contact
          </Link>
        </div>
      </section>
      <div className="feature-grid page-section">
        <Link href="/portal/safe-zones" className="feature-card">
          <h3>Child Protection</h3>
          <p>Monitoring and emergency features designed for children.</p>
          <span className="feature-action">Safe zones →</span>
        </Link>
        <Link href="/portal/safe-zones" className="feature-card">
          <h3>Elderly Monitoring</h3>
          <p>Enhanced assistance and welfare features for elderly family members.</p>
          <span className="feature-action">Safe zones →</span>
        </Link>
        <Link href="/portal/location" className="feature-card">
          <h3>Family Tracking</h3>
          <p>View authorised family members&apos; live locations and history.</p>
          <span className="feature-action">Open tracking →</span>
        </Link>
      </div>
    </div>
  );
}

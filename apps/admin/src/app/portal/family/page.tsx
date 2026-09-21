'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import {
  FamilyProfilePopup,
  type FamilyProfilePerson,
} from '@/components/portal/FamilyProfilePopup';
import { UiSelect } from '@/components/ui/UiSelect';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { FAMILY_RELATIONSHIP_OPTIONS } from '@/lib/family-relationships';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type Family = {
  id: string;
  name: string;
  owner: string;
  ownerUserId?: string;
  isOwner?: boolean;
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
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    relationship: '',
  });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{
    name: string;
    code: string;
    url: string;
    relationship: string;
  } | null>(null);

  if (loading || accessLoading) return <LoadingSpinner label="Loading family..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const family = data!.data;
  if (!family) return <div className="empty-state">No family group linked yet.</div>;

  const hasFamily = access?.family ?? false;
  const canInvite = family.isOwner !== false;

  async function inviteMember(e: FormEvent) {
    e.preventDefault();
    if (!inviteForm.relationship.trim()) {
      setInviteError('Select a family relationship type (Spouse, Child, Parent, …).');
      return;
    }
    setInviteSaving(true);
    setInviteError('');
    try {
      const res = await clientApi.post<
        ApiResponse<{
          firstName: string;
          lastName: string;
          email: string;
          relationship: string;
          inviteToken?: string | null;
          inviteCode?: string | null;
          inviteUrl?: string | null;
        }>
      >('/client/family/members', {
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        relationship: inviteForm.relationship.trim(),
      });
      const code = res.data.inviteCode ?? res.data.inviteToken ?? '';
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3010';
      const path = res.data.inviteUrl ?? `/portal/register?token=${encodeURIComponent(code)}`;
      const url = path.startsWith('http') ? path : `${origin}${path}`;
      setCreatedInvite({
        name: `${res.data.firstName} ${res.data.lastName}`.trim() || res.data.email,
        code,
        url,
        relationship: res.data.relationship,
      });
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        relationship: '',
      });
      void reload();
    } catch (err) {
      setInviteError(friendlyErrorMessage(err, 'save'));
    } finally {
      setInviteSaving(false);
    }
  }

  return (
    <div className="page-content">
      {!hasFamily && <UpgradeBanner addon="FAMILY" title="Family Safety Pack" price="R 150" />}
      <div className="page-header">
        <div>
          <h1>{family.name}</h1>
          <p className="text-muted">
            Family safety, live tracking, and welfare monitoring. Owner: {family.owner}
          </p>
        </div>
        <Link href="/portal/safe-zones" className="btn-secondary">
          Safe Zones
        </Link>
        <Link href="/portal/family/chat" className="btn-secondary">
          Family Chat
        </Link>
        {canInvite ? (
          <a href="#add-member" className="btn-ghost btn-sm">
            + Add member
          </a>
        ) : null}
      </div>

      <section className="portal-card mb-2">
        <h2>Family messaging</h2>
        <p className="text-muted">
          Messaging is <strong>off by default</strong>. When enabled, you can only chat with linked family
          members who have the app and have also turned messaging on. Control room contact is always
          available through the <Link href="/portal/emergency">Emergency Hub</Link> — no outside
          communication.
        </p>
        <p className="text-muted">
          Status: {family.familyMessagingEnabled ? 'Enabled' : 'Disabled'} ·{' '}
          {family.members.filter((m) => m.familyMessagingEnabled).length} of {family.members.length}{' '}
          members active
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
              {m.relationship ? <span className="text-muted">{m.relationship}</span> : null}
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
          Invite a spouse, child, or dependent to your family group. They will appear on your family
          map and receive shared alerts.
        </p>
        {!canInvite ? (
          <p className="text-muted">
            Only the household account holder can send family invites. Ask {family.owner} to add
            someone, or add an emergency contact instead.
          </p>
        ) : createdInvite ? (
          <div className="stack-form">
            <p>
              Invite ready for <strong>{createdInvite.name}</strong>
              {createdInvite.relationship ? ` (${createdInvite.relationship})` : ''}. Share this code
              so they can activate the panic app.
            </p>
            <p
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textAlign: 'center',
                margin: '0.35rem 0',
              }}
            >
              {createdInvite.code}
            </p>
            <div className="invite-link-box__row">
              <input readOnly value={createdInvite.url} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInvite.url);
                }}
              >
                Copy link
              </button>
            </div>
            <div className="profile-form-actions profile-form-actions--flat">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInvite.code);
                }}
              >
                Copy code
              </button>
              <button type="button" className="btn-ghost" onClick={() => setCreatedInvite(null)}>
                Invite another
              </button>
            </div>
          </div>
        ) : (
          <form className="stack-form" onSubmit={(e) => void inviteMember(e)}>
            {inviteError ? <ErrorAlert error={inviteError} /> : null}
            <div className="form-row-2">
              <label>
                First name
                <input
                  required
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                />
              </label>
              <label>
                Last name
                <input
                  required
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row-2">
              <label>
                Email
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  placeholder="+27 …"
                />
              </label>
            </div>
            <label>
              Relationship type
              <UiSelect
                compact={false}
                ariaLabel="Family relationship"
                placeholder="Select relationship…"
                value={inviteForm.relationship}
                onChange={(relationship) => setInviteForm({ ...inviteForm, relationship })}
                options={[
                  { value: '', label: '— Select —' },
                  ...FAMILY_RELATIONSHIP_OPTIONS.filter((r) => r !== 'Account holder').map((r) => ({
                    value: r,
                    label: r,
                  })),
                ]}
              />
            </label>
            <div className="profile-form-actions profile-form-actions--flat">
              <button type="submit" className="btn-ok" disabled={inviteSaving}>
                {inviteSaving ? 'Sending invite…' : 'Send invite'}
              </button>
              <Link href="/portal/contacts" className="btn-ghost">
                + Add emergency contact
              </Link>
            </div>
          </form>
        )}
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

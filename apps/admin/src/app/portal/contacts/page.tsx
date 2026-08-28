'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UiSelect } from '@/components/ui/UiSelect';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import {
  EmergencyCallButton,
  EmergencyDispatchCallCard,
  formatZaPhone,
} from '@/components/portal/EmergencyCallButton';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  priority: number;
  linkedUserId?: string | null;
  linkedUserName?: string | null;
  isDispatch?: boolean;
  verifiedAt?: string | null;
};

type ContactsResponse = {
  data: Contact[];
  meta?: { dispatchLine: { name: string; phone: string } };
};

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Aunt / Uncle',
  'Cousin',
  'Guardian',
  'Caregiver',
  'Neighbor',
  'Friend',
];

function relationshipSelectValue(value: string) {
  if (!value.trim()) return '';
  return RELATIONSHIP_OPTIONS.includes(value) ? value : 'Other';
}

function isSystemDispatch(c: Contact) {
  if (c.isDispatch) return true;
  const text = `${c.name} ${c.relationship ?? ''}`.toLowerCase();
  return text.includes('dispatch') || text.includes('4ds') || c.relationship?.toLowerCase() === 'security';
}

function formatVerified(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContactsPage() {
  return (
    <PortalLayout>
      <ContactsContent />
    </PortalLayout>
  );
}

function ContactsContent() {
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Contact[]> & { meta?: ContactsResponse['meta'] }>('/client/contacts'),
    [],
  );
  const [showForm, setShowForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relationship: '' });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await clientApi.post('/client/contacts', form);
      setForm({ name: '', phone: '', relationship: '' });
      setShowForm(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await clientApi.delete(`/client/contacts/${id}`);
    reload();
  }

  if (loading) return <LoadingSpinner label="Loading contacts..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const dispatch = data!.meta?.dispatchLine ?? { name: '4DS Control Room', phone: '+27111004400' };
  const personal = (data!.data ?? []).filter((c) => !isSystemDispatch(c));
  const verifiedCount = personal.filter((c) => c.verifiedAt).length;

  return (
    <div className="page-content ec-page">
      <header className="ec-page__header">
        <div>
          <p className="ec-kicker">Security</p>
          <h1>Emergency Contacts</h1>
          <p className="ec-lede">
            People we can contact if you&apos;re unavailable.{' '}
            <button type="button" className="ec-info" onClick={() => setShowAbout((open) => !open)}>
              About emergency contacts
            </button>
          </p>
          {showAbout ? (
            <p className="ec-about">
              Personal contacts are notified if you cannot be reached. 4DS Control Room stays the contracted 24/7
              response line and is not a personal contact.
            </p>
          ) : null}
        </div>
      </header>

      <section className="ec-protect" aria-label="Emergency protection">
        <div>
          <p className="ec-kicker">Emergency protection</p>
          <strong>Protected</strong>
        </div>
        <p className="ec-protect__meta">
          <span className="ec-dot" aria-hidden />
          Primary device connected · Location ready
        </p>
      </section>

      <EmergencyDispatchCallCard name={dispatch.name} phone={dispatch.phone} />

      <section className="ec-list-head">
        <div>
          <h2>Your emergency contacts</h2>
          <p className="text-muted">
            {String(personal.length).padStart(2, '0')} active · {String(verifiedCount).padStart(2, '0')} verified
          </p>
        </div>
        <button type="button" className="btn-ghost btn-sm ec-add" onClick={() => setShowForm((open) => !open)}>
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </section>

      {showForm ? (
        <form className="form-card ec-form" onSubmit={handleAdd}>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <label>
            Relationship
            <UiSelect
              value={relationshipSelectValue(form.relationship)}
              onChange={(value) =>
                setForm({
                  ...form,
                  relationship: value === 'Other' ? '' : value,
                })
              }
              options={[
                { value: '', label: 'Select relationship' },
                ...RELATIONSHIP_OPTIONS.map((option) => ({ value: option, label: option })),
                { value: 'Other', label: 'Other' },
              ]}
              ariaLabel="Relationship"
              compact={false}
              className="form-field-select"
            />
          </label>
          {relationshipSelectValue(form.relationship) === 'Other' && (
            <label>
              Other relationship
              <input
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                placeholder="e.g. fiancé, godparent"
                required
              />
            </label>
          )}
          <button type="submit" className="btn-secondary" disabled={saving}>
            {saving ? <LoadingSpinner label="" size="sm" /> : 'Save contact'}
          </button>
        </form>
      ) : null}

      <div className="ec-cards">
        {personal.map((c, index) => {
          const verifiedOn = formatVerified(c.verifiedAt);
          return (
            <article key={c.id} className="ec-card">
              <div className="ec-card__main">
                <span className="ec-pri">{`P${c.priority || index + 1}`}</span>
                <div className="ec-card__copy">
                  <strong>{c.name}</strong>
                  <span>
                    {c.relationship ?? 'Contact'} · {formatZaPhone(c.phone)}
                  </span>
                  {verifiedOn ? (
                    <span className="ec-verify ec-verify--ok">Verified · Available · {verifiedOn}</span>
                  ) : (
                    <span className="ec-verify ec-verify--warn">Verification required</span>
                  )}
                </div>
                <OpsMenuDropdown
                  compact
                  hideCaret
                  align="right"
                  ariaLabel={`More actions for ${c.name}`}
                  label="⋯"
                  className="ec-more"
                  items={[
                    {
                      id: 'remove',
                      label: 'Remove contact',
                      tone: 'danger',
                      onClick: () => void handleDelete(c.id),
                    },
                  ]}
                />
              </div>
              <div className="ec-card__actions">
                <EmergencyCallButton
                  name={c.name}
                  phone={c.phone}
                  relationship={c.relationship}
                  linkedUserId={c.linkedUserId}
                />
                <a
                  className="ec-msg"
                  href={c.linkedUserId ? '/portal/family/chat' : `sms:${c.phone}`}
                >
                  Message
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {!showForm ? (
        <button type="button" className="ec-add-footer" onClick={() => setShowForm(true)}>
          + Add emergency contact
        </button>
      ) : null}
    </div>
  );
}

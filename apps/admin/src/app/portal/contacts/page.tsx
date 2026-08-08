'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { EmergencyCallButton, EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  priority: number;
  linkedUserId?: string | null;
  linkedUserName?: string | null;
  isDispatch?: boolean;
  canInAppCall?: boolean;
};

type ContactsResponse = {
  data: Contact[];
  meta?: { dispatchLine: { name: string; phone: string } };
};

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

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Emergency Contacts</h1>
          <p className="text-muted">
            <Link href="/portal" className="interactive-text">Back to dashboard</Link>
            {' · '}
            <Link href="/portal/emergency" className="interactive-text">Emergency hub</Link>
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={handleAdd}>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <label>Relationship<input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <LoadingSpinner label="" size="sm" /> : 'Save Contact'}
          </button>
        </form>
      )}

      {data!.meta?.dispatchLine && (
        <EmergencyDispatchCallCard
          name={data!.meta.dispatchLine.name}
          phone={data!.meta.dispatchLine.phone}
        />
      )}

      <div className="list-card page-section">
        {data!.data.map((c) => (
          <div key={c.id} className="list-row list-row--emergency-contact">
            <div className="contact-row">
              <span className="contact-priority">{c.priority}</span>
              <div className="list-row-body">
                <strong>{c.name}</strong>
                <span>
                  {c.relationship ?? 'Contact'} · {c.phone}
                  {c.linkedUserName && (
                    <span className="contact-app-badge"> · On app as {c.linkedUserName}</span>
                  )}
                </span>
              </div>
            </div>
            <EmergencyCallButton
              name={c.name}
              phone={c.phone}
              relationship={c.relationship}
              linkedUserId={c.linkedUserId}
              isDispatch={c.isDispatch}
            />
            <button type="button" className="btn-ghost btn-danger" onClick={() => handleDelete(c.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

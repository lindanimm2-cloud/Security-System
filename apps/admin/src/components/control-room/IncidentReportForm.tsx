'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useState } from 'react';
import { SubscriptionBadge } from '@/components/control-room/SubscriptionBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UiSelect } from '@/components/ui/UiSelect';
import { adminApi } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

const INCIDENT_TYPES = [
  'PANIC',
  'THEFT',
  'MEDICAL',
  'FIRE',
  'ASSAULT',
  'OTHER',
] as const;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  subscription?: {
    planName: string;
    tierCode: string;
    status: string;
    memberId?: string;
  } | null;
};

export function IncidentReportForm({
  clients,
  onSuccess,
  compact,
}: {
  clients: Client[];
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const [type, setType] = useState<string>('OTHER');
  const [priority, setPriority] = useState<string>('HIGH');
  const [userId, setUserId] = useState(clients[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isSilent, setIsSilent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Report details are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.post('/control-room/incidents', {
        userId: userId || undefined,
        type,
        priority,
        title: title || undefined,
        description: description.trim(),
        address: address || undefined,
        isSilent,
      });
      setSuccess('Incident reported and logged on the map.');
      setDescription('');
      setTitle('');
      setAddress('');
      onSuccess?.();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'save'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`incident-report-form ${compact ? 'incident-report-form--compact' : ''}`} onSubmit={submit}>
      <div className="incident-report-form__grid">
        <label>
          Type
          <UiSelect
            compact={false}
            ariaLabel="Incident type"
            value={type}
            onChange={setType}
            options={INCIDENT_TYPES.map((t) => ({
              value: t,
              label: t.replace('_', ' '),
            }))}
          />
        </label>
        <label>
          Priority
          <UiSelect
            compact={false}
            ariaLabel="Incident priority"
            value={priority}
            onChange={setPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          />
        </label>
        {clients.length > 0 && (
          <label>
            Client
            <UiSelect
              compact={false}
              ariaLabel="Client"
              value={userId}
              onChange={setUserId}
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName}`,
                meta: c.subscription?.tierCode,
              }))}
            />
            {(() => {
              const selected = clients.find((c) => c.id === userId);
              if (!selected?.subscription) return null;
              return (
                <div className="incident-report-form__plan">
                  <SubscriptionBadge subscription={selected.subscription} compact />
                  {selected.subscription.memberId && (
                    <span className="text-muted">{selected.subscription.memberId}</span>
                  )}
                </div>
              );
            })()}
          </label>
        )}
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Suspicious activity call-in"
          />
        </label>
        <label className="incident-report-form__full">
          Location
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address or landmark"
          />
        </label>
        <label className="incident-report-form__full">
          Report details
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={compact ? 3 : 4}
            placeholder="Describe the incident, caller information, and immediate risks..."
            required
          />
        </label>
        {type === 'PANIC' && (
          <label className="incident-report-form__checkbox">
            <input
              type="checkbox"
              checked={isSilent}
              onChange={(e) => setIsSilent(e.target.checked)}
            />
            Silent panic (covert distress)
          </label>
        )}
      </div>
      {error && <ErrorAlert error={error} />}
      {success && <div className="alert alert--success">{success}</div>}
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? <LoadingSpinner label="" size="sm" /> : 'Report incident'}
      </button>
    </form>
  );
}

export function IncidentReportPanel({
  incidentId,
  onSuccess,
}: {
  incidentId: string;
  onSuccess?: () => void;
}) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setMsg('');
    try {
      await adminApi.post(`/control-room/incidents/${incidentId}/reports`, {
        content: content.trim(),
      });
      setContent('');
      setMsg('Report added to incident log.');
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="incident-report-form incident-report-form--compact" onSubmit={submit}>
      <label>
        Add dispatch report
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Status update, actions taken, or operator notes..."
          required
        />
      </label>
      {msg && <div className="alert alert--success">{msg}</div>}
      <button type="submit" className="btn-sm" disabled={submitting}>
        {submitting ? 'Saving…' : 'Add report'}
      </button>
    </form>
  );
}

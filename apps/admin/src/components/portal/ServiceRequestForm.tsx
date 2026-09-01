'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UiSelect } from '@/components/ui/UiSelect';
import { clientApi } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import {
  fieldVisible,
  type ServiceRequestDef,
} from '@/lib/service-requests';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localDateTime(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyValues(def: ServiceRequestDef): Record<string, string | boolean> {
  const next: Record<string, string | boolean> = {};
  for (const field of def.fields) {
    if (field.type === 'checkbox') next[field.name] = false;
    else if (field.type === 'number') next[field.name] = String(field.min ?? 1);
    else if (field.type === 'datetime-local') {
      const later = /end|arrive/i.test(field.name);
      next[field.name] = localDateTime(later ? 60 : 15);
    } else next[field.name] = '';
  }
  return next;
}

export function ServiceRequestForm({ def }: { def: ServiceRequestDef }) {
  const router = useRouter();
  const [values, setValues] = useState(() => emptyValues(def));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const visible = useMemo(
    () => def.fields.filter((field) => fieldVisible(field, values)),
    [def.fields, values],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = visible.find(
      (field) => field.required && field.type === 'select' && !String(values[field.name] ?? ''),
    );
    if (missing) {
      setError(`Choose ${missing.label.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setError('');
    const details: Record<string, string | boolean | number> = {};
    for (const field of visible) {
      const raw = values[field.name];
      if (field.type === 'checkbox') details[field.name] = Boolean(raw);
      else if (field.type === 'number') details[field.name] = Number(raw || 0);
      else details[field.name] = String(raw ?? '');
    }
    try {
      await clientApi.post('/client/service-requests', { kind: def.kind, details });
      router.push('/portal/requests?submitted=1');
    } catch (err) {
      setError(friendlyErrorMessage(err, 'save'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card form-card--request" onSubmit={(e) => void onSubmit(e)}>
      <div className="svc-req__intro">
        <p className="svc-req__kicker">Service request</p>
        <h2>{def.title}</h2>
        <p className="text-muted">{def.summary}</p>
      </div>

      <div className="svc-req__grid">
        {visible.map((field) => {
          const id = `svc-${def.kind}-${field.name}`;
          if (field.type === 'checkbox') {
            return (
              <label key={field.name} className="svc-req__check" htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                />
                <span>{field.label}</span>
              </label>
            );
          }
          return (
            <label key={field.name} htmlFor={id} className={field.type === 'textarea' ? 'svc-req__span' : undefined}>
              {field.label}
              {field.type === 'textarea' ? (
                <textarea
                  id={id}
                  rows={3}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              ) : field.type === 'select' ? (
                <UiSelect
                  ariaLabel={field.label}
                  compact={false}
                  placeholder="Select…"
                  value={String(values[field.name] ?? '')}
                  onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
                  options={[
                    { value: '', label: 'Select…' },
                    ...(field.options ?? []).map((opt) => ({ value: opt.value, label: opt.label })),
                  ]}
                />
              ) : (
                <input
                  id={id}
                  type={field.type}
                  required={field.required}
                  min={field.min}
                  placeholder={field.placeholder}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              )}
              {field.hint ? <span className="svc-req__hint">{field.hint}</span> : null}
            </label>
          );
        })}
      </div>

      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="svc-req__actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <LoadingSpinner label="" size="sm" /> : def.submitLabel}
        </button>
        <Link href="/portal/personal" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

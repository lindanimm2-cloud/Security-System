'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Verification = {
  id: string;
  type: 'PROPERTY' | 'DEBIT_ORDER';
  clientName: string;
  clientEmail: string;
  summary: string;
  createdAt: string;
};

export function PendingVerificationsPanel() {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<Verification[]>>('/control-room/billing/verifications'),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const items = data?.data ?? [];

  async function approve(id: string) {
    setBusyId(id);
    setMsg('');
    try {
      await adminApi.patch(`/control-room/billing/verifications/${id}/approve`, {});
      setMsg('Verified — client notified.');
      void reload();
    } catch (err) {
      setMsg(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="portal-card billing-verifications" style={{ marginBottom: '1.25rem' }}>
      <div className="card-header-row">
        <h2>Pending verifications</h2>
        <span className="status-pill status-pill--acknowledged">{items.length} pending</span>
      </div>
      <p className="text-muted">
        Property registrations and debit orders awaiting control-room approval.
      </p>
      {msg ? <div className="alert alert--info">{msg}</div> : null}
      <ul className="billing-doc-list">
        {items.map((v) => (
          <li key={v.id} className="billing-doc-list__item">
            <div className="billing-doc-list__icon" aria-hidden>
              {v.type === 'PROPERTY' ? 'PRP' : 'DBT'}
            </div>
            <div className="billing-doc-list__body">
              <strong>{v.summary}</strong>
              <span className="text-muted">
                {v.clientName} · {v.clientEmail} · {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!!busyId}
              onClick={() => void approve(v.id)}
            >
              {busyId === v.id ? <LoadingSpinner label="" size="sm" /> : 'Verify'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

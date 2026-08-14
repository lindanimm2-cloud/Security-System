'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MedicalLayout } from '@/components/medical/MedicalLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type MedicalTicket = {
  id: string;
  incidentId: string;
  client: string;
  location: string;
  priority: string;
  status: string;
  level: 'ALS' | 'BLS';
  distanceKm: number;
  patientSummary: string;
  securityTicketId: string;
};

const CREW_FLOW = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'TRANSPORT', 'HOSPITAL', 'HANDOVER'] as const;

export default function MedicalQueuePage() {
  return (
    <MedicalLayout title="Medical queue">
      <MedicalQueueContent />
    </MedicalLayout>
  );
}

function MedicalQueueContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<MedicalTicket[]>>('/medical/queue'),
    [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const tickets = data?.data ?? [];

  async function advance(id: string, status: string) {
    const idx = CREW_FLOW.indexOf(status as (typeof CREW_FLOW)[number]);
    const next =
      idx < 0 ? 'ACCEPTED' : CREW_FLOW[idx + 1] ?? 'HANDOVER';
    setBusy(id);
    try {
      await adminApi.patch(`/medical/tickets/${id}`, { status: next });
      void reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading medical queue…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content">
      <p className="text-muted">
        Dual response — security ticket stays on the ops board. Officers never see full PHI.
      </p>
      {tickets.length === 0 ? (
        <div className="empty-state">No medical tickets.</div>
      ) : (
        tickets.map((t) => (
          <article key={t.id} className="queue-card" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="card-header-row">
              <span className={`priority-chip priority-chip--${t.priority === 'CRITICAL' ? 'P0' : 'P1'}`}>
                {t.level}
              </span>
              <strong>{t.client}</strong>
            </div>
            <p>{t.location} · {t.distanceKm} km</p>
            <p className="text-muted">{t.patientSummary}</p>
            <p className="text-muted" style={{ fontSize: '0.78rem' }}>
              Linked security ticket {t.securityTicketId}
            </p>
            <div className="workflow-steps">
              {CREW_FLOW.map((step) => (
                <span
                  key={step}
                  className={`workflow-step ${
                    CREW_FLOW.indexOf(step) <= CREW_FLOW.indexOf(t.status as (typeof CREW_FLOW)[number])
                      ? 'workflow-step--current'
                      : ''
                  }`}
                >
                  {step.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div className="queue-card__actions">
              <button
                type="button"
                className="btn-sm btn-primary"
                disabled={busy === t.id || t.status === 'HANDOVER'}
                onClick={() => void advance(t.id, t.status)}
              >
                {t.status === 'OPEN' || t.status === 'NEW' ? 'Accept' : `Next · ${t.status}`}
              </button>
              <Link href="/medical/crew" className="btn-sm">
                Recommend unit
              </Link>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

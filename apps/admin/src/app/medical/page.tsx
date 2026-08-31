'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MedicalLayout } from '@/components/medical/MedicalLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
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

const CREW_FLOW = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'TRANSPORT', 'HOSPITAL', 'HANDOVER', 'COMPLETED'] as const;

function nextCrewStatus(status: string) {
  const idx = CREW_FLOW.indexOf(status as (typeof CREW_FLOW)[number]);
  if (idx < 0) return 'ACCEPTED';
  return CREW_FLOW[idx + 1] ?? 'COMPLETED';
}

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
    const next = nextCrewStatus(status);
    if (status === 'COMPLETED') return;
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
      <p className="ec-kicker">4DS Medical</p>
      <p className="text-muted">
        Dual response — security ticket stays on the ops board. Officers never see full PHI.
      </p>
      {tickets.length === 0 ? (
        <EmptyState
          kicker="Queue"
          title="No medical tickets"
          body="ALS/BLS jobs will appear here when dispatch requests a crew."
        />
      ) : (
        tickets.map((t) => (
          <article key={t.id} className="queue-card portal-card">
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
                disabled={busy === t.id || t.status === 'COMPLETED'}
                onClick={() => void advance(t.id, t.status)}
              >
                {t.status === 'OPEN' || t.status === 'NEW'
                  ? 'Accept'
                  : t.status === 'COMPLETED'
                    ? 'Completed'
                    : `Next · ${nextCrewStatus(t.status).replace(/_/g, ' ')}`}
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

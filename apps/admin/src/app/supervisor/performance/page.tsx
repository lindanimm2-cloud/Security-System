'use client';

import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type Card = { officer: string; index: number; ackSec: number; jobs: number };

export default function SupervisorPerformancePage() {
  return (
    <SupervisorLayout title="Officer index">
      <PerfContent />
    </SupervisorLayout>
  );
}

function PerfContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Card[]>>('/supervisor/performance'),
    [],
  );
  if (loading) return <LoadingSpinner label="Loading index…" />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const cards = data?.data ?? [];

  return (
    <div className="page-content">
      <p className="text-muted">Read-only performance index. Weights are configurable later.</p>
      <div className="entity-grid">
        {cards.map((c) => (
          <article key={c.officer} className="entity-card">
            <strong>{c.officer}</strong>
            <p>Index {c.index}</p>
            <p className="text-muted">
              Avg ack {c.ackSec}s · {c.jobs} jobs
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

'use client';

import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type Shift = {
  id: string;
  officer: string;
  start: string;
  end: string;
  flag: 'OK' | 'LATE' | 'ABSENT';
};

export default function SupervisorShiftsPage() {
  return (
    <SupervisorLayout title="Shifts">
      <ShiftsContent />
    </SupervisorLayout>
  );
}

function ShiftsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Shift[]>>('/supervisor/shifts'),
    [],
  );
  if (loading) return <LoadingSpinner label="Loading shifts…" />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const shifts = data?.data ?? [];

  return (
    <div className="page-content">
      <p className="text-muted">Late and absent flags for this shift window.</p>
      <div className="card-stack">
        {shifts.map((s) => (
          <article key={s.id} className="card-panel">
            <div className="card-header-row">
              <strong>{s.officer}</strong>
              <span className={`priority-chip priority-chip--${s.flag === 'OK' ? 'P3' : 'P0'}`}>
                {s.flag}
              </span>
            </div>
            <p className="text-muted">
              {s.start} – {s.end}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

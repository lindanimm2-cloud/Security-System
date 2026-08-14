'use client';

import { MedicalLayout } from '@/components/medical/MedicalLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type Unit = {
  id: string;
  callSign: string;
  level: 'ALS' | 'BLS';
  status: string;
  distanceKm: number;
  eta: string;
};

export default function MedicalCrewPage() {
  return (
    <MedicalLayout title="Ambulance recommend">
      <CrewContent />
    </MedicalLayout>
  );
}

function CrewContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Unit[]>>('/medical/units'),
    [],
  );
  if (loading) return <LoadingSpinner label="Loading units…" />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const units = data?.data ?? [];

  return (
    <div className="page-content">
      <p className="text-muted">ALS/BLS + distance using MEDICAL fleet type. Suggestion only.</p>
      <div className="card-stack">
        {units.map((u) => (
          <article key={u.id} className="card-panel">
            <div className="card-header-row">
              <strong>
                {u.callSign} · {u.level}
              </strong>
              <span className="badge">{u.status}</span>
            </div>
            <p>
              {u.distanceKm} km · ETA {u.eta}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

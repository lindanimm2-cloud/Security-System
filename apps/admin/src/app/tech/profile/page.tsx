'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';

type TechProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  branch: { name: string; code: string } | null;
  teams: { id: string; name: string; isLead: boolean }[];
  stats: { scheduled: number; active: number; completed: number };
};

export default function TechProfilePage() {
  return (
    <TechLayout title="Technician Profile">
      <TechProfileContent />
    </TechLayout>
  );
}

function TechProfileContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TechProfile>>('/store/tech/me'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading profile..." />;
  if (error || !data?.data) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  const p = data.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>
            {p.firstName} {p.lastName}
          </h1>
          <p className="text-muted">Install technician profile</p>
        </div>
      </div>

      <div className="card-panel">
        <dl className="detail-list">
          <div>
            <dt>Role</dt>
            <dd>{p.jobTitle ?? 'Technician'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{p.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{p.phone ?? '—'}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd>{p.branch ? `${p.branch.name} (${p.branch.code})` : '—'}</dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>
              {p.teams.length
                ? p.teams.map((t) => `${t.name}${t.isLead ? ' · Lead' : ''}`).join(', ')
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Jobs completed</dt>
            <dd>{p.stats.completed}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

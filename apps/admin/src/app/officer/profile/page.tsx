'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { ThemeSettings } from '@/components/ThemeSettings';
import { OfficerStatusPicker } from '@/components/officer/OfficerStatusPicker';
import { OfficerStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';

type Dashboard = {
  officer: {
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    zone: string | null;
    avgResponseSec: number;
  };
  stats: { completedToday: number; avgResponseFormatted: string };
};

export default function OfficerProfilePage() {
  return (
    <OfficerLayout title="Profile & Shift">
      <ProfileContent />
    </OfficerLayout>
  );
}

function ProfileContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<Dashboard>>('/officer/dashboard'),
    [],
  );
  if (loading) return <LoadingSpinner label="Loading profile..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const o = data!.data.officer;

  return (
    <>
      <section className="portal-card profile-section">
        <div className="profile-hero-main">
          <div className="profile-avatar profile-avatar--lg">{o.firstName[0]}{o.lastName[0]}</div>
          <div>
            <h2>{o.firstName} {o.lastName}</h2>
            <p className="text-muted">{o.email}</p>
            <p className="text-muted">Zone: {o.zone ?? 'Unassigned'}</p>
          </div>
        </div>
      </section>

      <section id="shift" className="portal-card profile-section">
        <div className="card-header-row">
          <h2>Shift status</h2>
          <OfficerStatusBadge status={o.status} />
        </div>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Update your availability for dispatch assignment.
        </p>
        <OfficerStatusPicker status={o.status} onUpdated={reload} />
      </section>

      <section className="portal-card profile-section">
        <ThemeSettings />
      </section>

      <section className="portal-card profile-section">
        <h2>Account</h2>
        <dl className="profile-summary-grid">
          <div className="profile-summary-item">
            <dt>Completed today</dt>
            <dd>{data!.data.stats.completedToday}</dd>
          </div>
          <div className="profile-summary-item">
            <dt>Current status</dt>
            <dd><OfficerStatusBadge status={o.status} /></dd>
          </div>
          <div className="profile-summary-item">
            <dt>Employee ID</dt>
            <dd>{o.email.split('@')[0]}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

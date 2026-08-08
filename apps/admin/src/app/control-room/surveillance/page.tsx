'use client';

import Link from 'next/link';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type Overview = {
  stats: {
    sites: number;
    cameras: number;
    openEvents: number;
    triggeredSites: number;
    offlineCameras: number;
  };
  sites: {
    id: string;
    name: string;
    address: string;
    propertyType: string;
    alarmStatus: string;
    monitoringEnabled: boolean;
    camerasLinked: boolean;
    alarmLinked: boolean;
    cameraCount: number;
    onlineCameras: number;
    client: { id: string; name: string; email: string; phone: string | null };
    openEvents: {
      id: string;
      title: string;
      type: string;
      severity: string;
      status: string;
      triggeredAt: string;
    }[];
  }[];
};

export default function SurveillancePage() {
  return (
    <ControlRoomLayout title="Surveillance">
      <SurveillanceContent />
    </ControlRoomLayout>
  );
}

function SurveillanceContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading surveillance..." />;
  if (error || !data) return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reload} />;

  const { stats, sites } = data.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Surveillance</h1>
          <p className="text-muted">Monitored sites, cameras, and open alarm events.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => reload()}>
          Refresh
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-label">Sites</span>
          <strong className="stat-value">{stats.sites}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cameras</span>
          <strong className="stat-value">{stats.cameras}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Open events</span>
          <strong className="stat-value">{stats.openEvents}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Triggered</span>
          <strong className="stat-value">{stats.triggeredSites}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Offline cams</span>
          <strong className="stat-value">{stats.offlineCameras}</strong>
        </div>
      </div>

      <div className="entity-grid">
        {sites.map((site) => (
          <article key={site.id} className="entity-card">
            <div className="entity-card-header">
              <Link href={`/control-room/surveillance/${site.id}`} className="status-list-link">
                {site.name}
              </Link>
              <span className={`status-pill status-pill--${site.alarmStatus.toLowerCase()}`}>
                {site.alarmStatus}
              </span>
            </div>
            <p>{site.address}</p>
            <p className="text-muted">
              {site.client.name} · Cams {site.onlineCameras}/{site.cameraCount}
            </p>
            {site.openEvents.length > 0 && (
              <ul className="status-list" style={{ marginTop: '0.75rem' }}>
                {site.openEvents.slice(0, 2).map((e) => (
                  <li key={e.id} className="status-list-item">
                    <span>{e.title}</span>
                    <span className={`status-pill status-pill--${e.severity.toLowerCase()}`}>{e.severity}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="entity-card-actions">
              <Link href={`/control-room/surveillance/${site.id}`} className="btn-secondary btn-sm">
                Open site
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

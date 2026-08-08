'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';

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
    alarmStatus: string;
    cameraCount: number;
    onlineCameras: number;
    client: { name: string };
    openEvents: { id: string; title: string; severity: string }[];
  }[];
};

export function ControlRoomMiniCameras() {
  const { data, loading, error } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );

  if (loading) {
    return (
      <section className="panel panel--wide mini-cameras">
        <div className="panel-header">
          <h2>Surveillance</h2>
        </div>
        <p className="text-muted">Loading cameras…</p>
      </section>
    );
  }

  if (error || !data) {
    return null;
  }

  const { stats, sites } = data.data;
  const hot = sites
    .filter((s) => s.openEvents.length > 0 || s.alarmStatus === 'TRIGGERED' || s.cameraCount > 0)
    .slice(0, 4);

  return (
    <section className="panel panel--wide mini-cameras">
      <div className="panel-header">
        <Link href={CONTROL_ROOM_ROUTES.surveillance} className="card-title-link">
          <h2>Surveillance</h2>
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.surveillance} className="link-sm">
          All sites
        </Link>
      </div>

      <div className="mini-cameras__stats">
        <span>{stats.cameras} cams</span>
        <span>{stats.openEvents} open events</span>
        <span>{stats.offlineCameras} offline</span>
        {stats.triggeredSites > 0 && (
          <span className="mini-cameras__alert">{stats.triggeredSites} triggered</span>
        )}
      </div>

      {hot.length === 0 ? (
        <p className="text-muted">No monitored sites yet.</p>
      ) : (
        <div className="camera-grid camera-grid--mini">
          {hot.map((s) => (
            <Link
              key={s.id}
              href={`/control-room/surveillance/${s.id}`}
              className="camera-tile"
            >
              <div
                className={`camera-tile__feed camera-tile__feed--${
                  s.alarmStatus === 'TRIGGERED' ? 'fault' : s.onlineCameras > 0 ? 'online' : 'offline'
                }`}
              >
                <span className="camera-tile__live">
                  {s.onlineCameras}/{s.cameraCount}
                </span>
                <span className="camera-tile__name">{s.name}</span>
              </div>
              <span className="camera-tile__meta">
                {s.client.name}
                {s.openEvents[0] ? ` · ${s.openEvents[0].title}` : ` · ${s.alarmStatus}`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

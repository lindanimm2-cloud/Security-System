'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { MapCommandData } from '@/components/maps/map-types';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { maskMapDataForScreenshot } from '@/lib/map-screenshot';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';

const LiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="dash-live-map__loading">
      <LoadingSpinner label="Loading live map..." />
    </div>
  ),
});

type DashboardLiveMapProps = {
  focusIncidentId?: string | null;
  className?: string;
};

export function DashboardLiveMap({ focusIncidentId, className = '' }: DashboardLiveMapProps) {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<MapCommandData>>('/control-room/map'),
    [],
  );
  const [mapData, setMapData] = useState<MapCommandData | null>(null);

  useEffect(() => {
    if (data?.data) setMapData(maskMapDataForScreenshot(data.data));
  }, [data]);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  const users = useMemo(
    () =>
      (mapData?.clients ?? [])
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
        .map((c) => ({
          id: c.id,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
        })),
    [mapData],
  );

  const officers = useMemo(
    () =>
      (mapData?.officers ?? [])
        .filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lng))
        .map((o) => ({
          id: o.id,
          name: o.name,
          lat: o.lat,
          lng: o.lng,
          status: o.status,
          zone: o.zone,
          avatarUrl: o.avatarUrl,
        })),
    [mapData],
  );

  const incidents = useMemo(
    () =>
      (mapData?.incidents ?? [])
        .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
        .map((i) => ({
          id: i.id,
          type: i.type,
          priority: i.priority,
          status: i.status,
          name: i.name,
          lat: i.lat,
          lng: i.lng,
          address: i.address,
        })),
    [mapData],
  );

  const flyTo = useMemo(() => {
    if (!focusIncidentId || !mapData) return null;
    const hit = (mapData.incidents ?? []).find((i) => i.id === focusIncidentId);
    return hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)
      ? { lat: hit.lat, lng: hit.lng }
      : null;
  }, [focusIncidentId, mapData]);

  const center = mapData?.center ?? { lat: -29.8587, lng: 31.0218 };

  if (loading && !mapData) {
    return (
      <div className={`dash-live-map ${className}`.trim()}>
        <div className="dash-live-map__loading">
          <LoadingSpinner label="Loading live map..." />
        </div>
      </div>
    );
  }

  if (error && !mapData) {
    return (
      <div className={`dash-live-map ${className}`.trim()}>
        <div className="dash-live-map__fallback">
          <strong>Map unavailable</strong>
          <p className="text-muted">{error}</p>
          <button type="button" className="btn-sm" onClick={() => void reload()}>
            Retry
          </button>
          <Link href={CONTROL_ROOM_ROUTES.map} className="link-sm">
            Open full map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`dash-live-map dash-live-map--hero ${className}`.trim()}>
      <div className="dash-live-map__canvas">
        <LiveMap
          center={center}
          users={users}
          officers={officers}
          incidents={incidents}
          flyTo={flyTo}
        />
        <div className="dash-live-map__hud" aria-label="Live field status">
          <div className="dash-live-map__live">
            <span className="dash-live-map__pulse" aria-hidden />
            Live
          </div>
          <div className="dash-live-map__counts">
            <span>
              <strong>{incidents.length}</strong> incidents
            </span>
            <span>
              <strong>{officers.length}</strong> officers
            </span>
            <span>
              <strong>{users.length}</strong> users
            </span>
          </div>
        </div>
        <Link href={CONTROL_ROOM_ROUTES.map} className="dash-live-map__full-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Full map
        </Link>
      </div>
    </div>
  );
}

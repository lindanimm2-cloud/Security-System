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
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  const users = useMemo(
    () =>
      (mapData?.clients ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
      })),
    [mapData],
  );

  const officers = useMemo(
    () =>
      (mapData?.officers ?? []).map((o) => ({
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
      (mapData?.incidents ?? []).map((i) => ({
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
    const hit = mapData.incidents.find((i) => i.id === focusIncidentId);
    return hit ? { lat: hit.lat, lng: hit.lng } : null;
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
    <div className={`dash-live-map ${className}`.trim()}>
      <div className="dash-live-map__toolbar">
        <div className="dash-live-map__live">
          <span className="dash-live-map__pulse" aria-hidden />
          Live field picture
        </div>
        <Link href={CONTROL_ROOM_ROUTES.map} className="btn-sm btn-sm--link dash-live-map__full">
          Full map
        </Link>
        <div className="dash-live-map__counts">
          <span>{incidents.length} incidents</span>
          <span>{officers.length} officers</span>
          <span>{users.length} users</span>
        </div>
      </div>
      <div className="dash-live-map__canvas">
        <LiveMap
          center={center}
          users={users}
          officers={officers}
          incidents={incidents}
          flyTo={flyTo}
        />
      </div>
    </div>
  );
}

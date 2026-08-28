'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';

const LiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
  loading: () => <LoadingSpinner label="Loading map..." />,
});

type MapData = {
  center: { lat: number; lng: number };
  officer: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: string;
    avatarUrl?: string | null;
  };
  assignments: {
    dispatchId: string;
    status: string;
    incident: {
      id: string;
      type: string;
      lat: number;
      lng: number;
      address: string | null;
      client: string;
    };
  }[];
};

export default function OfficerMapPage() {
  return (
    <OfficerLayout title="Navigation">
      <MapContent />
    </OfficerLayout>
  );
}

function MapContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<MapData>>('/officer/map'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading map..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const m = data?.data && !Array.isArray(data.data) ? data.data : null;
  if (!m?.officer || !m.center) {
    return (
      <ErrorAlert
        error="Map data is still loading. Try again in a moment."
        onRetry={reload}
      />
    );
  }
  const incidents = (m.assignments ?? []).map((a) => ({
    id: a.incident.id,
    type: a.incident.type,
    priority: 'HIGH',
    status: a.status,
    name: a.incident.client,
    lat: a.incident.lat,
    lng: a.incident.lng,
    address: a.incident.address,
  }));

  const target = incidents[0];

  return (
    <div className="page-content page-content--map">
      {target && (
        <div className="portal-card officer-nav-card">
          <strong>Navigate to {target.name}</strong>
          <p className="text-muted">{target.address ?? 'Active incident location'}</p>
          <Link
            href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-inline mt-1"
          >
            Open in Google Maps
          </Link>
        </div>
      )}

      <LiveMap
        center={m.center}
        users={[]}
        officers={[{
          id: m.officer.id,
          name: m.officer.name,
          lat: m.officer.lat,
          lng: m.officer.lng,
          status: m.officer.status,
          zone: null,
          avatarUrl: m.officer.avatarUrl,
        }]}
        incidents={incidents}
        flyTo={target ? { lat: target.lat, lng: target.lng } : null}
      />
      <p className="map-hint text-muted">Your position and assigned incidents · Durban metro</p>
    </div>
  );
}

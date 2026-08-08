'use client';

import 'leaflet/dist/leaflet.css';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

type TrailPoint = { lat: number; lng: number };

type PortalVehicleMapProps = {
  vehicleId: string;
  registration: string;
  lat: number;
  lng: number;
  trail?: TrailPoint[];
  theftRecovery?: boolean;
  onPositionUpdate?: (lat: number, lng: number) => void;
};

const VehicleMapCanvas = dynamic(() => import('./PortalVehicleMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="vehicle-map-placeholder">
      <LoadingSpinner label="Loading map..." />
    </div>
  ),
});

export function PortalVehicleMap({
  vehicleId,
  registration,
  lat,
  lng,
  trail = [],
  theftRecovery,
  onPositionUpdate,
}: PortalVehicleMapProps) {
  const [position, setPosition] = useState({ lat, lng });

  useEffect(() => {
    setPosition({ lat, lng });
  }, [lat, lng]);

  useEffect(() => {
    const session = getSession('client');
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('position:update', (updates: { entityType: string; id: string; lat: number; lng: number }[]) => {
      const hit = updates.find((u) => u.entityType === 'vehicle' && u.id === vehicleId);
      if (hit) {
        setPosition({ lat: hit.lat, lng: hit.lng });
        onPositionUpdate?.(hit.lat, hit.lng);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [vehicleId, onPositionUpdate]);

  return (
    <div className={`vehicle-map-wrap ${theftRecovery ? 'vehicle-map-wrap--recovery' : ''}`}>
      <VehicleMapCanvas
        registration={registration}
        position={position}
        trail={trail}
        theftRecovery={theftRecovery}
      />
      <div className="vehicle-map-live-badge">
        <span className="vehicle-map-live-dot" aria-hidden />
        Live · synced with control room
      </div>
    </div>
  );
}

export function VehicleMapIdle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="vehicle-map-idle">
      <div className="vehicle-map-idle__grid" aria-hidden />
      <div className="vehicle-map-idle__content">
        <strong>{title}</strong>
        <p>{description}</p>
        {action}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import type { LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { vehicleIcon } from '@/components/maps/map-icons';

type Props = {
  registration: string;
  position: { lat: number; lng: number };
  trail: { lat: number; lng: number }[];
  theftRecovery?: boolean;
};

function FollowVehicle({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.5 });
  }, [position.lat, position.lng, map]);
  return null;
}

export default function PortalVehicleMapCanvas({
  registration,
  position,
  trail,
  theftRecovery,
}: Props) {
  const icon = vehicleIcon(theftRecovery ? 'STOLEN' : 'CLIENT');
  const trailPoints: LatLngTuple[] = [
    ...trail.map((p) => [p.lat, p.lng] as LatLngTuple),
    [position.lat, position.lng],
  ];

  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={15}
      scrollWheelZoom
      className="vehicle-map leaflet-map"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap · CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FollowVehicle position={position} />
      {trailPoints.length > 1 && (
        <Polyline
          positions={trailPoints}
          pathOptions={{
            color: theftRecovery ? '#ef4444' : '#7c3aed',
            weight: 3,
            opacity: 0.75,
            dashArray: theftRecovery ? undefined : '6 8',
          }}
        />
      )}
      <Marker position={[position.lat, position.lng]} icon={icon}>
        <Popup>
          <strong>{registration}</strong>
          <br />
          {theftRecovery ? 'Theft recovery — live' : 'Live vehicle position'}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

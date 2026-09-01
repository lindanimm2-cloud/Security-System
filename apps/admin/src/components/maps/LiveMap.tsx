'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { IncidentDetailsMenu } from '@/components/control-room/IncidentDetailsMenu';
import { legacyIncidentIcon, officerIcon, userIcon } from './map-icons';
import { safeFitBounds, safeSetView } from './safe-map-move';
import { spreadOverlappingMarkers } from './spread-overlapping-markers';

export type MapUser = { id: string; name: string; lat: number; lng: number };
export type MapOfficer = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  zone?: string | null;
  avatarUrl?: string | null;
};
export type MapIncident = {
  id: string;
  type: string;
  priority: string;
  status: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
};

type LiveMapProps = {
  center: { lat: number; lng: number };
  users: MapUser[];
  officers: MapOfficer[];
  incidents: MapIncident[];
  flyTo?: { lat: number; lng: number } | null;
};

function FlyToTarget({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    if (safeSetView(map, target.lat, target.lng, 15)) return;
    const retry = () => safeSetView(map, target.lat, target.lng, 15);
    map.on('resize', retry);
    const id = window.setTimeout(retry, 250);
    return () => {
      map.off('resize', retry);
      window.clearTimeout(id);
    };
  }, [target, map]);
  return null;
}

function FitBoundsOnLoad({
  users,
  officers,
  incidents,
}: {
  users: MapUser[];
  officers: MapOfficer[];
  incidents: MapIncident[];
}) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    const points: [number, number][] = [
      ...users.map((u) => [u.lat, u.lng] as [number, number]),
      ...officers.map((o) => [o.lat, o.lng] as [number, number]),
      ...incidents.map((i) => [i.lat, i.lng] as [number, number]),
    ];
    if (points.length > 1 && safeFitBounds(map, points)) {
      fitted.current = true;
    }
  }, [map, users, officers, incidents]);
  return null;
}

function hasCoords(lat?: number, lng?: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export default function LiveMap({
  center,
  users = [],
  officers = [],
  incidents = [],
  flyTo,
}: LiveMapProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  const safeUsers = useMemo(
    () => users.filter((u) => hasCoords(u.lat, u.lng)),
    [users],
  );
  const safeOfficers = useMemo(
    () => officers.filter((o) => hasCoords(o.lat, o.lng)),
    [officers],
  );
  const safeIncidents = useMemo(
    () => incidents.filter((i) => hasCoords(i.lat, i.lng)),
    [incidents],
  );

  const safeCenter = {
    lat: Number.isFinite(center?.lat) ? center.lat : -29.8587,
    lng: Number.isFinite(center?.lng) ? center.lng : 31.0218,
  };
  const spreadPositions = useMemo(() => {
    const sources = [
      ...safeUsers.map((u) => ({ id: `user-${u.id}`, lat: u.lat, lng: u.lng })),
      ...safeOfficers.map((o) => ({ id: `officer-${o.id}`, lat: o.lat, lng: o.lng })),
      ...safeIncidents.map((i) => ({ id: `incident-${i.id}`, lat: i.lat, lng: i.lng })),
    ];
    return spreadOverlappingMarkers(sources);
  }, [safeUsers, safeOfficers, safeIncidents]);

  if (!ready) {
    return <div className="leaflet-map-container" />;
  }

  return (
    <div className="leaflet-map-container">
      <MapContainer
        center={[safeCenter.lat, safeCenter.lng]}
        zoom={12}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBoundsOnLoad users={safeUsers} officers={safeOfficers} incidents={safeIncidents} />
        <FlyToTarget target={flyTo && hasCoords(flyTo.lat, flyTo.lng) ? flyTo : null} />

        {safeUsers.map((u) => {
          const pos = spreadPositions.get(`user-${u.id}`) ?? { lat: u.lat, lng: u.lng };
          return (
          <Marker key={`user-${u.id}`} position={[pos.lat, pos.lng]} icon={userIcon} riseOnHover riseOffset={1200}>
            <Popup>
              <strong>{u.name}</strong>
              <br />
              <span className="map-popup-tag map-popup-tag--user">Active user</span>
              <br />
              <a href="/control-room/map?focus=users" className="map-popup-link">View on map</a>
            </Popup>
          </Marker>
          );
        })}

        {safeOfficers.map((o) => {
          const pos = spreadPositions.get(`officer-${o.id}`) ?? { lat: o.lat, lng: o.lng };
          return (
          <Marker key={`officer-${o.id}`} position={[pos.lat, pos.lng]} icon={officerIcon('ARMED_RESPONSE', o.avatarUrl)} riseOnHover riseOffset={1200}>
            <Popup>
              <strong>{o.name}</strong>
              <br />
              <span className="map-popup-tag map-popup-tag--officer">
                Officer · {(o.status ?? 'UNKNOWN').replace('_', ' ')}
              </span>
              {o.zone && <><br /><span>{o.zone}</span></>}
              <br />
              <a href="/control-room/officers" className="map-popup-link">Officer profile</a>
              {' · '}
              <a href="/control-room/dispatch" className="map-popup-link">Dispatch</a>
            </Popup>
          </Marker>
          );
        })}

        {safeIncidents.map((i) => {
          const pos = spreadPositions.get(`incident-${i.id}`) ?? { lat: i.lat, lng: i.lng };
          return (
          <Marker
            key={`incident-${i.id}`}
            position={[pos.lat, pos.lng]}
            icon={legacyIncidentIcon(i.type)}
            riseOnHover
            riseOffset={1200}
          >
            <Popup>
              <strong>{i.type === 'PANIC' ? '⚠ Panic Alert' : '🚗 Theft Report'}</strong>
              <br />
              {i.name}
              <br />
              <span className="map-popup-tag map-popup-tag--incident">{i.status}</span>
              {i.address && <><br /><span>{i.address}</span></>}
              <br />
              <div className="map-popup-actions map-popup-actions--compact">
                <DispatchMenuButton incidentId={i.id} />
                <IncidentDetailsMenu incident={i} triggerClassName="btn-sm" />
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

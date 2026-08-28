'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Polyline,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MapClient,
  MapCommandData,
  MapIncident,
  MapOfficer,
  MapProperty,
  MapVehicle,
  MarkerVisibility,
} from './map-types';
import {
  clientIcon,
  incidentIcon,
  officerIcon,
  propertyIcon,
  fleetIcon,
  vehicleIcon,
} from './map-icons';
import { AnimatedMarker } from './AnimatedMarker';
import {
  ClientPopup,
  FleetVehiclePopup,
  IncidentPopup,
  OfficerPopup,
  PropertyPopup,
  VehiclePopup,
} from './MapPopups';
import { MapOverlapPicker, type OverlapPinOption } from './MapOverlapPicker';
import { overlapGroupKey, spreadOverlappingMarkers } from './spread-overlapping-markers';

type CommandCentreMapProps = {
  data: MapCommandData;
  visibility: MarkerVisibility;
  selectedIncidentId?: string | null;
  followIncidentId?: string | null;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  returnToOverview?: number;
  replayProgress?: number;
  theftRecoveryFocusId?: string | null;
  onSelectIncident?: (id: string) => void;
  onDispatchAssigned?: () => void;
};

type MapPinPayload = {
  key: string;
  pinId: string;
  groupKey: string;
  kind: string;
  label: string;
  lat: number;
  lng: number;
  icon: L.DivIcon;
  html: string;
};

function FlyToTarget({
  target,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 16, { duration: 1.1 });
    }
  }, [target, map]);
  return null;
}

function ReturnToOverview({
  trigger,
  points,
}: {
  trigger: number;
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (trigger <= 0 || points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 12, { duration: 1 });
      return;
    }
    map.flyToBounds(points, { padding: [56, 56], maxZoom: 13, duration: 1.2 });
  }, [trigger, map, points]);
  return null;
}

function FollowIncident({
  incident,
  enabled,
}: {
  incident: MapIncident | null;
  enabled: boolean;
}) {
  const map = useMap();
  const lastPanRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    if (!enabled || !incident) return;
    const now = Date.now();
    const last = lastPanRef.current;
    const moved =
      !last ||
      Math.abs(incident.lat - last.lat) > 0.001 ||
      Math.abs(incident.lng - last.lng) > 0.001;
    if (last && now - last.at < 4000 && !moved) return;
    map.panTo([incident.lat, incident.lng], { animate: true, duration: 0.5 });
    lastPanRef.current = { lat: incident.lat, lng: incident.lng, at: now };
  }, [enabled, incident?.lat, incident?.lng, map, incident]);

  return null;
}

function ClusterLayer({
  pins,
  spreadPositions,
  popupOpenersRef,
  onOverlapHover,
  onOverlapLeave,
}: {
  pins: MapPinPayload[];
  spreadPositions: Map<string, { lat: number; lng: number }>;
  popupOpenersRef: React.MutableRefObject<Map<string, () => void>>;
  onOverlapHover: (groupKey: string, anchor: L.LatLng, options: OverlapPinOption[]) => void;
  onOverlapLeave: () => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!clusterRef.current) {
      clusterRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 36,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 16,
        chunkedLoading: true,
      } as L.MarkerClusterGroupOptions);
      map.addLayer(clusterRef.current);
    }
    return () => {
      markersRef.current.clear();
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    const nextKeys = new Set(pins.map((p) => p.key));
    for (const [key, marker] of markersRef.current) {
      if (!nextKeys.has(key)) {
        cluster.removeLayer(marker);
        markersRef.current.delete(key);
        popupOpenersRef.current.delete(key);
      }
    }

    const groups = new Map<string, OverlapPinOption[]>();

    pins.forEach((pin) => {
      const display = spreadPositions.get(pin.pinId) ?? { lat: pin.lat, lng: pin.lng };
      const existing = markersRef.current.get(pin.key);

      const openPopup = () => {
        markersRef.current.get(pin.key)?.openPopup();
      };

      const option: OverlapPinOption = {
        key: pin.key,
        label: pin.label,
        kind: pin.kind,
        onSelect: openPopup,
      };

      const group = groups.get(pin.groupKey) ?? [];
      group.push(option);
      groups.set(pin.groupKey, group);

      if (existing) {
        existing.setLatLng([display.lat, display.lng]);
        popupOpenersRef.current.set(pin.key, openPopup);
        return;
      }

      const marker = L.marker([display.lat, display.lng], {
        icon: pin.icon,
        riseOnHover: true,
        riseOffset: 1200,
      });
      marker.bindPopup(pin.html, { maxWidth: 280, minWidth: 220, className: 'map-popup--compact' });
      popupOpenersRef.current.set(pin.key, openPopup);

      marker.on('mouseover', () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        const options = groups.get(pin.groupKey) ?? [option];
        if (options.length > 1) {
          onOverlapHover(pin.groupKey, marker.getLatLng(), options);
        }
      });

      marker.on('mouseout', () => {
        hideTimer.current = setTimeout(onOverlapLeave, 200);
      });

      cluster.addLayer(marker);
      markersRef.current.set(pin.key, marker);
    });
  }, [pins, spreadPositions, popupOpenersRef, onOverlapHover, onOverlapLeave]);

  return null;
}

function trailSlice(trail: { lat: number; lng: number }[], progress: number) {
  if (trail.length < 2) return trail;
  const count = Math.max(2, Math.round(trail.length * progress));
  return trail.slice(0, count);
}

export default function CommandCentreMap({
  data,
  visibility,
  selectedIncidentId,
  followIncidentId,
  flyTo,
  returnToOverview = 0,
  replayProgress = 1,
  theftRecoveryFocusId,
  onSelectIncident,
  onDispatchAssigned,
}: CommandCentreMapProps) {
  const clients = data.clients ?? [];
  const officers = data.officers ?? [];
  const vehicles = data.vehicles ?? [];
  const properties = data.properties ?? [];
  const mapIncidents = data.incidents ?? [];
  const followIncident = mapIncidents.find((i) => i.id === followIncidentId) ?? null;
  const [overlapAnchor, setOverlapAnchor] = useState<L.LatLng | null>(null);
  const [overlapPins, setOverlapPins] = useState<OverlapPinOption[]>([]);
  const popupOpenersRef = useRef<Map<string, () => void>>(new Map());

  const { clusterPins, spreadSources, incidentPins, stolenPins } = useMemo(() => {
    const cluster: MapPinPayload[] = [];
    const spread: { id: string; lat: number; lng: number }[] = [];
    const incidents: MapPinPayload[] = [];
    const stolen: MapPinPayload[] = [];

    const addSpread = (pinId: string, lat: number, lng: number) => {
      spread.push({ id: pinId, lat, lng });
    };

    if (visibility.clients) {
      clients.forEach((c) => {
        const pinId = `client-${c.id}`;
        const groupKey = overlapGroupKey(c.lat, c.lng);
        addSpread(pinId, c.lat, c.lng);
        cluster.push({
          key: pinId,
          pinId,
          groupKey,
          kind: 'client',
          label: c.name,
          lat: c.lat,
          lng: c.lng,
          icon: clientIcon(c.clientType),
          html: renderToStaticMarkup(<ClientPopup client={c} />),
        });
      });
    }

    if (visibility.officers) {
      officers.forEach((o) => {
        const pinId = `officer-${o.id}`;
        const groupKey = overlapGroupKey(o.lat, o.lng);
        addSpread(pinId, o.lat, o.lng);
        cluster.push({
          key: pinId,
          pinId,
          groupKey,
          kind: 'officer',
          label: o.name,
          lat: o.lat,
          lng: o.lng,
          icon: officerIcon(o.officerType, o.avatarUrl),
          html: renderToStaticMarkup(<OfficerPopup officer={o} />),
        });
      });
    }

    if (visibility.fleet && data.fleet?.length) {
      data.fleet.forEach((v) => {
        const pinId = `fleet-${v.id}`;
        const groupKey = overlapGroupKey(v.lat, v.lng);
        addSpread(pinId, v.lat, v.lng);
        cluster.push({
          key: pinId,
          pinId,
          groupKey,
          kind: 'vehicle',
          label: v.callSign,
          lat: v.lat,
          lng: v.lng,
          icon: fleetIcon(v.vehicleType, v.crewCount),
          html: renderToStaticMarkup(<FleetVehiclePopup vehicle={v} />),
        });
      });
    }

    if (visibility.vehicles) {
      vehicles
        .filter((v) => v.vehicleType !== 'STOLEN')
        .forEach((v) => {
          const pinId = `vehicle-${v.id}`;
          const groupKey = overlapGroupKey(v.lat, v.lng);
          addSpread(pinId, v.lat, v.lng);
          cluster.push({
            key: pinId,
            pinId,
            groupKey,
            kind: 'vehicle',
            label: v.registration,
            lat: v.lat,
            lng: v.lng,
            icon: vehicleIcon(v.vehicleType),
            html: renderToStaticMarkup(<VehiclePopup vehicle={v} />),
          });
        });
    }

    if (visibility.properties) {
      properties.forEach((p) => {
        const pinId = `property-${p.id}`;
        const groupKey = overlapGroupKey(p.lat, p.lng);
        addSpread(pinId, p.lat, p.lng);
        cluster.push({
          key: pinId,
          pinId,
          groupKey,
          kind: 'property',
          label: p.name,
          lat: p.lat,
          lng: p.lng,
          icon: propertyIcon(p.propertyType),
          html: renderToStaticMarkup(<PropertyPopup property={p} />),
        });
      });
    }

    if (visibility.incidents) {
      mapIncidents.forEach((incident) => {
        const pinId = `incident-${incident.id}`;
        const groupKey = overlapGroupKey(incident.lat, incident.lng);
        addSpread(pinId, incident.lat, incident.lng);
        incidents.push({
          key: pinId,
          pinId,
          groupKey,
          kind: 'incident',
          label: incident.name,
          lat: incident.lat,
          lng: incident.lng,
          icon: incidentIcon(incident.category),
          html: renderToStaticMarkup(<IncidentPopup incident={incident} />),
        });
      });
    }

    if (visibility.vehicles) {
      vehicles
        .filter((v) => v.vehicleType === 'STOLEN')
        .forEach((v) => {
          const pinId = `stolen-${v.id}`;
          const groupKey = overlapGroupKey(v.lat, v.lng);
          addSpread(pinId, v.lat, v.lng);
          stolen.push({
            key: pinId,
            pinId,
            groupKey,
            kind: 'vehicle',
            label: `${v.registration} (stolen)`,
            lat: v.lat,
            lng: v.lng,
            icon: vehicleIcon('STOLEN'),
            html: renderToStaticMarkup(<VehiclePopup vehicle={v} />),
          });
        });
    }

    return {
      clusterPins: cluster,
      spreadSources: spread,
      incidentPins: incidents,
      stolenPins: stolen,
    };
  }, [clients, officers, vehicles, properties, mapIncidents, data.fleet, visibility]);

  const spreadPositions = useMemo(
    () => spreadOverlappingMarkers(spreadSources),
    [spreadSources],
  );

  const overlapGroups = useMemo(() => {
    const groups = new Map<string, OverlapPinOption[]>();
    const allPins = [...clusterPins, ...incidentPins, ...stolenPins];
    for (const pin of allPins) {
      const list = groups.get(pin.groupKey) ?? [];
      list.push({
        key: pin.key,
        label: pin.label,
        kind: pin.kind,
        onSelect: () => {
          if (pin.kind === 'incident') {
            onSelectIncident?.(pin.key.replace('incident-', ''));
          }
          popupOpenersRef.current.get(pin.key)?.();
        },
      });
      groups.set(pin.groupKey, list);
    }
    return groups;
  }, [clusterPins, incidentPins, stolenPins, onSelectIncident]);

  const handleOverlapHover = useMemo(
    () => (groupKey: string, anchor: L.LatLng, options: OverlapPinOption[]) => {
      setOverlapAnchor(anchor);
      setOverlapPins(options.length > 1 ? options : overlapGroups.get(groupKey) ?? options);
    },
    [overlapGroups],
  );

  const handleOverlapLeave = useMemo(
    () => () => {
      setOverlapAnchor(null);
      setOverlapPins([]);
    },
    [],
  );

  const overviewPoints = useMemo(() => {
    const pts: [number, number][] = [];
    spreadSources.forEach((s) => {
      const pos = spreadPositions.get(s.id) ?? { lat: s.lat, lng: s.lng };
      pts.push([pos.lat, pos.lng]);
    });
    return pts;
  }, [spreadSources, spreadPositions]);

  const stolenVehicles = vehicles.filter((v) => v.vehicleType === 'STOLEN');

  return (
    <div className="command-map-container">
      <MapContainer
        center={[data.center?.lat ?? -29.8587, data.center?.lng ?? 31.0218]}
        zoom={12}
        scrollWheelZoom
        zoomControl={false}
        className="command-map leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" imperial={false} />

        <FlyToTarget target={flyTo ?? null} />
        <ReturnToOverview trigger={returnToOverview} points={overviewPoints} />
        <FollowIncident incident={followIncident} enabled={!!followIncidentId} />

        <ClusterLayer
          pins={clusterPins}
          spreadPositions={spreadPositions}
          popupOpenersRef={popupOpenersRef}
          onOverlapHover={handleOverlapHover}
          onOverlapLeave={handleOverlapLeave}
        />

        <MapOverlapPicker
          pins={overlapPins}
          anchor={overlapAnchor}
          onClose={handleOverlapLeave}
        />

        {visibility.trails &&
          mapIncidents.map((incident) => {
            if ((incident.trail?.length ?? 0) < 2) return null;
            const active =
              incident.category === 'THEFT_RECOVERY' ||
              incident.category === 'PANIC' ||
              incident.category === 'SILENT_PANIC' ||
              ['ACTIVE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE'].includes(incident.status);
            if (!active) return null;
            const points = trailSlice(incident.trail, replayProgress).map(
              (p) => [p.lat, p.lng] as [number, number],
            );
            const highlighted = incident.id === selectedIncidentId;
            return (
              <Polyline
                key={`trail-${incident.id}`}
                positions={points}
                pathOptions={{
                  color: highlighted ? '#ef4444' : '#f59e0b',
                  weight: highlighted ? 4 : 2,
                  opacity: 0.85,
                  dashArray: incident.category === 'THEFT_RECOVERY' ? undefined : '6 8',
                }}
              />
            );
          })}

        {visibility.incidents &&
          mapIncidents.map((incident) => {
            const pinId = `incident-${incident.id}`;
            const pin = incidentPins.find((p) => p.pinId === pinId);
            if (!pin) return null;
            const position = spreadPositions.get(pinId) ?? { lat: incident.lat, lng: incident.lng };
            const groupOptions = overlapGroups.get(pin.groupKey) ?? [];

            return (
              <AnimatedMarker
                key={pinId}
                position={position}
                icon={incidentIcon(incident.category)}
                selected={incident.id === selectedIncidentId}
                riseOnHover
                overlapGroupSize={groupOptions.length}
                onOverlapHover={() => {
                  if (groupOptions.length > 1) {
                    handleOverlapHover(
                      pin.groupKey,
                      L.latLng(position.lat, position.lng),
                      groupOptions,
                    );
                  }
                }}
                onOverlapLeave={handleOverlapLeave}
                markerRef={(marker) => {
                  if (marker) {
                    popupOpenersRef.current.set(pinId, () => marker.openPopup());
                  } else {
                    popupOpenersRef.current.delete(pinId);
                  }
                }}
                onSelect={() => onSelectIncident?.(incident.id)}
              >
                <IncidentPopup incident={incident} onDispatchAssigned={onDispatchAssigned} />
              </AnimatedMarker>
            );
          })}

        {visibility.vehicles &&
          stolenVehicles.map((vehicle) => {
            const pinId = `stolen-${vehicle.id}`;
            const pin = stolenPins.find((p) => p.pinId === pinId);
            if (!pin) return null;
            const position = spreadPositions.get(pinId) ?? { lat: vehicle.lat, lng: vehicle.lng };
            const groupOptions = overlapGroups.get(pin.groupKey) ?? [];

            return (
              <AnimatedMarker
                key={pinId}
                position={position}
                icon={vehicleIcon('STOLEN')}
                selected={theftRecoveryFocusId === vehicle.id}
                riseOnHover
                overlapGroupSize={groupOptions.length}
                onOverlapHover={() => {
                  if (groupOptions.length > 1) {
                    handleOverlapHover(
                      pin.groupKey,
                      L.latLng(position.lat, position.lng),
                      groupOptions,
                    );
                  }
                }}
                onOverlapLeave={handleOverlapLeave}
                markerRef={(marker) => {
                  if (marker) {
                    popupOpenersRef.current.set(pinId, () => marker.openPopup());
                  } else {
                    popupOpenersRef.current.delete(pinId);
                  }
                }}
              >
                <VehiclePopup vehicle={vehicle} />
              </AnimatedMarker>
            );
          })}

      </MapContainer>
    </div>
  );
}

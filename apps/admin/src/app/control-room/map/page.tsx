'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { CallActions, DispatchLineButton } from '@/components/calls/CallActions';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';
import {
  DEFAULT_VISIBILITY,
  type IncidentCategory,
  type MapCommandData,
  type MapIncident,
  type MarkerVisibility,
} from '@/components/maps/map-types';

function normalizeSocketIncident(
  raw: Partial<MapIncident> & {
    id: string;
    type: string;
    priority: string;
    status: string;
    name: string;
    lat: number;
    lng: number;
    address: string | null;
  },
): MapIncident {
  let category: IncidentCategory = 'SUSPICIOUS';
  if (raw.category) category = raw.category as IncidentCategory;
  else if (raw.type === 'PANIC') category = raw.isSilent ? 'SILENT_PANIC' : 'PANIC';
  else if (raw.type === 'THEFT') category = 'THEFT_RECOVERY';
  else if (raw.type === 'MEDICAL') category = 'MEDICAL';
  else if (raw.type === 'FIRE') category = 'FIRE';

  return {
    id: raw.id,
    category,
    type: raw.type,
    priority: raw.priority,
    status: raw.status,
    name: raw.name,
    clientUserId: raw.clientUserId,
    clientPhone: raw.clientPhone,
    lat: raw.lat,
    lng: raw.lng,
    address: raw.address,
    isSilent: raw.isSilent ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    assignedOfficer: raw.assignedOfficer ?? null,
    nearestUnitKm: raw.nearestUnitKm ?? null,
    nearestUnitEta: raw.nearestUnitEta ?? null,
    trail: raw.trail ?? [],
  };
}
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { maskMapDataForScreenshot } from '@/lib/map-screenshot';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { CONTROL_ROOM_ROUTES, incidentHref } from '@/lib/control-room-routes';
import { getSocketUrl } from '@/lib/socket';

const CommandCentreMap = dynamic(() => import('@/components/maps/CommandCentreMap'), {
  ssr: false,
  loading: () => <LoadingSpinner label="Loading command centre map..." fullScreen />,
});

type PositionUpdate = {
  entityType: 'client' | 'officer' | 'vehicle';
  id: string;
  lat: number;
  lng: number;
};

export default function MapPage() {
  return (
    <ControlRoomLayout title="Live Operations Map">
      <MapContent />
    </ControlRoomLayout>
  );
}

function MapContent() {
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<MapCommandData>>('/control-room/map'),
    [],
  );

  const [rawMapData, setRawMapData] = useState<MapCommandData | null>(null);
  const mapData = useMemo(
    () => (rawMapData ? maskMapDataForScreenshot(rawMapData) : null),
    [rawMapData],
  );
  const [visibility, setVisibility] = useState<MarkerVisibility>(DEFAULT_VISIBILITY);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [followIncidentId, setFollowIncidentId] = useState<string | null>(null);
  const [theftRecoveryMode, setTheftRecoveryMode] = useState(false);
  const [theftFocusId, setTheftFocusId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [overviewTrigger, setOverviewTrigger] = useState(0);
  const [replayProgress, setReplayProgress] = useState(1);
  const [replayActive, setReplayActive] = useState(false);
  const [search, setSearch] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (data?.data) setRawMapData(data.data);
  }, [data]);

  const selectIncident = useCallback((incident: MapIncident) => {
    setSelectedIncidentId(incident.id);
    setFollowIncidentId(incident.id);
    setFlyTo({ lat: incident.lat, lng: incident.lng, zoom: 16 });
    setActiveIncidentId(incident.id);
  }, []);

  useEffect(() => {
    const incidentParam = searchParams.get('incident');
    if (incidentParam && mapData) {
      const incident = mapData.incidents.find((i) => i.id === incidentParam);
      if (incident) selectIncident(incident);
    }
  }, [searchParams, mapData, selectIncident]);

  const positionBufferRef = useRef<PositionUpdate[]>([]);
  const positionFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPositionUpdates = useCallback((updates: PositionUpdate[]) => {
    if (!updates.length) return;
    setRawMapData((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const u of updates) {
        if (u.entityType === 'client') {
          next.clients = prev.clients.map((c) =>
            c.id === u.id ? { ...c, lat: u.lat, lng: u.lng } : c,
          );
        } else if (u.entityType === 'officer') {
          next.officers = prev.officers.map((o) =>
            o.id === u.id ? { ...o, lat: u.lat, lng: u.lng } : o,
          );
        } else if (u.entityType === 'vehicle') {
          next.vehicles = prev.vehicles.map((v) =>
            v.id === u.id ? { ...v, lat: u.lat, lng: u.lng } : v,
          );
        }
      }
      return next;
    });
  }, []);

  const queuePositionUpdates = useCallback(
    (updates: PositionUpdate[]) => {
      positionBufferRef.current.push(...updates);
      if (positionFlushRef.current) return;
      positionFlushRef.current = setTimeout(() => {
        const batch = positionBufferRef.current;
        positionBufferRef.current = [];
        positionFlushRef.current = null;
        applyPositionUpdates(batch);
      }, 600);
    },
    [applyPositionUpdates],
  );

  const handleIncidentCreated = useCallback(
    (raw: Parameters<typeof normalizeSocketIncident>[0]) => {
      const incident = normalizeSocketIncident(raw);
      setRawMapData((prev) => {
        if (!prev) return prev;
        if (prev.incidents.some((i) => i.id === incident.id)) return prev;
        return { ...prev, incidents: [incident, ...prev.incidents] };
      });
      if (incident.category === 'PANIC' || incident.priority === 'CRITICAL') {
        selectIncident(incident);
      }
      if (incident.category === 'THEFT_RECOVERY') {
        setTheftRecoveryMode(true);
      }
    },
    [selectIncident],
  );

  useEffect(() => {
    const session = getSession('admin');
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setLiveConnected(true));
    socket.on('disconnect', () => setLiveConnected(false));
    socket.on('incident:created', (incident: MapIncident) => handleIncidentCreated(incident));
    socket.on('position:update', (updates: PositionUpdate[]) => queuePositionUpdates(updates));

    const poll = setInterval(() => void reload({ silent: true }), 60000);

    return () => {
      socket.disconnect();
      clearInterval(poll);
      if (positionFlushRef.current) clearTimeout(positionFlushRef.current);
    };
  }, [handleIncidentCreated, queuePositionUpdates, reload]);

  useEffect(() => {
    if (!replayActive) {
      if (replayRef.current) clearInterval(replayRef.current);
      setReplayProgress(1);
      return;
    }
    setReplayProgress(0);
    replayRef.current = setInterval(() => {
      setReplayProgress((p) => {
        if (p >= 1) {
          setReplayActive(false);
          return 1;
        }
        return Math.min(1, p + 0.04);
      });
    }, 200);
    return () => {
      if (replayRef.current) clearInterval(replayRef.current);
    };
  }, [replayActive]);

  useEffect(() => {
    if (!theftRecoveryMode || !mapData) return;
    const stolen = mapData.vehicles.find((v) => v.vehicleType === 'STOLEN');
    if (stolen) {
      setTheftFocusId(stolen.id);
      setFlyTo({ lat: stolen.lat, lng: stolen.lng, zoom: 16 });
    }
  }, [theftRecoveryMode, mapData?.vehicles]);

  function returnToOverview() {
    setSelectedIncidentId(null);
    setFollowIncidentId(null);
    setTheftRecoveryMode(false);
    setTheftFocusId(null);
    setFlyTo(null);
    setOverviewTrigger((n) => n + 1);
  }

  function toggleVisibility(key: keyof MarkerVisibility) {
    setVisibility((v) => ({ ...v, [key]: !v[key] }));
  }

  function toggleFullscreen() {
    const el = mapWrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
      setFullscreen(true);
    } else {
      void document.exitFullscreen();
      setFullscreen(false);
    }
  }

  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const filteredIncidents = useMemo(() => {
    if (!mapData) return [];
    const q = search.trim().toLowerCase();
    if (!q) return mapData.incidents;
    return mapData.incidents.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        (i.address?.toLowerCase().includes(q) ?? false),
    );
  }, [mapData, search]);

  const searchMatches = useMemo(() => {
    if (!mapData || !search.trim()) return null;
    const q = search.trim().toLowerCase();
    return {
      clients: mapData.clients.filter((c) => c.name.toLowerCase().includes(q)),
      officers: mapData.officers.filter((o) => o.name.toLowerCase().includes(q)),
      vehicles: mapData.vehicles.filter(
        (v) =>
          v.registration.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q),
      ),
      incidents: mapData.incidents.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q),
      ),
    };
  }, [mapData, search]);

  if (loading && !mapData) return <LoadingSpinner label="Loading operations data..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!mapData) return null;

  const layerItems = (
    [
      ['clients', 'Clients'],
      ['officers', 'Officers'],
      ['fleet', 'Fleet'],
      ['vehicles', 'Client vehicles'],
      ['incidents', 'Incidents'],
      ['properties', 'Properties'],
      ['trails', 'Trails'],
    ] as const
  ).map(([key, label]) => ({
    id: key,
    label,
    active: visibility[key],
    onClick: () => toggleVisibility(key),
  }));

  const actionItems = [
    {
      id: 'theft',
      label: 'Theft Recovery',
      active: theftRecoveryMode,
      tone: 'danger' as const,
      onClick: () => setTheftRecoveryMode((v) => !v),
    },
    {
      id: 'replay',
      label: 'Replay Trail',
      active: replayActive,
      onClick: () => setReplayActive((v) => !v),
    },
    {
      id: 'overview',
      label: 'Return to Overview',
      onClick: returnToOverview,
    },
    {
      id: 'fullscreen',
      label: fullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      onClick: toggleFullscreen,
    },
    {
      id: 'refresh',
      label: 'Refresh map data',
      onClick: () => void reload({ silent: true }),
    },
  ];

  const layersOn = layerItems.filter((i) => i.active).length;

  return (
    <div className={`command-centre ${fullscreen ? 'command-centre--fullscreen' : ''}`}>
      <div className="command-centre__toolbar">
        <div className="command-centre__toolbar-left">
          <input
            type="search"
            className="command-search"
            placeholder="Search map…"
            aria-label="Search clients, officers, vehicles, incidents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="command-filters command-filters--desktop">
            {layerItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`command-filter ${item.active ? 'command-filter--on' : ''}`}
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="command-filters-mobile">
            <OpsMenuDropdown
              label="Layers"
              summary={`${layersOn}/${layerItems.length}`}
              items={layerItems}
            />
          </div>
        </div>
        <div className="command-centre__toolbar-right">
          <DispatchLineButton phone="+27860000000" name="4DS Dispatch" />
          <div className="command-actions--desktop">
            <button
              type="button"
              className={`command-btn ${theftRecoveryMode ? 'command-btn--active' : ''}`}
              onClick={() => setTheftRecoveryMode((v) => !v)}
            >
              Theft Recovery
            </button>
            <button
              type="button"
              className={`command-btn ${replayActive ? 'command-btn--active' : ''}`}
              onClick={() => setReplayActive((v) => !v)}
            >
              Replay Trail
            </button>
            <button type="button" className="command-btn" onClick={returnToOverview}>
              Return to Overview
            </button>
            <button type="button" className="command-btn" onClick={toggleFullscreen}>
              {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void reload({ silent: true })}>
              Refresh
            </button>
          </div>
          <div className="command-actions-mobile">
            <OpsMenuDropdown label="Actions" align="right" items={actionItems} />
          </div>
          <span className={`badge ${liveConnected ? 'badge--live' : ''}`}>
            {liveConnected ? 'LIVE' : 'Connecting'}
          </span>
        </div>
      </div>

      <div className="command-centre__body">
        <aside className="command-sidebar">
          <div className="command-sidebar__header">
            <h2>Active Incidents</h2>
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="link-sm">View all</Link>
          </div>

          {searchMatches && search.trim() && (
            <div className="command-search-results">
              {searchMatches.clients.length > 0 && (
                <p>{searchMatches.clients.length} client match(es)</p>
              )}
              {searchMatches.officers.length > 0 && (
                <p>{searchMatches.officers.length} officer match(es)</p>
              )}
              {searchMatches.vehicles.length > 0 && (
                <p>{searchMatches.vehicles.length} vehicle match(es)</p>
              )}
            </div>
          )}

          <ul className="command-incident-list">
            {filteredIncidents.length === 0 && (
              <li className="command-incident-empty">No active incidents</li>
            )}
            {filteredIncidents.map((incident) => (
              <li
                key={incident.id}
                className={`command-incident-item ${
                  selectedIncidentId === incident.id ? 'command-incident-item--selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="command-incident-item__body"
                  onClick={() => selectIncident(incident)}
                >
                  <div className="command-incident-item__row">
                    <span className={`incident-type incident-type--${incident.priority.toLowerCase()}`}>
                      {incident.category.replace('_', ' ')}
                    </span>
                    <span className="command-incident-status">{incident.status.replace('_', ' ')}</span>
                  </div>
                  <strong className="command-incident-item__name">{incident.name}</strong>
                  <span className="command-incident-item__meta text-muted">
                    {incident.address ?? 'Unknown'}
                    {incident.nearestUnitKm != null && ` · ${incident.nearestUnitKm.toFixed(1)} km`}
                  </span>
                </button>
                <div className="command-incident-item__actions">
                  <DispatchMenuButton
                    incidentId={incident.id}
                    onAssigned={() => void reload({ silent: true })}
                  />
                  <Link href={incidentHref(incident.id)} className="btn-sm btn-sm--link">Details</Link>
                  <CallActions
                    compact
                    target={{
                      name: incident.name,
                      phone: incident.clientPhone ?? undefined,
                      userId: incident.clientUserId,
                      incidentId: incident.id,
                      role: 'CLIENT',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="command-sidebar__legend">
            <h3>Map Legend</h3>
            <div className="command-legend-grid">
              <span className="legend-chip legend-chip--panic">Panic</span>
              <span className="legend-chip legend-chip--theft">Theft Recovery</span>
              <span className="legend-chip legend-chip--officer">Officers</span>
              <span className="legend-chip legend-chip--fleet">Fleet</span>
              <span className="legend-chip legend-chip--client">Clients</span>
              <span className="legend-chip legend-chip--vehicle">Client vehicles</span>
              <span className="legend-chip legend-chip--property">Properties</span>
            </div>
          </div>
        </aside>

        <div className="command-map-wrap" ref={mapWrapRef}>
          <CommandCentreMap
            data={mapData}
            visibility={visibility}
            selectedIncidentId={selectedIncidentId}
            followIncidentId={followIncidentId}
            flyTo={flyTo}
            returnToOverview={overviewTrigger}
            replayProgress={replayProgress}
            theftRecoveryFocusId={theftFocusId}
            onSelectIncident={(id) => {
              const incident = mapData.incidents.find((i) => i.id === id);
              if (incident) selectIncident(incident);
            }}
            onDispatchAssigned={() => void reload({ silent: true })}
          />
        </div>
      </div>

      <p className="command-centre__hint text-muted">
        Durban metro operations view · Dark mode optimised for 24/7 control room use ·
        {' '}
        <Link href={CONTROL_ROOM_ROUTES.analytics} className="interactive-text">Analytics</Link>
      </p>
    </div>
  );
}

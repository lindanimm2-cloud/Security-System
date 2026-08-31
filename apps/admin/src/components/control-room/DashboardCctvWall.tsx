'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import {
  subscribeVehicleFocus,
  type VehicleRemoteAction,
} from '@/lib/vehicle-remote';

type SitePreview = {
  id: string;
  name: string;
  alarmStatus: string;
  cameraCount: number;
  onlineCameras: number;
  cameras?: CctvCamera[];
};

type Overview = {
  stats: { cameras: number; offlineCameras: number; triggeredSites: number };
  sites: SitePreview[];
};

type FleetVehicle = {
  id: string;
  callSign: string;
  registration: string;
  status: string;
  cameras?: CctvCamera[];
};

type ClientVehicle = {
  id: string;
  callSign: string;
  registration: string;
  make?: string;
  model?: string;
  owner?: string;
  status: string;
  theftRecovery: boolean;
  immobiliserOn: boolean;
  doorsLocked: boolean;
  hornActive?: boolean;
  panicFocus?: boolean;
  cameras?: CctvCamera[];
};

type FeedTab = 'sites' | 'dash';
type DashSource = (FleetVehicle | ClientVehicle) & { source: 'fleet' | 'client' };

export function DashboardCctvWall() {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );
  const { data: fleetData, reload: reloadFleet } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );
  const { data: clientData, reload: reloadClients } = useApi(
    () => adminApi.get<ApiResponse<ClientVehicle[]>>('/control-room/client-vehicles'),
    [],
  );
  const [tab, setTab] = useState<FeedTab>('dash');
  const [focusVehicleId, setFocusVehicleId] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState<VehicleRemoteAction | null>(null);
  const [remoteNote, setRemoteNote] = useState('');

  const refresh = useCallback(() => {
    void reload({ silent: true });
    void reloadFleet({ silent: true });
    void reloadClients({ silent: true });
  }, [reload, reloadFleet, reloadClients]);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => refresh(), 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    return subscribeVehicleFocus((detail) => {
      setFocusVehicleId(detail.vehicleId);
      setTab('dash');
      if (detail.action === 'panic') {
        setRemoteNote(`Vehicle panic — ${detail.registration}. Dash cameras switched.`);
      }
      void reloadClients({ silent: true });
    });
  }, [reloadClients]);

  usePlatformEvents('admin', ['vehicle.panic', 'vehicle.remote'], (payload) => {
    const vehicleId = typeof payload.vehicleId === 'string' ? payload.vehicleId : null;
    if (!vehicleId) return;
    setFocusVehicleId(vehicleId);
    setTab('dash');
    if (payload.event === 'vehicle.panic' || payload.action === 'panic') {
      const plate = typeof payload.registration === 'string' ? payload.registration : 'vehicle';
      setRemoteNote(`Vehicle panic — ${plate}. Dash cameras switched.`);
    }
    void reloadClients({ silent: true });
  });

  const sites = data?.data?.sites ?? [];
  const fleet = fleetData?.data ?? [];
  const clientVehicles = clientData?.data ?? [];

  const hotSite =
    sites.find((s) => s.alarmStatus === 'TRIGGERED' && (s.cameras?.length ?? 0) > 0) ??
    sites.find((s) => (s.cameras?.length ?? 0) > 0) ??
    sites[0];

  const dashUnits = useMemo<DashSource[]>(() => {
    const clients: DashSource[] = clientVehicles
      .filter((v) => (v.cameras?.length ?? 0) > 0)
      .map((v) => ({ ...v, source: 'client' as const }));
    const company: DashSource[] = fleet
      .filter((v) => (v.cameras?.length ?? 0) > 0)
      .map((v) => ({ ...v, source: 'fleet' as const }));
    return [...clients, ...company].sort((a, b) => {
      const hot = (u: DashSource) => {
        if (u.id === focusVehicleId) return 0;
        if (u.source === 'client' && 'panicFocus' in u && u.panicFocus) return 1;
        if (u.source === 'client' && 'theftRecovery' in u && u.theftRecovery) return 2;
        const s = u.status;
        if (s === 'ON_DUTY' || s === 'EN_ROUTE' || s === 'DEPLOYED' || s === 'RECOVERY') return 3;
        if (s === 'MAINTENANCE' || s === 'OFFLINE') return 5;
        return 4;
      };
      return hot(a) - hot(b);
    });
  }, [clientVehicles, fleet, focusVehicleId]);

  const hotUnit = dashUnits[0];
  const focusedClient =
    hotUnit?.source === 'client'
      ? (clientVehicles.find((v) => v.id === hotUnit.id) ?? null)
      : null;
  const siteCameras = (hotSite?.cameras ?? []).slice(0, 4);
  const dashCameras = (hotUnit?.cameras ?? []).slice(0, 4);
  const usingDash = tab === 'dash';
  const cameras = usingDash ? dashCameras : siteCameras;
  const primary = cameras[0];
  const rest = cameras.slice(1, 4);
  const href = usingDash
    ? focusedClient
      ? CONTROL_ROOM_ROUTES.map
      : CONTROL_ROOM_ROUTES.fleet
    : hotSite
      ? `${CONTROL_ROOM_ROUTES.surveillance}/${hotSite.id}`
      : CONTROL_ROOM_ROUTES.surveillance;

  const siteOnline = hotSite ? `${hotSite.onlineCameras}/${hotSite.cameraCount}` : '0/0';
  const dashOnline = dashCameras.filter((c) => {
    const s = (c.status ?? 'OFFLINE').toUpperCase();
    return s === 'ONLINE' || s === 'RECORDING';
  }).length;

  async function sendRemote(action: VehicleRemoteAction) {
    if (!focusedClient) return;
    setRemoteBusy(action);
    setRemoteNote('');
    try {
      const res = await adminApi.post<ApiResponse<{ message?: string }>>(
        `/control-room/client-vehicles/${focusedClient.id}/remote`,
        { action },
      );
      setRemoteNote(res.data?.message ?? 'Command sent.');
      refresh();
    } catch {
      setRemoteNote('Remote command failed.');
    } finally {
      setRemoteBusy(null);
    }
  }

  const dashLabel = usingDash
    ? hotUnit
      ? hotUnit.source === 'client'
        ? `${hotUnit.registration} client dash · ${dashOnline}/${dashCameras.length} live`
        : `${hotUnit.callSign} dash cam · ${dashOnline}/${dashCameras.length} online`
      : loading
        ? 'Loading dash cams…'
        : 'Fleet dash cams'
    : hotSite
      ? `${hotSite.name} · ${siteOnline} online`
      : loading
        ? 'Loading cameras…'
        : 'Live site cameras';

  return (
    <section className="ops-board__cctv" aria-label="CCTV footage">
      <div className="panel-header ops-board__pane-head">
        <div>
          <h2>CCTV</h2>
          <p className="text-muted">{dashLabel}</p>
        </div>
        <Link href={usingDash ? CONTROL_ROOM_ROUTES.fleet : CONTROL_ROOM_ROUTES.surveillance} className="link-sm">
          {usingDash ? 'Fleet' : 'All sites'}
        </Link>
      </div>

      <div className="ops-cctv__tabs" role="tablist" aria-label="Camera source">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'dash'}
          className={`ops-cctv__tab ${tab === 'dash' ? 'ops-cctv__tab--on' : ''}`}
          onClick={() => setTab('dash')}
        >
          Dash cams
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sites'}
          className={`ops-cctv__tab ${tab === 'sites' ? 'ops-cctv__tab--on' : ''}`}
          onClick={() => setTab('sites')}
        >
          Sites
        </button>
      </div>

      {!primary ? (
        <div className="dash-clear" style={{ padding: '0.85rem' }}>
          <strong>{loading ? 'Loading footage…' : usingDash ? 'No dash cams' : 'No live cameras'}</strong>
          <p className="text-muted">
            {loading
              ? 'Pulling live feeds.'
              : usingDash
                ? 'Client and company vehicles will show dash-cam footage here.'
                : 'Link site cameras to show footage here.'}
          </p>
        </div>
      ) : (
        <div className="ops-cctv">
          <CctvLiveFeed camera={primary} href={href} featured />
          {rest.length > 0 ? (
            <div className="ops-cctv__strip">
              {rest.map((c) => (
                <CctvLiveFeed key={c.id} camera={c} href={href} compact />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {usingDash && focusedClient ? (
        <div className="ops-cctv__vehicle-cmd">
          {remoteNote ? <p className="text-muted">{remoteNote}</p> : null}
          <VehicleRemotePad
            variant="ops"
            compact
            state={{
              doorsLocked: focusedClient.doorsLocked ?? true,
              immobiliserOn: focusedClient.immobiliserOn ?? false,
              theftRecovery: focusedClient.theftRecovery ?? false,
              hornActive: focusedClient.hornActive ?? false,
            }}
            busyAction={remoteBusy}
            onCommand={(action) => void sendRemote(action)}
          />
        </div>
      ) : null}
    </section>
  );
}

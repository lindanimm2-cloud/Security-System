'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { useApi } from '@/hooks/useApi';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';

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

type FeedTab = 'sites' | 'dash';

export function DashboardCctvWall() {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );
  const { data: fleetData, reload: reloadFleet } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );
  const [tab, setTab] = useState<FeedTab>('dash');

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => {
      void reload({ silent: true });
      void reloadFleet({ silent: true });
    }, 15000);
    return () => window.clearInterval(id);
  }, [reload, reloadFleet]);

  const sites = data?.data?.sites ?? [];
  const fleet = fleetData?.data ?? [];

  const hotSite =
    sites.find((s) => s.alarmStatus === 'TRIGGERED' && (s.cameras?.length ?? 0) > 0) ??
    sites.find((s) => (s.cameras?.length ?? 0) > 0) ??
    sites[0];

  const dashUnits = useMemo(
    () =>
      fleet
        .filter((v) => (v.cameras?.length ?? 0) > 0)
        .sort((a, b) => {
          const rank = (s: string) =>
            s === 'ON_DUTY' || s === 'EN_ROUTE' || s === 'DEPLOYED' ? 0 : s === 'MAINTENANCE' || s === 'OFFLINE' ? 2 : 1;
          return rank(a.status) - rank(b.status);
        }),
    [fleet],
  );

  const hotUnit = dashUnits[0];
  const siteCameras = (hotSite?.cameras ?? []).slice(0, 4);
  const dashCameras = (hotUnit?.cameras ?? []).slice(0, 4);
  const usingDash = tab === 'dash';
  const cameras = usingDash ? dashCameras : siteCameras;
  const primary = cameras[0];
  const rest = cameras.slice(1, 4);
  const href = usingDash
    ? CONTROL_ROOM_ROUTES.fleet
    : hotSite
      ? `${CONTROL_ROOM_ROUTES.surveillance}/${hotSite.id}`
      : CONTROL_ROOM_ROUTES.surveillance;

  const siteOnline = hotSite ? `${hotSite.onlineCameras}/${hotSite.cameraCount}` : '0/0';
  const dashOnline = dashCameras.filter((c) => {
    const s = c.status.toUpperCase();
    return s === 'ONLINE' || s === 'RECORDING';
  }).length;

  return (
    <section className="ops-board__cctv" aria-label="CCTV footage">
      <div className="panel-header ops-board__pane-head">
        <div>
          <h2>CCTV</h2>
          <p className="text-muted">
            {usingDash
              ? hotUnit
                ? `${hotUnit.callSign} dash cam · ${dashOnline}/${dashCameras.length} online`
                : loading
                  ? 'Loading dash cams…'
                  : 'Fleet dash cams'
              : hotSite
                ? `${hotSite.name} · ${siteOnline} online`
                : loading
                  ? 'Loading cameras…'
                  : 'Live site cameras'}
          </p>
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
                ? 'Company vehicles will show dash-cam footage here.'
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
    </section>
  );
}

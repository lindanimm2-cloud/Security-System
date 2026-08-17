'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsKpi } from '@/components/ops/OpsKpi';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';

type SitePreview = {
  id: string;
  name: string;
  address: string;
  alarmStatus: string;
  cameraCount: number;
  onlineCameras: number;
  cameras?: CctvCamera[];
  client: { id: string; name: string; email: string; phone: string | null };
  openEvents: {
    id: string;
    title: string;
    type: string;
    severity: string;
    status: string;
    triggeredAt: string;
  }[];
};

type Overview = {
  stats: {
    sites: number;
    cameras: number;
    openEvents: number;
    triggeredSites: number;
    offlineCameras: number;
  };
  sites: SitePreview[];
};

type FleetVehicle = {
  id: string;
  callSign: string;
  registration: string;
  status: string;
  cameras?: CctvCamera[];
};

type WallSource = {
  key: string;
  label: string;
  href: string;
  cameras: CctvCamera[];
};

export default function SurveillancePage() {
  return (
    <ControlRoomLayout title="Camera viewer">
      <SurveillanceContent />
    </ControlRoomLayout>
  );
}

function SurveillanceContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );
  const { data: fleetData } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );
  const [tab, setTab] = useState<'sites' | 'dash'>('sites');
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const stats = data?.data?.stats;
  const sites = data?.data?.sites ?? [];
  const fleet = fleetData?.data ?? [];

  const siteSources: WallSource[] = useMemo(
    () =>
      sites
        .filter((s) => (s.cameras?.length ?? 0) > 0)
        .map((s) => ({
          key: `site-${s.id}`,
          label: s.name,
          href: `${CONTROL_ROOM_ROUTES.surveillance}/${s.id}`,
          cameras: s.cameras ?? [],
        })),
    [sites],
  );

  const dashSources: WallSource[] = useMemo(
    () =>
      fleet
        .filter((v) => (v.cameras?.length ?? 0) > 0)
        .map((v) => ({
          key: `dash-${v.id}`,
          label: `${v.callSign} · ${v.registration}`,
          href: CONTROL_ROOM_ROUTES.fleet,
          cameras: v.cameras ?? [],
        })),
    [fleet],
  );

  const sources = tab === 'dash' ? dashSources : siteSources;
  const active = sources.find((s) => s.key === focusKey) ?? sources[0];
  const cameras = active?.cameras ?? [];
  const featured = cameras[0];
  const mosaic = cameras.slice(1);

  const events = useMemo(
    () =>
      sites.flatMap((s) =>
        (s.openEvents ?? []).map((e) => ({
          ...e,
          siteName: s.name,
          href: `${CONTROL_ROOM_ROUTES.surveillance}/${s.id}`,
        })),
      ),
    [sites],
  );

  if (loading) return <LoadingSpinner label="Opening camera viewer…" />;
  if (error || !data) return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reload} />;

  return (
    <div className="cam-viewer">
      <div className="cam-viewer__head">
        <div>
          <p className="cam-viewer__eyebrow">Control room</p>
        </div>
        <div className="cam-viewer__tools">
          <div className="ops-cctv__tabs" role="tablist" aria-label="Feed source">
            <button
              type="button"
              role="tab"
              className={`ops-cctv__tab ${tab === 'sites' ? 'ops-cctv__tab--on' : ''}`}
              aria-selected={tab === 'sites'}
              onClick={() => {
                setTab('sites');
                setFocusKey(null);
              }}
            >
              Sites
            </button>
            <button
              type="button"
              role="tab"
              className={`ops-cctv__tab ${tab === 'dash' ? 'ops-cctv__tab--on' : ''}`}
              aria-selected={tab === 'dash'}
              onClick={() => {
                setTab('dash');
                setFocusKey(null);
              }}
            >
              Dash cams
            </button>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => reload()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="cam-viewer__kpi">
        <OpsKpi label="Sites" value={stats?.sites ?? 0} icon="sites" />
        <OpsKpi label="Cameras" value={stats?.cameras ?? 0} icon="cameras" />
        <OpsKpi label="Open events" value={stats?.openEvents ?? 0} icon="events" hot={(stats?.openEvents ?? 0) > 0} />
        <OpsKpi label="Triggered" value={stats?.triggeredSites ?? 0} icon="critical" hot={(stats?.triggeredSites ?? 0) > 0} />
        <OpsKpi label="Offline cams" value={stats?.offlineCameras ?? 0} icon="offline" hot={(stats?.offlineCameras ?? 0) > 0} />
      </div>

      <div className="cam-viewer__stage">
        <section className="cam-viewer__wall" aria-label="Live camera wall">
          {!featured ? (
            <div className="dash-clear" style={{ padding: '1.25rem' }}>
              <strong>{tab === 'dash' ? 'No dash cams' : 'No live cameras'}</strong>
              <p className="text-muted">
                {tab === 'dash'
                  ? 'Company vehicles will show dash-cam footage here.'
                  : 'Open a site after cameras are linked.'}
              </p>
            </div>
          ) : (
            <>
              <div className="cam-viewer__hero">
                <CctvLiveFeed camera={featured} href={active.href} featured />
              </div>
              {mosaic.length > 0 ? (
                <div className={`cam-viewer__mosaic cam-viewer__mosaic--${Math.min(mosaic.length, 4)}`}>
                  {mosaic.map((c) => (
                    <CctvLiveFeed key={c.id} camera={c} href={active.href} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <aside className="cam-viewer__rail">
          <section>
            <h2>Sources</h2>
            {sources.length === 0 ? (
              <p className="text-muted">No feeds in this view.</p>
            ) : (
              <ul className="cam-viewer__sources">
                {sources.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={`cam-viewer__source ${active?.key === s.key ? 'cam-viewer__source--on' : ''}`}
                      onClick={() => setFocusKey(s.key)}
                    >
                      <strong>{s.label}</strong>
                      <span>{s.cameras.length} cams</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>Events</h2>
            {events.length === 0 ? (
              <p className="text-muted">Board clear · no open alarm events.</p>
            ) : (
              <ul className="cam-viewer__events">
                {events.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <Link href={e.href} className="cam-viewer__event">
                      <span className={`cam-viewer__event-kind cam-viewer__event-kind--${e.severity.toLowerCase()}`}>
                        {e.type.replace(/_/g, ' ')}
                      </span>
                      <strong>{e.title}</strong>
                      <span>{e.siteName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sites[0] ? (
            <Link href={`${CONTROL_ROOM_ROUTES.surveillance}/${sites[0].id}`} className="btn-sm btn-primary">
              Open site
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ExportsWorkspace } from '@/components/vms/ExportsWorkspace';
import { LiveWorkspace } from '@/components/vms/LiveWorkspace';
import { PlaybackWorkspace } from '@/components/vms/PlaybackWorkspace';
import { useApi } from '@/hooks/useApi';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { fetchVmsTree } from '@/lib/vms/api';
import { flattenCameras } from '@/lib/vms/types';

type View = 'live' | 'recordings' | 'exports';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'live', label: 'Live view' },
  { id: 'recordings', label: 'Playback' },
  { id: 'exports', label: 'Backup & export' },
];

const TITLES: Record<View, string> = {
  live: 'Live view',
  recordings: 'Playback',
  exports: 'Backup & export',
};

function parseView(raw: string | null): View {
  return raw === 'recordings' || raw === 'exports' ? raw : 'live';
}

export default function SurveillancePage() {
  const view = parseView(useSearchParams().get('view'));
  return (
    <ControlRoomLayout title={TITLES[view]}>
      <SurveillanceContent view={view} />
    </ControlRoomLayout>
  );
}

function SurveillanceContent({ view }: { view: View }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [exportsKey, setExportsKey] = useState(0);
  const { data, loading, error, reload } = useApi(() => fetchVmsTree(), []);
  const tree = data?.data ?? null;

  const counts = useMemo(() => {
    const cams = flattenCameras(tree);
    const offline = cams.filter((c) => c.status.toUpperCase() === 'OFFLINE').length;
    const recorders = (tree?.sites ?? []).reduce((n, s) => n + s.recorders.length, 0);
    return { cams: cams.length, offline, recorders, sites: tree?.sites.filter((s) => s.group === 'SITE').length ?? 0 };
  }, [tree]);

  function go(next: View) {
    const params = new URLSearchParams(search.toString());
    if (next === 'live') params.delete('view');
    else params.set('view', next);
    if (next !== 'recordings') {
      params.delete('cams');
      params.delete('at');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (loading) return <LoadingSpinner label="Loading cameras…" />;
  if (error || !tree) return <ErrorAlert error={error ?? 'Failed to load cameras'} onRetry={reload} />;

  const cams = (search.get('cams') ?? '').split(',').filter(Boolean);
  const siteId = search.get('site');

  return (
    <div className="vms-page">
      <header className="vms-page__head">
        <div className="vms-tabs" role="tablist" aria-label="Camera workspace">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={`vms-tab ${view === v.id ? 'is-on' : ''}`}
              onClick={() => go(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="vms-page__meta">
          <span>
            {counts.sites} sites · {counts.recorders} recorders · {counts.cams} cameras
          </span>
          {counts.offline > 0 ? <span className="vms-pill vms-pill--warn">{counts.offline} offline</span> : null}
          {tree.demo ? <span className="vms-badge">Demo</span> : null}
          <Link href={CONTROL_ROOM_ROUTES.emap} className="btn btn-ghost btn-sm">
            E-map
          </Link>
          <Link href={CONTROL_ROOM_ROUTES.cctvSystems} className="btn btn-ghost btn-sm">
            Devices
          </Link>
        </div>
      </header>

      {view === 'live' ? <LiveWorkspace tree={tree} initialSiteId={siteId} /> : null}
      {view === 'recordings' ? (
        <PlaybackWorkspace
          key={`${cams.join(',')}|${search.get('at') ?? ''}`}
          tree={tree}
          initialCams={cams}
          initialAt={search.get('at')}
          initialSiteId={siteId}
          onExported={() => setExportsKey((k) => k + 1)}
        />
      ) : null}
      {view === 'exports' ? <ExportsWorkspace tree={tree} refreshKey={exportsKey} /> : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Camera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  status: string;
};

type Site = {
  id: string;
  name: string;
  cameraCount: number;
  onlineCameras: number;
  openEvents: number;
  cameras: Camera[];
};

type Props = {
  hasAccess: boolean;
};

export function MiniCameraSection({ hasAccess }: Props) {
  const { data, loading } = useApi(
    () =>
      hasAccess
        ? clientApi.get<ApiResponse<Site[]>>('/client/surveillance/sites')
        : Promise.resolve({ success: true as const, data: [] as Site[] }),
    [hasAccess],
  );

  if (!hasAccess) {
    return (
      <section className="portal-card mini-cameras" aria-label="Cameras">
        <div className="card-header-row">
          <h2>Cameras</h2>
          <Link href="/portal/subscription/upgrade?addon=HOME_SECURITY" className="link-sm">
            Upgrade
          </Link>
        </div>
        <p className="text-muted">Home Security unlocks live camera previews on your dashboard.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="portal-card mini-cameras" aria-label="Cameras">
        <div className="card-header-row">
          <h2>Cameras</h2>
        </div>
        <p className="text-muted">Loading cameras…</p>
      </section>
    );
  }

  const sites = data?.data ?? [];
  const cameras = sites.flatMap((s) =>
    s.cameras.map((c) => ({ ...c, siteId: s.id, siteName: s.name })),
  );
  const openEvents = sites.reduce((n, s) => n + s.openEvents, 0);
  const online = sites.reduce((n, s) => n + s.onlineCameras, 0);
  const total = sites.reduce((n, s) => n + s.cameraCount, 0);
  const preview = cameras.slice(0, 4);
  const primarySite = sites.find((s) => s.cameraCount > 0) ?? sites[0];

  return (
    <section className="portal-card mini-cameras" aria-label="Cameras">
      <div className="card-header-row">
        <div>
          <h2>Cameras</h2>
          <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
            {total === 0
              ? 'No cameras linked yet'
              : `${online}/${total} online${openEvents > 0 ? ` · ${openEvents} alert${openEvents === 1 ? '' : 's'}` : ''}`}
          </p>
        </div>
        <Link href={primarySite ? `/portal/home/${primarySite.id}` : '/portal/home'} className="link-sm">
          Open
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="text-muted">
          Cameras appear here after install.{' '}
          <Link href="/portal/home">Home security</Link>
        </p>
      ) : (
        <div className="camera-grid camera-grid--mini">
          {preview.map((c) => (
            <Link key={c.id} href={`/portal/home/${c.siteId}`} className="camera-tile">
              <div className={`camera-tile__feed camera-tile__feed--${c.status.toLowerCase()}`}>
                <span className="camera-tile__live">CH {c.channel}</span>
                <span className="camera-tile__name">{c.name}</span>
              </div>
              <span className="camera-tile__meta">
                {c.siteName} · {c.status.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

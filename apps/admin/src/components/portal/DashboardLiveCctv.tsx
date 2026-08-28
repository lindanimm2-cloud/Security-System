'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { SlideCarousel, SlideCarouselCard } from '@/components/portal/SlideCarousel';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type FeedSource = {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  cameras: CctvCamera[];
  onlineCount?: number;
};

type DashboardFeeds = {
  home: FeedSource | null;
  vehicles: FeedSource[];
};

type Props = {
  /** Strip carousel chrome so this can sit inside Home Security. */
  embedded?: boolean;
};

function onlineCount(cameras: CctvCamera[], fallback?: number) {
  return fallback ?? cameras.filter((c) => c.status.toUpperCase() !== 'OFFLINE').length;
}

function useDashboardFeeds() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { data, loading } = useApi(
    () => clientApi.get<ApiResponse<DashboardFeeds>>('/client/surveillance/dashboard-feeds'),
    [],
  );

  const feeds = data?.data;
  const home = access?.home ? feeds?.home ?? null : null;
  const vehicles = access?.vehicle ? feeds?.vehicles ?? [] : [];

  const sources = useMemo(() => {
    const list: Array<{ key: string; kind: 'home' | 'vehicle'; source: FeedSource }> = [];
    if (home && home.cameras.length > 0) {
      list.push({ key: 'home', kind: 'home', source: home });
    }
    for (const v of vehicles) {
      if (v.cameras.length > 0) {
        list.push({ key: v.id, kind: 'vehicle', source: v });
      }
    }
    return list;
  }, [home, vehicles]);

  return { sources, loading: accessLoading || loading };
}

/** Live CCTV — carousel on its own, or a compact pane inside Home Security. */
export function DashboardLiveCctv({ embedded = false }: Props) {
  const { sources, loading } = useDashboardFeeds();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (loading) {
    if (embedded) {
      return (
        <div className="home-sec__watch home-sec__watch--loading">
          <LoadingSpinner label="Loading cameras…" size="sm" />
        </div>
      );
    }
    return (
      <SlideCarousel title="Live feeds" subtitle="Loading cameras…">
        <SlideCarouselCard title="…" wide>
          <LoadingSpinner label="Loading live feeds…" size="sm" />
        </SlideCarouselCard>
      </SlideCarousel>
    );
  }

  if (sources.length === 0) return null;

  const selected = sources.find((s) => s.key === activeKey) ?? sources[0];
  const cameras = selected.source.cameras;
  const primary = cameras[0];
  const rest = cameras.slice(1, 3);
  const online = onlineCount(cameras, selected.source.onlineCount);
  const totalOnline = sources.reduce(
    (n, s) => n + onlineCount(s.source.cameras, s.source.onlineCount),
    0,
  );
  const totalCams = sources.reduce((n, s) => n + s.source.cameras.length, 0);

  if (embedded) {
    return (
      <div className="home-sec__watch">
        <div className="home-sec__watch-head">
          <div>
            <p className="home-sec__watch-kicker">Live cameras</p>
            <p className="home-sec__watch-title">{selected.source.label}</p>
          </div>
          <span className="home-sec__watch-count">
            {online}/{cameras.length} live
          </span>
        </div>
        {sources.length > 1 ? (
          <div className="home-sec__watch-tabs" role="tablist" aria-label="Camera sources">
            {sources.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={s.key === selected.key}
                className={`home-sec__watch-tab ${s.key === selected.key ? 'home-sec__watch-tab--active' : ''}`}
                onClick={() => setActiveKey(s.key)}
              >
                {s.kind === 'home' ? 'Home' : s.source.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="home-sec__watch-grid">
          <CctvLiveFeed camera={primary} href={selected.source.href} featured />
          {rest.map((c) => (
            <CctvLiveFeed key={c.id} camera={c} href={selected.source.href} compact />
          ))}
        </div>
        <Link href={selected.source.href} className="home-sec__watch-open">
          Open live view
        </Link>
      </div>
    );
  }

  return (
    <SlideCarousel
      title="Live feeds"
      subtitle={`${totalOnline}/${totalCams} online · swipe for more`}
      seeAllHref={sources[0]?.source.href ?? '/portal/home'}
      seeAllLabel="All cameras"
      className="slide-carousel--feeds"
    >
      {sources.map(({ key, kind, source }) => {
        const cams = source.cameras;
        const feat = cams[0];
        const extra = cams.slice(1, 2);
        const on = onlineCount(cams, source.onlineCount);

        return (
          <SlideCarouselCard
            key={key}
            title={kind === 'home' ? 'Home CCTV' : 'Vehicle cam'}
            href={source.href}
            expandLabel={`Open ${source.label}`}
            wide
          >
            <p className="slide-carousel__feed-name">{source.label}</p>
            <p className="text-muted slide-carousel__feed-meta">
              {on}/{cams.length} online
              {source.subtitle && kind === 'vehicle' ? ` · ${source.subtitle}` : ''}
            </p>
            <div className="slide-carousel__feed-layout">
              <CctvLiveFeed camera={feat} href={source.href} featured />
              {extra.map((c) => (
                <CctvLiveFeed key={c.id} camera={c} href={source.href} />
              ))}
            </div>
            <span className="slide-carousel__card-cta">View live →</span>
          </SlideCarouselCard>
        );
      })}
    </SlideCarousel>
  );
}

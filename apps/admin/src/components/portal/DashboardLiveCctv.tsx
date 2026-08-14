'use client';

import Link from 'next/link';
import { useMemo } from 'react';
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

function onlineCount(cameras: CctvCamera[], fallback?: number) {
  return fallback ?? cameras.filter((c) => c.status.toUpperCase() !== 'OFFLINE').length;
}

/** Live CCTV — horizontal swipe cards (home + vehicle). */
export function DashboardLiveCctv() {
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

  if (accessLoading || loading) {
    return (
      <SlideCarousel title="Live feeds" subtitle="Loading cameras…">
        <SlideCarouselCard title="…" wide>
          <LoadingSpinner label="Loading live feeds…" size="sm" />
        </SlideCarouselCard>
      </SlideCarousel>
    );
  }

  if (sources.length === 0) return null;

  const totalOnline = sources.reduce(
    (n, s) => n + onlineCount(s.source.cameras, s.source.onlineCount),
    0,
  );
  const totalCams = sources.reduce((n, s) => n + s.source.cameras.length, 0);

  return (
    <SlideCarousel
      title="Live feeds"
      subtitle={`${totalOnline}/${totalCams} online · swipe for more`}
      seeAllHref={sources[0]?.source.href ?? '/portal/home'}
      seeAllLabel="All cameras"
      className="slide-carousel--feeds"
    >
      {sources.map(({ key, kind, source }) => {
        const cameras = source.cameras;
        const primary = cameras[0];
        const rest = cameras.slice(1, 2);
        const online = onlineCount(cameras, source.onlineCount);

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
              {online}/{cameras.length} online
              {source.subtitle && kind === 'vehicle' ? ` · ${source.subtitle}` : ''}
            </p>
            <div className="slide-carousel__feed-layout">
              <CctvLiveFeed camera={primary} href={source.href} featured />
              {rest.map((c) => (
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

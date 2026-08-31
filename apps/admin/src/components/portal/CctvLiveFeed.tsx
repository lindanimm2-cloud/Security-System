'use client';

import Link from 'next/link';

export type CctvCamera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  status: string;
  snapshotUrl?: string | null;
  isLiveCapable?: boolean;
  isInterior?: boolean;
};

type CctvLiveFeedProps = {
  camera: CctvCamera;
  href?: string;
  featured?: boolean;
  compact?: boolean;
  className?: string;
};

function FeedInner({
  camera,
  featured,
  compact,
}: {
  camera: CctvCamera;
  featured?: boolean;
  compact?: boolean;
}) {
  const status = (camera.status ?? 'offline').toLowerCase();
  const live =
    camera.isLiveCapable !== false &&
    (status === 'online' || status === 'recording');
  const offline = status === 'offline' || status === 'fault';

  return (
    <div
      className={`cctv-feed cctv-feed--${status} ${featured ? 'cctv-feed--featured' : ''} ${compact ? 'cctv-feed--compact' : ''} ${live ? 'cctv-feed--live' : ''}`}
    >
      <div className="cctv-feed__stage">
        {camera.snapshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={camera.snapshotUrl} alt="" className="cctv-feed__img" />
        ) : (
          <div className="cctv-feed__sim" aria-hidden>
            <span className="cctv-feed__noise" />
            <span className="cctv-feed__scan" />
          </div>
        )}
        <div className="cctv-feed__overlay">
          {live ? (
            <span className="cctv-feed__rec">
              <i aria-hidden />
              {compact ? null : ' LIVE'}
            </span>
          ) : (
            <span className="cctv-feed__rec cctv-feed__rec--off">
              {offline ? 'OFF' : status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
          <span className="cctv-feed__meta">
            {camera.isInterior ? <span className="cctv-feed__badge">Interior</span> : null}
            <span className="cctv-feed__ch">CH {camera.channel}</span>
          </span>
        </div>
        {featured ? (
          <div className="cctv-feed__controls" aria-hidden>
            <span className="cctv-feed__ctrl" title="Fullscreen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </span>
            <span className="cctv-feed__ctrl" title="Mute">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </span>
            <span className="cctv-feed__ctrl" title="Snapshot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </div>
        ) : null}
      </div>
      <div className="cctv-feed__footer">
        <strong>{camera.name}</strong>
        {compact ? null : <span className="cctv-feed__loc">{camera.locationLabel}</span>}
      </div>
    </div>
  );
}

export function CctvLiveFeed({ camera, href, featured, compact, className = '' }: CctvLiveFeedProps) {
  const body = <FeedInner camera={camera} featured={featured} compact={compact} />;

  if (href) {
    return (
      <Link href={href} className={`cctv-feed-link ${className}`.trim()} aria-label={`View ${camera.name}`}>
        {body}
      </Link>
    );
  }

  return <div className={className.trim()}>{body}</div>;
}

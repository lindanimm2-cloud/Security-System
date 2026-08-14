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
  className?: string;
};

function FeedInner({ camera, featured }: { camera: CctvCamera; featured?: boolean }) {
  const status = camera.status.toLowerCase();
  const live =
    camera.isLiveCapable !== false &&
    (status === 'online' || status === 'recording');
  const offline = status === 'offline' || status === 'fault';

  return (
    <div
      className={`cctv-feed cctv-feed--${status} ${featured ? 'cctv-feed--featured' : ''} ${live ? 'cctv-feed--live' : ''}`}
    >
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
            <i aria-hidden /> LIVE
          </span>
        ) : (
          <span className="cctv-feed__rec cctv-feed__rec--off">
            {offline ? 'OFFLINE' : status.replace(/_/g, ' ').toUpperCase()}
          </span>
        )}
        <span className="cctv-feed__ch">CH {camera.channel}</span>
      </div>
      <div className="cctv-feed__footer">
        <strong>{camera.name}</strong>
        <span>{camera.locationLabel}</span>
      </div>
      {camera.isInterior ? <span className="cctv-feed__badge">Interior</span> : null}
    </div>
  );
}

export function CctvLiveFeed({ camera, href, featured, className = '' }: CctvLiveFeedProps) {
  const body = <FeedInner camera={camera} featured={featured} />;

  if (href) {
    return (
      <Link href={href} className={`cctv-feed-link ${className}`.trim()} aria-label={`View ${camera.name}`}>
        {body}
      </Link>
    );
  }

  return <div className={className.trim()}>{body}</div>;
}

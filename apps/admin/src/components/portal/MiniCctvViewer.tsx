'use client';

import Link from 'next/link';
import { CctvLiveFeed, type CctvCamera } from './CctvLiveFeed';

type MiniCctvViewerProps = {
  siteId: string;
  siteName: string;
  cameras: CctvCamera[];
  onlineCount?: number;
  className?: string;
};

/** Compact live CCTV strip for home — hero feed + mini channels. */
export function MiniCctvViewer({
  siteId,
  siteName,
  cameras,
  onlineCount,
  className = '',
}: MiniCctvViewerProps) {
  if (cameras.length === 0) return null;

  const siteHref = `/portal/home/${siteId}`;
  const primary = cameras[0];
  const rest = cameras.slice(1, 4);
  const online = onlineCount ?? cameras.filter((c) => c.status.toUpperCase() !== 'OFFLINE').length;

  return (
    <section className={`mini-cctv ${className}`.trim()} aria-label="Live home CCTV">
      <div className="mini-cctv__head">
        <div>
          <p className="mini-cctv__eyebrow">Live CCTV</p>
          <h2>{siteName}</h2>
          <p className="text-muted mini-cctv__sub">
            {online}/{cameras.length} online · tap a channel for full view
          </p>
        </div>
        <Link href={siteHref} className="link-sm">
          All cameras
        </Link>
      </div>

      <div className="mini-cctv__layout">
        <CctvLiveFeed camera={primary} href={siteHref} featured />
        {rest.length > 0 ? (
          <div className="mini-cctv__strip" aria-label="Other cameras">
            {rest.map((c) => (
              <CctvLiveFeed key={c.id} camera={c} href={siteHref} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

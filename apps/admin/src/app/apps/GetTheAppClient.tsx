'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  APP_CATALOG,
  PLATFORM_DISCLAIMER,
  catalogForDetection,
  detectClient,
  type AppCatalogEntry,
  type DetectedClient,
} from '@/lib/platform';

function statusBadge(status: AppCatalogEntry['status']) {
  if (status === 'live') return { label: 'Live', className: 'apps-hub__badge--live' };
  if (status === 'web_fallback') return { label: 'Web Control', className: 'apps-hub__badge--web' };
  if (status === 'beta') return { label: 'Beta', className: 'apps-hub__badge--beta' };
  return { label: 'Coming soon', className: 'apps-hub__badge--planned' };
}

export default function GetTheAppClient() {
  const [detected, setDetected] = useState<DetectedClient | null>(null);

  useEffect(() => {
    setDetected(detectClient());
  }, []);

  const catalog = useMemo(
    () => (detected ? catalogForDetection(detected) : APP_CATALOG),
    [detected],
  );

  return (
    <div className="apps-hub">
      <nav className="apps-hub__nav">
        <Link href="/">4DS</Link>
        <Link href="/portal">Client portal</Link>
        <Link href="/control-room">Control Panel</Link>
        <Link href="/apps/compatibility">Compatibility</Link>
      </nav>
      <header className="apps-hub__hero">
        <p className="apps-hub__kicker">4DS ecosystem</p>
        <h1>Get the 4DS app</h1>
        <p className="apps-hub__lead">
          One 4DS account and organisation — multiple native clients. Web, mobile, watch, and
          hardware adapters share the same cloud, incidents, AlertEngine, and realtime bus.
        </p>
      </header>

      {detected ? (
        <section className="apps-hub__detect">
          <p className="dash-ops__eyebrow">Detected device</p>
          <h2>You&apos;re using {detected.label}</h2>
          <p className="text-muted">{detected.osName}</p>
          <Link href={detected.primaryCta.href} className="ops-act ops-act--dispatch apps-hub__cta">
            {detected.primaryCta.label}
          </Link>
          <ul className="apps-hub__notes">
            {detected.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <div className="apps-hub__quick">
            <Link href="/apps#pwa" className="btn-sm btn-secondary">
              Install as web app
            </Link>
            <Link href="/apps/compatibility" className="btn-sm btn-secondary">
              Compatibility check
            </Link>
            <Link href="/portal/security/emergency-setup" className="btn-sm btn-secondary">
              Emergency setup
            </Link>
          </div>
        </section>
      ) : null}

      <section className="apps-hub__grid" id="catalog">
        {catalog.map((app) => {
          const badge = statusBadge(app.status);
          const anchor =
            app.id === 'watchos'
              ? 'apple-watch'
              : app.id === 'wearos'
                ? 'wear-os'
                : app.id === 'ipados'
                  ? 'ipad'
                  : app.id;
          return (
            <article key={app.id} id={anchor} className="apps-hub__card">
              <div className="apps-hub__card-top">
                <h3>{app.name}</h3>
                <span className={`apps-hub__badge ${badge.className}`}>{badge.label}</span>
              </div>
              <p className="apps-hub__ux">{app.uxRole}</p>
              <p>{app.summary}</p>
              <p className="apps-hub__meta">
                {app.storeLabel}
                {app.status === 'live' || app.status === 'web_fallback'
                  ? ` · v${app.latestVersion}`
                  : ` · package ${app.packageId}`}
              </p>
              {app.storeUrl ? (
                <a href={app.storeUrl} className="ops-act" target="_blank" rel="noreferrer">
                  {app.storeLabel}
                </a>
              ) : app.status === 'live' || app.status === 'web_fallback' ? (
                <Link href={app.href} className="ops-act">
                  {app.storeLabel}
                </Link>
              ) : (
                <button type="button" className="ops-act" disabled>
                  Store listing not published yet
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section className="apps-hub__ecosystem">
        <h2>Application family</h2>
        <pre className="apps-hub__tree" aria-label="4DS application family">
{`4DS CLOUD / API
└─ CORE · ALERT · INCIDENT · REALTIME
   ├─ WEB / PWA          Control + client
   ├─ MOBILE             Android / iOS / tablet
   ├─ WATCH              watchOS / Wear OS
   └─ CONNECT            BLE · Vehicle · GPS · CCTV · Alarm`}
        </pre>
        <p className="text-muted">{PLATFORM_DISCLAIMER}</p>
      </section>
    </div>
  );
}

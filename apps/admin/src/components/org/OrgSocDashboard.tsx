'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrgCamera, OrgDashboardKpis, OrgIncident } from '@/lib/org';
import {
  listOrgActivity,
  listOrgAttention,
  listOrgCameras,
  listOrgMapMarkers,
} from '@/lib/org';
import { CameraFeed } from './CameraFeed';

const PIN_CODE: Record<string, string> = {
  camera: 'CAM',
  gate: 'GT',
  officer: 'OFF',
  building: 'BLD',
  vehicle: 'VEH',
  incident: 'INC',
  fire: 'FIR',
  assembly: 'ASM',
  hose: 'HSE',
  wiring: 'WIR',
  sensor: 'SNS',
  zone: 'ZN',
  entrance: 'ENT',
};

const SYSTEMS = [
  { kind: 'fire', label: 'Fire panels' },
  { kind: 'assembly', label: 'Assembly points' },
  { kind: 'hose', label: 'Hose reels' },
  { kind: 'wiring', label: 'Wiring / fence' },
  { kind: 'sensor', label: 'Sensors' },
  { kind: 'zone', label: 'Zones' },
  { kind: 'entrance', label: 'Entrances' },
] as const;

export function OrgSocDashboard({
  organizationId,
  siteId,
  kpis,
  incidents,
}: {
  organizationId: string;
  siteId: string | 'all';
  kpis: OrgDashboardKpis;
  incidents: OrgIncident[];
}) {
  const base = `/org/${organizationId}`;
  const cameras = useMemo(() => listOrgCameras(organizationId, siteId), [organizationId, siteId]);
  const attention = useMemo(() => listOrgAttention(organizationId, siteId).slice(0, 5), [organizationId, siteId]);
  const activity = useMemo(() => listOrgActivity(organizationId, siteId).slice(0, 6), [organizationId, siteId]);
  const markers = useMemo(() => listOrgMapMarkers(organizationId, siteId), [organizationId, siteId]);
  const [selected, setSelected] = useState<OrgCamera | null>(null);
  const lead = incidents.find((i) => i.severity === 'critical' || i.severity === 'high');
  const camerasOffline = Math.max(0, kpis.camerasTotal - kpis.camerasOnline);

  return (
    <div className="soc">
      {lead ? (
        <section className={`soc-banner soc-banner--${lead.severity}`}>
          <div>
            <p className="soc-kicker">Active incident</p>
            <h2>
              {lead.type} · {lead.subject}
            </h2>
            <p>
              {lead.siteName} · {lead.location} · {lead.ageLabel}
            </p>
          </div>
          <div className="soc-banner__actions">
            <button type="button" className="org-btn" onClick={() => setSelected(cameras[1] ?? cameras[0] ?? null)}>
              <SocIcon name="camera" /> View camera
            </button>
            <Link className="org-btn" href={`${base}/incidents`}>
              <SocIcon name="flag" /> Open incident
            </Link>
            <Link className="org-btn org-btn--danger" href={`${base}/security`}>
              <SocIcon name="officer" /> Dispatch officer
            </Link>
          </div>
        </section>
      ) : null}

      <div className="soc-hero">
        <section className="soc-cctv">
          <header className="soc-head">
            <div>
              <p className="soc-kicker">Live security monitoring</p>
              <h2>Live CCTV</h2>
            </div>
            <Link href={`${base}/cctv`}>View all</Link>
          </header>
          <p className="soc-demo-note">
            Demo previews — slide for every camera. No device is connected.
          </p>
          {cameras.length === 0 ? (
            <p className="org-empty">No cameras in this organization yet.</p>
          ) : (
            <CctvSlider cameras={cameras} onSelect={setSelected} />
          )}
        </section>

        <section className="soc-map">
          <header className="soc-head">
            <div>
              <p className="soc-kicker">Site picture</p>
              <h2>Live map</h2>
            </div>
            <Link href={`${base}/map`}>Open</Link>
          </header>
          <div className="soc-map__canvas" aria-label="Live security map">
            <span className="soc-plan soc-plan--bldg" aria-hidden />
            <span className="soc-plan soc-plan--zone" aria-hidden />
            <span className="soc-plan soc-plan--fence" aria-hidden />
            {markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                className={`soc-pin soc-pin--${marker.tone} soc-pin--${marker.kind}`}
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                title={`${PIN_CODE[marker.kind] ?? marker.kind} · ${marker.label}`}
                onClick={() => {
                  if (!marker.cameraId) return;
                  const camera = listOrgCameras(organizationId, siteId).find((c) => c.id === marker.cameraId);
                  if (camera) setSelected(camera);
                }}
              >
                <em>{PIN_CODE[marker.kind] ?? '•'}</em>
                <span>{marker.label}</span>
              </button>
            ))}
          </div>
          <p className="soc-map__legend">
            Cameras, gates, officers, fire, assembly, hose, wiring, sensors, zones, entrances
          </p>
        </section>
      </div>

      <nav className="soc-commands" aria-label="Quick response">
        <Link href={`${base}/incidents`}>
          <SocIcon name="flag" /> Report incident
        </Link>
        <Link href={`${base}/emergencies`} className="soc-commands__alert">
          <SocIcon name="alert" /> Panic / SOS
        </Link>
        <Link href={`${base}/cctv`}>
          <SocIcon name="camera" /> View all cameras
        </Link>
        <Link href={`${base}/security`}>
          <SocIcon name="officer" /> Dispatch officer
        </Link>
        <Link href={`${base}/gates`}>
          <SocIcon name="gate" /> Gate control
        </Link>
        <Link href={`${base}/map`}>
          <SocIcon name="map" /> Open live map
        </Link>
      </nav>

      <section className="soc-systems" aria-label="Connected site systems">
        {SYSTEMS.map((system) => {
          const rows = markers.filter((marker) => marker.kind === system.kind);
          const tone = rows.some((row) => row.tone === 'danger')
            ? 'danger'
            : rows.some((row) => row.tone === 'warn')
              ? 'warn'
              : 'ok';
          return (
            <article key={system.kind} className={`soc-systems__item is-${tone}`}>
              <SocIcon name={system.kind} />
              <span>{system.label}</span>
              <strong>{rows.length}</strong>
            </article>
          );
        })}
      </section>

      <section className="soc-status" aria-label="Security status">
        <Status icon="flag" label="Incidents" value={String(kpis.activeIncidents)} tone={kpis.activeIncidents ? 'danger' : 'ok'} />
        <Status icon="alert" label="Alerts" value={String(kpis.activeAlerts)} tone={kpis.activeAlerts ? 'warn' : 'ok'} />
        <Status
          icon="camera"
          label="Cameras"
          value={`${kpis.camerasOnline}/${kpis.camerasTotal}`}
          tone={camerasOffline ? 'warn' : 'ok'}
        />
        <Status icon="officer" label="People" value={String(kpis.peopleOnSite)} tone="info" />
        <Status icon="vehicle" label="Vehicles" value={String(kpis.vehiclesOnSite)} tone="info" />
        <Status icon="gate" label="Open gates" value={String(kpis.openGates)} tone={kpis.openGates ? 'warn' : 'ok'} />
      </section>

      <div className="soc-lower">
        <section className="soc-panel">
          <header className="soc-head">
            <h2>Attention required</h2>
            <Link href={`${base}/incidents`}>View all</Link>
          </header>
          {attention.length === 0 ? (
            <p className="soc-clear">
              All systems operating normally. No incidents or device faults need attention.
            </p>
          ) : (
            <ul className="soc-attention">
              {attention.map((item) => (
                <li key={item.id} className={`soc-attention__item is-${item.severity}`}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.location} · {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="soc-panel">
          <header className="soc-head">
            <h2>Today&apos;s operations</h2>
          </header>
          <div className="soc-ops">
            <article>
              <SocIcon name="officer" />
              <p>Officers</p>
              <strong>
                {kpis.officersOnDuty}/{kpis.officersRostered}
              </strong>
              <span>On duty</span>
            </article>
            <article>
              <SocIcon name="vehicle" />
              <p>Vehicles</p>
              <strong>{kpis.vehiclesOnSite}</strong>
              <span>On site</span>
            </article>
            <article>
              <SocIcon name="entrance" />
              <p>Visitors</p>
              <strong>{kpis.visitors}</strong>
              <span>Today</span>
            </article>
          </div>
          <h3 className="soc-subhead">Recent activity</h3>
          {activity.length === 0 ? (
            <p className="org-empty">No activity in this view.</p>
          ) : (
            <ul className="soc-activity">
              {activity.map((event) => (
                <li key={event.id}>
                  <time>{event.time}</time>
                  <span>
                    {event.text}
                    <em>{event.location}</em>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected ? (
        <div className="soc-modal" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="soc-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="soc-head">
              <div>
                <p className="soc-kicker">Demo preview</p>
                <h2>{selected.name}</h2>
              </div>
              <button type="button" className="org-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </header>
            <CameraFeed camera={selected} large />
            <p className="soc-demo-note">
              {selected.location} · {selected.status} · PTZ {selected.ptz ? 'capable' : 'not fitted'} · audio{' '}
              {selected.audio ? 'capable' : 'not fitted'}. Controls are not sent to a device.
            </p>
            <div className="soc-modal__actions">
              <Link className="org-btn" href={`${base}/cctv?camera=${selected.id}`}>
                Open in CCTV
              </Link>
              <Link className="org-btn" href={`${base}/incidents`}>
                Report incident
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CctvSlider({
  cameras,
  onSelect,
}: {
  cameras: OrgCamera[];
  onSelect: (camera: OrgCamera) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = useMemo(() => {
    const chunks: OrgCamera[][] = [];
    for (let i = 0; i < cameras.length; i += 4) chunks.push(cameras.slice(i, i + 4));
    return chunks;
  }, [cameras]);

  const syncPage = useCallback(() => {
    const track = trackRef.current;
    if (!track || pages.length < 2) return;
    const width = track.clientWidth || 1;
    const next = Math.round(track.scrollLeft / width);
    setPage(Math.max(0, Math.min(pages.length - 1, next)));
  }, [pages.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncPage();
    track.addEventListener('scroll', syncPage, { passive: true });
    window.addEventListener('resize', syncPage);
    return () => {
      track.removeEventListener('scroll', syncPage);
      window.removeEventListener('resize', syncPage);
    };
  }, [syncPage, pages.length]);

  function go(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.max(0, Math.min(pages.length - 1, next));
    const slide = track.querySelectorAll<HTMLElement>('[data-cctv-page]')[index];
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    setPage(index);
  }

  const from = page * 4 + 1;
  const to = Math.min(cameras.length, from + 3);

  return (
    <div className="soc-cam-slider">
      <div className="soc-cam-slider__track" ref={trackRef}>
        {pages.map((chunk, index) => (
          <div key={chunk[0]?.id ?? index} className="soc-cam-slider__page soc-cam-grid" data-cctv-page>
            {chunk.map((camera) => (
              <button
                key={camera.id}
                type="button"
                className="soc-cam"
                onClick={() => onSelect(camera)}
              >
                <CameraFeed camera={camera} />
              </button>
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 ? (
        <div className="soc-cam-slider__nav">
          <button
            type="button"
            className="soc-cam-slider__arrow"
            aria-label="Previous cameras"
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            ‹
          </button>
          <div className="soc-cam-slider__dots" role="tablist" aria-label="Camera pages">
            {pages.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === page}
                aria-label={`Cameras ${index * 4 + 1} to ${Math.min(cameras.length, (index + 1) * 4)}`}
                className={`soc-cam-slider__dot${index === page ? ' is-active' : ''}`}
                onClick={() => go(index)}
              />
            ))}
          </div>
          <span className="soc-cam-slider__count">
            {from}–{to} of {cameras.length}
          </span>
          <button
            type="button"
            className="soc-cam-slider__arrow"
            aria-label="Next cameras"
            disabled={page >= pages.length - 1}
            onClick={() => go(page + 1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Status({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'danger' | 'info';
}) {
  return (
    <div className={`soc-status__item is-${tone}`}>
      <SocIcon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SocIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'flag':
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h10l-1.5 3L15 10H5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );
    case 'officer':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c1.2-3 3.4-4.5 7-4.5S17.8 17 19 20" />
        </svg>
      );
    case 'gate':
      return (
        <svg {...common}>
          <path d="M4 20V6" />
          <path d="M20 20V6" />
          <path d="M4 10h16" />
          <path d="M8 10v10" />
          <path d="M16 10v10" />
        </svg>
      );
    case 'vehicle':
      return (
        <svg {...common}>
          <path d="M4 15h16" />
          <path d="M6 15 7.5 9h9L18 15" />
          <circle cx="7.5" cy="17.5" r="1.4" />
          <circle cx="16.5" cy="17.5" r="1.4" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...common}>
          <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-5.5 1-7.5z" />
        </svg>
      );
    case 'assembly':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.2" />
          <circle cx="16" cy="8" r="2.2" />
          <path d="M4 18c.8-2.4 2.4-3.5 4-3.5s3.2 1.1 4 3.5" />
          <path d="M12 18c.8-2.4 2.4-3.5 4-3.5s3.2 1.1 4 3.5" />
        </svg>
      );
    case 'hose':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      );
    case 'wiring':
      return (
        <svg {...common}>
          <path d="M4 8h6l2 8h8" />
          <circle cx="4" cy="8" r="1.4" />
          <circle cx="20" cy="16" r="1.4" />
        </svg>
      );
    case 'sensor':
      return (
        <svg {...common}>
          <path d="M5 12a7 7 0 0 1 14 0" />
          <path d="M8 12a4 4 0 0 1 8 0" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'zone':
      return (
        <svg {...common}>
          <path d="M4 8 12 4l8 4v8l-8 4-8-4z" />
        </svg>
      );
    case 'entrance':
      return (
        <svg {...common}>
          <path d="M5 21V5a2 2 0 0 1 2-2h7" />
          <path d="M14 3v18" />
          <path d="M9 12h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

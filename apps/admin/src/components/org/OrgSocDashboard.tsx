'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrgCamera, OrgDashboardKpis, OrgIncident } from '@/lib/org';
import {
  listOrgActivity,
  listOrgAttention,
  listOrgCameras,
} from '@/lib/org';
import { CameraFeed } from './CameraFeed';
import { OpsMarqueeText, OpsTicker } from '@/components/ui/OpsMarquee';
import { OpsMonActionsMenu, type OpsMonAction } from '@/components/ops/OpsMonActionsMenu';

const PlainLiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
  loading: () => <div className="soc-map__loading">Loading map…</div>,
});

const MAP_CENTER = { lat: -29.8587, lng: 31.0218 };
const HISTORY_PAGE = 10;

type HistoryRow = {
  id: string;
  code: string;
  type: string;
  title: string;
  location: string;
  status: string;
  statusTone: 'ok' | 'alert' | 'fault' | 'offline' | 'muted';
  openedAt: string;
  duration: string;
  voided: boolean;
  href: string;
  meta: string;
  cameraId?: string;
  kind: 'incident' | 'attention';
};

function incidentStatusLabel(status: string) {
  switch (status) {
    case 'NEW':
      return 'New';
    case 'ACKNOWLEDGED':
      return 'Acknowledged';
    case 'DISPATCHED':
      return 'Dispatched';
    case 'RESPONDING':
      return 'Response underway';
    case 'ON_SCENE':
      return 'On scene';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Closed';
    default:
      return status.replace(/_/g, ' ');
  }
}

function incidentTone(status: string): HistoryRow['statusTone'] {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'ok';
  if (status === 'RESPONDING' || status === 'ON_SCENE') return 'alert';
  if (status === 'DISPATCHED' || status === 'ACKNOWLEDGED') return 'fault';
  if (status === 'NEW') return 'offline';
  return 'muted';
}

function formatClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

function durationLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function toneFill(tone: HistoryRow['statusTone']) {
  switch (tone) {
    case 'ok':
      return 100;
    case 'alert':
      return 75;
    case 'fault':
      return 48;
    case 'offline':
      return 22;
    default:
      return 35;
  }
}

function historyActions(row: HistoryRow, base: string): OpsMonAction[] {
  const items: OpsMonAction[] = [
    {
      id: 'open',
      label: row.kind === 'incident' ? 'Open incident' : 'Open alert',
      description: row.code,
      href: row.href,
    },
  ];

  if (row.cameraId) {
    items.push({
      id: 'camera',
      label: 'View camera',
      description: 'Open live CCTV for this alert',
      href: `${base}/cctv?camera=${row.cameraId}`,
    });
  } else if (/camera|cctv|cam /i.test(row.type) || /camera|cctv|cam /i.test(row.title)) {
    items.push({
      id: 'cctv',
      label: 'Open CCTV',
      href: `${base}/cctv`,
    });
  }

  items.push(
    {
      id: 'map',
      label: 'Open live map',
      description: row.location,
      href: `${base}/map`,
    },
    {
      id: 'incidents',
      label: 'Incident center',
      href: `${base}/incidents`,
    },
    {
      id: 'dispatch',
      label: 'Dispatch officer',
      description: 'Send site security response',
      href: `${base}/security`,
    },
    {
      id: 'copy',
      label: 'Copy reference',
      description: row.code,
      onClick: () => {
        void navigator.clipboard?.writeText(row.code);
      },
    },
  );

  return items;
}

function rowIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('panic')) return 'alert';
  if (t.includes('medical')) return 'officer';
  if (t.includes('camera') || t.includes('cam ')) return 'camera';
  if (t.includes('gate') || t.includes('security')) return 'gate';
  if (t.includes('fire')) return 'fire';
  if (t.includes('sensor')) return 'sensor';
  return 'flag';
}

function OpsSignal({ fill }: { fill: number }) {
  const level = Math.max(1, Math.min(4, Math.ceil((fill / 100) * 4)));
  return (
    <span className="ops-mon__signal" title={`${fill}%`}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= level ? 'is-on' : undefined} />
      ))}
      <em>{fill}%</em>
    </span>
  );
}

function OpsStatusPill({
  tone,
  label,
}: {
  tone: HistoryRow['statusTone'];
  label: string;
}) {
  return (
    <span className={`ops-mon__status ops-mon__status--${tone}`}>
      <em aria-hidden />
      {label}
    </span>
  );
}

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
  const attention = useMemo(() => listOrgAttention(organizationId, siteId), [organizationId, siteId]);
  const activity = useMemo(() => listOrgActivity(organizationId, siteId).slice(0, 8), [organizationId, siteId]);
  const [selected, setSelected] = useState<OrgCamera | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const lead = incidents.find((i) => i.severity === 'critical' || i.severity === 'high');

  const history = useMemo<HistoryRow[]>(() => {
    const fromIncidents: HistoryRow[] = incidents.map((incident, index) => {
      const voided = incident.status === 'RESOLVED' || incident.status === 'CLOSED';
      return {
        id: incident.id,
        code: `RH${String(index + 1).padStart(4, '0')}`,
        type: incident.type.replace(/_/g, ' '),
        title: `${incident.type.replace(/_/g, ' ')} — ${incident.subject}`,
        location: incident.siteName,
        status: incidentStatusLabel(incident.status),
        statusTone: incidentTone(incident.status),
        openedAt: incident.createdAt,
        duration: durationLabel(incident.createdAt),
        voided,
        href: `${base}/incidents`,
        meta: `${new Date(incident.createdAt).toLocaleString()} · ${incident.location}`,
        kind: 'incident' as const,
      };
    });

    const fromAttention: HistoryRow[] = attention
      .filter((item) => !incidents.some((i) => i.id === item.id))
      .map((item, index) => ({
        id: item.id,
        code: `AL${String(index + 1).padStart(4, '0')}`,
        type: item.kind.replace(/_/g, ' '),
        title: item.title,
        location: item.location.split('·')[0]?.trim() || item.location,
        status: item.severity === 'critical' || item.severity === 'high' ? 'Needs response' : 'Monitoring',
        statusTone:
          item.severity === 'critical' || item.severity === 'high'
            ? 'offline'
            : item.severity === 'medium'
              ? 'fault'
              : 'muted',
        openedAt: new Date(Date.now() - (index + 3) * 60_000).toISOString(),
        duration: `${index + 3}m`,
        voided: false,
        href: item.cameraId ? `${base}/cctv?camera=${item.cameraId}` : `${base}/incidents`,
        meta: `${item.location} · ${item.detail}`,
        cameraId: item.cameraId,
        kind: 'attention' as const,
      }));

    return [...fromIncidents, ...fromAttention];
  }, [attention, base, incidents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter((row) =>
      [row.code, row.type, row.title, row.location, row.status, row.meta]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [history, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * HISTORY_PAGE, safePage * HISTORY_PAGE + HISTORY_PAGE);
  const viewFrom = filtered.length === 0 ? 0 : safePage * HISTORY_PAGE + 1;
  const viewTo = Math.min(filtered.length, (safePage + 1) * HISTORY_PAGE);

  const tickerItems = useMemo(
    () =>
      history
        .filter((row) => !row.voided)
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          label: (
            <>
              <span className={`ops-mon__status ops-mon__status--${row.statusTone} ops-ticker__status`}>
                <em aria-hidden />
                {row.status}
              </span>
              <strong>{row.title}</strong>
              <span>{row.location}</span>
            </>
          ),
        })),
    [history],
  );

  return (
    <div className="soc">
      {lead ? (
        <section className={`soc-banner soc-banner--${lead.severity}`}>
          <div>
            <p className="soc-kicker">Active incident</p>
            <h2>
              <OpsMarqueeText>
                {lead.type} · {lead.subject}
              </OpsMarqueeText>
            </h2>
            <p>
              <OpsMarqueeText>
                {lead.siteName} · {lead.location} · {lead.ageLabel}
              </OpsMarqueeText>
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

      <OpsTicker items={tickerItems} label="Live ops" durationSec={32} />

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
          <div className="soc-map__canvas" aria-label="Live map">
            <PlainLiveMap
              center={MAP_CENTER}
              users={[]}
              officers={[]}
              incidents={[]}
              scrollWheelZoom={false}
            />
          </div>
        </section>
      </div>

      <section className="soc-history" aria-label="Response history">
        <header className="soc-history__head">
          <div>
            <h2>Response history</h2>
            <p>Alerts, who responded, and how it ended.</p>
          </div>
          <div className="soc-history__stats" aria-label="Quick counts">
            <span>
              <strong>{kpis.activeIncidents}</strong> open
            </span>
            <span>
              <strong>{kpis.activeAlerts}</strong> alerts
            </span>
            <span>
              <strong>
                {kpis.camerasOnline}/{kpis.camerasTotal}
              </strong>{' '}
              cams
            </span>
          </div>
        </header>

        <label className="soc-history__search">
          <span className="sr-only">Search response history</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search alerts, location, status…"
          />
        </label>

        <div className="soc-history__board ops-mon">
          <table className="ops-mon__table">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last seen</th>
                <th>Signal</th>
                <th className="ops-mon__actions-h">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ops-mon__empty">
                    No matching responses.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const fill = toneFill(row.statusTone);
                  return (
                    <tr key={row.id} className={row.voided ? 'is-void' : undefined}>
                      <td>
                        <div className="ops-mon__device">
                          <span className="ops-mon__icon" aria-hidden>
                            <SocIcon name={rowIcon(row.type)} />
                          </span>
                          <span className="ops-mon__device-copy">
                            <strong>
                              <OpsMarqueeText>{row.title}</OpsMarqueeText>
                            </strong>
                            <em>{row.code}</em>
                          </span>
                        </div>
                      </td>
                      <td className="ops-mon__muted">{row.type}</td>
                      <td className="ops-mon__muted">{row.location}</td>
                      <td>
                        <OpsStatusPill tone={row.statusTone} label={row.status} />
                      </td>
                      <td className="ops-mon__muted">
                        {formatClock(row.openedAt)} · {row.duration}
                      </td>
                      <td>
                        <OpsSignal fill={fill} />
                      </td>
                      <td className="ops-mon__actions">
                        <OpsMonActionsMenu
                          label={`Actions for ${row.title}`}
                          items={historyActions(row, base)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <ul className="ops-mon__cards">
            {pageRows.map((row) => {
              const fill = toneFill(row.statusTone);
              return (
                <li key={`card-${row.id}`} className={row.voided ? 'is-void' : undefined}>
                  <div className="ops-mon__device">
                    <span className="ops-mon__icon" aria-hidden>
                      <SocIcon name={rowIcon(row.type)} />
                    </span>
                    <span className="ops-mon__device-copy">
                      <strong>
                        <OpsMarqueeText>{row.title}</OpsMarqueeText>
                      </strong>
                      <em>{row.code}</em>
                    </span>
                    <OpsMonActionsMenu
                      label={`Actions for ${row.title}`}
                      items={historyActions(row, base)}
                    />
                  </div>
                  <div className="ops-mon__card-meta">
                    <span>{row.type}</span>
                    <span>{row.location}</span>
                    <span>
                      {formatClock(row.openedAt)} · {row.duration}
                    </span>
                  </div>
                  <div className="ops-mon__card-foot">
                    <OpsStatusPill tone={row.statusTone} label={row.status} />
                    <OpsSignal fill={fill} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="ops-mon__pager">
            <p>
              Viewing{' '}
              <span className="ops-mon__range">
                {viewFrom}-{viewTo}
              </span>{' '}
              of {filtered.length} results
            </p>
            <div>
              <button type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </button>
              <button
                type="button"
                className="is-next"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {activity.length > 0 ? (
          <p className="soc-history__footnote">
            Latest site note: {activity[0]?.text} · {activity[0]?.location}
          </p>
        ) : null}
      </section>

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
            <CameraFeed camera={selected} large href={`${base}/cctv?camera=${selected.id}`} />
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
                <CameraFeed camera={camera} href={`${base}/cctv?camera=${camera.id}`} />
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

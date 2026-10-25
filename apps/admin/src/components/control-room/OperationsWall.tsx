'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { EventQuickActions } from '@/components/control-room/EventQuickActions';
import {
  isOpsVehicleScope,
  OPS_ALL_DASHCAMS_SCOPE,
  parseOpsVehicleScopeId,
  useOpsDesk,
} from '@/components/control-room/ops-desk';
import { CONTROL_ROOM_ROUTES, incidentHref } from '@/lib/control-room-routes';
import { openCctvMiniPlayer } from '@/lib/cctv-mini-player';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import {
  eventIsOpen,
  isInformativeEvent,
  relativeEventTime,
  type ArcDeskEvent,
  type ArcMonitoringFile,
} from '@/lib/arc-desk';
import { sortIncidentsForOps } from '@/lib/alert-priority';
import { opsAlertKind, opsPriorityLabel, type OpsIncident } from '@/lib/ops-incident';

const LAYOUTS = [
  { id: '2x2', cols: 2, rows: 2, label: '2×2' },
  { id: '3x2', cols: 3, rows: 2, label: '3×2' },
  { id: '3x3', cols: 3, rows: 3, label: '3×3' },
  { id: '4x3', cols: 4, rows: 3, label: '4×3' },
] as const;

type LayoutId = (typeof LAYOUTS)[number]['id'];

const EVENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'informative', label: 'Informative' },
  { id: 'mine', label: 'Mine' },
  { id: 'critical', label: 'Critical' },
  { id: 'panic', label: 'Panic' },
] as const;

type EventFilter = (typeof EVENT_FILTERS)[number]['id'];

const LAYOUT_KEY = '4ds-ops-grid';

type Feed = {
  key: string;
  camera: CctvCamera;
  siteId: string;
  siteName: string;
  href: string;
  hasEvent: boolean;
};

export function OperationsWall() {
  const desk = useOpsDesk();
  const [layout, setLayout] = useState<LayoutId>('3x2');
  const [page, setPage] = useState(0);
  const [allowed, setAllowed] = useState<LayoutId[]>(['2x2', '3x2', '3x3', '4x3']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved && LAYOUTS.some((item) => item.id === saved)) setLayout(saved as LayoutId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const apply = () => {
      const width = window.innerWidth;
      const next: LayoutId[] =
        width < 1100 ? ['2x2'] : width < 1360 ? ['2x2', '3x2'] : width < 1680 ? ['2x2', '3x2', '3x3'] : ['2x2', '3x2', '3x3', '4x3'];
      setAllowed(next);
      setLayout((current) => (next.includes(current) ? current : next[next.length - 1]));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const spec = LAYOUTS.find((item) => item.id === layout) ?? LAYOUTS[1];
  const capacity = spec.cols * spec.rows;

  const feeds = useMemo(() => {
    const q = desk.query.trim().toLowerCase();
    let list: Feed[];

    if (isOpsVehicleScope(desk.propertyId)) {
      const vehicleId = parseOpsVehicleScopeId(desk.propertyId);
      const vehicles =
        desk.propertyId === OPS_ALL_DASHCAMS_SCOPE || vehicleId === 'all'
          ? desk.vehicles.filter((vehicle) => (vehicle.cameras?.length ?? 0) > 0)
          : desk.vehicles.filter((vehicle) => vehicle.id === vehicleId);
      list = vehicles.flatMap((vehicle) => {
        const label = vehicle.callSign || vehicle.registration || 'Vehicle';
        return (vehicle.cameras ?? []).map((camera) => ({
          key: `vehicle-${vehicle.id}-${camera.id}`,
          camera,
          siteId: vehicle.id,
          siteName: label,
          href: `${CONTROL_ROOM_ROUTES.fleet}?vehicle=${vehicle.id}`,
          hasEvent: false,
        }));
      });
    } else {
      const sites =
        desk.propertyId === 'all' ? desk.properties : desk.properties.filter((site) => site.id === desk.propertyId);
      list = sites.flatMap((site) =>
        (site.cameras ?? []).map((camera) => ({
          key: `${site.id}-${camera.id}`,
          camera,
          siteId: site.id,
          siteName: site.name,
          href: `/control-room/surveillance/${site.id}`,
          hasEvent: (site.openEvents?.length ?? 0) > 0,
        })),
      );
    }

    const filtered = q
      ? list.filter((feed) =>
          `${feed.camera.name} ${feed.camera.locationLabel} ${feed.siteName}`.toLowerCase().includes(q),
        )
      : list;
    return filtered.sort((a, b) => {
      const eventDelta = Number(b.hasEvent) - Number(a.hasEvent);
      if (eventDelta !== 0) return eventDelta;
      return Number(cameraOnline(b.camera)) - Number(cameraOnline(a.camera));
    });
  }, [desk.properties, desk.propertyId, desk.query, desk.vehicles]);

  const pageCount = Math.max(1, Math.ceil(feeds.length / capacity));
  const safePage = Math.min(page, pageCount - 1);
  const visible = feeds.slice(safePage * capacity, safePage * capacity + capacity);
  const blanks = feeds.length === 0 ? 0 : capacity - visible.length;

  useEffect(() => {
    setPage(0);
    setSelectedFeed(null);
  }, [layout, desk.propertyId, desk.query]);

  const incidents = useMemo(() => {
    const active = desk.incidents.filter((incident) => isActive(incident.status));
    if (isOpsVehicleScope(desk.propertyId)) {
      const vehicleId = parseOpsVehicleScopeId(desk.propertyId);
      const scoped =
        desk.propertyId === OPS_ALL_DASHCAMS_SCOPE || vehicleId === 'all'
          ? active.filter((incident) => Boolean(incident.vehicleId))
          : active.filter((incident) => incident.vehicleId === vehicleId);
      return sortIncidentsForOps(scoped);
    }
    const property = desk.properties.find((site) => site.id === desk.propertyId);
    const scoped =
      desk.propertyId === 'all' || !property
        ? active
        : active.filter(
            (incident) =>
              incident.siteId === property.id ||
              incident.location.toLowerCase().includes(property.name.toLowerCase()),
          );
    return sortIncidentsForOps(scoped);
  }, [desk.incidents, desk.properties, desk.propertyId]);

  function chooseLayout(id: LayoutId) {
    setLayout(id);
    try {
      localStorage.setItem(LAYOUT_KEY, id);
    } catch {
      /* ignore */
    }
  }

  function focusIncident(incident: OpsIncident) {
    if (selectedId === incident.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(incident.id);
    setSelectedEventId(null);
    setSelectedFeed(null);
    const site =
      desk.properties.find((item) => item.id === incident.siteId) ??
      desk.properties.find((item) => incident.location.toLowerCase().includes(item.name.toLowerCase()));
    if (site) desk.setPropertyId(site.id);
  }

  function focusDeskEvent(event: ArcDeskEvent) {
    if (selectedEventId === event.id) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(event.id);
    setSelectedId(null);
    setSelectedFeed(null);
    const site = desk.properties.find((item) => item.id === event.propertyId);
    if (site) desk.setPropertyId(site.id);
  }

  function clearAlertDetail() {
    setSelectedEventId(null);
    setSelectedId(null);
  }

  const deskEvents = useMemo(() => {
    const open = desk.deskEvents.filter((event) => eventIsOpen(event.status));
    if (isOpsVehicleScope(desk.propertyId)) return [];
    if (desk.propertyId === 'all') return open;
    return open.filter((event) => event.propertyId === desk.propertyId);
  }, [desk.deskEvents, desk.propertyId]);

  const visibleDeskEvents = deskEvents.filter((event) => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'informative') return isInformativeEvent(event);
    if (eventFilter === 'alarms') return !isInformativeEvent(event) && event.requiresAck !== false;
    if (eventFilter === 'mine') return Boolean(desk.operatorId && event.claimedByUserId === desk.operatorId);
    if (eventFilter === 'critical') {
      return ['CRITICAL', 'HIGH'].includes((event.severity ?? '').toUpperCase()) && !isInformativeEvent(event);
    }
    if (eventFilter === 'panic') return (event.type ?? '').toUpperCase().includes('PANIC');
    return true;
  });

  const visibleIncidents = incidents.filter((incident) => matchesEventFilter(incident, eventFilter));
  const selectedDeskEvent = desk.deskEvents.find((event) => event.id === selectedEventId) ?? null;
  const selectedIncident = incidents.find((incident) => incident.id === selectedId) ?? null;
  const detailSiteId =
    selectedDeskEvent?.propertyId ??
    selectedIncident?.siteId ??
    (selectedIncident
      ? desk.properties.find((site) =>
          selectedIncident.location.toLowerCase().includes(site.name.toLowerCase()),
        )?.id
      : null) ??
    null;

  const detailOpen = Boolean(selectedDeskEvent || selectedIncident);

  return (
    <section
      className={`ops-wall${detailOpen ? ' ops-wall--detail' : ''}${selectedFeed ? ' ops-wall--focus' : ''}`}
      aria-label="Operations wall"
    >
      <div className="ops-wall__cameras">
        <div className="ops-wall__bar">
          <strong>{isOpsVehicleScope(desk.propertyId) ? 'Live dashcams' : 'Live cameras'}</strong>
          <div className="ops-layouts" role="group" aria-label="Camera layout">
            {LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === layout ? 'is-on' : ''}
                disabled={!allowed.includes(item.id)}
                aria-pressed={item.id === layout}
                aria-label={`${item.label} layout`}
                title={item.label}
                onClick={() => chooseLayout(item.id)}
              >
                <span
                  className="ops-layouts__grid"
                  style={{ gridTemplateColumns: `repeat(${item.cols}, 1fr)`, gridTemplateRows: `repeat(${item.rows}, 1fr)` }}
                  aria-hidden
                >
                  {Array.from({ length: item.cols * item.rows }, (_, i) => (
                    <span key={i} />
                  ))}
                </span>
              </button>
            ))}
          </div>
          <div className="ops-pager">
            <button type="button" onClick={() => setPage((n) => Math.max(0, n - 1))} disabled={safePage === 0} aria-label="Previous cameras">
              ‹
            </button>
            <span>
              {feeds.length === 0 ? '0' : `${safePage + 1} / ${pageCount}`}
            </span>
            <button
              type="button"
              onClick={() => setPage((n) => Math.min(pageCount - 1, n + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Next cameras"
            >
              ›
            </button>
          </div>
        </div>

        {desk.surveillanceError ? (
          <div className="ops-wall__empty">
            <p>{desk.surveillanceError}</p>
            <button type="button" onClick={desk.reload}>
              Retry
            </button>
          </div>
        ) : desk.surveillanceLoading && feeds.length === 0 ? (
          <div className={`ops-grid ops-grid--${layout}`} aria-busy="true">
            {Array.from({ length: capacity }, (_, index) => (
              <div key={index} className="ops-tile ops-tile--loading" />
            ))}
          </div>
        ) : feeds.length === 0 ? (
          <div className="ops-wall__empty">
            <p>{isOpsVehicleScope(desk.propertyId) ? 'No dashcams for this view.' : 'No cameras for this view.'}</p>
          </div>
        ) : (
          <div className={`ops-grid ops-grid--${layout}`}>
            {visible.map((feed, index) => (
              <CameraTile
                key={feed.key}
                feed={feed}
                number={safePage * capacity + index + 1}
                selected={selectedFeed?.key === feed.key}
                onSelect={setSelectedFeed}
              />
            ))}
            {Array.from({ length: blanks }, (_, index) => (
              <Link
                key={`blank-${index}`}
                href={
                  isOpsVehicleScope(desk.propertyId)
                    ? CONTROL_ROOM_ROUTES.fleet
                    : desk.propertyId !== 'all'
                      ? `${CONTROL_ROOM_ROUTES.cctvSystems}?site=${desk.propertyId}&add=1`
                      : `${CONTROL_ROOM_ROUTES.cctvSystems}?add=1`
                }
                className="ops-tile ops-tile--blank ops-tile--add"
                aria-label={isOpsVehicleScope(desk.propertyId) ? 'Open fleet for dashcams' : 'Add a camera to this slot'}
              >
                <span className="ops-tile__add" aria-hidden>
                  <span className="ops-tile__add-plus">
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M8 3.25v9.5M3.25 8h9.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="ops-tile__add-label">
                    {isOpsVehicleScope(desk.propertyId) ? 'Open fleet' : 'Add camera'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <aside className="ops-events" aria-label={selectedFeed ? 'Camera' : 'Events'}>
        {selectedFeed ? (
          <CameraFocus
            feed={selectedFeed}
            incidents={incidents.filter((incident) => incident.siteId === selectedFeed.siteId)}
            alarmStatus={desk.properties.find((site) => site.id === selectedFeed.siteId)?.alarmStatus}
            onClose={() => setSelectedFeed(null)}
          />
        ) : (
          <>
        <header className="ops-events__head">
          <h2>Events</h2>
          <span>{visibleDeskEvents.length + visibleIncidents.length}</span>
        </header>
        <div className="ops-filters" role="tablist" aria-label="Event filters">
          {EVENT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={eventFilter === filter.id}
              className={eventFilter === filter.id ? 'is-on' : ''}
              onClick={() => setEventFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {visibleDeskEvents.length === 0 && visibleIncidents.length === 0 ? (
          <p className="ops-events__empty">No active events.</p>
        ) : (
          <ul className="ops-events__list">
            {visibleDeskEvents.map((event) => {
              const informative = isInformativeEvent(event);
              const selected = event.id === selectedEventId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`ops-event ${selected ? 'ops-event--on' : ''} ${
                      informative ? 'ops-event--info' : 'ops-event--p1'
                    }`}
                    onClick={() => focusDeskEvent(event)}
                  >
                    <span className="ops-event__band">{informative ? 'INFO' : 'ALM'}</span>
                    <span className="ops-event__body">
                      <strong>{event.reportAsType || event.type}</strong>
                      <span>
                        {event.title}
                        {event.claimedByName ? ` · ${event.claimedByName}` : ''}
                      </span>
                    </span>
                    <span className="ops-event__time">{relativeEventTime(event.triggeredAt)}</span>
                  </button>
                  <EventQuickActions
                    kind="event"
                    event={event}
                    onEventChange={(next) => {
                      desk.setDeskEvents((prev) =>
                        prev
                          .map((row) => (row.id === next.id ? next : row))
                          .filter((row) => eventIsOpen(row.status)),
                      );
                    }}
                  />
                </li>
              );
            })}
            {visibleIncidents.map((incident) => {
              const band = opsPriorityLabel(incident.priority, incident.type);
              const selected = incident.id === selectedId;
              return (
                <li key={incident.id}>
                  <button
                    type="button"
                    className={`ops-event ${selected ? 'ops-event--on' : ''} ops-event--${band.toLowerCase()}`}
                    onClick={() => focusIncident(incident)}
                  >
                    <span className="ops-event__band">{band}</span>
                    <span className="ops-event__body">
                      <strong>{incident.type}</strong>
                      <span>{incident.location || incident.user}</span>
                    </span>
                    <span className="ops-event__time">{incident.time}</span>
                  </button>
                  <EventQuickActions
                    kind="incident"
                    incident={incident}
                    onAssigned={() => desk.reload()}
                  />
                </li>
              );
            })}
          </ul>
        )}
          </>
        )}
        {selectedDeskEvent || selectedIncident ? (
          <SelectedAlertDetails
            siteId={detailSiteId}
            event={selectedDeskEvent}
            incident={selectedIncident}
            onClose={clearAlertDetail}
          />
        ) : null}
      </aside>
    </section>
  );
}

function SelectedAlertDetails({
  siteId,
  event,
  incident,
  onClose,
}: {
  siteId: string | null;
  event: ArcDeskEvent | null;
  incident: OpsIncident | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<ArcMonitoringFile | null>(null);

  useEffect(() => {
    if (!siteId) {
      setFile(null);
      return;
    }
    let cancelled = false;
    void adminApi
      .get<ApiResponse<ArcMonitoringFile>>(`/control-room/sites/${siteId}/monitoring-file`)
      .then((res) => {
        if (!cancelled) setFile(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const title = event
    ? event.reportAsType || event.type
    : incident?.type ?? 'Alert';
  const subtitle = event ? event.title : incident?.location || incident?.user || '';
  const address = file?.address || incident?.location || 'Address unavailable';
  const client = file?.owner?.name || file?.contacts?.[0]?.name || incident?.user || '—';
  const gate = file?.gateCode || null;
  const note = file?.accessNotes || null;

  return (
    <div className="ops-events__detail" aria-live="polite">
      <div className="ops-events__detail-head">
        <div>
          <strong>{title}</strong>
          {subtitle ? <span className="ops-events__detail-sub">{subtitle}</span> : null}
        </div>
        <button type="button" className="ops-events__detail-close" onClick={onClose} aria-label="Close alert details">
          Close
        </button>
      </div>
      <dl>
        <div>
          <dt>Address</dt>
          <dd>{address}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{client}</dd>
        </div>
        {gate ? (
          <div>
            <dt>Gate</dt>
            <dd>{gate}</dd>
          </div>
        ) : null}
      </dl>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function CameraFocus({
  feed,
  incidents,
  alarmStatus,
  onClose,
}: {
  feed: Feed;
  incidents: OpsIncident[];
  alarmStatus?: string;
  onClose: () => void;
}) {
  const online = cameraOnline(feed.camera);
  return (
    <div className="ops-focus">
      <header className="ops-events__head">
        <button type="button" onClick={onClose}>
          Events
        </button>
        <h2>{feed.camera.name}</h2>
      </header>
      <div className="ops-focus__video">
        <CctvLiveFeed camera={feed.camera} showControls />
      </div>
      <dl className="ops-focus__meta">
        <div>
          <dt>Site</dt>
          <dd>{feed.siteName}</dd>
        </div>
        <div>
          <dt>Signal</dt>
          <dd>{online ? 'Online' : 'Offline'}</dd>
        </div>
        <div>
          <dt>Alarm</dt>
          <dd>{alarmStatus ? alarmStatus.replace(/_/g, ' ') : 'Unknown'}</dd>
        </div>
      </dl>
      <ul className="ops-events__list">
        {incidents.length === 0 ? (
          <li className="ops-events__empty">No events on this camera&apos;s site.</li>
        ) : (
          incidents.slice(0, 4).map((incident) => (
            <li key={incident.id}>
              <Link href={incidentHref(incident.id)} className="ops-focus__event">
                <strong>{incident.type}</strong>
                <span>{incident.location || incident.time}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
      <div className="ops-focus__actions">
        <button
          type="button"
          onClick={() => openCctvMiniPlayer({ ...feed.camera, href: feed.href })}
        >
          Pop out
        </button>
        <Link href={feed.href}>Open site</Link>
      </div>
    </div>
  );
}

function CameraTile({
  feed,
  number,
  selected,
  onSelect,
}: {
  feed: Feed;
  number: number;
  selected: boolean;
  onSelect: (feed: Feed) => void;
}) {
  const tileRef = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);
  const online = cameraOnline(feed.camera);
  const label = `CAM-${String(feed.camera.channel || number).padStart(2, '0')}`;

  useEffect(() => {
    if (!menu) return;
    function close(event: MouseEvent) {
      if (!tileRef.current?.contains(event.target as Node)) setMenu(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  function toggleFullscreen() {
    const node = tileRef.current;
    if (!node) return;
    if (document.fullscreenElement === node) void document.exitFullscreen();
    else void node.requestFullscreen();
  }

  return (
    <article
      ref={tileRef}
      className={`ops-tile ${online ? '' : 'ops-tile--offline'} ${feed.hasEvent ? 'ops-tile--event' : ''} ${selected ? 'ops-tile--on' : ''}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return;
        onSelect(feed);
      }}
      onDoubleClick={toggleFullscreen}
    >
      <div className="ops-tile__stage">
        <CctvLiveFeed
          camera={feed.camera}
          compact
          showControls={false}
          onSelect={() => onSelect(feed)}
        />
      </div>
      <header className="ops-tile__top">
        <strong title={feed.camera.name}>{feed.camera.name}</strong>
        <span className={online ? 'ops-tile__live' : 'ops-tile__off'}>{online ? 'Live' : 'Offline'}</span>
        <TileClock />
      </header>
      <footer className="ops-tile__bottom">
        <span className="ops-tile__id">{label}</span>
        <span className={online ? 'ops-tile__ok' : 'ops-tile__bad'}>{online ? 'Online' : 'No signal'}</span>
        {feed.hasEvent ? <span className="ops-tile__flag" title="Event at this property">Event</span> : null}
        <span className="ops-tile__spacer" />
        <button type="button" aria-label={`Fullscreen ${feed.camera.name}`} onClick={toggleFullscreen}>
          <ExpandIcon />
        </button>
        <button
          type="button"
          aria-label={`Options for ${feed.camera.name}`}
          aria-expanded={menu}
          onClick={() => setMenu((open) => !open)}
        >
          <MoreIcon />
        </button>
        {menu ? (
          <div className="ops-tile__menu" role="menu">
            <Link href={feed.href} role="menuitem" onClick={() => setMenu(false)}>
              Open {feed.siteName}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                openCctvMiniPlayer({ ...feed.camera, href: feed.href });
                setMenu(false);
              }}
            >
              Pop out
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleFullscreen();
                setMenu(false);
              }}
            >
              Full screen
            </button>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

function TileClock() {
  const ref = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <time ref={ref} />;
}

function matchesEventFilter(incident: OpsIncident, filter: EventFilter) {
  if (filter === 'all') return true;
  if (filter === 'mine' || filter === 'informative') return false;
  const kind = opsAlertKind(incident.type);
  const band = opsPriorityLabel(incident.priority, incident.type);
  if (filter === 'critical') return band === 'P1';
  if (filter === 'panic') return kind === 'panic';
  if (filter === 'alarms') return kind === 'alarm' || kind === 'intrusion' || kind === 'fire';
  return true;
}

function cameraOnline(camera: CctvCamera) {
  const status = camera.status.toUpperCase();
  return !['OFFLINE', 'FAULT', 'DISABLED', 'NO_SIGNAL'].includes(status);
}

function isActive(status?: string) {
  const value = (status ?? '').toUpperCase();
  return value !== 'RESOLVED' && value !== 'CLOSED' && value !== 'CANCELLED';
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

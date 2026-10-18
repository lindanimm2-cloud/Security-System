'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { UiSelect } from '@/components/ui/UiSelect';
import { ChartCard, DonutChart, countBy } from '@/components/ui/charts';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES, dispatchHref, incidentHref, mapHref } from '@/lib/control-room-routes';
import { matchesSearch } from '@/lib/list-search';

type PanicRow = {
  id: string;
  priority: string;
  headline: string;
  client: string;
  phone: string | null;
  source: string;
  workflowStatus: string;
  device: { name: string; status: string } | null;
  location: { lat: number; lng: number; accuracy: number | null } | null;
  createdAt: string;
  incidentId: string | null;
  cancelRequestedAt?: string | null;
  history: { toStatus: string; note?: string; at?: string }[];
};

type DeviceEvent = {
  id: string;
  type: string;
  createdAt: string;
  payload?: { actor?: string; reason?: string };
  device?: { name?: string; status?: string; clientName?: string };
};

type OpsDevice = {
  id: string;
  name: string;
  deviceType: string;
  osName: string;
  osVersion: string | null;
  status: string;
  isPrimary: boolean;
  isLocked: boolean;
  lastActiveLabel: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
};

type TabId = 'overview' | 'panic' | 'devices' | 'events';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'panic', label: 'Active Panic' },
  { id: 'devices', label: 'Devices' },
  { id: 'events', label: 'Events' },
];

const STEPPER = [
  { id: 'detected', label: 'Detected', match: ['NEW', 'ACKNOWLEDGED'] },
  { id: 'contacting', label: 'Contacting', match: ['CONTACTING_CLIENT'] },
  { id: 'dispatch', label: 'Dispatch', match: ['DISPATCHED', 'RESPONDING', 'ON_SCENE'] },
  { id: 'resolved', label: 'Resolved', match: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
] as const;

function eventTone(type: string): 'ok' | 'warn' | 'danger' | 'neutral' | 'duress' {
  if (type.includes('STOLEN') || type === 'PANIC' || type.includes('LOCKDOWN')) return 'danger';
  if (type.includes('DURESS')) return 'duress';
  if (type.includes('LOST') || type.includes('TEMPORARY')) return 'warn';
  if (type.includes('REGISTERED') || type.includes('RESOLVED') || type.includes('SESSION')) return 'ok';
  return 'neutral';
}

function statusTone(status: string): string {
  const s = status.toUpperCase();
  if (s === 'TRUSTED') return 'ok';
  if (s === 'TEMPORARY') return 'warn';
  if (s === 'STOLEN') return 'duress';
  if (s === 'LOST' || s === 'BLOCKED' || s === 'REVOKED') return 'danger';
  return 'neutral';
}

function statusChartTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  const s = status.toUpperCase();
  if (s === 'TRUSTED') return 'success';
  if (s === 'TEMPORARY') return 'warning';
  if (s === 'STOLEN') return 'accent';
  if (s === 'LOST' || s === 'BLOCKED' || s === 'REVOKED') return 'danger';
  return 'neutral';
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function stepperIndex(status: string) {
  const idx = STEPPER.findIndex((s) => s.match.includes(status));
  return idx < 0 ? 0 : idx;
}

function placeLabel(panic: PanicRow) {
  if (!panic.location) return 'Location unavailable';
  const { lat, lng } = panic.location;
  if (lat < -29.7 && lat > -29.85 && lng > 30.9 && lng < 31.2) return 'Durban, KZN';
  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function deviceIcon(type: string, os: string) {
  const t = `${type} ${os}`.toLowerCase();
  if (t.includes('watch')) return '⌚';
  if (t.includes('tablet') || t.includes('ipad')) return '▦';
  if (t.includes('laptop') || t.includes('windows') || t.includes('mac')) return '▣';
  return '▣';
}

export default function DeviceSecurityOpsPage() {
  return (
    <ControlRoomLayout title="Panic & Devices">
      <OpsContent />
    </ControlRoomLayout>
  );
}

function OpsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<PanicRow[]>>('/control-room/security/panic'),
    [],
  );
  const { data: eventsData } = useApi(
    () => adminApi.get<ApiResponse<DeviceEvent[]>>('/control-room/security/events'),
    [],
  );
  const { data: devicesData } = useApi(
    () => adminApi.get<ApiResponse<OpsDevice[]>>('/control-room/security/devices'),
    [],
  );

  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');

  const panics = data?.data ?? [];
  const events = eventsData?.data ?? [];
  const devices = devicesData?.data ?? [];

  const activePanics = useMemo(
    () => panics.filter((p) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(p.workflowStatus)),
    [panics],
  );

  const deviceStatusSlices = useMemo(
    () =>
      countBy(devices, (d) => d.status).map((slice) => ({
        ...slice,
        tone: statusChartTone(slice.label),
      })),
    [devices],
  );

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (platformFilter !== 'ALL' && d.osName !== platformFilter) return false;
      return matchesSearch(
        search,
        d.name,
        d.status,
        d.clientName,
        d.clientPhone,
        d.clientEmail,
        d.deviceType,
        d.osName,
      );
    });
  }, [devices, search, statusFilter, platformFilter]);

  const recentEvents = useMemo(() => {
    const list =
      eventFilter === 'ALL'
        ? events
        : eventFilter === 'PANIC'
          ? events.filter((e) => e.type === 'PANIC' || e.type.startsWith('PANIC_'))
          : events.filter((e) => e.type === eventFilter);
    return list.slice(0, tab === 'events' ? 40 : 8);
  }, [events, eventFilter, tab]);

  async function transition(id: string, status: string) {
    await adminApi.post(`/control-room/security/panic/${id}/transition`, { status });
    void reload();
  }

  if (loading) return <LoadingSpinner label="Loading Panic & Devices…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const showOverview = tab === 'overview';
  const showPanic = tab === 'overview' || tab === 'panic';
  const showMid = tab === 'overview' || tab === 'events';
  const showDevices = tab === 'overview' || tab === 'devices';
  const showEventsOnly = tab === 'events';

  const trustedCount = devices.filter((d) => d.status === 'TRUSTED').length;
  const riskCount = devices.filter((d) => ['LOST', 'STOLEN', 'BLOCKED', 'REVOKED'].includes(d.status)).length;

  return (
    <div className="pd-page vms-page">
      <header className="vms-page__head pd-header">
        <div>
          <h1 className="pd-header__title">Panic & Devices</h1>
          <p className="pd-header__subtitle">
            Panic buttons, trusted endpoints, and live emergency sessions
          </p>
        </div>
        <div className="vms-page__meta pd-header__meta">
          <nav className="pd-tabs" aria-label="Panic and devices views">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`pd-tabs__btn ${tab === t.id ? 'is-active' : ''}`}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {showOverview ? (
        <div className="pd-stats" aria-label="Desk summary">
          <div className={`pd-stat ${activePanics.length ? 'pd-stat--hot' : ''}`}>
            <strong>{activePanics.length}</strong>
            <span>Live panic</span>
          </div>
          <div className="pd-stat">
            <strong>{devices.length}</strong>
            <span>Devices</span>
          </div>
          <div className="pd-stat pd-stat--ok">
            <strong>{trustedCount}</strong>
            <span>Trusted</span>
          </div>
          <div className={`pd-stat ${riskCount ? 'pd-stat--warn' : ''}`}>
            <strong>{riskCount}</strong>
            <span>At risk</span>
          </div>
          <div className="pd-stat">
            <strong>{events.length}</strong>
            <span>Events</span>
          </div>
        </div>
      ) : null}

      {showPanic ? (
        <section className="pd-section" aria-label="Active incidents">
          <div className="pd-section__head">
            <div className="pd-section__title-row">
              <h2>Active Incidents</h2>
              <span className={`pd-live ${activePanics.length ? 'is-hot' : ''}`}>
                {activePanics.length} LIVE
              </span>
            </div>
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="pd-link">
              View all incidents
            </Link>
          </div>

          {activePanics.length === 0 ? (
            <EmptyState
              title="No active panic"
              body="Live Panic, duress and emergency sessions from client devices appear here."
            />
          ) : (
            <div className="pd-incident-list">
              {activePanics.map((panic) => {
                const silent = panic.priority === 'SILENT';
                const step = stepperIndex(panic.workflowStatus);
                const tone = silent ? 'duress' : panic.priority === 'TEST' ? 'test' : 'critical';
                return (
                  <article key={panic.id} className={`pd-incident pd-incident--${tone}`}>
                    <div className="pd-incident__rail" aria-hidden />
                    <div className="pd-incident__body">
                      <div className="pd-incident__top">
                        <div className="pd-incident__badges">
                          <span className={`pd-badge pd-badge--${tone}`}>
                            {silent ? 'DURESS' : panic.priority === 'TEST' ? 'TEST' : 'CRITICAL'}
                          </span>
                          <span className="pd-badge pd-badge--muted">
                            {silent
                              ? 'Silent Duress'
                              : panic.source.includes('TEST')
                                ? 'Test Alert'
                                : 'Client Panic'}
                          </span>
                        </div>
                        <span className={`pd-status-pill pd-status-pill--${tone}`}>
                          {panic.workflowStatus.replaceAll('_', ' ')}
                        </span>
                      </div>

                      <div className="pd-incident__main">
                        <div className="pd-incident__person">
                          <span className={`pd-avatar pd-avatar--${tone}`} aria-hidden>
                            {initials(panic.client)}
                          </span>
                          <div>
                            <strong>{panic.client}</strong>
                            <span>
                              {panic.device?.name ?? 'Unknown device'}
                              {panic.device?.status ? ` · ${panic.device.status}` : ''}
                            </span>
                            <span className="pd-incident__place">{placeLabel(panic)}</span>
                          </div>
                        </div>

                        <div className="pd-incident__loc">
                          <span className="pd-incident__loc-label">Last known location</span>
                          <strong>
                            {panic.location
                              ? `${panic.location.lat.toFixed(4)}, ${panic.location.lng.toFixed(4)}`
                              : '—'}
                          </strong>
                          <span>
                            {panic.location?.accuracy != null
                              ? `±${Math.round(panic.location.accuracy)}m`
                              : 'GPS'}
                            {' · '}
                            {relativeTime(panic.createdAt)}
                          </span>
                        </div>

                        <ol className={`pd-stepper pd-stepper--${tone}`} aria-label="Response workflow">
                          {STEPPER.map((s, i) => (
                            <li
                              key={s.id}
                              className={
                                i < step ? 'is-done' : i === step ? 'is-current' : 'is-todo'
                              }
                            >
                              <span className="pd-stepper__dot" aria-hidden />
                              <span className="pd-stepper__label">{s.label}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {panic.cancelRequestedAt ? (
                        <p className="pd-incident__alert">Client attempting to cancel Panic.</p>
                      ) : null}

                      <div className="pd-incident__actions">
                        {panic.incidentId ? (
                          <Link className="btn-sm btn-secondary" href={incidentHref(panic.incidentId)}>
                            Open Incident
                          </Link>
                        ) : null}
                        {panic.phone ? (
                          <a className="btn-sm btn-secondary" href={`tel:${panic.phone}`}>
                            Call Client
                          </a>
                        ) : null}
                        <Link className="btn-sm btn-secondary" href={CONTROL_ROOM_ROUTES.surveillance}>
                          View CCTV
                        </Link>
                        <OpsMenuDropdown
                          compact
                          align="right"
                          ariaLabel="Incident actions"
                          label="⋯"
                          items={[
                            ...(panic.incidentId
                              ? [
                                  {
                                    id: 'dispatch',
                                    label: 'Open dispatch',
                                    onClick: () => {
                                      window.location.href = dispatchHref(panic.incidentId!);
                                    },
                                  },
                                  {
                                    id: 'map',
                                    label: 'Open map',
                                    onClick: () => {
                                      window.location.href = mapHref('incidents');
                                    },
                                  },
                                ]
                              : []),
                            ...(['ACKNOWLEDGED', 'CONTACTING_CLIENT', 'DISPATCHED', 'RESOLVED'] as const)
                              .filter((s) => s !== panic.workflowStatus)
                              .map((status) => ({
                                id: status,
                                label:
                                  status === 'ACKNOWLEDGED'
                                    ? 'Acknowledge'
                                    : status.replaceAll('_', ' '),
                                onClick: () => void transition(panic.id, status),
                              })),
                          ]}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {showMid ? (
        <div className="pd-mid">
          {showOverview ? (
            <ChartCard
              title="Device Status"
              subtitle="Trust posture across registered endpoints"
              className="pd-mid__chart"
            >
              <DonutChart
                slices={deviceStatusSlices}
                centerValue={devices.length}
                centerLabel="devices"
              />
            </ChartCard>
          ) : null}

          <section className={`pd-activity ${showOverview ? '' : 'pd-activity--wide'}`}>
            <div className="pd-section__head">
              <h2>Recent Activity</h2>
              {showEventsOnly ? (
                <UiSelect
                  value={eventFilter}
                  ariaLabel="Event type filter"
                  onChange={setEventFilter}
                  options={[
                    { value: 'ALL', label: 'All events' },
                    { value: 'PANIC', label: 'Panic' },
                    { value: 'DEVICE_REGISTERED', label: 'Registered' },
                    { value: 'DEVICE_LOST', label: 'Lost' },
                    { value: 'DEVICE_STOLEN', label: 'Stolen' },
                    { value: 'SECURITY_LOCKDOWN', label: 'Lockdown' },
                  ]}
                />
              ) : (
                <button type="button" className="pd-link" onClick={() => setTab('events')}>
                  View all
                </button>
              )}
            </div>
            <ul className="pd-activity__list">
              {recentEvents.map((event) => {
                const tone = eventTone(event.type);
                return (
                  <li key={event.id} className={`pd-activity__item pd-activity__item--${tone}`}>
                    <span className="pd-activity__dot" aria-hidden />
                    <div className="pd-activity__copy">
                      <strong>{event.type.replaceAll('_', ' ')}</strong>
                      <span>
                        {event.device?.name ?? '—'}
                        {event.device?.clientName || event.payload?.actor
                          ? ` · ${event.device?.clientName ?? event.payload?.actor}`
                          : ''}
                      </span>
                    </div>
                    <time dateTime={event.createdAt}>{relativeTime(event.createdAt)}</time>
                  </li>
                );
              })}
              {recentEvents.length === 0 ? (
                <li className="pd-activity__empty">
                  <EmptyState title="No recent activity" body="Device and panic events will show here." />
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      ) : null}

      {showDevices ? (
        <section className="pd-section pd-devices" aria-label="Registered devices">
          <div className="pd-section__head">
            <h2>Registered Devices</h2>
            <span className="pd-section__meta">{filteredDevices.length} devices</span>
          </div>

          <div className="pd-devices__toolbar">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Search devices…"
              resultCount={filteredDevices.length}
              totalCount={devices.length}
            />
            <UiSelect
              value={statusFilter}
              ariaLabel="Filter by status"
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'TRUSTED', label: 'Trusted' },
                { value: 'TEMPORARY', label: 'Temporary' },
                { value: 'BLOCKED', label: 'Blocked' },
                { value: 'LOST', label: 'Lost' },
                { value: 'STOLEN', label: 'Stolen' },
              ]}
            />
            <UiSelect
              value={platformFilter}
              ariaLabel="Filter by platform"
              onChange={setPlatformFilter}
              options={[
                { value: 'ALL', label: 'All Platforms' },
                ...Array.from(new Set(devices.map((d) => d.osName))).map((os) => ({
                  value: os,
                  label: os,
                })),
              ]}
            />
          </div>

          {filteredDevices.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'No devices'}
              body={search.trim() ? 'Try another client or device name.' : 'Registered client devices appear here.'}
            />
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Platform</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device) => {
                    const tone = statusTone(device.status);
                    return (
                      <tr key={device.id}>
                        <td>
                          <div className="pd-table__device">
                            <span className="pd-table__device-icon" aria-hidden>
                              {deviceIcon(device.deviceType, device.osName)}
                            </span>
                            <div>
                              <strong>{device.name}</strong>
                              <span className="text-muted">
                                {device.deviceType}
                                {device.isPrimary ? ' · Primary' : ''}
                                {device.isLocked ? ' · Locked' : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{device.clientName}</strong>
                          <span className="text-muted pd-table__sub">{device.clientEmail}</span>
                        </td>
                        <td>
                          <span className={`pd-pill pd-pill--${tone}`}>
                            {device.status.charAt(0) + device.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td>
                          {device.osName}
                          {device.osVersion ? ` ${device.osVersion}` : ''}
                        </td>
                        <td>{device.lastActiveLabel}</td>
                        <td>
                          <div className="pd-table__actions">
                            <a className="btn-sm btn-secondary" href={`tel:${device.clientPhone}`}>
                              View
                            </a>
                            <OpsMenuDropdown
                              compact
                              align="right"
                              ariaLabel={`${device.name} actions`}
                              label="⋯"
                              items={[
                                {
                                  id: 'call',
                                  label: 'Call client',
                                  onClick: () => {
                                    window.location.href = `tel:${device.clientPhone}`;
                                  },
                                },
                                {
                                  id: 'mail',
                                  label: 'Email client',
                                  onClick: () => {
                                    window.location.href = `mailto:${device.clientEmail}`;
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

    </div>
  );
}

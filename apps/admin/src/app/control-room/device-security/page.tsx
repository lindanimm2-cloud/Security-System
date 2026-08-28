'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { MetricStrip } from '@/components/ui/MetricStrip';
import {
  bucketByDay,
  ChartCard,
  ColumnChart,
  countBy,
  DonutChart,
  GaugeChart,
  HorizontalBars,
  type ChartTone,
} from '@/components/ui/charts';
import { dispatchHref, incidentHref, mapHref } from '@/lib/control-room-routes';
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

const WORKFLOW = [
  'NEW',
  'ACKNOWLEDGED',
  'CONTACTING_CLIENT',
  'DISPATCHED',
  'RESPONDING',
  'ON_SCENE',
  'RESOLVED',
];

const FILTERS = [
  'ALL',
  'PANIC',
  'DEVICE_REGISTERED',
  'DEVICE_LOST',
  'DEVICE_STOLEN',
  'EMERGENCY_SESSION_CREATED',
  'SECURITY_LOCKDOWN',
];

function eventTone(type: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (type.includes('STOLEN') || type === 'PANIC' || type.includes('LOCKDOWN')) return 'danger';
  if (type.includes('LOST') || type.includes('DURESS')) return 'warn';
  if (type.includes('REGISTERED') || type.includes('RESOLVED') || type.includes('SESSION')) return 'ok';
  return 'neutral';
}

function statusTone(status: string): string {
  const s = status.toUpperCase();
  if (s === 'TRUSTED') return 'ok';
  if (s === 'TEMPORARY') return 'warn';
  if (s === 'LOST' || s === 'STOLEN' || s === 'BLOCKED' || s === 'REVOKED') return 'danger';
  return 'neutral';
}

function statusChartTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  const s = status.toUpperCase();
  if (s === 'TRUSTED') return 'success';
  if (s === 'TEMPORARY') return 'warning';
  if (s === 'LOST' || s === 'STOLEN' || s === 'BLOCKED' || s === 'REVOKED') return 'danger';
  return 'neutral';
}

export default function DeviceSecurityOpsPage() {
  return (
    <ControlRoomLayout title="Device Security">
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
  const { data: analytics } = useApi(
    () =>
      adminApi.get<
        ApiResponse<{
          events90d: number;
          tests: number;
          falseAlarms: number;
          avgAckMs: number | null;
          lostDeviceReports: number;
          registeredDevices?: number;
          activeClients?: number;
        }>
      >('/control-room/security/analytics'),
    [],
  );
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const panics = data?.data ?? [];
  const events = eventsData?.data ?? [];
  const devices = devicesData?.data ?? [];
  const filteredPanics = useMemo(
    () =>
      panics.filter((p) =>
        matchesSearch(
          search,
          p.client,
          p.phone,
          p.device?.name,
          p.device?.status,
          p.source,
          p.workflowStatus,
          p.headline,
        ),
      ),
    [panics, search],
  );
  const activePanics = useMemo(
    () => filteredPanics.filter((p) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(p.workflowStatus)),
    [filteredPanics],
  );
  const filteredDevices = useMemo(
    () =>
      devices.filter((d) =>
        matchesSearch(
          search,
          d.name,
          d.status,
          d.clientName,
          d.clientPhone,
          d.clientEmail,
          d.deviceType,
          d.osName,
        ),
      ),
    [devices, search],
  );
  const typeFilteredEvents = useMemo(() => {
    if (filter === 'ALL') return events;
    if (filter === 'PANIC') {
      return events.filter((e) => e.type === 'PANIC' || e.type.startsWith('PANIC_'));
    }
    return events.filter((e) => e.type === filter);
  }, [events, filter]);
  const filteredEvents = useMemo(
    () =>
      typeFilteredEvents.filter((e) =>
        matchesSearch(
          search,
          e.type,
          e.device?.name,
          e.device?.status,
          e.device?.clientName,
          e.payload?.actor,
          e.payload?.reason,
        ),
      ),
    [typeFilteredEvents, search],
  );
  const deviceStatusSlices = useMemo(
    () =>
      countBy(devices, (d) => d.status).map((slice) => ({
        ...slice,
        tone: statusChartTone(slice.label),
      })),
    [devices],
  );
  const platformSlices = useMemo(
    () =>
      countBy(devices, (d) => d.osName, (os) => (os === 'Android' ? 'Android' : os === 'iOS' ? 'iOS' : os)).map(
        (slice, index): { label: string; value: number; tone: ChartTone } => ({
          ...slice,
          tone: index === 0 ? 'accent' : 'info',
        }),
      ),
    [devices],
  );
  const eventTrend = useMemo(
    () => bucketByDay(events, (e) => e.createdAt, 7),
    [events],
  );
  const eventTypeBars = useMemo(
    () =>
      countBy(events, (e) => e.type, (type) => type.replaceAll('_', ' '))
        .slice(0, 6)
        .map((slice, index): { label: string; value: number; tone: ChartTone } => ({
          label: slice.label,
          value: slice.value,
          tone: index === 0 ? 'danger' : index < 3 ? 'warning' : 'accent',
        })),
    [events],
  );
  const trustedCount = devices.filter((d) => d.status === 'TRUSTED').length;
  const trustScore = devices.length > 0 ? Math.round((trustedCount / devices.length) * 100) : 0;

  async function transition(id: string, status: string) {
    await adminApi.post(`/control-room/security/panic/${id}/transition`, { status });
    void reload();
  }

  if (loading) return <LoadingSpinner label="Loading device security…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="sec-ops">
      <MetricStrip
        items={[
          {
            id: 'devices',
            label: 'Devices',
            value: analytics?.data.registeredDevices ?? devices.length,
            tone: 'active',
          },
          {
            id: 'clients',
            label: 'Clients',
            value: analytics?.data.activeClients ?? new Set(devices.map((d) => d.clientEmail)).size,
          },
          { id: 'events', label: 'Events (90d)', value: analytics?.data.events90d ?? '—' },
          {
            id: 'ack',
            label: 'Avg ack',
            value: analytics?.data.avgAckMs ? `${Math.round(analytics.data.avgAckMs / 1000)}s` : '—',
            tone: 'success',
          },
          { id: 'tests', label: 'Tests', value: analytics?.data.tests ?? 0 },
          {
            id: 'lost',
            label: 'Lost / stolen',
            value: analytics?.data.lostDeviceReports ?? 0,
            tone: 'warning',
          },
        ]}
      />

      <div className="ds-chart-grid">
        <ChartCard title="Device trust posture" subtitle="Status mix across registered endpoints" className="ds-chart-card--span-4">
          <DonutChart
            slices={deviceStatusSlices}
            centerValue={devices.length}
            centerLabel="devices"
          />
        </ChartCard>
        <ChartCard title="Platform footprint" subtitle="Operating system distribution" className="ds-chart-card--span-4">
          <DonutChart slices={platformSlices} centerValue={devices.length} centerLabel="fleet" />
        </ChartCard>
        <ChartCard title="Trust score" subtitle="Trusted vs total registered" className="ds-chart-card--span-4">
          <GaugeChart
            value={trustScore}
            label="Trusted devices"
            hint={`${trustedCount} of ${devices.length} endpoints`}
            tone={trustScore >= 80 ? 'success' : trustScore >= 60 ? 'warning' : 'danger'}
          />
        </ChartCard>
        <ChartCard title="Security events" subtitle="Last 7 days" className="ds-chart-card--span-7">
          <ColumnChart
            items={eventTrend.map((point, index) => ({
              label: point.label,
              value: point.value,
              tone: index === eventTrend.length - 1 ? 'accent' : 'info',
            }))}
            height={132}
            emptyLabel="No events in the last week"
          />
        </ChartCard>
        <ChartCard title="Event categories" subtitle="Top activity types (90d)" className="ds-chart-card--span-5">
          <HorizontalBars items={eventTypeBars} compact />
        </ChartCard>
      </div>

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search client, device, event, workflow…"
          resultCount={filteredPanics.length + filteredDevices.length + filteredEvents.length}
          totalCount={panics.length + devices.length + typeFilteredEvents.length}
        />
      </div>

      <section className="sec-ops-section">
        <div className="sec-ops-section__head">
          <h2>Panic & emergency</h2>
          <span className="sec-ops-count">{activePanics.length} live</span>
        </div>
        <div className="sec-ops-grid">
          {filteredPanics.map((panic) => (
            <article
              key={panic.id}
              className={`sec-panic-card ${
                panic.priority === 'TEST'
                  ? 'sec-panic-card--test'
                  : panic.priority === 'SILENT'
                    ? 'sec-panic-card--silent'
                    : 'sec-panic-card--p1'
              }`}
            >
              <p className="sec-kicker">{panic.headline}</p>
              <h3>{panic.client}</h3>
              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{panic.source.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Device</dt>
                  <dd>
                    {panic.device?.name} · {panic.device?.status}
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {panic.location
                      ? `${panic.location.lat.toFixed(4)}, ${panic.location.lng.toFixed(4)} ±${Math.round(panic.location.accuracy ?? 0)}m`
                      : 'Unavailable'}
                  </dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{new Date(panic.createdAt).toLocaleTimeString()}</dd>
                </div>
                <div>
                  <dt>Workflow</dt>
                  <dd>{panic.workflowStatus.replaceAll('_', ' ')}</dd>
                </div>
              </dl>
              {panic.cancelRequestedAt ? (
                <p className="alert">Client attempting to cancel Panic.</p>
              ) : null}
              <div className="sec-device__actions">
                {WORKFLOW.filter((s) => s !== panic.workflowStatus)
                  .slice(0, 4)
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={() => void transition(panic.id, status)}
                    >
                      {status === 'ACKNOWLEDGED' ? 'Acknowledge' : status.replaceAll('_', ' ')}
                    </button>
                  ))}
                {panic.incidentId ? (
                  <>
                    <Link className="btn-sm btn-primary" href={incidentHref(panic.incidentId)}>
                      Open incident
                    </Link>
                    <Link className="btn-sm btn-secondary" href={dispatchHref(panic.incidentId)}>
                      Dispatch
                    </Link>
                    <Link className="btn-sm btn-secondary" href={mapHref('incidents')}>
                      Open map
                    </Link>
                  </>
                ) : null}
                {panic.phone ? (
                  <a className="btn-sm btn-secondary" href={`tel:${panic.phone}`}>
                    Call client
                  </a>
                ) : null}
                <Link className="btn-sm btn-secondary" href="/control-room/surveillance">
                  View CCTV
                </Link>
              </div>
            </article>
          ))}
          {filteredPanics.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'No panic events'}
              body={
                search.trim()
                  ? 'Try another client, device, or workflow term.'
                  : 'Live Panic, duress and labelled tests from client devices appear here.'
              }
            />
          ) : null}
        </div>
      </section>

      <section className="sec-ops-section">
        <div className="sec-ops-section__head">
          <h2>Registered devices</h2>
          <span className="sec-ops-count">{filteredDevices.length} total</span>
        </div>
        <div className="sec-ops-devices">
          {filteredDevices.map((device) => (
            <article key={device.id} className={`sec-ops-device sec-ops-device--${statusTone(device.status)}`}>
              <div className="sec-ops-device__top">
                <strong>{device.name}</strong>
                <span className={`sec-ops-pill sec-ops-pill--${statusTone(device.status)}`}>
                  {device.status}
                </span>
              </div>
              <p className="sec-ops-device__client">{device.clientName}</p>
              <p className="sec-ops-device__meta">
                {device.osName}
                {device.osVersion ? ` ${device.osVersion}` : ''} · {device.deviceType}
                {device.isPrimary ? ' · Primary' : ''}
                {device.isLocked ? ' · Locked' : ''}
              </p>
              <p className="sec-ops-device__active">Active {device.lastActiveLabel.toLowerCase()}</p>
              <a className="sec-ops-device__phone" href={`tel:${device.clientPhone}`}>
                {device.clientPhone}
              </a>
            </article>
          ))}
          {filteredDevices.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'No devices'}
              body={search.trim() ? 'Try another client or device name.' : 'Registered client devices appear here.'}
            />
          ) : null}
        </div>
      </section>

      <section className="sec-ops-section">
        <div className="sec-ops-section__head">
          <h2>Device events</h2>
          <span className="sec-ops-count">{filteredEvents.length} shown</span>
        </div>
        <div className="sec-ops-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? 'btn-sm btn-primary' : 'btn-sm btn-secondary'}
              onClick={() => setFilter(f)}
            >
              {f.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
        <ul className="sec-activity">
          {filteredEvents.map((event) => {
            const tone = eventTone(event.type);
            return (
              <li key={event.id} className={`sec-activity__item sec-activity__item--${tone}`}>
                <strong>{event.type.replaceAll('_', ' ')}</strong>
                <span>
                  {event.device?.name ?? '—'}
                  {event.device?.clientName || event.payload?.actor
                    ? ` · ${event.device?.clientName ?? event.payload?.actor}`
                    : ''}
                </span>
                {event.payload?.reason ? <span className="sec-activity__reason">{event.payload.reason}</span> : null}
                <time>{new Date(event.createdAt).toLocaleString()}</time>
              </li>
            );
          })}
          {filteredEvents.length === 0 ? (
            <li className="sec-activity__empty">
              <EmptyState
                title="No matching events"
                body={search.trim() ? 'Try another search term.' : 'Try another filter or wait for new device activity.'}
              />
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

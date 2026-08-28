'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { ChartCard, ColumnChart, DonutChart, HorizontalBars } from '@/components/ui/charts';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { incidentHref, mapHref } from '@/lib/control-room-routes';
import { sourceLabel, severityTone } from '@/lib/psim/security-events';
import type {
  AccessDoorRow,
  AlarmFeedRow,
  ComplianceRow,
  PatrolRouteRow,
  WatchlistRow,
} from '@/lib/demo/demo-psim';
import type { IntegrationEntry } from '@/lib/psim/integration-catalog';
import type { DispatchRule } from '@/lib/psim/integration-catalog';
import type { NormalizedSecurityEvent } from '@/lib/psim/security-events';

export type PsimTab =
  | 'overview'
  | 'alarms'
  | 'access'
  | 'patrols'
  | 'compliance'
  | 'intelligence'
  | 'rules'
  | 'integrations'
  | 'events';

const TABS: { id: PsimTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'alarms', label: 'Alarm ARC' },
  { id: 'events', label: 'Event bus' },
  { id: 'access', label: 'Access' },
  { id: 'patrols', label: 'Patrols' },
  { id: 'compliance', label: 'PSIRA' },
  { id: 'intelligence', label: 'Watchlists' },
  { id: 'rules', label: 'Rules' },
  { id: 'integrations', label: 'Integrations' },
];

type PsimOverview = {
  stats: {
    unackedAlarms: number;
    forcedDoors: number;
    latePatrols: number;
    nonCompliant: number;
    liveIntegrations: number;
    eventQueue: number;
    totalIntegrations: number;
    activeRules: number;
  };
  eventMix: { label: string; value: number; tone?: 'accent' | 'danger' | 'warning' | 'success' }[];
  alarmTrend: { label: string; value: number }[];
};

type PsimBundle = {
  overview: PsimOverview;
  alarms: AlarmFeedRow[];
  access: AccessDoorRow[];
  patrols: PatrolRouteRow[];
  compliance: ComplianceRow[];
  watchlists: WatchlistRow[];
  rules: DispatchRule[];
  integrations: IntegrationEntry[];
  events: NormalizedSecurityEvent[];
};

export function CommandHubPanels({ initialTab = 'overview' }: { initialTab?: PsimTab }) {
  const [tab, setTab] = useState<PsimTab>(initialTab);
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<PsimBundle>>('/control-room/psim/overview'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading command hub…" />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const bundle = data!.data;

  return (
    <div className="psim-hub">
      <nav className="psim-hub__tabs" aria-label="PSIM modules">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`psim-hub__tab ${tab === t.id ? 'psim-hub__tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="psim-hub__panel">
        {tab === 'overview' && <OverviewPanel data={bundle.overview} onNav={setTab} />}
        {tab === 'alarms' && <AlarmsPanel rows={bundle.alarms} onAck={reload} />}
        {tab === 'events' && <EventsPanel events={bundle.events} onAck={reload} />}
        {tab === 'access' && <AccessPanel rows={bundle.access} />}
        {tab === 'patrols' && <PatrolsPanel rows={bundle.patrols} />}
        {tab === 'compliance' && <CompliancePanel rows={bundle.compliance} />}
        {tab === 'intelligence' && <WatchlistPanel rows={bundle.watchlists} />}
        {tab === 'rules' && <RulesPanel rules={bundle.rules} />}
        {tab === 'integrations' && <IntegrationsPanel rows={bundle.integrations} />}
      </div>
    </div>
  );
}

function OverviewPanel({
  data,
  onNav,
}: {
  data: PsimOverview;
  onNav: (t: PsimTab) => void;
}) {
  const s = data.stats;
  return (
    <>
      <MetricStrip
        items={[
          { id: 'alarms', label: 'Unacked alarms', value: String(s.unackedAlarms), tone: s.unackedAlarms ? 'danger' : 'success' },
          { id: 'events', label: 'Event queue', value: String(s.eventQueue), tone: s.eventQueue ? 'warning' : 'neutral' },
          { id: 'doors', label: 'Forced doors', value: String(s.forcedDoors), tone: s.forcedDoors ? 'danger' : 'neutral' },
          { id: 'patrols', label: 'Late patrols', value: String(s.latePatrols), tone: s.latePatrols ? 'warning' : 'neutral' },
          { id: 'integrations', label: 'Live integrations', value: `${s.liveIntegrations}/${s.totalIntegrations}`, tone: 'active' },
          { id: 'rules', label: 'Active rules', value: String(s.activeRules), tone: 'active' },
        ]}
      />

      <div className="psim-hub__grid">
        <ChartCard title="Event sources (24h)" subtitle="Normalized event bus">
          <DonutChart
            slices={data.eventMix}
            centerValue={data.eventMix.reduce((n, d) => n + d.value, 0)}
            centerLabel="events"
          />
        </ChartCard>
        <ChartCard title="Alarm volume" subtitle="Hourly receipts — ARC">
          <ColumnChart items={data.alarmTrend} height={160} />
        </ChartCard>
      </div>

      <div className="psim-hub__quick">
        <button type="button" className="btn-sm" onClick={() => onNav('alarms')}>
          Alarm feed
        </button>
        <button type="button" className="btn-sm" onClick={() => onNav('events')}>
          Event bus
        </button>
        <Link href={mapHref('incidents')} className="btn-sm">
          Live map
        </Link>
        <Link href={incidentHref()} className="btn-sm">
          Incident file
        </Link>
      </div>
    </>
  );
}

function AlarmsPanel({ rows, onAck }: { rows: AlarmFeedRow[]; onAck: () => void }) {
  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Alarm receiver (ARC)</h2>
          <p className="text-muted">SIA DC-09 · Contact ID · IP modules</p>
        </div>
      </header>
      <div className="psim-feed">
        {rows.map((row) => (
          <article key={row.id} className={`psim-feed__row psim-feed__row--${row.severity.toLowerCase()}`}>
            <div className="psim-feed__main">
              <StatusBadge tone={alarmStatusTone(row.status)} label={row.status} />
              <strong>{row.account}</strong>
              <span>{row.zone} · {row.signal} · {row.protocol}</span>
              <time className="text-muted">{formatWhen(row.receivedAt)}</time>
            </div>
            <div className="psim-feed__acts">
              {row.incidentId ? (
                <Link href={incidentHref(row.incidentId)} className="link-sm">
                  Incident
                </Link>
              ) : null}
              {row.status === 'NEW' ? (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={async () => {
                    await adminApi.post(`/control-room/alarms/${row.id}/ack`);
                    onAck();
                  }}
                >
                  ACK
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventsPanel({
  events,
  onAck,
}: {
  events: NormalizedSecurityEvent[];
  onAck: () => void;
}) {
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      }),
    [events],
  );

  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Security event bus</h2>
          <p className="text-muted">Alarm · video · access · fleet · patrol · app</p>
        </div>
      </header>
      <ul className="psim-event-list">
        {sorted.map((e) => (
          <li key={e.id} className={`psim-event psim-event--${severityTone(e.severity)}`}>
            <span className="psim-event__src">{sourceLabel(e.source)}</span>
            <strong>{e.title}</strong>
            <span className="text-muted">
              {e.site ?? '—'}
              {e.zone ? ` · ${e.zone}` : ''}
            </span>
            <time>{formatWhen(e.receivedAt)}</time>
            <div className="psim-event__acts">
              {e.incidentId ? (
                <Link href={incidentHref(e.incidentId)} className="link-sm">
                  Open
                </Link>
              ) : null}
              {!e.acknowledged ? (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={async () => {
                    await adminApi.post(`/control-room/psim/events/${e.id}/ack`);
                    onAck();
                  }}
                >
                  Ack
                </button>
              ) : (
                <span className="text-muted">Acked</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccessPanel({ rows }: { rows: AccessDoorRow[] }) {
  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Access control</h2>
          <p className="text-muted">Doors · readers · forced entry</p>
        </div>
      </header>
      <div className="psim-cards">
        {rows.map((d) => (
          <article key={d.id} className={`psim-card psim-card--${d.status.toLowerCase()}`}>
            <StatusBadge tone={doorTone(d.status)} label={d.status.replace(/_/g, ' ')} />
            <strong>{d.name}</strong>
            <span className="text-muted">{d.site}</span>
            <p>{d.lastEvent}</p>
            <time className="text-muted">{formatWhen(d.lastEventAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function PatrolsPanel({ rows }: { rows: PatrolRouteRow[] }) {
  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Guard patrols & e-OB</h2>
          <p className="text-muted">NFC checkpoints · daily activity reports</p>
        </div>
      </header>
      <div className="psim-cards psim-cards--wide">
        {rows.map((p) => (
          <article key={p.id} className="psim-card">
            <div className="psim-card__head">
              <StatusBadge tone={patrolTone(p.status)} label={p.status.replace(/_/g, ' ')} />
              <strong>{p.name}</strong>
            </div>
            <span className="text-muted">{p.site} · {p.officer}</span>
            <div className="psim-progress">
              <div className="psim-progress__bar" style={{ width: `${p.progress}%` }} />
              <span>{p.progress}% · {p.checkpoints.filter((c) => c.scannedAt).length}/{p.checkpoints.length} scans</span>
            </div>
            <ul className="psim-checkpoints">
              {p.checkpoints.map((cp) => (
                <li key={cp.id} className={cp.scannedAt ? 'done' : 'miss'}>
                  {cp.label}
                  {cp.scannedAt ? ` · ${formatWhen(cp.scannedAt)}` : ' · pending'}
                </li>
              ))}
            </ul>
            <span className="text-muted">DAR {p.darSubmitted ? 'submitted' : 'pending'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompliancePanel({ rows }: { rows: ComplianceRow[] }) {
  const mix = [
    { label: 'Compliant', value: rows.filter((r) => r.status === 'COMPLIANT').length, tone: 'success' as const },
    { label: 'Expiring', value: rows.filter((r) => r.status === 'EXPIRING').length, tone: 'warning' as const },
    { label: 'Non-compliant', value: rows.filter((r) => r.status === 'NON_COMPLIANT').length, tone: 'danger' as const },
  ];

  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>PSIRA & HR compliance</h2>
          <p className="text-muted">Grades · firearm · medical · training</p>
        </div>
      </header>
      <div className="psim-hub__grid psim-hub__grid--compliance">
        <ChartCard title="Officer compliance">
          <HorizontalBars items={mix} compact />
        </ChartCard>
        <div className="psim-table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Officer</th>
                <th>PSIRA</th>
                <th>Firearm</th>
                <th>Medical</th>
                <th>Training</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.officer}</td>
                  <td>{r.psiraGrade}</td>
                  <td>{r.firearmExpiry}</td>
                  <td>{r.medicalExpiry}</td>
                  <td>{r.trainingDue}</td>
                  <td>
                    <StatusBadge tone={complianceTone(r.status)} label={r.status.replace(/_/g, ' ')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function WatchlistPanel({ rows }: { rows: WatchlistRow[] }) {
  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Intelligence & watchlists</h2>
          <p className="text-muted">Plate · person · vehicle hits</p>
        </div>
      </header>
      <ul className="psim-watchlist">
        {rows.map((w) => (
          <li key={w.id} className="psim-watchlist__row">
            <StatusBadge tone={w.active ? 'warning' : 'neutral'} label={w.kind} />
            <strong>{w.value}</strong>
            <span>{w.reason}</span>
            <span className="text-muted">{w.hits} hits · {w.addedBy}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RulesPanel({ rules }: { rules: DispatchRule[] }) {
  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Dispatch rules engine</h2>
          <p className="text-muted">Automated recommendations & escalations</p>
        </div>
      </header>
      <ul className="psim-rules">
        {rules.map((r) => (
          <li key={r.id} className={`psim-rules__row ${r.enabled ? '' : 'psim-rules__row--off'}`}>
            <span className="psim-rules__pri">P{r.priority}</span>
            <div>
              <strong>{r.name}</strong>
              <span className="text-muted">When: {r.trigger}</span>
              <span>Then: {r.action}</span>
            </div>
            <StatusBadge tone={r.enabled ? 'success' : 'neutral'} label={r.enabled ? 'ON' : 'OFF'} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntegrationsPanel({ rows }: { rows: IntegrationEntry[] }) {
  const byCat = useMemo(() => {
    const map = new Map<string, IntegrationEntry[]>();
    for (const r of rows) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <section className="psim-table-section">
      <header className="card-header-row card-header-row--panel">
        <div>
          <h2>Integration catalog</h2>
          <p className="text-muted">Protocols · vendors · event throughput</p>
        </div>
      </header>
      {byCat.map(([cat, items]) => (
        <div key={cat} className="psim-int-group">
          <h3>{cat}</h3>
          <ul className="psim-int-list">
            {items.map((i) => (
              <li key={i.id} className="psim-int-list__row">
                <StatusBadge tone={integrationTone(i.status)} label={i.status} />
                <strong>{i.vendor}</strong>
                <span className="text-muted">{i.protocol}</span>
                <span>{i.description}</span>
                {i.eventsPerDay != null ? (
                  <span className="text-muted">~{i.eventsPerDay}/day</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function alarmStatusTone(status: string): StatusTone {
  if (status === 'NEW') return 'danger';
  if (status === 'ACK') return 'warning';
  if (status === 'DISPATCHED') return 'active';
  return 'neutral';
}

function doorTone(status: string): StatusTone {
  if (status === 'SECURE') return 'success';
  if (status === 'OPEN') return 'warning';
  if (status === 'FORCED') return 'danger';
  return 'neutral';
}

function patrolTone(status: string): StatusTone {
  if (status === 'ON_ROUTE') return 'active';
  if (status === 'COMPLETE') return 'success';
  if (status === 'LATE') return 'warning';
  return 'danger';
}

function complianceTone(status: string): StatusTone {
  if (status === 'COMPLIANT') return 'success';
  if (status === 'EXPIRING') return 'warning';
  return 'danger';
}

function integrationTone(status: string): StatusTone {
  if (status === 'LIVE') return 'success';
  if (status === 'CONFIGURED') return 'active';
  return 'neutral';
}

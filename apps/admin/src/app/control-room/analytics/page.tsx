'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { exportCsv } from '@/lib/export-csv';
import { CONTROL_ROOM_ROUTES, analyticsMetricHref, mapHref, officerHref } from '@/lib/control-room-routes';

type Analytics = {
  totalUsers: number;
  totalIncidents: number;
  resolvedIncidents: number;
  resolutionRate: number;
  panicCount: number;
  theftCount: number;
  avgResponseSec: number;
  avgAckSec?: number;
  avgDispatchSec?: number;
  customerRating?: number;
  sla?: { type: string; targetSec: number; avgSec: number; breaches: number }[];
  officerPerformance: {
    name: string;
    avgResponseSec: number;
    status: string;
    rank?: string;
    skills?: string[];
  }[];
  aiSuggestions?: { id: string; title: string; detail: string }[];
};

export default function AnalyticsPage() {
  return (
    <ControlRoomLayout title="Analytics">
      <AnalyticsContent />
    </ControlRoomLayout>
  );
}

function AnalyticsContent() {
  const { data, loading, error , reload } = useApi(
    () => adminApi.get<ApiResponse<Analytics>>('/control-room/analytics'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading analytics..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const a = data!.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            <Link href={CONTROL_ROOM_ROUTES.overview} className="interactive-text">Overview</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="interactive-text">Incidents</Link>
            {' · '}
            <Link href={officerHref()} className="interactive-text">Officers</Link>
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            exportCsv('analytics.csv', [
              { metric: 'Total Users', value: a.totalUsers },
              { metric: 'Total Incidents', value: a.totalIncidents },
              { metric: 'Resolved Incidents', value: a.resolvedIncidents },
              { metric: 'Resolution Rate (%)', value: a.resolutionRate },
              { metric: 'Panic Alerts', value: a.panicCount },
              { metric: 'Theft Reports', value: a.theftCount },
              { metric: 'Avg Response (sec)', value: a.avgResponseSec },
              ...a.officerPerformance.map((o) => ({
                metric: `Officer: ${o.name}`,
                value: `${Math.floor(o.avgResponseSec / 60)}m ${o.avgResponseSec % 60}s · ${o.status}`,
              })),
            ])
          }
        >
          Export CSV
        </button>
      </div>

      <div className="stats-grid">
        <Link href={mapHref('users')} className="stat-card stat-card--link">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{a.totalUsers}</div>
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="stat-card stat-card--link">
          <div className="stat-label">Total Incidents</div>
          <div className="stat-value">{a.totalIncidents}</div>
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="stat-card stat-card--link">
          <div className="stat-label">Resolution Rate</div>
          <div className="stat-value">{a.resolutionRate}%</div>
        </Link>
        <Link href={officerHref()} className="stat-card stat-card--link stat-card--highlight">
          <div className="stat-label">Avg Response</div>
          <div className="stat-value">{Math.floor(a.avgResponseSec / 60)}m {a.avgResponseSec % 60}s</div>
        </Link>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <Link href={CONTROL_ROOM_ROUTES.incidents} className="card-title-link"><h2>Incident Breakdown</h2></Link>
          <div className="ops-bars" style={{ marginTop: '0.75rem' }}>
            {[
              { title: 'Panic Alerts', count: a.panicCount, tone: 'critical' },
              { title: 'Theft Reports', count: a.theftCount, tone: 'high' },
              { title: 'Resolved', count: a.resolvedIncidents, tone: 'ok' },
              {
                title: 'Open remainder',
                count: Math.max(0, a.totalIncidents - a.resolvedIncidents),
                tone: 'medium',
              },
            ].map((item) => {
              const max = Math.max(1, a.totalIncidents, a.panicCount, a.theftCount, a.resolvedIncidents);
              const pct = Math.round((item.count / max) * 100);
              return (
                <Link
                  key={item.title}
                  href={analyticsMetricHref(item.title)}
                  className="bar-row bar-row--link"
                >
                  <span className="bar-label">{item.title}</span>
                  <div className="bar-track">
                    <div className={`bar-fill bar-fill--${item.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="bar-value">{item.count}</span>
                </Link>
              );
            })}
          </div>
          <div className="ops-meter" style={{ marginTop: '1rem' }} aria-label="Resolution rate">
            <div className="ops-meter__fill ops-meter__fill--ok" style={{ width: `${a.resolutionRate}%` }} />
          </div>
          <p className="text-muted" style={{ margin: '0.45rem 0 0', fontSize: '0.8rem' }}>
            Resolution rate {a.resolutionRate}%
          </p>
        </section>
        <section className="panel">
          <Link href={officerHref()} className="card-title-link"><h2>Officer Performance</h2></Link>
          <div className="ops-bars" style={{ marginTop: '0.75rem' }}>
            {a.officerPerformance.map((o, i) => {
              const slowest = Math.max(1, ...a.officerPerformance.map((x) => x.avgResponseSec));
              const pct = Math.max(8, 100 - Math.round((o.avgResponseSec / slowest) * 100));
              return (
                <div key={i} className="bar-row">
                  <span className="bar-label" title={o.name}>{o.name.split(' ')[0]}</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill--ok" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="bar-value">
                    {Math.floor(o.avgResponseSec / 60)}m{o.avgResponseSec % 60}s
                  </span>
                </div>
              );
            })}
          </div>
          <ul className="officer-list" style={{ marginTop: '0.85rem' }}>
            {a.officerPerformance.map((o, i) => (
              <li key={i} className="officer-row officer-row--link">
                <Link href={officerHref()} className="officer-row-body">
                  <div>
                    <div className="officer-name">{o.name}</div>
                    <div className="officer-meta">{Math.floor(o.avgResponseSec / 60)}m {o.avgResponseSec % 60}s avg · {o.status}</div>
                  </div>
                </Link>
                <Link href={mapHref('officers')} className="link-sm">Map</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Response averages</h2>
        <p className="text-muted">
          Ack {a.avgAckSec ?? 45}s · Dispatch {a.avgDispatchSec ?? 90}s · On scene {a.avgResponseSec}s
          · Customer rating {a.customerRating ?? 4.6}/5
        </p>
        {(a.sla ?? []).map((row) => (
          <p key={row.type}>
            {row.type} SLA {row.targetSec}s · avg {row.avgSec}s · {row.breaches} breach
            {row.breaches === 1 ? '' : 'es'}
          </p>
        ))}
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>AI assist — suggestions only</h2>
        <p className="text-muted">Never unsupervised dispatch.</p>
        {(a.aiSuggestions ?? []).map((s) => (
          <article key={s.id} className="queue-card">
            <strong>{s.title}</strong>
            <p className="text-muted">{s.detail}</p>
          </article>
        ))}
        {a.officerPerformance[0]?.rank && (
          <p className="text-muted" style={{ marginTop: '0.75rem' }}>
            Rank / skills feed dispatch scoring: {a.officerPerformance[0].name} · {a.officerPerformance[0].rank} ·{' '}
            {(a.officerPerformance[0].skills ?? []).join(', ')}
          </p>
        )}
      </section>
    </div>
  );
}

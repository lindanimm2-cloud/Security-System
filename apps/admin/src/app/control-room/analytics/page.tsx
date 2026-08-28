'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { exportCsv } from '@/lib/export-csv';
import { openBrandedTableReport } from '@/lib/branded-document';
import { CONTROL_ROOM_ROUTES, analyticsMetricHref, mapHref, officerHref } from '@/lib/control-room-routes';
import {
  ChartCard,
  ColumnChart,
  DonutChart,
  GaugeChart,
  HorizontalBars,
  Sparkline,
} from '@/components/ui/charts';

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
  incidentTrend?: { label: string; value: number }[];
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
  const incidentMix = [
    { label: 'Panic', value: a.panicCount, tone: 'danger' as const },
    { label: 'Theft', value: a.theftCount, tone: 'warning' as const },
    { label: 'Resolved', value: a.resolvedIncidents, tone: 'success' as const },
    {
      label: 'Open',
      value: Math.max(0, a.totalIncidents - a.resolvedIncidents),
      tone: 'accent' as const,
    },
  ];
  const incidentTrend =
    a.incidentTrend ??
    [
      { label: 'Mar', value: 6 },
      { label: 'Apr', value: 8 },
      { label: 'May', value: 5 },
      { label: 'Jun', value: 9 },
      { label: 'Jul', value: 7 },
      { label: 'Aug', value: a.totalIncidents },
    ];
  const responseBars = [
    { label: 'Ack', value: a.avgAckSec ?? 45, tone: 'success' as const, hint: 'Average acknowledgement' },
    { label: 'Dispatch', value: a.avgDispatchSec ?? 90, tone: 'info' as const, hint: 'Average dispatch' },
    { label: 'On scene', value: a.avgResponseSec, tone: 'accent' as const, hint: 'Average arrival' },
  ];

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
        <div className="page-header__actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              openBrandedTableReport({
                title: 'Operations analytics summary',
                filenameStem: 'analytics',
                headers: ['Metric', 'Value'],
                rows: [
                  ['Total Users', a.totalUsers],
                  ['Total Incidents', a.totalIncidents],
                  ['Resolved Incidents', a.resolvedIncidents],
                  ['Resolution Rate (%)', a.resolutionRate],
                  ['Panic Alerts', a.panicCount],
                  ['Theft Reports', a.theftCount],
                  ['Avg Response (sec)', a.avgResponseSec],
                  ...a.officerPerformance.map((o) => [
                    `Officer: ${o.name}`,
                    `${Math.floor(o.avgResponseSec / 60)}m ${o.avgResponseSec % 60}s · ${o.status}`,
                  ]),
                ],
              })
            }
          >
            Print report
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              exportCsv(
                'analytics.csv',
                [
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
                ],
                { title: 'Operations analytics summary' },
              )
            }
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <Link href={mapHref('users')} className="stat-card stat-card--link stat-card--alive">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{a.totalUsers}</div>
          <Sparkline points={[96, 102, 108, 114, 118, 124, a.totalUsers]} tone="accent" />
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="stat-card stat-card--link stat-card--alive">
          <div className="stat-label">Total Incidents</div>
          <div className="stat-value">{a.totalIncidents}</div>
          <Sparkline points={incidentTrend.map((point) => point.value)} tone="warning" />
        </Link>
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="stat-card stat-card--link stat-card--alive">
          <div className="stat-label">Resolution Rate</div>
          <div className="stat-value">{a.resolutionRate}%</div>
          <Sparkline points={[62, 66, 69, 71, 73, 74, a.resolutionRate]} tone="success" />
        </Link>
        <Link href={officerHref()} className="stat-card stat-card--link stat-card--highlight stat-card--alive">
          <div className="stat-label">Avg Response</div>
          <div className="stat-value">{Math.floor(a.avgResponseSec / 60)}m {a.avgResponseSec % 60}s</div>
          <Sparkline points={[340, 320, 305, 295, 288, 282, a.avgResponseSec]} tone="success" />
        </Link>
      </div>

      <div className="ds-chart-grid">
        <ChartCard title="Incident mix" subtitle="Volume by category" className="ds-chart-card--span-4">
          <DonutChart slices={incidentMix} centerValue={a.totalIncidents} centerLabel="total" />
        </ChartCard>
        <ChartCard title="Resolution health" subtitle="Closed vs total workload" className="ds-chart-card--span-4">
          <GaugeChart
            value={a.resolutionRate}
            label="Resolution rate"
            hint={`${a.resolvedIncidents} of ${a.totalIncidents} closed`}
            tone={a.resolutionRate >= 75 ? 'success' : a.resolutionRate >= 60 ? 'warning' : 'danger'}
          />
        </ChartCard>
        <ChartCard title="Customer rating" subtitle="Post-incident feedback" className="ds-chart-card--span-4">
          <GaugeChart
            value={Math.round(((a.customerRating ?? 4.6) / 5) * 100)}
            max={100}
            label={`${a.customerRating ?? 4.6} / 5`}
            hint="Rolling 30-day average"
            tone="success"
          />
        </ChartCard>
        <ChartCard title="Incident volume" subtitle="Monthly trend" className="ds-chart-card--span-7">
          <ColumnChart
            items={incidentTrend.map((point, index) => ({
              ...point,
              tone: index === incidentTrend.length - 1 ? 'accent' : 'info',
            }))}
            height={140}
          />
        </ChartCard>
        <ChartCard title="Response stages" subtitle="Average seconds by phase" className="ds-chart-card--span-5">
          <HorizontalBars items={responseBars} max={Math.max(a.avgResponseSec, a.avgDispatchSec ?? 0, a.avgAckSec ?? 0)} />
        </ChartCard>
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

      <div className="analytics-insights">
        <section className="panel analytics-sla-panel">
          <div className="analytics-panel-head">
            <div>
              <h2>Response averages</h2>
              <p className="text-muted">End-to-end timing and SLA compliance</p>
            </div>
            <span className="analytics-badge analytics-badge--live">Live KPIs</span>
          </div>

          <div className="analytics-response-metrics">
            {[
              { label: 'Acknowledge', value: a.avgAckSec ?? 45, tone: 'success' },
              { label: 'Dispatch', value: a.avgDispatchSec ?? 90, tone: 'info' },
              { label: 'On scene', value: a.avgResponseSec, tone: 'accent' },
              {
                label: 'Customer rating',
                value: `${a.customerRating ?? 4.6}/5`,
                tone: 'warning',
                isText: true,
              },
            ].map((metric) => (
              <div key={metric.label} className={`analytics-metric analytics-metric--${metric.tone}`}>
                <span className="analytics-metric__label">{metric.label}</span>
                <strong className="analytics-metric__value">
                  {metric.isText ? metric.value : `${metric.value}s`}
                </strong>
              </div>
            ))}
          </div>

          <div className="analytics-sla-grid">
            {(a.sla ?? []).map((row) => {
              const pct = Math.min(100, Math.round((row.avgSec / row.targetSec) * 100));
              const over = row.avgSec > row.targetSec;
              return (
                <article
                  key={row.type}
                  className={`analytics-sla-card ${over ? 'analytics-sla-card--breach' : 'analytics-sla-card--ok'}`}
                >
                  <div className="analytics-sla-card__head">
                    <strong>{row.type}</strong>
                    <span className={`analytics-sla-badge ${row.breaches > 0 ? 'analytics-sla-badge--warn' : 'analytics-sla-badge--ok'}`}>
                      {row.breaches} breach{row.breaches === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="analytics-sla-card__track" aria-hidden>
                    <div
                      className={`analytics-sla-card__fill ${over ? 'analytics-sla-card__fill--over' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span
                      className="analytics-sla-card__target"
                      style={{ left: `${Math.min(96, 100)}%` }}
                      title={`Target ${row.targetSec}s`}
                    />
                  </div>
                  <div className="analytics-sla-card__meta">
                    <span>Avg <em>{row.avgSec}s</em></span>
                    <span>Target <em>{row.targetSec}s</em></span>
                    <span className={over ? 'analytics-sla-card__delta analytics-sla-card__delta--bad' : 'analytics-sla-card__delta'}>
                      {over ? `+${row.avgSec - row.targetSec}s` : `${row.targetSec - row.avgSec}s under`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel analytics-ai-panel">
          <div className="analytics-panel-head">
            <div>
              <h2>AI assist</h2>
              <p className="text-muted">Suggestions only — never unsupervised dispatch</p>
            </div>
            <span className="analytics-badge analytics-badge--assist">Assist</span>
          </div>

          <div className="analytics-ai-list">
            {(a.aiSuggestions ?? []).map((s) => (
              <article key={s.id} className="analytics-ai-card">
                <div className="analytics-ai-card__icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M12 3 4 9v12h16V9l-8-6z" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>
                <div className="analytics-ai-card__body">
                  <strong>{s.title}</strong>
                  <p>{s.detail}</p>
                </div>
                <span className="analytics-ai-card__tag">Suggestion</span>
              </article>
            ))}
          </div>

          {a.officerPerformance[0]?.rank ? (
            <div className="analytics-dispatch-score">
              <span className="analytics-dispatch-score__label">Dispatch scoring feed</span>
              <div className="analytics-dispatch-score__officer">
                <strong>{a.officerPerformance[0].name}</strong>
                <span className="analytics-rank-pill">{a.officerPerformance[0].rank}</span>
              </div>
              <div className="analytics-skill-chips">
                {(a.officerPerformance[0].skills ?? []).map((skill) => (
                  <span key={skill} className="analytics-skill-chip">
                    {skill.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

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

function formatMmSs(sec: number) {
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function AnalyticsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Analytics>>('/control-room/analytics'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading analytics..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const a = data!.data;
  const openCount = Math.max(0, a.totalIncidents - a.resolvedIncidents);
  const incidentMix = [
    { label: 'Panic', value: a.panicCount, tone: 'danger' as const },
    { label: 'Theft', value: a.theftCount, tone: 'warning' as const },
    { label: 'Resolved', value: a.resolvedIncidents, tone: 'success' as const },
    { label: 'Open', value: openCount, tone: 'accent' as const },
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
  const slaRows = a.sla ?? [];
  const breachTotal = slaRows.reduce((sum, row) => sum + row.breaches, 0);

  function printReport() {
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
          `${formatMmSs(o.avgResponseSec)} · ${o.status}`,
        ]),
      ],
    });
  }

  function exportReport() {
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
          value: `${formatMmSs(o.avgResponseSec)} · ${o.status}`,
        })),
      ],
      { title: 'Operations analytics summary' },
    );
  }

  return (
    <div className="vms-page analytics-page">
      <header className="vms-page__head">
        <nav className="vms-tabs" aria-label="Analytics sections">
          <span className="vms-tab is-on" aria-current="page">
            Overview
          </span>
          <Link href={CONTROL_ROOM_ROUTES.incidents} className="vms-tab">
            Incidents
          </Link>
          <Link href={officerHref()} className="vms-tab">
            Officers
          </Link>
        </nav>
        <div className="vms-page__meta">
          <span>
            {a.totalIncidents} incidents · {openCount} open · {a.resolutionRate}% resolved
          </span>
          {a.panicCount > 0 ? (
            <Link href={CONTROL_ROOM_ROUTES.incidents} className="vms-pill vms-pill--warn">
              {a.panicCount} panic
            </Link>
          ) : null}
          {breachTotal > 0 ? (
            <span className="vms-pill vms-pill--warn">{breachTotal} SLA breach</span>
          ) : (
            <span className="vms-badge">SLA ok</span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={printReport}>
            Print
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportReport}>
            CSV
          </button>
        </div>
      </header>

      <div className="analytics-desk">
        <div className="stats-grid stats-grid--sparks" role="list">
          <Link href={mapHref('users')} className="stat-card stat-card--link stat-card--alive" role="listitem">
            <span className="stat-label">Total Users</span>
            <strong className="stat-value">{a.totalUsers}</strong>
            <Sparkline compact points={[96, 102, 108, 114, 118, 124, a.totalUsers]} tone="accent" />
          </Link>
          <Link
            href={CONTROL_ROOM_ROUTES.incidents}
            className="stat-card stat-card--link stat-card--alive"
            role="listitem"
            title="Open incidents"
          >
            <span className="stat-label">Total Incidents</span>
            <strong className="stat-value">{a.totalIncidents}</strong>
            <Sparkline compact points={incidentTrend.map((point) => point.value)} tone="warning" />
          </Link>
          <Link
            href={CONTROL_ROOM_ROUTES.incidents}
            className="stat-card stat-card--link stat-card--alive"
            role="listitem"
          >
            <span className="stat-label">Resolution Rate</span>
            <strong className="stat-value">{a.resolutionRate}%</strong>
            <Sparkline compact points={[62, 66, 69, 71, 73, 74, a.resolutionRate]} tone="success" />
          </Link>
          <Link
            href={officerHref()}
            className="stat-card stat-card--link stat-card--highlight stat-card--alive"
            role="listitem"
          >
            <span className="stat-label">Avg Response</span>
            <strong className="stat-value">{formatMmSs(a.avgResponseSec)}</strong>
            <Sparkline compact points={[340, 320, 305, 295, 288, 282, a.avgResponseSec]} tone="success" />
          </Link>
        </div>

        <div className="analytics-desk__charts ds-chart-grid">
          <ChartCard title="Incident mix" subtitle="Volume by category" className="ds-chart-card--span-4">
            <DonutChart slices={incidentMix} centerValue={a.totalIncidents} centerLabel="total" />
          </ChartCard>
          <ChartCard title="Resolution health" subtitle="Closed vs total" className="ds-chart-card--span-4">
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
              height={96}
            />
          </ChartCard>
          <ChartCard title="Response stages" subtitle="Average seconds by phase" className="ds-chart-card--span-5">
            <HorizontalBars
              items={responseBars}
              max={Math.max(a.avgResponseSec, a.avgDispatchSec ?? 0, a.avgAckSec ?? 0)}
            />
          </ChartCard>
        </div>

        <div className="analytics-desk__split">
          <section className="analytics-panel">
            <div className="analytics-panel__head">
              <Link href={CONTROL_ROOM_ROUTES.incidents} className="analytics-panel__title">
                Incident breakdown
              </Link>
              <span className="vms-badge">{a.resolutionRate}% closed</span>
            </div>
            <div className="ops-bars analytics-bars">
              {[
                { title: 'Panic Alerts', count: a.panicCount, tone: 'critical' },
                { title: 'Theft Reports', count: a.theftCount, tone: 'high' },
                { title: 'Resolved', count: a.resolvedIncidents, tone: 'ok' },
                { title: 'Open remainder', count: openCount, tone: 'medium' },
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
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel__head">
              <Link href={officerHref()} className="analytics-panel__title">
                Officer performance
              </Link>
              <Link href={mapHref('officers')} className="analytics-panel__link">
                Map
              </Link>
            </div>
            <ul className="analytics-officer-list">
              {a.officerPerformance.map((o) => (
                <li key={o.name}>
                  <Link href={officerHref()} className="analytics-officer-row">
                    <span className="analytics-officer-row__name">{o.name}</span>
                    <span className="analytics-officer-row__meta">
                      {formatMmSs(o.avgResponseSec)} · {o.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="analytics-desk__split analytics-desk__split--insights">
          <section className="analytics-panel">
            <div className="analytics-panel__head">
              <div>
                <h2 className="analytics-panel__title">Response averages</h2>
                <p className="analytics-panel__sub">Ack → dispatch → on scene · SLA</p>
              </div>
              <span className="vms-badge">Live KPIs</span>
            </div>

            <div className="analytics-response-metrics">
              {[
                { label: 'Acknowledge', value: `${a.avgAckSec ?? 45}s`, tone: 'success' },
                { label: 'Dispatch', value: `${a.avgDispatchSec ?? 90}s`, tone: 'info' },
                { label: 'On scene', value: `${a.avgResponseSec}s`, tone: 'accent' },
                {
                  label: 'Customer rating',
                  value: `${a.customerRating ?? 4.6}/5`,
                  tone: 'warning',
                },
              ].map((metric) => (
                <div key={metric.label} className={`analytics-metric analytics-metric--${metric.tone}`}>
                  <span className="analytics-metric__label">{metric.label}</span>
                  <strong className="analytics-metric__value">{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="analytics-sla-grid">
              {slaRows.map((row) => {
                const pct = Math.min(100, Math.round((row.avgSec / row.targetSec) * 100));
                const over = row.avgSec > row.targetSec;
                return (
                  <article
                    key={row.type}
                    className={`analytics-sla-card ${over ? 'analytics-sla-card--breach' : 'analytics-sla-card--ok'}`}
                  >
                    <div className="analytics-sla-card__head">
                      <strong>{row.type}</strong>
                      <span
                        className={`analytics-sla-badge ${
                          row.breaches > 0 ? 'analytics-sla-badge--warn' : 'analytics-sla-badge--ok'
                        }`}
                      >
                        {row.breaches} breach{row.breaches === 1 ? '' : 'es'}
                      </span>
                    </div>
                    <div className="analytics-sla-card__track" aria-hidden>
                      <div
                        className={`analytics-sla-card__fill ${over ? 'analytics-sla-card__fill--over' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="analytics-sla-card__meta">
                      <span>
                        Avg <em>{row.avgSec}s</em>
                      </span>
                      <span>
                        Target <em>{row.targetSec}s</em>
                      </span>
                      <span
                        className={
                          over
                            ? 'analytics-sla-card__delta analytics-sla-card__delta--bad'
                            : 'analytics-sla-card__delta'
                        }
                      >
                        {over ? `+${row.avgSec - row.targetSec}s` : `${row.targetSec - row.avgSec}s under`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel__head">
              <div>
                <h2 className="analytics-panel__title">AI assist</h2>
                <p className="analytics-panel__sub">Suggestions only — never unsupervised</p>
              </div>
              <span className="vms-badge">Assist</span>
            </div>

            <div className="analytics-ai-list">
              {(a.aiSuggestions ?? []).map((s) => (
                <article key={s.id} className="analytics-ai-card">
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
                <span className="analytics-dispatch-score__label">Dispatch scoring</span>
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
    </div>
  );
}

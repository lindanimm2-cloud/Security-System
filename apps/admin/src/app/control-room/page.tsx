'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { officerStatusLabel } from '@/lib/officer-status';
import { sortIncidentsForOps } from '@/lib/alert-priority';
import { CONTROL_ROOM_ROUTES, dispatchHref, incidentHref, mapHref, officerHref } from '@/lib/control-room-routes';
import { getSession } from '@/lib/auth';
import { navForRole } from '@/lib/control-room-nav';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import { OpsCompactStats, OpsNeedsYou, OpsQuickWork } from '@/components/ops/OpsQuickWork';

type Dashboard = {
  stats: {
    activeUsers: number;
    activeIncidents: number;
    criticalIncidents: number;
    availableOfficers: number;
    totalOfficers: number;
    avgResponseFormatted: string;
    avgResponseSec?: number;
  };
  incidents: { id: string; type: string; user: string; location: string; time: string; priority: string }[];
  officers: { id: string; name: string; status: string; zone: string }[];
  system: Record<string, string>;
};

export default function ControlRoomPage() {
  return (
    <ControlRoomLayout>
      <OverviewContent />
    </ControlRoomLayout>
  );
}

function OverviewContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Dashboard>>('/control-room/dashboard'),
    [],
  );
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

  const role = getSession('admin')?.user.role ?? '';
  const allowedNav = new Set(navForRole(role).map((item) => item.href));
  const canAccess = (href: string) => allowedNav.has(href);

  const d = data?.data;

  const prioritizedIncidents = useMemo(
    () => (d ? sortIncidentsForOps(d.incidents) : []),
    [d],
  );

  const criticalList = useMemo(
    () =>
      prioritizedIncidents.filter((i) =>
        ['critical', 'CRITICAL', 'high', 'HIGH'].includes(i.priority),
      ),
    [prioritizedIncidents],
  );

  const officerCoveragePct = d
    ? Math.round((d.stats.availableOfficers / Math.max(1, d.stats.totalOfficers)) * 100)
    : 0;

  if (loading) return <LoadingSpinner label="Loading control room..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!d) return null;

  const topIncident = prioritizedIncidents[0];
  const list =
    filter === 'urgent' ? criticalList : prioritizedIncidents;

  return (
    <div className="dash-ops">
      <OpsMyShiftHeader
        title="Ops shift"
        subtitle={`${d.stats.activeIncidents} open · ${d.stats.criticalIncidents} critical · ${officerCoveragePct}% officers available`}
        chips={[
          {
            id: 'all',
            label: 'Everything',
            count: d.stats.activeIncidents,
          },
          {
            id: 'urgent',
            label: 'Critical',
            count: d.stats.criticalIncidents,
            tone: 'urgent',
          },
          {
            id: 'officers',
            label: 'Available',
            count: d.stats.availableOfficers,
            tone: 'ok',
          },
          {
            id: 'map',
            label: 'Map',
            count: d.stats.activeUsers,
            tone: 'neutral',
          },
        ]}
        activeChip={filter}
        onChip={(id) => {
          if (id === 'map' && canAccess(CONTROL_ROOM_ROUTES.map)) {
            window.location.href = CONTROL_ROOM_ROUTES.map;
            return;
          }
          if (id === 'officers' && canAccess(CONTROL_ROOM_ROUTES.officers)) {
            window.location.href = CONTROL_ROOM_ROUTES.officers;
            return;
          }
          setFilter(id);
        }}
      />

      {topIncident && canAccess(CONTROL_ROOM_ROUTES.dispatch) && (
        <OpsQuickWork
          hint={`${topIncident.type} — ${topIncident.user}`}
          actions={[
            {
              id: 'dispatch',
              label: 'Dispatch',
              primary: true,
              href: dispatchHref(topIncident.id),
            },
            {
              id: 'open',
              label: 'Open',
              href: incidentHref(topIncident.id),
            },
            canAccess(CONTROL_ROOM_ROUTES.map)
              ? {
                  id: 'map',
                  label: 'Live map',
                  href: CONTROL_ROOM_ROUTES.map,
                }
              : { id: 'map', label: 'Live map', href: CONTROL_ROOM_ROUTES.map },
            {
              id: 'call',
              label: 'Calls',
              href: CONTROL_ROOM_ROUTES.communications,
            },
          ]}
        />
      )}

      {canAccess(CONTROL_ROOM_ROUTES.incidents) && d.stats.criticalIncidents > 0 && (
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="ops-critical-banner">
          <span className="ops-critical-banner__pulse" aria-hidden />
          <div>
            <strong>{d.stats.criticalIncidents} critical open</strong>
            <span>Handle these before anything else</span>
          </div>
          <span className="ops-critical-banner__cta">Incidents →</span>
        </Link>
      )}

      {/* Priority 1: Active incidents + Live map */}
      <div className="dash-focus-grid">
        {canAccess(CONTROL_ROOM_ROUTES.incidents) && (
          <section className="panel dash-focus-panel dash-focus-panel--incidents">
            <div className="panel-header">
              <div>
                <h2>Active incidents</h2>
                <p className="text-muted dash-focus-sub">
                  {d.stats.activeIncidents} open · {d.stats.criticalIncidents} critical
                </p>
              </div>
              <Link href={CONTROL_ROOM_ROUTES.incidents} className="badge badge--alert badge--link">
                {d.stats.activeIncidents} open
              </Link>
            </div>
            {list.length === 0 ? (
              <div className="dash-clear">
                <strong>Board clear</strong>
                <p className="text-muted">No active incidents. Monitor the map for new alerts.</p>
              </div>
            ) : (
              <ul className="incident-list dash-incident-list">
                {list.slice(0, 6).map((i) => (
                  <li
                    key={i.id}
                    className={`incident-row incident-row--link incident-row--${i.priority.toLowerCase()}`}
                  >
                    <Link href={incidentHref(i.id)} className="incident-row-body">
                      <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>
                        {i.type}
                      </span>
                      <div className="incident-user">{i.user}</div>
                      <div className="incident-meta">
                        {i.location} · {i.time}
                      </div>
                    </Link>
                    <Link href={dispatchHref(i.id)} className="btn-sm btn-sm--link">
                      Dispatch
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {criticalList.length > 0 && (
              <OpsNeedsYou
                items={criticalList.slice(0, 3).map((i) => ({
                  id: i.id,
                  title: `${i.type} — ${i.user}`,
                  detail: `${i.location} · ${i.time}`,
                  href: dispatchHref(i.id),
                }))}
                viewAllHref={CONTROL_ROOM_ROUTES.incidents}
              />
            )}
          </section>
        )}

        {canAccess(CONTROL_ROOM_ROUTES.map) && (
          <section className="panel dash-focus-panel dash-focus-panel--map">
            <div className="panel-header">
              <Link href={CONTROL_ROOM_ROUTES.map} className="card-title-link">
                <h2>Live map</h2>
              </Link>
              <Link href={CONTROL_ROOM_ROUTES.map} className="link-sm">
                Full screen
              </Link>
            </div>
            <Link
              href={CONTROL_ROOM_ROUTES.map}
              className="map-placeholder map-placeholder--link map-placeholder--alive dash-map-hero"
            >
              <div className="map-placeholder-grid" />
              <div className="map-placeholder-stats">
                <span>
                  <strong>{d.stats.activeUsers}</strong> users
                </span>
                <span>
                  <strong>{d.stats.totalOfficers}</strong> officers
                </span>
                <span>
                  <strong>{d.stats.activeIncidents}</strong> incidents
                </span>
              </div>
              <p>Field picture for dispatch — jump in for live context.</p>
              <span className="feature-action">Open live map →</span>
            </Link>
          </section>
        )}
      </div>

      {/* Priority 2: coverage metrics */}
      <OpsCompactStats
        items={[
          ...(canAccess(CONTROL_ROOM_ROUTES.incidents)
            ? [
                {
                  label: 'Incidents',
                  value: String(d.stats.activeIncidents),
                  href: CONTROL_ROOM_ROUTES.incidents,
                  warn: d.stats.criticalIncidents > 0,
                },
              ]
            : []),
          ...(canAccess(officerHref())
            ? [
                {
                  label: 'Available',
                  value: String(d.stats.availableOfficers),
                  href: officerHref(),
                },
              ]
            : []),
          ...(canAccess(CONTROL_ROOM_ROUTES.map)
            ? [
                {
                  label: 'Users',
                  value: d.stats.activeUsers.toLocaleString(),
                  href: mapHref('users'),
                },
              ]
            : []),
        ]}
      />

      <div className="dashboard-grid">
        {canAccess(CONTROL_ROOM_ROUTES.officers) && (
          <section className="panel">
            <div className="panel-header">
              <Link href={CONTROL_ROOM_ROUTES.officers} className="card-title-link">
                <h2>Officer status</h2>
              </Link>
              <Link href={CONTROL_ROOM_ROUTES.officers} className="link-sm">
                Manage
              </Link>
            </div>
            <ul className="officer-list officer-list--managed">
              {d.officers.slice(0, 8).map((o) => (
                <li key={o.id} className="officer-row officer-row--managed">
                  <div className="officer-row-body">
                    <OfficerStatusDot status={o.status} />
                    <div>
                      <div className="officer-name">{o.name}</div>
                      <div className="officer-meta">
                        {officerStatusLabel(o.status)} · {o.zone}
                      </div>
                    </div>
                  </div>
                  {role !== 'SALES' && (
                    <OfficerStatusControl
                      officerId={o.id}
                      status={o.status}
                      variant="select"
                      onUpdated={reload}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>System status</h2>
          </div>
          <div className="status-row">
            <span className={`status-pill ${d.system.api === 'up' ? 'status-pill--ok' : ''}`}>API</span>
            <span className={`status-pill ${d.system.database === 'up' ? 'status-pill--ok' : ''}`}>
              Database
            </span>
            <span className={`status-pill ${d.system.websocket === 'up' ? 'status-pill--ok' : ''}`}>
              WebSocket
            </span>
            <span className={`status-pill ${d.system.push === 'up' ? 'status-pill--ok' : ''}`}>
              Push
            </span>
            <span
              className={`status-pill ${d.system.maps === 'pending' ? 'status-pill--pending' : 'status-pill--ok'}`}
            >
              Maps
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  trend,
  highlight,
  positive,
}: {
  href: string;
  label: string;
  value: string;
  trend: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`stat-card stat-card--link ${highlight ? 'stat-card--highlight' : ''}`}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-trend ${positive ? 'stat-trend--positive' : ''}`}>{trend}</div>
    </Link>
  );
}

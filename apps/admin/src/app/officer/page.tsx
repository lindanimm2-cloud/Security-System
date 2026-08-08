'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { OfficerActiveAssignment } from '@/components/officer/OfficerActiveAssignment';
import { OfficerStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { DispatchStatusBadge } from '@/components/officer/StatusBadges';
import { officerQueueRowClass } from '@/lib/officer-task-theme';
import { officerApi, type ApiResponse } from '@/lib/api-client';

type Dashboard = {
  officer: {
    firstName: string;
    lastName: string;
    status: string;
    zone: string | null;
    avgResponseSec: number;
  };
  stats: {
    activeAssignments: number;
    completedToday: number;
    avgResponseFormatted: string;
  };
  activeDispatch: DispatchItem | null;
  queue: DispatchItem[];
};

type DispatchItem = {
  id: string;
  status: string;
  incident: {
    id: string;
    type: string;
    priority: string;
    address: string | null;
    client: string;
    phone: string | null;
    lat: number;
    lng: number;
  };
};

export default function OfficerDashboardPage() {
  return (
    <OfficerLayout title="Field Dashboard">
      <DashboardContent />
    </OfficerLayout>
  );
}

function DashboardContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<Dashboard>>('/officer/dashboard'),
    [],
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  async function runAction(key: string, fn: () => Promise<unknown>) {
    setActionLoading(key);
    setMsg('');
    try {
      await fn();
      setMsg('Status updated.');
      reload();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading dashboard..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const d = data!.data;
  const active = d.activeDispatch;
  const waiting = d.queue.filter((q) => !active || q.id !== active.id);

  return (
    <div className="dash-ops dash-ops--officer">
      {/* Priority 1: active assignment / empty queue CTA */}
      {active ? (
        <OfficerActiveAssignment
          dispatch={active}
          actionLoading={actionLoading}
          onAction={runAction}
        />
      ) : (
        <section className="officer-standby portal-card">
          <p className="dash-ops__eyebrow">
            <span className="ops-live-chip__dot" aria-hidden />
            Standby · refresh 20s
          </p>
          <h2>No active assignment</h2>
          <p className="text-muted">
            You are available. Pull the next job from the incident queue when
            dispatch assigns you.
          </p>
          <div className="officer-standby__actions">
            <Link href="/officer/queue" className="btn-primary">
              Open incident queue
            </Link>
            <Link href="/officer/map" className="btn-secondary">
              Navigation map
            </Link>
          </div>
        </section>
      )}

      {msg && <div className="alert alert--success">{msg}</div>}

      {/* Priority 2: rest of queue */}
      {waiting.length > 0 && (
        <section className="portal-card">
          <div className="card-header-row">
            <h2>Your queue</h2>
            <Link href="/officer/queue" className="link-sm">
              View all
            </Link>
          </div>
          <ul className="status-list">
            {waiting.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className={`status-list-item ${officerQueueRowClass(item.status, item.incident.type)}`}
              >
                <Link href="/officer/queue" className="status-list-link">
                  <span>
                    {item.incident.type} — {item.incident.client}
                  </span>
                  {item.incident.address && (
                    <span className="text-muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                      {item.incident.address}
                    </span>
                  )}
                </Link>
                <DispatchStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="officer-hero portal-card officer-hero--compact">
        <div>
          <h2>
            {d.officer.firstName} {d.officer.lastName}
          </h2>
          <p className="text-muted">{d.officer.zone ?? 'Unassigned zone'}</p>
        </div>
        <OfficerStatusBadge status={d.officer.status} linkToProfile />
      </div>

      <div className="stats-grid">
        <StatCard
          label="Active jobs"
          value={String(d.stats.activeAssignments)}
          href="/officer/queue"
          highlight={d.stats.activeAssignments > 0}
        />
        <StatCard
          label="Completed today"
          value={String(d.stats.completedToday)}
          href="/officer/profile"
        />
        <StatCard label="Avg response" value={d.stats.avgResponseFormatted} />
      </div>

      <div className="action-grid officer-quick-grid">
        <Link href="/officer/queue" className="action-tile">
          <span className="action-icon">📋</span>
          <span className="action-label">Incident queue</span>
        </Link>
        <Link href="/officer/map" className="action-tile">
          <span className="action-icon">🗺️</span>
          <span className="action-label">Navigation</span>
        </Link>
        <Link href="/officer/record?quick=1" className="action-tile action-tile--record">
          <span className="action-icon">🔴</span>
          <span className="action-label">Quick record</span>
        </Link>
        <Link href="/officer/report" className="action-tile">
          <span className="action-icon">📝</span>
          <span className="action-label">Incident report</span>
        </Link>
        <Link href="/officer/messages" className="action-tile">
          <span className="action-icon">💬</span>
          <span className="action-label">Dispatch chat</span>
        </Link>
        <Link href="/officer/calls" className="action-tile">
          <span className="action-icon">📞</span>
          <span className="action-label">Calls</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}) {
  const className = `stat-card ${highlight ? 'stat-card--highlight' : ''} ${href ? 'stat-card--link' : ''}`;
  const content = (
    <>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

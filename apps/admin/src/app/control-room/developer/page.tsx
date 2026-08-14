'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { InternalChat } from '@/components/InternalChat';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';

type Desk = {
  tenantName: string;
  canViewRevenue: boolean;
  revenueNote: string;
  openErrorReports: number;
  recentReports: {
    id: string;
    message: string;
    path: string | null;
    status: string;
    createdAt: string;
    reporter: string;
  }[];
  platformLinks?: { label: string; href: string }[];
};

type ReportList = {
  openCount: number;
  reports: {
    id: string;
    message: string;
    path: string | null;
    context: string | null;
    status: string;
    createdAt: string;
    reporter: { id: string; name: string; role: string; email: string };
  }[];
};

function formatContext(raw: string | null): string {
  if (!raw) return 'No technical context attached.';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function DeveloperDeskPage() {
  return (
    <ControlRoomLayout title="Developer desk">
      <DeveloperDeskContent />
    </ControlRoomLayout>
  );
}

function DeveloperDeskContent() {
  const session = getSession('admin');
  const isDev = session?.user.role === 'DEVELOPER';
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const desk = useApi(
    () =>
      isDev
        ? adminApi.get<ApiResponse<Desk>>('/developer/desk')
        : Promise.resolve({
            success: true as const,
            data: {
              tenantName: '',
              canViewRevenue: false,
              revenueNote: '',
              openErrorReports: 0,
              recentReports: [],
            },
          }),
    [isDev],
  );

  const reports = useApi(
    () => adminApi.get<ApiResponse<ReportList>>('/developer/error-reports'),
    [],
  );

  async function setStatus(id: string, status: 'ACKNOWLEDGED' | 'RESOLVED' | 'OPEN') {
    setBusy(id);
    setActionError('');
    try {
      await adminApi.patch(`/developer/error-reports/${id}`, { status });
      reports.reload();
      desk.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  if (desk.loading || reports.loading) {
    return <LoadingSpinner label="Loading developer desk…" fullScreen />;
  }

  if (!session || !['DEVELOPER', 'OWNER', 'SUPER_ADMIN'].includes(session.user.role)) {
    return (
      <div className="empty-state">
        Developer desk is for the developer profile (owner can also view reports).
      </div>
    );
  }

  const list = reports.data?.data;
  const deskData = desk.data?.data;
  const ackCount =
    list?.reports.filter((r) => r.status === 'ACKNOWLEDGED').length ?? 0;
  const resolvedCount =
    list?.reports.filter((r) => r.status === 'RESOLVED').length ?? 0;
  const platformLinks = deskData?.platformLinks ?? [
    { label: 'Control room', href: '/control-room' },
    { label: 'Live map', href: '/control-room/map' },
    { label: 'Customers', href: '/control-room/customers' },
    { label: 'Fleet', href: '/control-room/fleet' },
    { label: 'Client portal', href: '/portal' },
    { label: 'Settings', href: '/control-room/settings' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Developer desk</h1>
          <p className="text-muted">
            Error reports from clients, ops, and field teams — manage platform health from here.
            {isDev && deskData ? ` · ${deskData.revenueNote}` : ''}
          </p>
        </div>
        {list && (
          <span className="status-pill status-pill--new">{list.openCount} open</span>
        )}
      </div>

      {(desk.error || reports.error || actionError) && (
        <ErrorAlert error={desk.error ?? reports.error ?? actionError} onRetry={reports.reload} />
      )}

      <div className="dev-desk-stats">
        <div className="dev-desk-stat">
          <strong>{list?.openCount ?? 0}</strong>
          <span>Open</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{ackCount}</strong>
          <span>Acknowledged</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{resolvedCount}</strong>
          <span>Resolved</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{list?.reports.length ?? 0}</strong>
          <span>Total</span>
        </div>
      </div>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Platform health</h2>
          <span className="text-muted">Quick links to verify features</span>
        </div>
        <div className="dev-desk-links">
          {platformLinks.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="portal-card" style={{ marginTop: '1rem' }}>
        <div className="card-header-row">
          <h2>Error reports</h2>
          <span className="text-muted">Stack traces visible here only — not shown to users</span>
        </div>
        {!list?.reports.length ? (
          <p className="text-muted">
            No reports yet. Users can tap “Send details to developer” on any error page.
          </p>
        ) : (
          <ul className="status-list">
            {list.reports.map((r) => (
              <li key={r.id} className="status-list-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '14rem' }}>
                  <strong>{r.message}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {r.reporter.name} · {r.reporter.role}
                    {r.path ? ` · ${r.path}` : ''}
                    {' · '}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.context ? (
                    <details className="dev-report-context">
                      <summary>Technical details</summary>
                      <pre>{formatContext(r.context)}</pre>
                    </details>
                  ) : null}
                </div>
                <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
                <div className="entity-card-actions">
                  {r.status === 'OPEN' && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={busy === r.id}
                      onClick={() => void setStatus(r.id, 'ACKNOWLEDGED')}
                    >
                      Ack
                    </button>
                  )}
                  {r.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={busy === r.id}
                      onClick={() => void setStatus(r.id, 'RESOLVED')}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isDev && deskData?.recentReports.length ? (
        <section className="portal-card" style={{ marginTop: '1rem' }}>
          <div className="card-header-row">
            <h2>Recent activity</h2>
          </div>
          <ul className="status-list">
            {deskData.recentReports.map((r) => (
              <li key={r.id} className="status-list-item">
                <div>
                  <strong>{r.message}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {r.reporter}
                    {r.path ? ` · ${r.path}` : ''}
                    {' · '}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="portal-card" style={{ marginTop: '1rem' }}>
        <div className="card-header-row">
          <h2>Developer support chat</h2>
          <span className="text-muted">Owner · control room · store · techs</span>
        </div>
        <InternalChat portal="admin" channel="dev-support" />
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { InternalChat } from '@/components/InternalChat';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import {
  DEMO_DEV_TICKET_EVENT,
  DEMO_ERROR_REPORTS_KEY,
  developerTicketCode,
} from '@/lib/developer-tickets';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';

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
    ticketCode?: string;
  }[];
  platformLinks?: { label: string; href: string }[];
};

type Report = {
  id: string;
  message: string;
  path: string | null;
  context: string | null;
  status: string;
  createdAt: string;
  ticketCode?: string;
  reporter: { id: string; name: string; role: string; email: string };
};

type ReportList = {
  openCount: number;
  reports: Report[];
};

type TicketFilter = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ALL';

function formatContext(raw: string | null): string {
  if (!raw) return 'No technical context attached.';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ticketQueryId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ticket');
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
  const [filter, setFilter] = useState<TicketFilter>('OPEN');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    const id = ticketQueryId();
    setFocusId(id);
    if (id) setFilter('ALL');
  }, []);

  useEffect(() => {
    const refresh = () => {
      void reports.reload({ silent: true });
      void desk.reload({ silent: true });
    };
    const onTicket = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_ERROR_REPORTS_KEY) refresh();
    };
    window.addEventListener(DEMO_DEV_TICKET_EVENT, onTicket);
    window.addEventListener('storage', onStorage);
    const poll = shouldBackgroundPoll() ? window.setInterval(refresh, 4000) : null;
    return () => {
      window.removeEventListener(DEMO_DEV_TICKET_EVENT, onTicket);
      window.removeEventListener('storage', onStorage);
      if (poll) window.clearInterval(poll);
    };
  }, [reports.reload, desk.reload]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`dev-ticket-${focusId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId, reports.data]);

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

  const list = reports.data?.data;
  const deskData = desk.data?.data;
  const allReports = list?.reports ?? [];
  const statusFiltered = useMemo(
    () => allReports.filter((r) => (filter === 'ALL' ? true : r.status === filter)),
    [allReports, filter],
  );
  const filtered = useMemo(
    () =>
      statusFiltered.filter((r) =>
        matchesSearch(
          search,
          r.message,
          r.path,
          r.status,
          r.reporter.name,
          r.reporter.email,
          r.id,
          r.ticketCode,
          developerTicketCode(r.id),
        ),
      ),
    [statusFiltered, search],
  );

  if (desk.loading || reports.loading) {
    return <LoadingSpinner label="Loading developer desk…" fullScreen />;
  }

  if (!session || session.user.role !== 'DEVELOPER') {
    return (
      <div className="empty-state portal-card">
        Developer desk is only available on the developer sign-in.
      </div>
    );
  }

  const ackCount = allReports.filter((r) => r.status === 'ACKNOWLEDGED').length;
  const resolvedCount = allReports.filter((r) => r.status === 'RESOLVED').length;
  const openCount = list?.openCount ?? allReports.filter((r) => r.status === 'OPEN').length;
  const platformLinks = deskData?.platformLinks ?? [
    { label: 'Ops Board', href: '/control-room' },
    { label: 'Live map', href: '/control-room/map' },
    { label: 'CCTV', href: '/control-room/surveillance' },
    { label: 'Vehicles', href: '/control-room/fleet' },
    { label: 'Incidents', href: '/control-room/incidents' },
    { label: 'Device security', href: '/control-room/device-security' },
    { label: 'Dispatch', href: '/control-room/dispatch' },
    { label: 'Customers', href: '/control-room/customers' },
    { label: 'Gear store', href: '/control-room/store' },
    { label: 'Internal chat', href: '/control-room/chat' },
    { label: 'Client portal', href: '/portal' },
    { label: 'Settings', href: '/control-room/my-settings' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            Incoming issues become tickets here as soon as someone sends details from an error page.
            {isDev && deskData ? ` · ${deskData.revenueNote}` : ''}
          </p>
        </div>
        {list && (
          <span className="status-pill status-pill--new">{openCount} open tickets</span>
        )}
      </div>

      {(desk.error || reports.error || actionError) && (
        <ErrorAlert error={desk.error ?? reports.error ?? actionError} onRetry={reports.reload} />
      )}

      <div className="dev-desk-stats">
        <div className="dev-desk-stat">
          <strong>{openCount}</strong>
          <span>Open</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{ackCount}</strong>
          <span>In progress</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{resolvedCount}</strong>
          <span>Resolved</span>
        </div>
        <div className="dev-desk-stat">
          <strong>{allReports.length}</strong>
          <span>Total tickets</span>
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
          <h2>Issue tickets</h2>
          <span className="text-muted">Live queue · stack traces stay on this desk</span>
        </div>
        <div className="dev-ticket-filters">
          {(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'] as TicketFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`dev-ticket-filter ${filter === key ? 'dev-ticket-filter--on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {key === 'ACKNOWLEDGED' ? 'In progress' : key === 'ALL' ? 'All' : key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search tickets, path, reporter…"
            resultCount={filtered.length}
            totalCount={statusFiltered.length}
            id="dev-ticket-search"
          />
        </div>
        {!filtered.length ? (
          <p className="text-muted">
            {search.trim()
              ? 'No tickets match this search.'
              : filter === 'OPEN'
                ? 'No open tickets. New issues appear here the moment someone taps “Send details to developer”.'
                : 'No tickets in this view.'}
          </p>
        ) : (
          <div className="dev-ticket-list">
            {filtered.map((r) => (
              <IssueTicketCard
                key={r.id}
                report={r}
                busy={busy === r.id}
                focused={focusId === r.id}
                onStatus={(status) => void setStatus(r.id, status)}
              />
            ))}
          </div>
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
                  <strong>{r.ticketCode ?? developerTicketCode(r.id)}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {r.message} · {r.reporter}
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
        <InternalChat portal="admin" channel="dev-support" embedded />
      </section>
    </div>
  );
}

function IssueTicketCard({
  report,
  busy,
  focused,
  onStatus,
}: {
  report: Report;
  busy: boolean;
  focused: boolean;
  onStatus: (status: 'ACKNOWLEDGED' | 'RESOLVED' | 'OPEN') => void;
}) {
  const code = report.ticketCode ?? developerTicketCode(report.id);
  const statusClass = report.status.toLowerCase();

  return (
    <article
      id={`dev-ticket-${report.id}`}
      className={`dev-ticket ${focused ? 'dev-ticket--focus' : ''} ${
        report.status === 'OPEN' ? 'dev-ticket--open' : ''
      }`}
    >
      <div className="dev-ticket__top">
        <span className="dev-ticket__code">{code}</span>
        <span className={`status-pill status-pill--${statusClass}`}>
          {report.status.replace(/_/g, ' ')}
        </span>
      </div>
      <h3 className="dev-ticket__title">{report.message}</h3>
      <p className="dev-ticket__meta">
        {report.reporter.name} · {report.reporter.role}
        {report.path ? ` · ${report.path}` : ''}
        {' · '}
        {new Date(report.createdAt).toLocaleString()}
      </p>
      {report.context ? (
        <details className="dev-report-context">
          <summary>Technical details</summary>
          <pre>{formatContext(report.context)}</pre>
        </details>
      ) : null}
      <div className="queue-card__actions">
        {report.status === 'OPEN' && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => onStatus('ACKNOWLEDGED')}
          >
            Take ticket
          </button>
        )}
        {report.status === 'ACKNOWLEDGED' && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => onStatus('OPEN')}
          >
            Reopen
          </button>
        )}
        {report.status !== 'RESOLVED' && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busy}
            onClick={() => onStatus('RESOLVED')}
          >
            Resolve
          </button>
        )}
        {report.status === 'RESOLVED' && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => onStatus('OPEN')}
          >
            Reopen
          </button>
        )}
      </div>
    </article>
  );
}

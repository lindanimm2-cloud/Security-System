'use client';

import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { DeveloperErrorAnalytics, DeveloperProfileCard } from '@/components/developer/DeveloperAnalytics';
import { DeveloperCommandHeader, DeveloperQuickDock } from '@/components/developer/DeveloperCommandHeader';
import { DeveloperDeploymentPanel, DeveloperPlatformHealth } from '@/components/developer/DeveloperOpsPanels';
import { DeveloperTicketCard } from '@/components/developer/DeveloperTicketCard';
import { ErrorAlert } from '@/components/ErrorAlert';
import { InternalChat } from '@/components/InternalChat';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearch } from '@/components/ui/ListSearch';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import {
  appendAudit,
  buildTicketContext,
  computeAnalytics,
  DEFAULT_PLATFORM_HEALTH,
  DEFAULT_PRODUCTION,
  detectDuplicateGroups,
  enrichTicket,
  parseTicketContext,
  type DevCommandDesk,
  type DevTicket,
  type DevWorkflowStatus,
  workflowToLegacy,
} from '@/lib/developer-desk';
import {
  DEMO_DEV_TICKET_EVENT,
  DEMO_ERROR_REPORTS_KEY,
  developerTicketCode,
} from '@/lib/developer-tickets';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { matchesSearch } from '@/lib/list-search';

type Report = {
  id: string;
  message: string;
  path: string | null;
  context: string | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  ticketCode?: string;
  reporter: { id: string; name: string; role: string; email: string };
};

type ReportList = { openCount: number; reports: Report[] };

type TicketFilter = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL';

function ticketQueryId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ticket');
}

export default function DeveloperDeskPage() {
  return (
    <ControlRoomLayout title="Developer command centre">
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
        ? adminApi.get<ApiResponse<DevCommandDesk>>('/developer/desk')
        : Promise.resolve({ success: true as const, data: null }),
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

  const tickets = useMemo(
    () => (reports.data?.data?.reports ?? []).map((r) => enrichTicket(r)),
    [reports.data],
  );

  const duplicateGroups = useMemo(() => detectDuplicateGroups(tickets), [tickets]);
  const dupCountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of duplicateGroups) {
      for (const id of g.ticketIds) map.set(id, g.count);
    }
    return map;
  }, [duplicateGroups]);

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'ACKNOWLEDGED').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const criticalCount = tickets.filter(
    (t) => (t.severity === 'P0' || t.severity === 'P1') && t.status !== 'RESOLVED',
  ).length;

  const statusFiltered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter === 'ALL') return true;
      if (filter === 'OPEN') return t.status === 'OPEN';
      if (filter === 'IN_PROGRESS') return t.status === 'ACKNOWLEDGED';
      return t.status === 'RESOLVED';
    });
  }, [tickets, filter]);

  const filtered = useMemo(
    () =>
      statusFiltered.filter((t) =>
        matchesSearch(
          search,
          t.message,
          t.path,
          t.status,
          t.workflowStatus,
          t.severity,
          t.reporter.name,
          t.reporter.email,
          t.ticketCode,
          developerTicketCode(t.id),
        ),
      ),
    [statusFiltered, search],
  );

  async function patchTicket(
    ticket: DevTicket,
    patch: {
      workflowStatus?: DevWorkflowStatus;
      reproduction?: { reproducible: boolean };
      mergeDuplicates?: boolean;
    },
  ) {
    setBusy(ticket.id);
    setActionError('');
    try {
      let meta = parseTicketContext(ticket.context);
      if (patch.workflowStatus) {
        meta = appendAudit(
          { ...meta, workflowStatus: patch.workflowStatus },
          `Status → ${patch.workflowStatus}`,
          session?.user.firstName,
        );
      }
      if (patch.reproduction) {
        meta = {
          ...meta,
          reproduction: {
            ...meta.reproduction,
            reproducible: patch.reproduction.reproducible,
            notes: patch.reproduction.reproducible
              ? 'Issue confirmed reproducible'
              : 'Unable to reproduce in dev environment',
          },
        };
        meta = appendAudit(
          meta,
          patch.reproduction.reproducible ? 'Marked reproducible' : 'Unable to reproduce',
          session?.user.firstName,
        );
      }
      const workflowStatus = patch.workflowStatus ?? meta.workflowStatus ?? ticket.workflowStatus;
      const status = workflowToLegacy(workflowStatus);
      await adminApi.patch(`/developer/error-reports/${ticket.id}`, {
        status,
        workflowStatus,
        context: buildTicketContext(meta),
        mergeDuplicates: patch.mergeDuplicates,
      });
      reports.reload();
      desk.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  if (desk.loading || reports.loading) {
    return <LoadingSpinner label="Loading developer command centre…" fullScreen />;
  }

  if (!session || session.user.role !== 'DEVELOPER') {
    return (
      <div className="empty-state portal-card">
        Developer command centre is only available on the developer sign-in.
      </div>
    );
  }

  const deskData: DevCommandDesk = desk.data?.data ?? {
    tenantName: '4DS Security',
    canViewRevenue: false,
    revenueNote: '',
    openErrorReports: openCount,
    systemStatus: criticalCount > 0 ? 'incident' : openCount > 0 ? 'degraded' : 'operational',
    systemMessage:
      criticalCount > 0
        ? 'Critical issues require immediate attention'
        : 'Production monitoring active',
    production: DEFAULT_PRODUCTION,
    recentDeployments: [
      DEFAULT_PRODUCTION,
      { ...DEFAULT_PRODUCTION, version: '2.4.17', build: '8410', environment: 'production' },
    ],
    platformHealth: DEFAULT_PLATFORM_HEALTH,
    analytics: computeAnalytics(tickets),
    duplicateGroups,
    recentReports: [],
    developers: [],
    developerAccess: {
      production: true,
      staging: true,
      database: false,
      serverLogs: true,
      deployments: true,
      monitoring: true,
    },
  };

  const devUser = deskData.developers[0];

  return (
    <div className="page-content dev-cmd">
      {(desk.error || reports.error || actionError) && (
        <ErrorAlert error={desk.error ?? reports.error ?? actionError} onRetry={reports.reload} />
      )}

      <DeveloperCommandHeader
        desk={deskData}
        openCount={openCount}
        criticalCount={criticalCount}
        inProgressCount={inProgressCount}
        resolvedCount={resolvedCount}
      />

      <div className="dev-cmd-layout">
        <div className="dev-cmd-layout__main">
          <DeveloperQuickDock />

          {duplicateGroups.length > 0 ? (
            <section className="dev-cmd-merge-banner">
              <strong>Similar incidents detected</strong>
              <p className="text-muted">
                {duplicateGroups.length} error pattern{duplicateGroups.length === 1 ? '' : 's'} with multiple
                reports. Review and merge to avoid duplicate work.
              </p>
              <div className="dev-cmd-merge-banner__chips">
                {duplicateGroups.slice(0, 3).map((g) => (
                  <span key={g.fingerprint} className="status-pill status-pill--warn">
                    {g.count} reports · {developerTicketCode(g.ticketIds[0])}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section id="dev-tickets" className="dev-cmd-panel">
            <div className="dev-cmd-panel__head">
              <h2>Developer incidents</h2>
              <span className="text-muted">Full lifecycle · safe diagnostic snapshots</span>
            </div>
            <div className="dev-ticket-filters">
              {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'] as TicketFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`dev-ticket-filter ${filter === key ? 'dev-ticket-filter--on' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {key === 'IN_PROGRESS' ? 'In progress' : key === 'ALL' ? 'All' : key.charAt(0) + key.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="list-search-bar">
              <ListSearch
                value={search}
                onChange={setSearch}
                placeholder="Search tickets, error code, path, reporter…"
                resultCount={filtered.length}
                totalCount={statusFiltered.length}
                id="dev-ticket-search"
              />
            </div>
            {!filtered.length ? (
              <p className="text-muted">
                {search.trim()
                  ? 'No tickets match this search.'
                  : 'No open tickets. New issues appear when someone taps “Send details to developer”.'}
              </p>
            ) : (
              <div className="dev-incident-list">
                {filtered.map((t) => (
                  <DeveloperTicketCard
                    key={t.id}
                    ticket={t}
                    busy={busy === t.id}
                    focused={focusId === t.id}
                    duplicateCount={dupCountById.get(t.id)}
                    onWorkflow={(status) => void patchTicket(t, { workflowStatus: status })}
                    onReproducible={(reproducible) =>
                      void patchTicket(t, { reproduction: { reproducible } })
                    }
                    onMerge={
                      (dupCountById.get(t.id) ?? 0) > 1
                        ? () => void patchTicket(t, { workflowStatus: 'DUPLICATE', mergeDuplicates: true })
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section id="dev-chat" className="dev-cmd-panel">
            <div className="dev-cmd-panel__head">
              <h2>Developer support chat</h2>
              <span className="text-muted">Owner · control room · techs</span>
            </div>
            <InternalChat portal="admin" channel="dev-support" embedded />
          </section>
        </div>

        <aside className="dev-cmd-layout__side">
          <DeveloperPlatformHealth services={deskData.platformHealth} />
          <DeveloperDeploymentPanel
            production={deskData.production}
            recent={deskData.recentDeployments}
          />
          <DeveloperErrorAnalytics analytics={deskData.analytics ?? computeAnalytics(tickets)} />
          <DeveloperProfileCard
            name={devUser ? `${devUser.firstName} ${devUser.lastName}` : session.user.firstName}
            email={devUser?.email ?? session.user.email}
            access={deskData.developerAccess}
          />
        </aside>
      </div>
    </div>
  );
}

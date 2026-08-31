'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { OfficerActiveAssignment } from '@/components/officer/OfficerActiveAssignment';
import { OfficerStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { DispatchStatusBadge } from '@/components/officer/StatusBadges';
import {
  officerQueueRowClass,
  officerTaskButtonClass,
  primaryTaskAction,
} from '@/lib/officer-task-theme';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import {
  OpsCompactStats,
  OpsNeedsYou,
  OpsQuickWork,
  OpsSection,
} from '@/components/ops/OpsQuickWork';
import { OpsSwipeRow } from '@/components/ops/OpsSwipeRow';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import { EmergencyModeBanner, HoldToActivate } from '@/components/ops/EmergencyMode';

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

function nextDispatchAction(status: string): {
  key: string;
  label: string;
  path: string;
} | null {
  if (status === 'ASSIGNED') {
    return { key: 'accept', label: 'Accept', path: 'accept' };
  }
  if (status === 'ACCEPTED') {
    return { key: 'enroute', label: 'En route', path: 'en-route' };
  }
  if (status === 'EN_ROUTE') {
    return { key: 'scene', label: 'Arrived', path: 'on-scene' };
  }
  if (status === 'ON_SCENE') {
    return { key: 'complete', label: 'Complete', path: 'complete' };
  }
  return null;
}

export default function OfficerDashboardPage() {
  return (
    <OfficerLayout title="Field Home">
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
  const [filter, setFilter] = useState('all');
  const [sosBusy, setSosBusy] = useState(false);
  const [sosMsg, setSosMsg] = useState('');
  const [checkInMsg, setCheckInMsg] = useState('');
  const [localActive, setLocalActive] = useState<DispatchItem | null | undefined>(
    undefined,
  );
  const [localQueue, setLocalQueue] = useState<DispatchItem[] | null>(null);
  const undo = useUndoToast();

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!data?.data) return;
    setLocalActive(data.data.activeDispatch);
    setLocalQueue(data.data.queue);
  }, [data]);

  const d = data?.data;
  const active = localActive === undefined ? d?.activeDispatch ?? null : localActive;
  const queue = localQueue ?? d?.queue ?? [];
  const waiting = queue.filter((q) => !active || q.id !== active.id);

  const urgentCount = useMemo(
    () =>
      [active, ...waiting].filter(
        (i) =>
          i &&
          ['CRITICAL', 'HIGH'].includes(i.incident.priority.toUpperCase()),
      ).length,
    [active, waiting],
  );

  async function patchDispatch(
    item: DispatchItem,
    path: string,
    key: string,
    previousStatus: string,
  ) {
    setActionLoading(key);
    try {
      await officerApi.post(`/officer/dispatch/${item.id}/${path}`);
      const nextStatus =
        path === 'accept'
          ? 'ACCEPTED'
          : path === 'en-route'
            ? 'EN_ROUTE'
            : path === 'on-scene'
              ? 'ON_SCENE'
              : path === 'complete'
                ? 'COMPLETED'
                : item.status;

      if (path === 'complete') {
        setLocalActive(null);
        setLocalQueue((prev) => (prev ?? queue).filter((q) => q.id !== item.id));
        undo.show(
          'Assignment completed',
          async () => {
            await officerApi.post(`/officer/dispatch/${item.id}/undo`, {
              status: previousStatus,
            });
            void reload();
          },
          { kind: 'success', detail: 'Tap Undo to restore this assignment' },
        );
      } else {
        const updated = { ...item, status: nextStatus };
        setLocalActive(updated);
        setLocalQueue((prev) =>
          (prev ?? queue).map((q) => (q.id === item.id ? updated : q)),
        );
        undo.show(
          `Marked ${nextStatus.replace(/_/g, ' ').toLowerCase()}`,
          async () => {
            await officerApi.post(`/officer/dispatch/${item.id}/undo`, {
              status: previousStatus,
            });
            void reload();
          },
          { kind: 'info', detail: 'Status updated · tap Undo to reverse' },
        );
      }
      void reload({ silent: true });
    } finally {
      setActionLoading(null);
    }
  }

  async function runAction(key: string, fn: () => Promise<unknown>) {
    setActionLoading(key);
    try {
      await fn();
      void reload();
    } finally {
      setActionLoading(null);
    }
  }

  async function sendSos() {
    setSosBusy(true);
    setSosMsg('');
    try {
      await officerApi.post('/officer/sos', {
        source: 'hold',
        incidentId: active?.incident.id ?? null,
      });
      setSosMsg('SOS sent to control room and supervisor.');
      void reload({ silent: true });
    } catch {
      setSosMsg('SOS queued for control room (demo).');
    } finally {
      setSosBusy(false);
    }
  }

  async function checkIn(kind: string) {
    setCheckInMsg('');
    try {
      await officerApi.post('/officer/check-in', { kind, incidentId: active?.incident.id });
      setCheckInMsg(`${kind} check-in logged.`);
    } catch {
      setCheckInMsg(`${kind} check-in logged (demo).`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading dashboard..." fullScreen />;
  if (error || !d) return <ErrorAlert error={error} onRetry={reload} />;

  const primary = active ? nextDispatchAction(active.status) : null;
  const showQueue = filter === 'all' || filter === 'queue';
  const showUrgentOnly = filter === 'urgent';

  const filteredWaiting = showUrgentOnly
    ? waiting.filter((w) =>
        ['CRITICAL', 'HIGH'].includes(w.incident.priority.toUpperCase()),
      )
    : waiting;

  const needsItems = [
    ...(urgentCount > 0
      ? [
          {
            id: 'urgent',
            title: `${urgentCount} high-priority`,
            detail: 'Incidents needing fast response',
            href: '/officer/queue',
          },
        ]
      : []),
    {
      id: 'messages',
      title: 'Dispatch chat',
      detail: 'Check for control-room messages',
      href: '/officer/messages',
    },
  ];

  const checkIns = [
    { kind: 'Safe', label: "I'm safe" },
    { kind: 'Arrived', label: 'On site' },
    { kind: 'Leaving', label: 'Leaving scene' },
    { kind: 'Backup', label: 'Request backup' },
    { kind: 'Medical', label: 'Need medic' },
    { kind: 'Supervisor', label: 'Call supervisor' },
  ] as const;

  return (
    <div className="dash-ops dash-ops--officer">
      {(sosMsg || (active && ['CRITICAL', 'HIGH'].includes(active.incident.priority.toUpperCase()))) && (
        <EmergencyModeBanner
          title={sosMsg ? 'Officer SOS active' : `${active!.incident.type} — priority response`}
          detail={
            sosMsg ||
            `${active!.incident.client} · control room tracking your status`
          }
          statusLine={active?.incident.address ?? d.officer.zone ?? 'Field'}
          liveLabel="Live · field"
          primaryAction={
            active && primary ? (
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() =>
                  void patchDispatch(active, primary.path, primary.key, active.status)
                }
              >
                {primary.label}
              </button>
            ) : null
          }
          actions={
            <Link href="/officer/messages">Dispatch chat</Link>
          }
        />
      )}

      <OpsMyShiftHeader
        title={`${d.officer.firstName} · field home`}
        subtitle={
          active
            ? `Current job · ${active.incident.type}`
            : waiting.length
              ? `${waiting.length} in queue · standby`
              : 'No active assignment'
        }
        chips={[
          { id: 'all', label: 'Board', count: (active ? 1 : 0) + waiting.length },
          { id: 'urgent', label: 'Urgent', count: urgentCount, tone: 'urgent' },
          { id: 'queue', label: 'Jobs', count: waiting.length, tone: 'warn' },
          {
            id: 'messages',
            label: 'Messages',
            count: 0,
            tone: 'neutral',
          },
        ]}
        activeChip={filter}
        onChip={(id) => {
          if (id === 'messages') {
            window.location.href = '/officer/messages';
            return;
          }
          setFilter(id);
        }}
      />

      <div className="protect-tile protect-tile--panic" style={{ marginBottom: '0.75rem' }}>
        <HoldToActivate
          label="Officer SOS"
          holdLabel="Hold to alert CR + supervisor…"
          loading={sosBusy}
          onActivate={() => sendSos()}
        />
      </div>

      <div className="check-grid" aria-label="Quick check-ins">
        {checkIns.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="check-row"
            onClick={() => void checkIn(item.kind)}
          >
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      {checkInMsg || sosMsg ? (
        <p className="alert alert--success" role="status">
          {sosMsg || checkInMsg}
        </p>
      ) : null}

      {active && primary && (
        <OpsQuickWork
          hint={active.incident.client}
          actions={[
            {
              id: 'primary',
              label: primary.label,
              primary: true,
              loading: actionLoading === primary.key,
              disabled: !!actionLoading,
              onClick: () =>
                void patchDispatch(active, primary.path, primary.key, active.status),
            },
            {
              id: 'nav',
              label: 'Navigate',
              href: `https://www.google.com/maps/dir/?api=1&destination=${active.incident.lat},${active.incident.lng}`,
            },
            {
              id: 'accept',
              label: 'Accept',
              disabled: active.status !== 'ASSIGNED' || !!actionLoading,
              onClick: () =>
                void patchDispatch(active, 'accept', 'accept', active.status),
            },
            {
              id: 'arrived',
              label: 'Arrived',
              disabled: active.status !== 'EN_ROUTE' || !!actionLoading,
              onClick: () =>
                void patchDispatch(active, 'on-scene', 'scene', active.status),
            },
            {
              id: 'backup',
              label: 'Need backup',
              onClick: () => void checkIn('Backup'),
            },
          ]}
        />
      )}

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
          <h2>No active job</h2>
          <p className="text-muted">
            You are available. Pull the next job when dispatch assigns you.
          </p>
          <div className="officer-standby__actions">
            <Link href="/officer/queue" className="btn-primary">
              Open jobs
            </Link>
            <Link href="/officer/map" className="btn-secondary">
              Map
            </Link>
          </div>
        </section>
      )}

      {showQueue && filteredWaiting.length > 0 && (
        <OpsSection
          title="Your jobs"
          action={
            <Link href="/officer/queue" className="link-sm">
              View all
            </Link>
          }
        >
          <div className="ops-queue-list">
            {filteredWaiting.slice(0, 5).map((item) => {
              const next = nextDispatchAction(item.status);
              return (
                <OpsSwipeRow
                  key={item.id}
                  label={next?.label ?? 'Open'}
                  disabled={!!actionLoading || !next}
                  onSwipePrimary={() => {
                    if (!next) return;
                    void patchDispatch(item, next.path, `${item.id}-${next.key}`, item.status);
                  }}
                >
                  <div
                    className={`ops-queue-card ${officerQueueRowClass(item.status, item.incident.type)}`}
                  >
                    <div className="card-header-row">
                      <strong>
                        {item.incident.type} — {item.incident.client}
                      </strong>
                      <DispatchStatusBadge status={item.status} />
                    </div>
                    {item.incident.address && (
                      <span className="text-muted">{item.incident.address}</span>
                    )}
                    <div className="ops-queue-card__actions">
                      {next && (
                        <button
                          type="button"
                          className={`btn-sm ${officerTaskButtonClass(primaryTaskAction(item.status) ?? 'accept', item.status)}`}
                          disabled={!!actionLoading}
                          onClick={() =>
                            void patchDispatch(
                              item,
                              next.path,
                              `${item.id}-${next.key}`,
                              item.status,
                            )
                          }
                        >
                          {next.label}
                        </button>
                      )}
                      <Link
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.incident.lat},${item.incident.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sm btn-secondary"
                      >
                        Navigate
                      </Link>
                    </div>
                  </div>
                </OpsSwipeRow>
              );
            })}
          </div>
        </OpsSection>
      )}

      <OpsNeedsYou items={needsItems} viewAllHref="/officer/messages" />

      <div className="officer-hero portal-card officer-hero--compact">
        <div>
          <h2>
            {d.officer.firstName} {d.officer.lastName}
          </h2>
          <p className="text-muted">{d.officer.zone ?? 'Unassigned zone'}</p>
        </div>
        <OfficerStatusBadge status={d.officer.status} linkToProfile />
      </div>

      <OpsCompactStats
        items={[
          {
            label: 'Active',
            value: String(d.stats.activeAssignments),
            href: '/officer/queue',
            warn: d.stats.activeAssignments > 0,
          },
          {
            label: 'Done today',
            value: String(d.stats.completedToday),
            href: '/officer/profile',
          },
          { label: 'Avg', value: d.stats.avgResponseFormatted },
        ]}
      />

      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}

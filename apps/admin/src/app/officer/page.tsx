'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { OfficerActiveAssignment } from '@/components/officer/OfficerActiveAssignment';
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
import {
  OpsCompactStats,
  OpsNeedsYou,
  OpsQuickWork,
  OpsSection,
} from '@/components/ops/OpsQuickWork';
import { OpsSwipeRow } from '@/components/ops/OpsSwipeRow';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import { EmergencyModeBanner, HoldToActivate, OpsPanicIcon } from '@/components/ops/EmergencyMode';
import { officerStatusLabel } from '@/lib/officer-status';
import { triggerEmergencyVibration } from '@/lib/emergency-vibration';
import { showClientEmergencyNotification } from '@/lib/client-push';
import { CrossDeviceIncidentCard } from '@/components/platform/CrossDeviceIncidentCard';

type Dashboard = {
  officer: {
    firstName: string;
    lastName: string;
    status: string;
    zone: string | null;
    avgResponseSec: number;
    dutyModeActive?: boolean;
    deviceLink?: string;
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
    <OfficerLayout title="Field Operations">
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
  const [filter, setFilter] = useState('queue');
  const [sosBusy, setSosBusy] = useState(false);
  const [sosMsg, setSosMsg] = useState('');
  const [checkInMsg, setCheckInMsg] = useState('');
  const [localActive, setLocalActive] = useState<DispatchItem | null | undefined>(
    undefined,
  );
  const [localQueue, setLocalQueue] = useState<DispatchItem[] | null>(null);
  const undo = useUndoToast();
  const knownDispatchIds = useRef(new Set<string>());
  const dispatchSeeded = useRef(false);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!data?.data) return;
    setLocalActive(data.data.activeDispatch);
    setLocalQueue(data.data.queue);

    const incoming = [
      ...(data.data.activeDispatch ? [data.data.activeDispatch] : []),
      ...data.data.queue,
    ];
    if (!dispatchSeeded.current) {
      for (const item of incoming) knownDispatchIds.current.add(item.id);
      dispatchSeeded.current = true;
      return;
    }

    for (const item of incoming) {
      if (knownDispatchIds.current.has(item.id)) continue;
      knownDispatchIds.current.add(item.id);
      triggerEmergencyVibration('officer');
      void showClientEmergencyNotification({
        title: 'NEW P1 RESPONSE',
        body: `${item.incident.type} · ${item.incident.address ?? item.incident.client} — Accept → En route`,
        tag: `officer-dispatch-${item.id}`,
        deepLink: '/officer/queue',
        urgency: 'critical',
        kind: 'officer',
      });
    }
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
      setSosMsg('SOS sent to the control room and your supervisor.');
      triggerEmergencyVibration('panic');
      void reload({ silent: true });
    } catch {
      setSosMsg('SOS queued for the control room (demo).');
      triggerEmergencyVibration('panic');
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

  if (loading) return <LoadingSpinner label="Loading dashboard…" fullScreen />;
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
            detail: 'Incidents that need a fast response',
            href: '/officer/queue',
          },
        ]
      : []),
    {
      id: 'patrol',
      title: 'Patrol site photos',
      detail: 'Photograph required sites on your shift',
      href: '/officer/patrol',
    },
    {
      id: 'messages',
      title: 'Dispatch chat',
      detail: 'Check for control room messages',
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

  const syncTime = new Date().toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateLabel = new Date().toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="dash-ops dash-ops--officer field-cmd">
      {(sosMsg || (active && ['CRITICAL', 'HIGH'].includes(active.incident.priority.toUpperCase()))) && (
        <EmergencyModeBanner
          title={sosMsg ? 'Officer SOS active' : `${active!.incident.type} — priority response`}
          detail={
            sosMsg ||
            `${active!.incident.client} · control room is tracking your status`
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

      {sosMsg ? (
        <div className="field-cmd__xd">
          <CrossDeviceIncidentCard />
        </div>
      ) : null}

      <header className="field-cmd-header">
        <div className="field-cmd-header__top">
          <div>
            <p className="field-cmd-header__kicker">4DS Field</p>
            <h1 className="field-cmd-header__title">Field Operations</h1>
            <div className="field-cmd-header__meta">
              <span>Officer · {d.officer.firstName}</span>
              <span>{dateLabel}</span>
              {d.officer.zone ? <span>{d.officer.zone}</span> : null}
            </div>
          </div>
          <span className="field-status-pill">
            <span className="field-status-pill__dot" aria-hidden />
            Online / {officerStatusLabel(d.officer.status)}
          </span>
        </div>
        <Link
          href="/officer/duty"
          className={`duty-home-strip ${d.officer.dutyModeActive ? 'is-active' : ''}`}
        >
          <span>
            {d.officer.dutyModeActive ? '🟢 Duty Mode active' : 'Start Duty Mode'}
          </span>
          <span className="duty-home-strip__meta">
            Persistent Operational Mode · device security
          </span>
        </Link>

        <div className="field-metrics" role="tablist" aria-label="Field metrics">
          {[
            {
              id: 'queue',
              label: 'Assigned',
              value: waiting.length,
              hint: 'Active queue',
              tone: 'warn' as const,
            },
            {
              id: 'all',
              label: 'Operations',
              value: (active ? 1 : 0) + waiting.length,
              hint: 'Board items',
              tone: 'neutral' as const,
            },
            {
              id: 'urgent',
              label: 'Priority',
              value: urgentCount,
              hint: 'Action required',
              tone: 'urgent' as const,
            },
            {
              id: 'messages',
              label: 'Comms',
              value: 0,
              hint: 'Unread',
              tone: 'neutral' as const,
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={filter === m.id}
              className={`field-metric field-metric--${m.tone} ${filter === m.id ? 'is-active' : ''}`}
              onClick={() => {
                if (m.id === 'messages') {
                  window.location.href = '/officer/messages';
                  return;
                }
                setFilter(m.id);
              }}
            >
              <span className="field-metric__label">{m.label}</span>
              <strong>{String(m.value).padStart(2, '0')}</strong>
              <span className="field-metric__hint">{m.hint}</span>
            </button>
          ))}
        </div>
      </header>

      {active ? (
        <OfficerActiveAssignment
          dispatch={active}
          actionLoading={actionLoading}
          onAction={runAction}
        />
      ) : (
        <section className="field-ops-panel" aria-label="Current assignment">
          <div className="field-ops-panel__head">
            <p className="field-ops-panel__kicker">Field Operations</p>
            <span className="field-ops-panel__status">
              <span className="field-status-pill__dot" aria-hidden />
              Online · on shift
            </span>
          </div>
          <p className="field-ops-panel__label">Current assignment</p>
          <h2>No active job</h2>
          <p className="field-ops-panel__detail">
            Awaiting dispatch assignment. You remain available for the next call.
          </p>
          <div className="field-ops-panel__actions">
            <Link href="/officer/queue" className="btn-primary">
              Open assignment queue
            </Link>
            <Link href="/officer/map" className="btn-secondary">
              Live map
            </Link>
            <Link href="/officer/patrol" className="btn-secondary">
              Patrol
            </Link>
          </div>
          <div className="field-sys-row" aria-label="Field systems">
            <div className="field-sys-item">
              <span className="field-sys-item__label">Last sync</span>
              <span className="field-sys-item__value">{syncTime}</span>
            </div>
            <div className="field-sys-item">
              <span className="field-sys-item__label">GPS status</span>
              <span className="field-sys-item__value">
                <span className="field-sys-item__dot" aria-hidden />
                Active
              </span>
            </div>
            <div className="field-sys-item">
              <span className="field-sys-item__label">Network</span>
              <span className="field-sys-item__value">
                <span className="field-sys-item__dot" aria-hidden />
                Online
              </span>
            </div>
          </div>
        </section>
      )}

      {(showQueue || showUrgentOnly) && (
        <OpsSection
          title="Field operations / Queue"
          subtitle="Field assignments"
          action={
            <Link href="/officer/queue" className="link-sm">
              View all
            </Link>
          }
        >
          {filteredWaiting.length === 0 ? (
            <div className="field-empty" role="status">
              <span className="field-empty__status">
                <span className="field-empty__dot" aria-hidden />
                Queue clear
              </span>
              <p>
                {showUrgentOnly
                  ? 'No priority items require action.'
                  : 'No queued jobs yet. New assignments from dispatch will appear here.'}
              </p>
            </div>
          ) : (
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
          )}
        </OpsSection>
      )}

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

      <div className="protect-tile protect-tile--panic" style={{ marginBottom: '0.75rem' }}>
        <HoldToActivate
          className="hold-activate--ops-well"
          label="Officer SOS"
          holdLabel="Hold to alert control room and supervisor…"
          hideHint
          keepLabel
          loading={sosBusy}
          onActivate={() => sendSos()}
        >
          <OpsPanicIcon />
          Officer SOS
        </HoldToActivate>
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

      <OpsNeedsYou items={needsItems} viewAllHref="/officer/messages" />

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

      <section className="field-system-strip" aria-label="System status">
        <p className="field-system-strip__title">System status</p>
        <div className="field-system-strip__grid">
          <div className="field-sys-item">
            <span className="field-sys-item__label">Network</span>
            <span className="field-sys-item__value">
              <span className="field-sys-item__dot" aria-hidden />
              Online
            </span>
          </div>
          <div className="field-sys-item">
            <span className="field-sys-item__label">GPS</span>
            <span className="field-sys-item__value">
              <span className="field-sys-item__dot" aria-hidden />
              Active
            </span>
          </div>
          <div className="field-sys-item">
            <span className="field-sys-item__label">Sync</span>
            <span className="field-sys-item__value">
              <span className="field-sys-item__dot" aria-hidden />
              OK
            </span>
          </div>
        </div>
        <p className="field-system-strip__sync">Last sync {syncTime}</p>
      </section>

      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}

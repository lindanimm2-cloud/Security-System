'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { DispatchStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsSwipeRow } from '@/components/ops/OpsSwipeRow';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import { useApi } from '@/hooks/useApi';
import {
  officerQueueRowClass,
  officerTaskButtonClass,
  primaryTaskAction,
} from '@/lib/officer-task-theme';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type QueueData = {
  assigned: {
    id: string;
    status: string;
    incident: {
      id: string;
      type: string;
      priority: string;
      address: string | null;
      client: string;
      lat: number;
      lng: number;
    };
  }[];
  unassigned: {
    id: string;
    type: string;
    priority: string;
    client: string;
    address: string | null;
    lat: number;
    lng: number;
    volunteered: boolean;
  }[];
};

function actionPath(primary: ReturnType<typeof primaryTaskAction>): string | null {
  if (primary === 'accept') return 'accept';
  if (primary === 'enroute') return 'en-route';
  if (primary === 'scene') return 'on-scene';
  if (primary === 'complete') return 'complete';
  return null;
}

function actionLabel(primary: ReturnType<typeof primaryTaskAction>): string {
  if (primary === 'accept') return 'Accept';
  if (primary === 'enroute') return 'En route';
  if (primary === 'scene') return 'On scene';
  if (primary === 'complete') return 'Complete';
  return 'Advance';
}

export default function OfficerQueuePage() {
  return (
    <OfficerLayout title="Your Jobs">
      <QueueContent />
    </OfficerLayout>
  );
}

function QueueContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<QueueData>>('/officer/queue'),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const undo = useUndoToast();

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  async function advance(d: QueueData['assigned'][number]) {
    const primary = primaryTaskAction(d.status);
    const path = actionPath(primary);
    if (!path || !primary) return;
    const prev = d.status;
    setBusyId(d.id);
    setActionError('');
    try {
      await officerApi.post(`/officer/dispatch/${d.id}/${path}`);
      undo.show(
        primary === 'complete'
          ? 'Assignment completed'
          : `Marked ${actionLabel(primary).toLowerCase()}`,
        async () => {
          await officerApi.post(`/officer/dispatch/${d.id}/undo`, { status: prev });
          void reload();
        },
        primary === 'complete'
          ? { kind: 'success', detail: 'Tap Undo to restore this assignment' }
          : { kind: 'info', detail: 'Status updated · tap Undo to reverse' },
      );
      void reload();
    } catch (e) {
      setActionError(friendlyErrorMessage(e) || 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading your jobs…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const q = data!.data;

  return (
    <>
      {actionError ? <ErrorAlert message={actionError} /> : null}
      <section className="portal-card">
        <h2>Your Jobs</h2>
        {q.assigned.length === 0 ? (
          <p className="text-muted">No assignments in your queue.</p>
        ) : (
          <div className="list-card">
            {q.assigned.map((d) => {
              const primary = primaryTaskAction(d.status);
              const label = actionLabel(primary);
              return (
                <OpsSwipeRow
                  key={d.id}
                  disabled={!primary || busyId === d.id}
                  label={label}
                  onSwipePrimary={() => void advance(d)}
                >
                  <div
                    className={`list-row list-row--stack ${officerQueueRowClass(d.status, d.incident.type)}`}
                  >
                    <div className="list-row-top">
                      <span
                        className={`incident-type incident-type--${d.incident.priority.toLowerCase()}`}
                      >
                        {d.incident.type}
                      </span>
                      <DispatchStatusBadge status={d.status} />
                    </div>
                    <strong>{d.incident.client}</strong>
                    <span className="text-muted">{d.incident.address ?? 'See map'}</span>
                    <div className="officer-action-row officer-task-actions">
                      {primary && (
                        <button
                          type="button"
                          className={`btn-sm ${officerTaskButtonClass(primary, d.status)}`}
                          disabled={busyId === d.id}
                          onClick={() => void advance(d)}
                        >
                          {busyId === d.id ? '…' : label}
                        </button>
                      )}
                      <Link
                        href="/officer/report"
                        className={`btn-sm ${officerTaskButtonClass('report', d.status, 'link')}`}
                      >
                        Report
                      </Link>
                      <Link
                        href={`https://www.google.com/maps/dir/?api=1&destination=${d.incident.lat},${d.incident.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn-sm ${officerTaskButtonClass('navigate', d.status, 'link')}`}
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
      </section>

      <section className="portal-card page-section">
        <h2 className="section-title section-title--tight">Open jobs</h2>
        <p className="text-muted mb-1">
          Unassigned incidents in your zone — tap Available when you are nearby and ready to respond.
        </p>

        {q.unassigned.length === 0 ? (
          <p className="text-muted">No unassigned incidents right now.</p>
        ) : (
          <div className="list-card">
            {q.unassigned.map((i) => (
              <div key={i.id} className="list-row list-row--stack">
                <div className="list-row-top">
                  <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>
                    {i.type}
                  </span>
                  <span className="badge badge--alert">Awaiting dispatch</span>
                </div>
                <div className="officer-open-incident-row">
                  <div>
                    <strong>{i.client}</strong>
                    <span className="text-muted">{i.address ?? 'Location available on map'}</span>
                  </div>
                  <IncidentVolunteerButton
                    incidentId={i.id}
                    volunteered={i.volunteered}
                    onVolunteered={() => void reload({ silent: true })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </>
  );
}

function IncidentVolunteerButton({
  incidentId,
  volunteered: initialVolunteered,
  onVolunteered,
}: {
  incidentId: string;
  volunteered: boolean;
  onVolunteered: () => void;
}) {
  const [volunteered, setVolunteered] = useState(initialVolunteered);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [volError, setVolError] = useState('');

  useEffect(() => {
    setVolunteered(initialVolunteered);
  }, [initialVolunteered, incidentId]);

  async function handleVolunteer() {
    setLoading(true);
    setVolError('');
    setMessage('');
    try {
      const res = await officerApi.post<
        ApiResponse<{ volunteered: boolean; message: string }>
      >(`/officer/incidents/${incidentId}/volunteer`);
      setVolunteered(true);
      setMessage(res.data?.message ?? 'Dispatch notified.');
      onVolunteered();
    } catch (err) {
      setVolError(friendlyErrorMessage(err, 'action'));
    } finally {
      setLoading(false);
    }
  }

  if (volunteered) {
    return (
      <div className="officer-volunteer-status">
        <span className="badge badge--ok">Dispatch notified</span>
        {message && <span className="text-muted officer-volunteer-status__note">{message}</span>}
      </div>
    );
  }

  return (
    <div className="officer-volunteer-action">
      <button
        type="button"
        className="btn-available"
        onClick={handleVolunteer}
        disabled={loading}
        title="Notify dispatch you are available for this incident"
      >
        {loading ? 'Notifying…' : 'Available'}
      </button>
      {volError && <ErrorAlert error={volError} inline />}
    </div>
  );
}

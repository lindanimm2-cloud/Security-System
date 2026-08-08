'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { DispatchStatusBadge } from '@/components/officer/StatusBadges';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import {
  officerQueueRowClass,
  officerTaskButtonClass,
  primaryTaskAction,
} from '@/lib/officer-task-theme';
import { officerApi, type ApiResponse } from '@/lib/api-client';
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

export default function OfficerQueuePage() {
  return (
    <OfficerLayout title="Incident Queue">
      <QueueContent />
    </OfficerLayout>
  );
}

function QueueContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<QueueData>>('/officer/queue'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading queue..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const q = data!.data;

  return (
    <>
      <section className="portal-card">
        <h2>Your assignments</h2>
        {q.assigned.length === 0 ? (
          <p className="text-muted">No assignments in your queue.</p>
        ) : (
          <div className="list-card">
            {q.assigned.map((d) => (
              <div
                key={d.id}
                className={`list-row list-row--stack ${officerQueueRowClass(d.status, d.incident.type)}`}
              >
                <div className="list-row-top">
                  <span className={`incident-type incident-type--${d.incident.priority.toLowerCase()}`}>
                    {d.incident.type}
                  </span>
                  <DispatchStatusBadge status={d.status} />
                </div>
                <strong>{d.incident.client}</strong>
                <span className="text-muted">{d.incident.address ?? 'See map'}</span>
                <div className="officer-action-row officer-task-actions">
                  <Link
                    href="/officer"
                    className={`btn-sm ${officerTaskButtonClass(primaryTaskAction(d.status) ?? 'accept', d.status, 'link')}`}
                  >
                    Manage
                  </Link>
                  <Link href="/officer/report" className={`btn-sm ${officerTaskButtonClass('report', d.status, 'link')}`}>
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
            ))}
          </div>
        )}
      </section>

      <section className="portal-card page-section">
        <h2 className="section-title section-title--tight">Open incidents</h2>
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
                  <span className={`incident-type incident-type--${i.priority.toLowerCase()}`}>{i.type}</span>
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
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setVolunteered(initialVolunteered);
  }, [initialVolunteered, incidentId]);

  async function handleVolunteer() {
    setLoading(true);
    setActionError('');
    setMessage('');
    try {
      const res = await officerApi.post<
        ApiResponse<{ volunteered: boolean; message: string }>
      >(`/officer/incidents/${incidentId}/volunteer`);
      setVolunteered(true);
      setMessage(res.data?.message ?? 'Dispatch notified.');
      onVolunteered();
    } catch (err) {
      setActionError(friendlyErrorMessage(err, 'action'));
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
      {actionError && <ErrorAlert error={actionError} inline />}
    </div>
  );
}

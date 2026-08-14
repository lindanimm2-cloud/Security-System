'use client';

import Link from 'next/link';
import { CallActions, DispatchLineButton } from '@/components/calls/CallActions';
import { OfficerSiteSurveillance } from '@/components/officer/OfficerSiteSurveillance';
import {
  formatDispatchPhase,
  officerTaskButtonClass,
  officerTaskCardClass,
  officerTaskStatusClass,
  primaryTaskAction,
} from '@/lib/officer-task-theme';
import { officerApi } from '@/lib/api-client';

export type ActiveDispatch = {
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

type Props = {
  dispatch: ActiveDispatch;
  actionLoading: string | null;
  onAction: (key: string, fn: () => Promise<unknown>) => void;
  dispatchLinePhone?: string;
};

export function OfficerActiveAssignment({
  dispatch: active,
  actionLoading,
  onAction,
  dispatchLinePhone = '+27860000000',
}: Props) {
  const status = active.status;
  const showAccept = status === 'ASSIGNED';
  const showEnRoute = ['ASSIGNED', 'ACCEPTED'].includes(status);
  const showOnScene = ['EN_ROUTE', 'ACCEPTED', 'ASSIGNED'].includes(status);
  const primary = primaryTaskAction(status);

  return (
    <section
      className={officerTaskCardClass(status, active.incident.type)}
      aria-label={`Active assignment — ${formatDispatchPhase(status)}`}
    >
      <div className="officer-task-card__accent" aria-hidden />

      <div className="card-header-row officer-task-card__header">
        <h2>Active assignment</h2>
        <span className={`incident-type incident-type--${active.incident.priority.toLowerCase()}`}>
          {active.incident.type}
        </span>
      </div>

      <p className="officer-task-card__client">
        <strong>{active.incident.client}</strong>
      </p>
      <p className="text-muted">{active.incident.address ?? 'Location on map'}</p>

      <div className="call-actions call-actions--inline officer-task-card__comms">
        <CallActions
          target={{
            name: active.incident.client,
            phone: active.incident.phone ?? undefined,
            incidentId: active.incident.id,
            role: 'CLIENT',
          }}
        />
        <DispatchLineButton phone={dispatchLinePhone} name="Control room" />
      </div>

      <div className={officerTaskStatusClass(status)}>
        <span className="officer-task-status__dot" aria-hidden />
        <span className="officer-task-status__label">Dispatch status</span>
        <strong>{formatDispatchPhase(status)}</strong>
      </div>

      <div className="officer-action-row officer-task-actions">
        {showAccept && (
          <button
            type="button"
            className={officerTaskButtonClass('accept', status)}
            disabled={!!actionLoading}
            aria-current={primary === 'accept' ? 'step' : undefined}
            onClick={() => onAction('accept', () => officerApi.post(`/officer/dispatch/${active.id}/accept`))}
          >
            {actionLoading === 'accept' ? 'Updating…' : 'Accept'}
          </button>
        )}
        {showEnRoute && (
          <button
            type="button"
            className={officerTaskButtonClass('enroute', status)}
            disabled={!!actionLoading}
            aria-current={primary === 'enroute' ? 'step' : undefined}
            onClick={() => onAction('enroute', () => officerApi.post(`/officer/dispatch/${active.id}/en-route`))}
          >
            {actionLoading === 'enroute' ? 'Updating…' : 'En route'}
          </button>
        )}
        {showOnScene && (
          <button
            type="button"
            className={officerTaskButtonClass('scene', status)}
            disabled={!!actionLoading}
            aria-current={primary === 'scene' ? 'step' : undefined}
            onClick={() => onAction('scene', () => officerApi.post(`/officer/dispatch/${active.id}/on-scene`))}
          >
            {actionLoading === 'scene' ? 'Updating…' : 'Arrived'}
          </button>
        )}
        <button
          type="button"
          className={officerTaskButtonClass('complete', status)}
          disabled={!!actionLoading}
          aria-current={primary === 'complete' ? 'step' : undefined}
          onClick={() => onAction('complete', () => officerApi.post(`/officer/dispatch/${active.id}/complete`))}
        >
          {actionLoading === 'complete' ? 'Updating…' : 'Complete'}
        </button>
        <button
          type="button"
          className={officerTaskButtonClass('backup', status)}
          disabled={!!actionLoading}
          onClick={() =>
            onAction('backup', () => officerApi.post('/officer/backup', { incidentId: active.incident.id }))
          }
        >
          {actionLoading === 'backup' ? 'Sending…' : 'Need backup'}
        </button>
        <Link
          href={`https://www.google.com/maps/dir/?api=1&destination=${active.incident.lat},${active.incident.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={officerTaskButtonClass('navigate', status, 'link')}
        >
          Navigate
        </Link>
        <Link href="/officer/report" className={officerTaskButtonClass('report', status, 'link')}>
          File report
        </Link>
      </div>

      <OfficerSiteSurveillance incidentId={active.incident.id} />
    </section>
  );
}

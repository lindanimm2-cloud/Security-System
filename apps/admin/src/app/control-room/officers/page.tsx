'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { OfficerStatusControl, OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { officerStatusLabel } from '@/lib/officer-status';
import { CONTROL_ROOM_ROUTES, mapHref } from '@/lib/control-room-routes';

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
  avgResponseSec: number;
  vehicle?: {
    id: string;
    callSign: string;
    registration: string;
    role: string;
    crewMates: { officerId: string; name: string; role: string; status?: string }[];
  } | null;
};

export default function OfficersPage() {
  return (
    <ControlRoomLayout title="Officers">
      <OfficersContent />
    </ControlRoomLayout>
  );
}

function OfficersContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Officer[]>>('/control-room/officers'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading officers..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            Override officer availability when they are too busy, en route, or returning.
            Dispatch only auto-assigns officers marked <strong>Available</strong>.
          </p>
          <p className="text-muted">
            <Link href={CONTROL_ROOM_ROUTES.overview} className="interactive-text">Overview</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.dispatch} className="interactive-text">Dispatch</Link>
            {' · '}
            <Link href={mapHref('officers')} className="interactive-text">Live map</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.analytics} className="interactive-text">Analytics</Link>
            {' · '}
            <Link href={CONTROL_ROOM_ROUTES.fleet} className="interactive-text">Fleet</Link>
          </p>
        </div>
      </div>

      <div className="officer-roster">
        {data!.data.map((o) => (
          <article key={o.id} className="officer-roster-card">
            <div className="officer-roster-card__header">
              <OfficerStatusDot status={o.status} />
              <div>
                <strong>{o.firstName} {o.lastName}</strong>
                <span className="text-muted">
                  {o.zone ?? 'Unassigned'} · Avg {Math.floor(o.avgResponseSec / 60)}m {o.avgResponseSec % 60}s
                  {o.vehicle ? ` · ${o.vehicle.callSign} (${o.vehicle.role.replace(/_/g, ' ')})` : ''}
                </span>
              </div>
              <span className={`badge badge--status badge--status-${o.status.toLowerCase().replace(/_/g, '-')}`}>
                {officerStatusLabel(o.status)}
              </span>
            </div>
            {o.vehicle && (
              <div className="officer-roster-card__vehicle">
                <span className="officer-roster-card__vehicle-label">Vehicle</span>
                <strong>{o.vehicle.callSign}</strong>
                <span className="text-muted">{o.vehicle.registration}</span>
                {o.vehicle.crewMates.length > 0 && (
                  <span className="text-muted">
                    Riding with {o.vehicle.crewMates.map((m) => m.name).join(', ')}
                  </span>
                )}
              </div>
            )}
            <OfficerStatusControl
              officerId={o.id}
              status={o.status}
              onUpdated={reload}
            />
            <div className="officer-roster-card__links">
              <Link href={mapHref('officers')} className="btn-sm btn-sm--link">View on map</Link>
              <Link href={CONTROL_ROOM_ROUTES.dispatch} className="btn-sm btn-sm--link">Dispatch</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

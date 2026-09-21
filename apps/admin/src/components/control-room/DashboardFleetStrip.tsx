'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { fleetTeamLabel } from '@/lib/fleet-teams';

type FleetVehicle = {
  id: string;
  callSign: string;
  registration: string;
  vehicleType: string;
  teamName?: string | null;
  status: string;
  crewCount?: number;
  cameras?: CctvCamera[];
};

export function DashboardFleetStrip({ compact = false }: { compact?: boolean }) {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

  const list = (Array.isArray(data?.data) ? data.data : []).slice(0, compact ? 6 : 8);

  return (
    <section
      className={`ops-board__vehicles ${compact ? 'ops-board__vehicles--compact' : ''}`}
      aria-label="Vehicles"
    >
      <div className="panel-header ops-board__pane-head">
        <div>
          <h2>{compact ? 'Vehicle status' : 'Vehicles'}</h2>
          <p className="text-muted">{compact ? 'Fleet telemetry strip' : 'Fleet units · status strip'}</p>
        </div>
        <Link href={CONTROL_ROOM_ROUTES.fleet} className="link-sm">
          Fleet
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="dash-clear" style={{ padding: '0.75rem 0.85rem' }}>
          <strong>{loading ? 'Loading fleet…' : 'No fleet units'}</strong>
          <p className="text-muted">
            {loading ? 'Checking vehicle status.' : 'Company vehicles will show here.'}
          </p>
        </div>
      ) : (
        <ul className={`ops-fleet ${compact ? 'ops-fleet--compact' : ''}`}>
          {list.map((v) => {
            const cam = compact ? null : v.cameras?.[0];
            return (
              <li key={v.id} className={`ops-fleet__item ops-fleet__item--${(v.status ?? 'unknown').toLowerCase()}`}>
                {cam ? (
                  <CctvLiveFeed camera={cam} href={CONTROL_ROOM_ROUTES.fleet} compact />
                ) : null}
                <strong className="ops-fleet__callsign">{v.callSign}</strong>
                <span className="ops-fleet__reg">{v.registration}</span>
                <span className="ops-fleet__type">{fleetTeamLabel(v.vehicleType, v.teamName)}</span>
                <em className="ops-fleet__status">{(v.status ?? 'UNKNOWN').replace(/_/g, ' ')}</em>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

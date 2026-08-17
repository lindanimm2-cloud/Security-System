'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';

type FleetVehicle = {
  id: string;
  callSign: string;
  registration: string;
  vehicleType: string;
  status: string;
  crewCount?: number;
  cameras?: CctvCamera[];
};

export function DashboardFleetStrip() {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(() => void reload({ silent: true }), 15000);
    return () => window.clearInterval(id);
  }, [reload]);

  const list = (data?.data ?? []).slice(0, 8);

  return (
    <section className="ops-board__vehicles" aria-label="Vehicles">
      <div className="panel-header ops-board__pane-head">
        <div>
          <h2>Vehicles</h2>
          <p className="text-muted">Fleet units · dash cam and status</p>
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
        <ul className="ops-fleet">
          {list.map((v) => {
            const cam = v.cameras?.[0];
            return (
              <li key={v.id} className={`ops-fleet__item ops-fleet__item--${v.status.toLowerCase()}`}>
                {cam ? (
                  <CctvLiveFeed camera={cam} href={CONTROL_ROOM_ROUTES.fleet} />
                ) : null}
                <strong>{v.callSign}</strong>
                <span>{v.vehicleType.replace(/_/g, ' ')}</span>
                <em>{v.status.replace(/_/g, ' ')}</em>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

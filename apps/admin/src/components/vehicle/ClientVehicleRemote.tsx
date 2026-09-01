'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLiveCctv } from '@/components/portal/DashboardLiveCctv';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

export type ClientVehicleRemoteVehicle = {
  id: string;
  registration?: string;
  doorsLocked?: boolean;
  immobiliserOn?: boolean;
  theftRecovery?: boolean;
  hornActive?: boolean;
};

type Props = {
  vehicle: ClientVehicleRemoteVehicle;
  compact?: boolean;
  hidePanic?: boolean;
  onUpdated?: () => void;
};

export function ClientVehicleRemote({
  vehicle,
  compact = false,
  hidePanic = true,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState<VehicleRemoteAction | null>(null);
  const [local, setLocal] = useState<VehicleRemoteState>(() => ({
    doorsLocked: vehicle.doorsLocked ?? true,
    immobiliserOn: vehicle.immobiliserOn ?? false,
    theftRecovery: vehicle.theftRecovery ?? false,
    hornActive: vehicle.hornActive ?? false,
  }));

  useEffect(() => {
    setLocal({
      doorsLocked: vehicle.doorsLocked ?? true,
      immobiliserOn: vehicle.immobiliserOn ?? false,
      theftRecovery: vehicle.theftRecovery ?? false,
      hornActive: vehicle.hornActive ?? false,
    });
  }, [vehicle.doorsLocked, vehicle.hornActive, vehicle.immobiliserOn, vehicle.theftRecovery]);

  async function send(action: VehicleRemoteAction): Promise<boolean> {
    setBusy(action);
    try {
      const res = await clientApi.post<ApiResponse<{ message?: string }>>(
        `/client/vehicles/${vehicle.id}/remote`,
        { action },
      );
      setLocal((prev) => ({
        doorsLocked: action === 'lock' ? true : action === 'unlock' ? false : prev.doorsLocked,
        immobiliserOn: action === 'immobilise' ? true : action === 'release' ? false : prev.immobiliserOn,
        theftRecovery: prev.theftRecovery,
        hornActive: action === 'horn' ? !prev.hornActive : prev.hornActive,
      }));
      onUpdated?.();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="vehicle-remote--dash" aria-label="Remote vehicle">
      <VehicleRemotePad
        state={local}
        busyAction={busy}
        compact={compact}
        hidePanic={hidePanic}
        onCommand={(action) => send(action)}
      >
        <DashboardLiveCctv embedded kind="vehicle" vehicleId={vehicle.id} />
      </VehicleRemotePad>
      <p className="vehicle-remote__dash-link">
        <Link href={`/portal/vehicles/${vehicle.id}`} className="link-sm">
          {vehicle.registration ? `${vehicle.registration} · vehicle` : 'Open vehicle'}
        </Link>
      </p>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLiveCctv } from '@/components/portal/DashboardLiveCctv';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { VehicleRemoteVisual } from '@/components/vehicle/VehicleRemoteVisual';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

export type ClientVehicleRemoteVehicle = {
  id: string;
  registration?: string;
  make?: string;
  model?: string;
  year?: number | null;
  color?: string | null;
  colour?: string | null;
  modelAsset?: string | null;
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
        theftRecovery:
          action === 'panic' ? true : action === 'clearRecovery' ? false : prev.theftRecovery,
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
      <VehicleRemoteVisual
        variant={compact ? 'compact' : 'full'}
        state={local}
        model={{
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          colour: vehicle.colour ?? vehicle.color,
          assetUrl: vehicle.modelAsset,
        }}
        busyAction={busy}
        hidePanic={hidePanic}
        onCommand={(action) => send(action)}
      />
      <VehicleRemotePad
        state={local}
        busyAction={busy}
        layout="command"
        compact={compact}
        hidePanic={hidePanic}
        vehicleLabel={[vehicle.make, vehicle.model].filter(Boolean).join(' ') || null}
        registration={vehicle.registration ?? null}
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

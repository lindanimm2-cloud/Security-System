'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
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
  const [note, setNote] = useState('');
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

  async function send(action: VehicleRemoteAction) {
    setBusy(action);
    setNote('');
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
      setNote(res.data?.message ?? 'Command sent.');
      onUpdated?.();
    } catch (e) {
      setNote(friendlyErrorMessage(e, 'action'));
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
        onCommand={(action) => void send(action)}
      />
      <p className="vehicle-remote__dash-link">
        <Link href={`/portal/vehicles/${vehicle.id}`} className="link-sm">
          {vehicle.registration ? `${vehicle.registration} · vehicle` : 'Open vehicle'}
        </Link>
      </p>
      {note ? (
        <p className="vehicle-remote__hint" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}

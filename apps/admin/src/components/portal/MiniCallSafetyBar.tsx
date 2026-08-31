'use client';

import { useCallback, useState } from 'react';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
import { PanicNeuButton } from '@/components/portal/PanicNeuButton';
import { SilentPanicIcon } from '@/components/portal/PanicNeuIcons';

type DispatchMeta = {
  meta?: { dispatchLine: { name: string; phone: string } };
};

const DEFAULT_DISPATCH = CONTROL_ROOM_LINE;

export function MiniCallSafetyBar({
  variant = 'floating',
  onStatus,
}: {
  variant?: 'floating' | 'inline' | 'docked';
  onStatus?: (message: string) => void;
}) {
  const calls = useCallsOptional();
  const [callBusy, setCallBusy] = useState(false);

  const { data } = useApi(
    () =>
      clientApi.get<ApiResponse<unknown[]> & DispatchMeta>('/client/contacts'),
    [],
  );

  const dispatch = data?.meta?.dispatchLine ?? DEFAULT_DISPATCH;

  const startSilentCall = useCallback(async () => {
    setCallBusy(true);
    try {
      await clientApi.post('/client/panic', { silent: true });
      await clientApi.post('/client/support/silent-call', {
        phone: dispatch.phone,
      });
      onStatus?.('Silent safety call — dispatch notified discreetly.');

      if (calls?.portal) {
        await calls.startCall('DISPATCH_LINE', {
          name: dispatch.name,
          phone: dispatch.phone,
          role: 'DISPATCH',
        });
      } else {
        window.location.href = `tel:${dispatch.phone}`;
      }
    } catch (err) {
      onStatus?.(friendlyErrorMessage(err, 'call'));
      if (!calls?.portal) window.location.href = `tel:${dispatch.phone}`;
    } finally {
      setCallBusy(false);
    }
  }, [calls, dispatch.name, dispatch.phone, onStatus]);

  return (
    <div
      className={`silent-call-fab ${
        variant === 'inline'
          ? 'silent-call-fab--inline'
          : variant === 'docked'
            ? 'silent-call-fab--docked'
            : 'silent-call-fab--floating'
      }`}
    >
      <PanicNeuButton
        label="Silent Panic. Hold for 2 seconds to notify dispatch discreetly."
        holdMs={2000}
        variant="silent"
        tone="warn"
        loading={callBusy}
        disabled={callBusy}
        onActivate={() => startSilentCall()}
        icon={<SilentPanicIcon />}
      />
    </div>
  );
}

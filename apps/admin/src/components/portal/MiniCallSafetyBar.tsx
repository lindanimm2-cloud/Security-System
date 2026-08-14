'use client';

import { useCallback, useState } from 'react';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { HoldToActivate } from '@/components/ops/EmergencyMode';

type DispatchMeta = {
  meta?: { dispatchLine: { name: string; phone: string } };
};

const DEFAULT_DISPATCH = { name: '4DS Dispatch', phone: '+27110000000' };

export function MiniCallSafetyBar({
  variant = 'floating',
  onStatus,
}: {
  variant?: 'floating' | 'inline';
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
      className={`silent-call-fab ${variant === 'inline' ? 'silent-call-fab--inline' : 'silent-call-fab--floating'}`}
    >
      <HoldToActivate
        label="Silent call"
        holdLabel="Hold"
        holdMs={1200}
        tone="warn"
        className="silent-call-fab__btn"
        disabled={callBusy}
        loading={callBusy}
        onActivate={() => startSilentCall()}
      >
        <span className="silent-call-fab__icon" aria-hidden>
          <MutePhoneIcon />
        </span>
        <span className="silent-call-fab__text">{callBusy ? '…' : 'Silent'}</span>
      </HoldToActivate>
    </div>
  );
}

function MutePhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

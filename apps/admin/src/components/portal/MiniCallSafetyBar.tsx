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
  const [tipsOpen, setTipsOpen] = useState(false);

  const { data } = useApi(
    () =>
      clientApi.get<ApiResponse<unknown[]> & DispatchMeta>('/client/contacts'),
    [],
  );

  const dispatch = data?.meta?.dispatchLine ?? DEFAULT_DISPATCH;

  const startCall = useCallback(
    async (silent: boolean) => {
      setCallBusy(true);
      try {
        if (silent) {
          await clientApi.post('/client/panic', { silent: true });
          await clientApi.post('/client/support/silent-call', {
            phone: dispatch.phone,
          });
          onStatus?.('Silent safety call — dispatch notified discreetly.');
        }

        if (calls) {
          await calls.startCall('DISPATCH_LINE', {
            name: dispatch.name,
            phone: dispatch.phone,
            role: 'DISPATCH',
          });
          if (!silent) onStatus?.('Connecting to control room…');
        } else {
          window.location.href = `tel:${dispatch.phone}`;
        }
      } catch (err) {
        onStatus?.(friendlyErrorMessage(err, 'call'));
        if (!calls) window.location.href = `tel:${dispatch.phone}`;
      } finally {
        setCallBusy(false);
      }
    },
    [calls, dispatch.name, dispatch.phone, onStatus],
  );

  return (
    <div
      className={`mini-call-safety ${variant === 'floating' ? 'mini-call-safety--floating' : 'mini-call-safety--inline'}`.trim()}
      aria-label="Dispatch call and silent safety"
    >
      <div className="mini-call-safety__actions">
        <button
          type="button"
          className="mini-call-safety__btn mini-call-safety__btn--call"
          disabled={callBusy}
          onClick={() => void startCall(false)}
          title={`Call ${dispatch.name}`}
        >
          <PhoneIcon />
          <span>{callBusy ? '…' : 'Call'}</span>
        </button>

        <HoldToActivate
          label="Silent call"
          holdLabel="Connecting…"
          holdMs={1200}
          tone="warn"
          className="mini-call-safety__silent-hold"
          disabled={callBusy}
          loading={callBusy}
          onActivate={() => startCall(true)}
        />
      </div>

      <button
        type="button"
        className="mini-call-safety__tips-toggle"
        aria-expanded={tipsOpen}
        onClick={() => setTipsOpen((v) => !v)}
      >
        {tipsOpen ? 'Hide silent safety' : 'Silent call safety'}
      </button>

      {tipsOpen ? (
        <ul className="mini-call-safety__tips">
          <li>Hold <strong>Silent call</strong> — dispatch is alerted quietly before your line opens.</li>
          <li>Your phone shows a normal call — no alarm sounds or panic screen.</li>
          <li>GPS and your profile are shared with control room automatically.</li>
          <li>Use earpiece and speak quietly if someone is nearby.</li>
        </ul>
      ) : null}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

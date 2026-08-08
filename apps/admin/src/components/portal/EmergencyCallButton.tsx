'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import type { CallChannel } from '@/types/calls';

type Props = {
  name: string;
  phone: string;
  relationship?: string | null;
  linkedUserId?: string | null;
  isDispatch?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
};

function isDispatchContact(
  name: string,
  relationship: string | null | undefined,
  isDispatch?: boolean,
): boolean {
  if (isDispatch) return true;
  const text = `${name} ${relationship ?? ''}`.toLowerCase();
  return text.includes('dispatch') || text.includes('4ds') || relationship?.toLowerCase() === 'security';
}

export function EmergencyCallButton({
  name,
  phone,
  relationship,
  linkedUserId,
  isDispatch,
  size = 'sm',
  className = '',
}: Props) {
  const ctx = useCallsOptional();
  const [busy, setBusy] = useState(false);

  if (!ctx) return null;

  const dispatch = isDispatchContact(name, relationship, isDispatch);

  async function handleCall() {
    setBusy(true);
    try {
      let channel: CallChannel;
      if (dispatch) {
        channel = 'DISPATCH_LINE';
      } else if (linkedUserId) {
        channel = 'INTERNAL';
      } else {
        channel = 'EXTERNAL';
      }

      await ctx!.startCall(channel, {
        name,
        phone,
        userId: linkedUserId ?? undefined,
        role: dispatch ? 'DISPATCH' : relationship ?? 'EMERGENCY_CONTACT',
      });
    } catch (err) {
      alert(friendlyErrorMessage(err, 'call'));
    } finally {
      setBusy(false);
    }
  }

  const label = dispatch ? 'Call control room' : linkedUserId ? 'In-app call' : 'Emergency call';

  return (
    <button
      type="button"
      className={`emergency-call-btn emergency-call-btn--${size} ${className}`.trim()}
      disabled={busy}
      onClick={() => void handleCall()}
      title={dispatch ? 'Connect to 4DS control room' : `Call ${name}`}
    >
      {busy ? (
        <LoadingSpinner label="" size="sm" />
      ) : (
        <>
          <PhoneIcon />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function EmergencyDispatchCallCard({
  phone,
  name = '4DS Control Room',
}: {
  phone: string;
  name?: string;
}) {
  return (
    <div className="emergency-call-card">
      <div className="emergency-call-card__row">
        <div className="emergency-call-card__icon" aria-hidden>
          <PhoneIcon />
        </div>
        <div className="emergency-call-card__meta">
          <strong>{name}</strong>
          <span className="emergency-call-card__hint">Always connected · {phone}</span>
        </div>
      </div>
      <EmergencyCallButton name={name} phone={phone} isDispatch size="lg" />
    </div>
  );
}

function PhoneIcon({ large }: { large?: boolean }) {
  return (
    <svg
      width={large ? 28 : 14}
      height={large ? 28 : 14}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

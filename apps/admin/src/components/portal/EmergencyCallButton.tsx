'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
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

export function formatZaPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length >= 11) {
    const rest = digits.slice(2);
    if (rest.length === 9) {
      return `+27 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
    }
  }
  return phone;
}

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

  const label = dispatch ? 'Call Control Room' : 'Call';

  return (
    <button
      type="button"
      className={`emergency-call-btn emergency-call-btn--${size} ${
        dispatch ? 'emergency-call-btn--dispatch' : 'emergency-call-btn--quiet'
      } ${className}`.trim()}
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
  phone = CONTROL_ROOM_LINE.phone,
  name = CONTROL_ROOM_LINE.name,
}: {
  phone?: string;
  name?: string;
}) {
  return (
    <section className="ec-dispatch" aria-label="4DS Control Room">
      <div className="ec-dispatch__top">
        <p className="ec-kicker">4DS Control Room</p>
        <span className="ec-online">
          <span className="ec-dot" aria-hidden />
          Online · 24/7 response
        </span>
      </div>
      <h2>24/7 security response</h2>
      <p className="ec-dispatch__phone">{formatZaPhone(phone)}</p>
      <EmergencyCallButton name={name} phone={phone} isDispatch size="lg" />
      <p className="ec-dispatch__note">
        Your contracted security response line. Available 24/7 for verified security emergencies.
      </p>
    </section>
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

'use client';

import { useState } from 'react';
import { useCallsOptional } from './CallProvider';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import type { CallTarget } from '@/types/calls';

type CallActionsProps = {
  target: CallTarget;
  compact?: boolean;
  showLabels?: boolean;
};

export function CallActions({ target, compact, showLabels }: CallActionsProps) {
  const ctx = useCallsOptional();
  const [busy, setBusy] = useState<string | null>(null);

  if (!ctx) return null;

  async function dial(channel: 'INTERNAL' | 'WHATSAPP' | 'DISPATCH_LINE' | 'EXTERNAL', key: string) {
    setBusy(key);
    try {
      await ctx!.startCall(channel, target);
    } catch (err) {
      alert(friendlyErrorMessage(err, 'call'));
    } finally {
      setBusy(null);
    }
  }

  const btnClass = compact ? 'call-action-btn call-action-btn--compact' : 'call-action-btn';

  return (
    <div className={`call-actions ${compact ? 'call-actions--compact' : ''}`}>
      {target.userId && (
        <button
          type="button"
          className={`${btnClass} call-action-btn--internal`}
          disabled={!!busy}
          onClick={() => void dial('INTERNAL', 'internal')}
          title="Internal app call"
        >
          <PhoneIcon />
          {showLabels && <span>App call</span>}
          {!showLabels && !compact && <span>Internal</span>}
        </button>
      )}
      {target.phone && (
        <>
          <button
            type="button"
            className={`${btnClass} call-action-btn--whatsapp`}
            disabled={!!busy}
            onClick={() => void dial('WHATSAPP', 'whatsapp')}
            title="Call via WhatsApp"
          >
            <WhatsAppIcon />
            {showLabels && <span>WhatsApp</span>}
            {!showLabels && !compact && <span>WhatsApp</span>}
          </button>
          <button
            type="button"
            className={`${btnClass} call-action-btn--phone`}
            disabled={!!busy}
            onClick={() => void dial('EXTERNAL', 'phone')}
            title="Call phone number"
          >
            <PhoneIcon />
            {showLabels && <span>Phone</span>}
            {!showLabels && !compact && <span>Phone</span>}
          </button>
        </>
      )}
    </div>
  );
}

export function DispatchLineButton({
  phone,
  name = 'Dispatch',
}: {
  phone: string;
  name?: string;
}) {
  const ctx = useCallsOptional();
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;

  return (
    <button
      type="button"
      className="call-action-btn call-action-btn--dispatch"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await ctx.startCall('DISPATCH_LINE', { name, phone, role: 'DISPATCH' });
        } catch (err) {
          alert(friendlyErrorMessage(err, 'call'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <DispatchIcon />
      <span>Dispatch line</span>
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function DispatchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 008.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2a7 7 0 017 7zm-4 0h2c0-2.76-2.24-5-5-5v2a3 3 0 013 3z" />
    </svg>
  );
}

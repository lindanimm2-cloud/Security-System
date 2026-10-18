'use client';

import { useState } from 'react';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import {
  handlePhysicalControlDemo,
  lookupDemoParkingTicket,
  type DemoParkingTicket,
} from '@/lib/demo/demo-physical-control';

type TicketResult = DemoParkingTicket;

export function ParkingTicketAssist({
  mode = 'org',
  defaultAccessPointId = 'ap-mall-park-exit',
  actorName = 'Mall security',
  onOpened,
}: {
  mode?: 'org' | 'control-room';
  defaultAccessPointId?: string;
  actorName?: string;
  onOpened?: () => void;
}) {
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const base = mode === 'org' ? '/org/parking-tickets' : '/control-room/parking-tickets';

  async function lookup() {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'org') {
        setTicket(lookupDemoParkingTicket(code.trim()));
      } else {
        const res = await adminApi.post<ApiResponse<TicketResult>>(`${base}/lookup`, {
          code: code.trim(),
        });
        setTicket((res.data as TicketResult) ?? null);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  async function raiseBoom() {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'org') {
        const result = handlePhysicalControlDemo({
          clean: '/org/parking-tickets/assist-open',
          method: 'POST',
          payload: {
            code: code.trim(),
            accessPointId: defaultAccessPointId,
            override,
            reason,
          },
          actorName,
        });
        const data = (result.handled ? result.response.data : null) as {
          note?: string;
          error?: string;
          denied?: boolean;
        } | null;
        if (data?.denied || data?.error) {
          setMessage(data.error ?? 'Could not raise boom');
          return;
        }
        setMessage(data?.note ?? 'Boom raised — action audited.');
        onOpened?.();
        return;
      }

      const res = await adminApi.post<
        ApiResponse<{ note?: string; error?: string; denied?: boolean; ticket?: TicketResult }>
      >(`${base}/assist-open`, {
        code: code.trim(),
        accessPointId: defaultAccessPointId,
        override,
        reason,
      });
      const data = res.data as { note?: string; error?: string; denied?: boolean } | undefined;
      if (data?.denied || data?.error) {
        setMessage(data.error ?? 'Could not raise boom');
        return;
      }
      setMessage(data?.note ?? 'Boom raised — action audited.');
      onOpened?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Open failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ticket-assist" aria-label="Parking ticket assist">
      <header className="ticket-assist__head">
        <div>
          <p className="ticket-assist__eyebrow">Parking ticket assist</p>
          <h2>Verify &amp; raise boom</h2>
          <p className="text-muted">
            When the card machine fails, enter the ticket code, confirm payment, then raise the exit boom remotely.
          </p>
        </div>
      </header>

      <div className="ticket-assist__form">
        <label className="ticket-assist__field">
          <span>Ticket code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. T-48291"
            autoComplete="off"
          />
        </label>
        <button type="button" className="btn-secondary" disabled={busy || !code.trim()} onClick={() => void lookup()}>
          Look up
        </button>
      </div>

      <p className="ticket-assist__hint">Demo codes: T-48291 (paid) · T-10001 (unpaid) · T-77820 (expired)</p>

      {ticket ? (
        <div className={`ticket-assist__result ticket-assist__result--${ticket.status.toLowerCase()}`}>
          <div>
            <strong>{ticket.code}</strong>
            <span>{ticket.status}</span>
          </div>
          <p>
            {ticket.plate ? `${ticket.plate} · ` : ''}
            {ticket.amountLabel ?? '—'}
          </p>
          <p className="text-muted">{ticket.note}</p>
        </div>
      ) : null}

      <label className="ticket-assist__check">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        Manual override (manager / security desk)
      </label>

      {override ? (
        <label className="ticket-assist__field">
          <span>Override reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Card machine fault — verified parking paid"
          />
        </label>
      ) : null}

      <div className="ticket-assist__actions">
        <button
          type="button"
          className="btn-primary"
          disabled={busy || (!ticket && !override) || (override && reason.trim().length < 3)}
          onClick={() => void raiseBoom()}
        >
          Raise exit boom
        </button>
      </div>

      {message ? (
        <p className="ticket-assist__msg" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

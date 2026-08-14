'use client';

import { FormEvent, useState } from 'react';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = {
  onRegistered?: () => void;
  compact?: boolean;
};

export function PropertyRegisterForm({ onRegistered, compact }: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const res = await clientApi.post<
        ApiResponse<{ id: string; status: string; message?: string }>
      >('/client/properties/register', { name, address, gateCode: gateCode || undefined });
      setMsg(
        res.data?.message ??
          'Property submitted. Our control room will verify and link your alarm & cameras.',
      );
      setName('');
      setAddress('');
      setGateCode('');
      onRegistered?.();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`property-register ${compact ? 'property-register--compact' : ''}`} onSubmit={submit}>
      {!compact && (
        <p className="text-muted" style={{ marginTop: 0 }}>
          Register a home or business site. Control room verifies ownership before monitoring goes live.
        </p>
      )}
      <label className="form-field">
        <span>Property name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Home — Umhlanga"
          required
        />
      </label>
      <label className="form-field">
        <span>Address</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, suburb, city"
          required
        />
      </label>
      <label className="form-field">
        <span>Gate code (optional)</span>
        <input
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value)}
          placeholder="For responder access"
        />
      </label>
      {error ? <div className="alert alert--error">{error}</div> : null}
      {msg ? <div className="alert alert--success">{msg}</div> : null}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? <LoadingSpinner label="" size="sm" /> : 'Register property'}
      </button>
    </form>
  );
}

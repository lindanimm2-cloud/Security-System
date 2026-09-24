'use client';

import { FormEvent, useState } from 'react';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { formatSplitAddress } from '@/lib/phone-countries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SplitAddressFields, type SplitAddressValue } from '@/components/ui/SplitAddressFields';

type Props = {
  onRegistered?: () => void;
  compact?: boolean;
};

const EMPTY_ADDRESS: SplitAddressValue = {
  street: '',
  suburb: '',
  city: '',
  postalCode: '',
};

export function PropertyRegisterForm({ onRegistered, compact }: Props) {
  const [name, setName] = useState('');
  const [addressParts, setAddressParts] = useState<SplitAddressValue>(EMPTY_ADDRESS);
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
      const address = formatSplitAddress(addressParts);
      const res = await clientApi.post<
        ApiResponse<{ id: string; status: string; message?: string }>
      >('/client/properties/register', { name, address, gateCode: gateCode || undefined });
      setMsg(
        res.data?.message ??
          'Property submitted. Our control room will verify and link your alarm & cameras.',
      );
      setName('');
      setAddressParts(EMPTY_ADDRESS);
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
      <SplitAddressFields
        title="Primary site address"
        value={addressParts}
        onChange={setAddressParts}
        showGate
        gateCode={gateCode}
        onGateCodeChange={setGateCode}
        gateLabel="Gate / access notes (optional)"
      />
      {error ? <div className="alert alert--error">{error}</div> : null}
      {msg ? <div className="alert alert--success">{msg}</div> : null}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? <LoadingSpinner label="" size="sm" /> : 'Register property'}
      </button>
    </form>
  );
}

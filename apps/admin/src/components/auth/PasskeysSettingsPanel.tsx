'use client';

import { useEffect, useState } from 'react';
import {
  getSession,
  registerPasskeyForSession,
  type AuthPortal,
} from '@/lib/auth';
import {
  adminApi,
  clientApi,
  officerApi,
  techApi,
  type ApiResponse,
} from '@/lib/api-client';
import { isDemoMode } from '@/lib/demo/is-demo-mode';
import {
  isPasskeySupported,
  listStoredPasskeys,
  mobileBiometricHint,
  mobileBiometricLabel,
  removeStoredPasskey,
  type PasskeyPortal,
  type StoredPasskey,
} from '@/lib/passkeys';

type ApiPasskeyRow = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type PasskeysSettingsPanelProps = {
  portal: AuthPortal;
  className?: string;
};

function apiFor(portal: AuthPortal) {
  if (portal === 'client') return clientApi;
  if (portal === 'officer') return officerApi;
  if (portal === 'technician') return techApi;
  return adminApi;
}

export function PasskeysSettingsPanel({ portal, className }: PasskeysSettingsPanelProps) {
  const session = getSession(portal);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [passkeys, setPasskeys] = useState<StoredPasskey[]>([]);
  const [label, setLabel] = useState('Add Face ID / fingerprint on this phone');
  const [hint, setHint] = useState(
    'Uses Face ID, Touch ID, fingerprint, or a screen lock on this device.',
  );

  useEffect(() => {
    setSupported(isPasskeySupported());
    setLabel(`Add ${mobileBiometricLabel()} on this phone`);
    setHint(mobileBiometricHint());
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPasskeys([]);
      return;
    }
    if (isDemoMode()) {
      setPasskeys(
        listStoredPasskeys(portal as PasskeyPortal, session.user.tenant?.slug ?? 'demo').filter(
          (row) => row.email === session.user.email.toLowerCase(),
        ),
      );
      return;
    }
    void apiFor(portal)
      .get<ApiResponse<ApiPasskeyRow[]>>('/auth/passkey')
      .then((res) => {
        setPasskeys(
          (res.data ?? []).map((row) => ({
            id: row.id,
            credentialId: row.id,
            portal: portal as PasskeyPortal,
            tenantSlug: session.user.tenant?.slug ?? 'demo',
            email: session.user.email,
            userId: session.user.id,
            displayName: row.label,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt ?? undefined,
          })),
        );
      })
      .catch(() => setPasskeys([]));
  }, [portal, session?.user.id, session?.user.email, session?.user.tenant?.slug, msg]);

  async function addPasskey() {
    if (!session) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await registerPasskeyForSession(portal, session);
      setMsg('Saved. Next sign-in can use Face ID, Touch ID, or fingerprint on this phone.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register biometric passkey');
    } finally {
      setBusy(false);
    }
  }

  async function deletePasskey(row: StoredPasskey) {
    setError('');
    setMsg('');
    if (isDemoMode()) {
      removeStoredPasskey(row.credentialId);
      setPasskeys((prev) => prev.filter((p) => p.credentialId !== row.credentialId));
      setMsg('Passkey removed from this phone.');
      return;
    }
    try {
      await apiFor(portal).post(`/auth/passkey/${row.id}/delete`, {});
      setPasskeys((prev) => prev.filter((p) => p.id !== row.id));
      setMsg('Passkey removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove passkey');
    }
  }

  return (
    <section className={className ?? 'portal-card profile-section'}>
      <div className="card-header-row">
        <div className="profile-section__title">
          <h2>Passkeys & biometrics</h2>
          <p className="profile-section__lede">
            {hint} Register once on this device, then unlock 4DS without typing a password.
          </p>
        </div>
        {passkeys.length > 0 ? (
          <span className="status-pill status-pill--ok">{passkeys.length} on this device</span>
        ) : (
          <span className="status-pill">Not set up</span>
        )}
      </div>
      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="alert alert--success" role="status">
          {msg}
        </div>
      ) : null}
      {!supported ? (
        <p className="text-muted">
          This browser or WebView does not support passkeys. Open Safari (iPhone) or Chrome
          (Android) for Face ID / fingerprint sign-in.
        </p>
      ) : (
        <>
          {passkeys.length > 0 ? (
            <ul className="status-list" style={{ marginBottom: '0.75rem' }}>
              {passkeys.map((row) => (
                <li key={row.id} className="status-list-item">
                  <span className="status-list-link">
                    <strong>{row.displayName || 'Phone passkey'}</strong>
                    <span className="text-muted">
                      {' '}
                      · added {new Date(row.createdAt).toLocaleDateString()}
                      {row.lastUsedAt
                        ? ` · last used ${new Date(row.lastUsedAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => void deletePasskey(row)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="btn-primary login-passkey-btn login-passkey-btn--inline"
            disabled={busy || !session}
            onClick={() => void addPasskey()}
          >
            {busy ? 'Waiting for biometric…' : label}
          </button>
        </>
      )}
    </section>
  );
}

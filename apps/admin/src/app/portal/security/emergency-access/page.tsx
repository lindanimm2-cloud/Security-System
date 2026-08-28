'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { DEMO_PASSWORD } from '@/lib/demo/users';

type SessionPayload = {
  sessionId: string;
  token: string;
  expiresAt: string;
  status: string;
  deviceTrusted: boolean;
};

export default function EmergencyAccessPage() {
  return (
    <PortalLayout>
      <EmergencyAccess />
    </PortalLayout>
  );
}

function EmergencyAccess() {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [panic, setPanic] = useState<{ id: string; transmissionStatus: string } | null>(null);
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const ms = new Date(session.expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setSession(null);
        setRemaining('SESSION EXPIRED');
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, '0')} remaining`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  async function openSession(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await clientApi.post<ApiResponse<SessionPayload>>('/client/security/emergency/access', {
        password,
        otp,
        purpose: 'WEB_RECOVERY',
      });
      setSession(res.data);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
    } finally {
      setBusy(false);
    }
  }

  async function requestAssist(kind: 'medical' | 'fire') {
    setBusy(true);
    setError('');
    try {
      await clientApi.post(kind === 'medical' ? '/client/medical/emergency' : '/client/fire/emergency');
      setPanic({ id: kind, transmissionStatus: 'SENT' });
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusy(false);
    }
  }

  async function activatePanic() {
    if (!session) return;
    setBusy(true);
    try {
      const res = await clientApi.post<ApiResponse<{ id: string; transmissionStatus: string }>>(
        '/client/security/emergency/panic',
        {
          emergencySessionToken: session.token,
          source: 'WEB_EMERGENCY_ACCESS',
        },
      );
      setPanic(res.data);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SOP-EACC-01"
        kicker="Schedule B"
        stamp={session ? 'Session · Untrusted' : 'Restricted · Client'}
        title="Emergency access"
        summary="Use this instrument when your primary device is unavailable or marked lost. Strong authentication is required. The session is short-lived and does not add this device as trusted. Authentication is not weakened because this is an emergency."
        toc={[
          { id: 'auth', label: 'Authentication' },
          { id: 'session', label: 'Emergency session' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="auth" number="01" title="Authentication">
          {!session ? (
            <form className="sec-doc-form" onSubmit={openSession}>
              <div className="sec-doc-form__field">
                <label htmlFor="eacc-password">Password</label>
                <input
                  id="eacc-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="sec-doc-form__field">
                <label htmlFor="eacc-otp">OTP / additional verification</label>
                <input
                  id="eacc-otp"
                  className="input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Optional where configured"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>
              <p className="sec-article__note">Demo password: {DEMO_PASSWORD}</p>
              <button type="submit" className="btn-secondary sec-doc-form__submit" disabled={busy}>
                Activate emergency access
              </button>
              {error ? <p className="alert alert--error">{error}</p> : null}
            </form>
          ) : (
            <p>Authentication accepted. Proceed under Article 02.</p>
          )}
        </SecurityArticle>

        <SecurityArticle id="session" number="02" title="Emergency session">
          {!session ? (
            <p className="sec-article__note">No emergency session is open. Complete Article 01 first.</p>
          ) : (
            <>
              <p className="sec-warn">You are using an untrusted device. It will not be added as trusted.</p>
              <dl className="sec-doc-status__grid">
                <div>
                  <dt>Expires</dt>
                  <dd>{new Date(session.expiresAt).toLocaleTimeString()}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{remaining}</dd>
                </div>
              </dl>
              {panic ? (
                <div className="sec-active-panic" role="status">
                  <h3>Panic active</h3>
                  <p>
                    Control room has been notified.
                    {panic.transmissionStatus === 'PENDING_TRANSMISSION'
                      ? ' Connection unavailable — waiting to send.'
                      : ' Alert sent.'}
                  </p>
                </div>
              ) : (
                <div className="sec-execute">
                  <HoldToActivate label="Panic" holdMs={3000} disabled={busy} onActivate={() => void activatePanic()} />
                  <HoldToActivate
                    label="Medical emergency"
                    holdMs={2000}
                    tone="medical"
                    disabled={busy}
                    onActivate={() => void requestAssist('medical')}
                  />
                  <HoldToActivate
                    label="Fire / property emergency"
                    holdMs={2000}
                    tone="warn"
                    disabled={busy}
                    onActivate={() => void requestAssist('fire')}
                  />
                </div>
              )}
              {error ? <p className="alert alert--error">{error}</p> : null}
              <div className="sec-sheet__actions">
                <EmergencyDispatchCallCard name={CONTROL_ROOM_LINE.name} phone={CONTROL_ROOM_LINE.phone} />
                <Link href="/portal/medical">Medical profile</Link>
                <Link href="/portal/security/devices">Mark a device lost</Link>
                <Link href="/portal/security/replace-device">Replace primary</Link>
              </div>
            </>
          )}
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

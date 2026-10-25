'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, updateSessionUser, type AuthSession } from '@/lib/auth';
import { setDemoAccountPassword } from '@/lib/demo/users';
import {
  getActiveEngagementForEmail,
  markJobDetailsDone,
  nextPortalPathAfterAuth,
  updateTempEngagement,
} from '@/lib/temp-engagements';
import { BrandMark } from '@/components/BrandMark';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalSetPasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getSession('client');
    if (!current) {
      router.replace('/portal/login');
      return;
    }
    if (!current.user.mustChangePassword) {
      router.replace('/portal');
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError('');
    if (password.trim().length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setDemoAccountPassword(session.user.email, password, { clearMustChangePassword: true });
    updateSessionUser('client', { mustChangePassword: false });
    const engagement = getActiveEngagementForEmail(session.user.email);
    if (engagement) {
      updateTempEngagement(engagement.id, { mustChangePassword: false });
    }
    setSaving(false);
    if (!engagement) {
      markJobDetailsDone(session.user.email);
    }
    router.replace(
      nextPortalPathAfterAuth({
        mustChangePassword: false,
        email: session.user.email,
        engagement,
      }),
    );
  }

  if (!ready || !session) {
    return <LoadingSpinner label="Loading…" fullScreen />;
  }

  return (
    <div className="login-page login-page--v2">
      <LoginPageChrome />
      <div className="login-page__inner">
        <div className="login-card login-card--v2">
          <div className="login-brand login-brand--v2">
            <BrandMark variant="portal" />
            <h1>Create your password</h1>
            <p>Replace the temporary password before using the portal or app.</p>
          </div>
          <form className="login-form login-form--v2" onSubmit={onSubmit}>
            <label className="login-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="login-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" className="login-submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save and continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

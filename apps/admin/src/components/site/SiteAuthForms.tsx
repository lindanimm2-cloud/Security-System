'use client';

import { FormEvent, useState } from 'react';
import {
  oauthClientSignIn,
  registerClient,
  type ClientAuthSource,
} from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingButton } from '@/components/LoadingButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export type SiteAuthMode = 'signin' | 'register';
type OAuthProvider = 'google' | 'apple';

type SiteAuthFormsProps = {
  mode: SiteAuthMode;
  onModeChange: (mode: SiteAuthMode) => void;
  onSignedIn: () => void | Promise<void>;
  /** Email/password sign-in handler from SiteClientProvider */
  onPasswordSignIn: (
    email: string,
    password: string,
    tenantSlug: string,
  ) => Promise<void>;
  authSource?: ClientAuthSource;
  accountKind?: 'store' | 'protection';
  className?: string;
};

export function SiteAuthForms({
  mode,
  onModeChange,
  onSignedIn,
  onPasswordSignIn,
  authSource = 'site',
  accountKind = 'store',
  className = '',
}: SiteAuthFormsProps) {
  const [email, setEmail] = useState(
    mode === 'signin' ? 'client@demo.local' : '',
  );
  const [password, setPassword] = useState(mode === 'signin' ? 'Demo123!' : '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthAccept, setOauthAccept] = useState(false);

  async function finishSession() {
    setCompleting(true);
    try {
      await onSignedIn();
    } catch {
      setCompleting(false);
      throw new Error('Could not finish sign-in.');
    }
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onPasswordSignIn(email, password, tenantSlug);
      await finishSession();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
      setCompleting(false);
    }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept the terms to create an account.');
      return;
    }
    setLoading(true);
    try {
      await registerClient(
        {
          tenantSlug,
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          accountKind,
          acceptTerms: true,
        },
        { authSource },
      );
      await finishSession();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
      setLoading(false);
      setCompleting(false);
    }
  }

  async function onOAuthContinue(e: FormEvent) {
    e.preventDefault();
    if (!oauthProvider) return;
    setError('');
    if (!oauthAccept) {
      setError('Please accept the terms to continue.');
      return;
    }
    setLoading(true);
    try {
      await oauthClientSignIn(
        {
          provider: oauthProvider,
          tenantSlug,
          email: oauthEmail.trim(),
          acceptTerms: true,
          accountKind,
        },
        { authSource },
      );
      setOauthProvider(null);
      await finishSession();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
      setCompleting(false);
    }
  }

  function startOAuth(provider: OAuthProvider) {
    setError('');
    setOauthProvider(provider);
    setOauthEmail(email || '');
    setOauthAccept(false);
  }

  if (completing) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        label="Signing you in…"
        hint="Loading your shop account…"
      />
    );
  }

  return (
    <div className={`nx-auth-forms ${className}`.trim()}>
      <div className="nx-auth-tabs" role="tablist" aria-label="Account">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={`nx-auth-tab ${mode === 'signin' ? 'nx-auth-tab--active' : ''}`}
          onClick={() => {
            onModeChange('signin');
            setOauthProvider(null);
            setError('');
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`nx-auth-tab ${mode === 'register' ? 'nx-auth-tab--active' : ''}`}
          onClick={() => {
            onModeChange('register');
            setOauthProvider(null);
            setError('');
            setPassword('');
            setConfirmPassword('');
          }}
        >
          Create account
        </button>
      </div>

      <div className="nx-oauth-row">
        <button
          type="button"
          className="nx-oauth-btn nx-oauth-btn--google"
          onClick={() => startOAuth('google')}
          disabled={loading}
        >
          <GoogleMark />
          Continue with Google
        </button>
        <button
          type="button"
          className="nx-oauth-btn nx-oauth-btn--apple"
          onClick={() => startOAuth('apple')}
          disabled={loading}
        >
          <AppleMark />
          Continue with Apple
        </button>
      </div>

      {oauthProvider && (
        <form className="nx-account-form nx-oauth-panel" onSubmit={onOAuthContinue}>
          <p className="nx-muted">
            Demo {oauthProvider === 'google' ? 'Google' : 'Apple'} sign-in —
            confirm the email for this organisation. Production apps verify the
            real provider token.
          </p>
          <label>
            Email
            <input
              type="email"
              required
              value={oauthEmail}
              onChange={(e) => setOauthEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Organisation / tenant
            <input
              required
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
          </label>
          <label className="nx-check-row">
            <input
              type="checkbox"
              checked={oauthAccept}
              onChange={(e) => setOauthAccept(e.target.checked)}
            />
            <span>I accept the terms of use</span>
          </label>
          {error && <ErrorAlert error={error} />}
          <div className="nx-section-cta">
            <LoadingButton
              type="submit"
              className="nx-btn nx-btn--primary"
              loading={loading}
              loadingLabel="Connecting…"
            >
              {`Continue with ${oauthProvider === 'google' ? 'Google' : 'Apple'}`}
            </LoadingButton>
            <button
              type="button"
              className="nx-btn nx-btn--ghost"
              onClick={() => setOauthProvider(null)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!oauthProvider && (
        <>
          <div className="nx-auth-divider">
            <span>or use email</span>
          </div>

          {mode === 'signin' ? (
            <form className="nx-account-form" onSubmit={onSignIn}>
              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Organisation / tenant
                <input
                  required
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                />
              </label>
              {error && <ErrorAlert error={error} />}
              <LoadingButton
                type="submit"
                className="nx-btn nx-btn--primary nx-btn--block"
                loading={loading}
                loadingLabel="Signing in…"
              >
                Sign in to account
              </LoadingButton>
              <p className="nx-muted nx-checkout-fineprint">
                Demo: <code>client@demo.local</code> / <code>Demo123!</code> ·
                tenant <code>demo</code>
              </p>
              <button
                type="button"
                className="nx-btn nx-btn--outline nx-btn--block"
                onClick={() => onModeChange('register')}
              >
                Create account
              </button>
            </form>
          ) : (
            <form className="nx-account-form" onSubmit={onRegister}>
              <div className="nx-auth-name-row">
                <label>
                  First name
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              <label>
                Organisation / tenant
                <input
                  required
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                />
              </label>
              <label className="nx-check-row">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>I accept the terms of use and privacy notice</span>
              </label>
              {error && <ErrorAlert error={error} />}
              <LoadingButton
                type="submit"
                className="nx-btn nx-btn--primary nx-btn--block"
                loading={loading}
                loadingLabel="Creating account…"
              >
                Create account
              </LoadingButton>
              <button
                type="button"
                className="nx-btn nx-btn--ghost nx-btn--block"
                onClick={() => onModeChange('signin')}
              >
                Already have an account? Sign in
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.1 6.9l.1.1 6.2 5.2C37.5 41.4 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.9 202.4-.6 3.2-21.1 71.9-69.8 141.9-42.4 61.1-86.4 122.1-155.7 122.1s-87.7-39.5-168.1-39.5c-78.2 0-105.2 40.8-168.9 40.8s-106.6-56.5-155.7-127.1C46.7 790.7 0 663 0 541.8c0-219.2 142.3-335.8 282.9-335.8 74.5 0 136.5 48.9 182.1 48.9 43.6 0 111.9-52.1 194.7-52.1 31.5-.1 115.5 8.6 178.4 66.1zm-246-149.9c36.7-43.6 62.5-104.3 62.5-164.9 0-8.4-.8-16.9-2.4-24.1-59.7 2.2-130.9 39.9-173.9 89.6-33.9 39-71.1 101.3-71.1 163.3 0 9.1 1.6 18.2 2.4 21.2 4.1.4 10.5.8 16.9.8 53.3 0 120.6-35.7 165.6-85.9z" />
    </svg>
  );
}

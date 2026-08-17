'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  AuthPortal,
  login,
  oauthClientSignIn,
} from '@/lib/auth';
import { applyTabTitle, bootTabSession } from '@/lib/tab-session';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { adminHomeForRole } from '@/lib/admin-home';
import { BrandMark } from './BrandMark';
import { ButtonSpinner } from './ButtonSpinner';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemeToggle } from './ThemeToggle';
import { SketchIcon, type SketchIconName } from './icons/SketchIcon';

type LoginFormProps = {
  portal: AuthPortal;
  title: string;
  subtitle: string;
  redirectTo: string;
  defaultEmail?: string;
  demoEmail?: string;
};

const REMEMBER_KEY = '4ds-login-remember';

const PORTAL_LINKS: {
  label: string;
  href: string;
  icon: SketchIconName;
  portal: AuthPortal;
}[] = [
  { label: 'Control Panel', href: '/login', icon: 'monitor', portal: 'admin' },
  { label: 'Client Portal', href: '/portal/login', icon: 'shield', portal: 'client' },
  { label: 'Officer App', href: '/officer/login', icon: 'officer', portal: 'officer' },
  { label: 'Technician', href: '/tech/login', icon: 'officer', portal: 'technician' },
];

export function LoginForm({
  portal,
  title,
  subtitle,
  redirectTo,
  defaultEmail,
  demoEmail,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const asDeveloper = portal === 'admin' && searchParams.get('as') === 'developer';
  const presetEmail =
    demoEmail ??
    defaultEmail ??
    (asDeveloper
      ? 'developer@4ds.local'
      : portal === 'admin'
        ? 'admin@demo.local'
        : portal === 'officer'
          ? 'ndlovu@4ds.local'
          : portal === 'technician'
            ? 'tech.cameras@4ds.local'
            : 'client@demo.local');
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState('Demo123!');
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(
    null,
  );
  const [oauthAccept, setOauthAccept] = useState(false);

  useEffect(() => {
    bootTabSession();
    applyTabTitle(null, portal);
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { email?: string; tenantSlug?: string; portal?: AuthPortal };
      if (saved.portal === portal) {
        if (saved.email) setEmail(saved.email);
        if (saved.tenantSlug) setTenantSlug(saved.tenantSlug);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, [portal]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await login(portal, email, password, tenantSlug, {
        authSource: portal === 'client' ? 'portal' : undefined,
      });
      applyTabTitle(session, portal);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, tenantSlug, portal }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setRedirecting(true);
      router.push(portal === 'admin' ? adminHomeForRole(session.user.role) : redirectTo);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
    }
  }

  async function handleOAuth(e: FormEvent) {
    e.preventDefault();
    if (!oauthProvider || portal !== 'client') return;
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
          email,
          acceptTerms: true,
          accountKind: 'protection',
        },
        { authSource: 'portal' },
      );
      setRedirecting(true);
      router.push(redirectTo);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
    }
  }

  const otherPortals = PORTAL_LINKS.filter((p) => p.portal !== portal);

  if (redirecting) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        label="Signing you in…"
        hint="Opening your portal — hang tight."
      />
    );
  }

  return (
    <div className="login-page login-page--v2">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="login-page__inner">
        <div className="login-page__logo">
          <BrandMark
            variant={portal === 'admin' ? 'control' : portal === 'officer' ? 'officer' : 'portal'}
            href={false}
            showProduct={false}
          />
        </div>

        <div className="login-card login-card--v2">
          <div className="login-card__icon" aria-hidden>
            <SketchIcon name="shield" size={28} />
          </div>
          <div className="login-brand login-brand--v2">
            <h1>{asDeveloper ? 'Developer sign-in' : title}</h1>
            <p>
              {asDeveloper
                ? 'Platform developer access — error desk, ops visibility, and support chat.'
                : subtitle}
            </p>
          </div>

          {portal === 'client' && (
            <div className="login-oauth">
              <button
                type="button"
                className="login-oauth-btn login-oauth-btn--google"
                disabled={loading}
                onClick={() => {
                  setOauthProvider('google');
                  setOauthAccept(false);
                  setError('');
                }}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="login-oauth-btn login-oauth-btn--apple"
                disabled={loading}
                onClick={() => {
                  setOauthProvider('apple');
                  setOauthAccept(false);
                  setError('');
                }}
              >
                Continue with Apple
              </button>
            </div>
          )}

          {portal === 'client' && oauthProvider && (
            <form onSubmit={handleOAuth} className="login-form login-form--v2 login-oauth-panel">
              <p className="text-muted">
                Confirm your {oauthProvider === 'google' ? 'Google' : 'Apple'} email to continue.
              </p>
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="login-field">
                <span>Organization</span>
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                />
              </label>
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={oauthAccept}
                  onChange={(e) => setOauthAccept(e.target.checked)}
                />
                I accept the terms of use
              </label>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <ButtonSpinner />
                    Connecting…
                  </span>
                ) : (
                  `Continue with ${oauthProvider === 'google' ? 'Google' : 'Apple'}`
                )}
              </button>
              <button
                type="button"
                className="login-forgot"
                onClick={() => setOauthProvider(null)}
              >
                Cancel
              </button>
            </form>
          )}

          {!(portal === 'client' && oauthProvider) && (
          <form onSubmit={handleSubmit} className="login-form login-form--v2">
            {portal !== 'client' && (
              <label className="login-field">
                <span>Organization</span>
                <span className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <SketchIcon name="building" size={18} />
                  </span>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder="demo"
                    required
                  />
                </span>
              </label>
            )}

            <label className="login-field">
              <span>Email</span>
              <span className="login-input-wrap">
                <span className="login-input-icon" aria-hidden>
                  <SketchIcon name="mail" size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </span>
            </label>

            <label className="login-field">
              <span>Password</span>
              <span className="login-input-wrap">
                <span className="login-input-icon" aria-hidden>
                  <SketchIcon name="lock" size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <SketchIcon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </span>
            </label>

            {portal === 'client' && (
              <input type="hidden" value={tenantSlug} readOnly />
            )}

            <div className="login-form__row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              {portal === 'client' && (
                <button type="button" className="login-forgot" onClick={() => setForgotOpen(true)}>
                  Forgot password?
                </button>
              )}
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <ButtonSpinner />
                  Signing in…
                </span>
              ) : (
                <>
                  <SketchIcon name="sign-in" size={18} />
                  Sign in
                </>
              )}
            </button>
          </form>
          )}

          {portal === 'client' && !oauthProvider && (
            <div className="login-register-links">
              <Link href="/portal/register">Have an invite code?</Link>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/portal/register?token=NX-DEMO01">
                Demo code <code>NX-DEMO01</code>
              </Link>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/account?mode=register">Store shop account</Link>
            </div>
          )}

          {portal === 'client' && oauthProvider ? null : (
          <>
          <div className="login-divider">
            <span>or continue as</span>
          </div>

          <div className="login-portal-switch">
            {otherPortals.map((p) => (
              <Link key={p.href} href={p.href} className="login-portal-btn">
                <SketchIcon name={p.icon} size={17} />
                {p.label}
              </Link>
            ))}
          </div>

          <div className="login-demo-hint login-demo-hint--v2">
            Demo:{' '}
            <code>
              {demoEmail ??
                (asDeveloper
                  ? 'developer@4ds.local'
                  : portal === 'admin'
                    ? 'admin@demo.local'
                    : portal === 'officer'
                      ? 'ndlovu@4ds.local'
                      : 'client@demo.local')}
            </code>
            {' / '}<code>Demo123!</code>
            {portal !== 'client' && (
              <>
                {' · '}org <code>demo</code>
              </>
            )}
            {asDeveloper && (
              <>
                {' · '}
                <Link href="/control-room/profile">Developer profile</Link>
              </>
            )}
          </div>
          </>
          )}
        </div>

        <p className="login-footer-note">
          <SketchIcon name="secure" size={15} className="login-footer-note__icon" />
          Secure access · Trusted by 4DS Solutions
        </p>
      </div>

      {forgotOpen && (
        <div className="modal-overlay" onClick={() => setForgotOpen(false)}>
          <div className="modal-card login-forgot-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Forgot your password?</h3>
            <p className="text-muted">
              Password resets are handled by your control room team. Contact 4DS Solutions or your
              account manager — they can set a new password from the control panel under{' '}
              <strong>Customers &amp; Subscriptions</strong>.
            </p>
            <button type="button" className="btn-primary" onClick={() => setForgotOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

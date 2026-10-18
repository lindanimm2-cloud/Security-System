'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import {
  AuthPortal,
  confirmMfaSetup,
  isMfaChallenge,
  login,
  loginWithPasskey,
  oauthClientSignIn,
  passkeysAvailable,
  startMfaSetup,
  verifyMfaLogin,
  type AuthSession,
  type MfaChallenge,
} from '@/lib/auth';
import {
  isConditionalMediationAvailable,
  loginPasskeyButtonLabel,
  mobileBiometricHint,
} from '@/lib/passkeys';
import { applyTabTitle, bootTabSession } from '@/lib/tab-session';
import { clearActionKind, getActionKind, setActionKind } from '@/lib/action-status';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { adminHomeForRole } from '@/lib/admin-home';
import { DEMO_PASSWORD } from '@/lib/demo/users';
import { LegalPolicyLink } from './legal/LegalPolicyLink';
import { BrandMark } from './BrandMark';
import { ButtonSpinner } from './ButtonSpinner';
import { LoadingSpinner } from './LoadingSpinner';
import { LoginPageChrome } from './LoginPageChrome';
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
}[] = [
  { label: 'Control Panel', href: '/login', icon: 'monitor' },
  { label: 'Client Portal', href: '/portal/login', icon: 'shield' },
  { label: 'Officer App', href: '/officer/login', icon: 'officer' },
  { label: 'Technician', href: '/tech/login', icon: 'building' },
  { label: 'Medical', href: '/medical/login', icon: 'secure' },
];

function loginPathFor(portal: AuthPortal, redirectTo: string) {
  if (redirectTo === '/medical' || redirectTo.startsWith('/medical')) return '/medical/login';
  if (portal === 'admin') return '/login';
  if (portal === 'client') return '/portal/login';
  if (portal === 'officer') return '/officer/login';
  return '/tech/login';
}

export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          brand
          fullScreen
          action="page"
          label="Loading sign-in…"
          hints={['Preparing your portal.', 'System updates underway…']}
        />
      }
    >
      <LoginFormInner {...props} />
    </Suspense>
  );
}

function LoginFormInner({
  portal,
  title,
  subtitle,
  redirectTo,
  defaultEmail,
  demoEmail,
}: LoginFormProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [password, setPassword] = useState(DEMO_PASSWORD);
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
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingSessionRole, setPendingSessionRole] = useState<string | null>(null);
  const [pendingPortal, setPendingPortal] = useState<string | null>(null);
  const [passkeyReady, setPasskeyReady] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyLabel, setPasskeyLabel] = useState('Sign in with passkey / biometrics');
  const [passkeyHint, setPasskeyHint] = useState(
    'Uses Windows Hello, Face ID, Touch ID, or a security key on this device.',
  );

  useEffect(() => {
    const pending = getActionKind();
    if (pending === 'sign-out' || pending === 'session-expired') {
      clearActionKind();
    }
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

  useEffect(() => {
    setPendingPortal(null);
  }, [pathname]);

  useEffect(() => {
    setPasskeyReady(passkeysAvailable());
    setPasskeyLabel(loginPasskeyButtonLabel());
    setPasskeyHint(mobileBiometricHint());
  }, []);

  useEffect(() => {
    if (!passkeyReady || mfaChallenge) return;
    let cancelled = false;
    void (async () => {
      const ok = await isConditionalMediationAvailable();
      if (!ok || cancelled) return;
      try {
        const result = await loginWithPasskey(portal, tenantSlug, {
          emailHint: email.trim() || undefined,
          authSource: portal === 'client' ? 'portal' : undefined,
          useBrowserAutofill: true,
        });
        if (cancelled) return;
        if (isMfaChallenge(result)) {
          if (result.kind === 'setup') {
            await beginMfaSetup(result);
          } else {
            setMfaChallenge(result);
            setMfaCode('');
            setBackupCodes(null);
          }
          return;
        }
        finishSignIn(result);
      } catch {
        /* User ignored autofill — password form remains available. */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Autofill once per portal mount; email/tenant updates still work via the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passkeyReady, portal, mfaChallenge]);

  async function handlePasskeyLogin() {
    setError('');
    setPasskeyBusy(true);
    setLoading(true);
    try {
      const result = await loginWithPasskey(portal, tenantSlug, {
        emailHint: email.trim() || undefined,
        authSource: portal === 'client' ? 'portal' : undefined,
      });
      if (isMfaChallenge(result)) {
        if (result.kind === 'setup') {
          await beginMfaSetup(result);
        } else {
          setMfaChallenge(result);
          setMfaCode('');
        }
        setLoading(false);
        setPasskeyBusy(false);
        return;
      }
      finishSignIn(result);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
      setPasskeyBusy(false);
    }
  }

  function finishSignIn(session: AuthSession) {
    applyTabTitle(session, portal);
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, tenantSlug, portal }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    setActionKind('sign-in');
    setRedirecting(true);
    router.push(portal === 'admin' ? adminHomeForRole(session.user.role) : redirectTo);
  }

  async function beginMfaSetup(challenge: MfaChallenge) {
    const started = await startMfaSetup(challenge.mfaToken);
    setSetupSecret(started.secret);
    setSetupUri(started.otpauthUrl);
    setSetupToken(started.mfaToken);
    setMfaChallenge(challenge);
    setMfaCode('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(portal, email, password, tenantSlug, {
        authSource: portal === 'client' ? 'portal' : undefined,
      });
      if (isMfaChallenge(result)) {
        if (result.kind === 'setup') {
          await beginMfaSetup(result);
        } else {
          setMfaChallenge(result);
          setMfaCode('');
        }
        setLoading(false);
        return;
      }
      finishSignIn(result);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: FormEvent) {
    e.preventDefault();
    if (!mfaChallenge) return;
    setError('');
    setLoading(true);
    try {
      if (mfaChallenge.kind === 'setup') {
        const token = setupToken ?? mfaChallenge.mfaToken;
        const { session, backupCodes: codes } = await confirmMfaSetup(
          portal,
          token,
          mfaCode,
          { authSource: portal === 'client' ? 'portal' : undefined },
        );
        setPendingSessionRole(session.user.role);
        applyTabTitle(session, portal);
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, tenantSlug, portal }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        if (codes.length) {
          setBackupCodes(codes);
          setLoading(false);
          return;
        }
        finishSignIn(session);
        return;
      }
      const session = await verifyMfaLogin(portal, mfaChallenge.mfaToken, mfaCode, {
        authSource: portal === 'client' ? 'portal' : undefined,
      });
      finishSignIn(session);
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
      setActionKind('sign-in');
      setRedirecting(true);
      router.push(redirectTo);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
    }
  }

  const currentPath = loginPathFor(portal, redirectTo);
  const otherPortals = PORTAL_LINKS.filter((p) => p.href !== currentPath);

  if (redirecting) {
    return <LoadingSpinner brand fullScreen action="sign-in" />;
  }

  if (backupCodes) {
    return (
      <div className={`login-page login-page--v2${portal === 'admin' ? ' login-page--control-only' : ''}`}>
        <LoginPageChrome />
        <div className="login-page__inner">
          <div className="login-card login-card--v2">
            <div className="login-brand login-brand--v2">
              <h1>Save your backup codes</h1>
              <p>
                Store these codes offline. Each works once if you lose your authenticator.
              </p>
            </div>
            <ul className="login-mfa-backup-list">
              {backupCodes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="login-submit"
              onClick={() => {
                setActionKind('sign-in');
                setBackupCodes(null);
                setRedirecting(true);
                router.push(
                  portal === 'admin'
                    ? adminHomeForRole(pendingSessionRole ?? mfaChallenge?.user.role ?? 'OWNER')
                    : redirectTo,
                );
              }}
            >
              Continue to portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mfaChallenge) {
    const isSetup = mfaChallenge.kind === 'setup';
    return (
      <div className={`login-page login-page--v2${portal === 'admin' ? ' login-page--control-only' : ''}`}>
        <LoginPageChrome />
        <div className="login-page__inner">
          {portal !== 'admin' ? (
            <div className="login-page__logo">
              <BrandMark
                variant={portal === 'officer' ? 'officer' : 'portal'}
                href={false}
                showProduct={false}
              />
            </div>
          ) : null}
          <div className={`login-card login-card--v2${portal === 'admin' ? ' login-card--control' : ''}`}>
            <div className="login-brand login-brand--v2">
              <h1>{isSetup ? 'Set up authenticator' : 'Two-step verification'}</h1>
              <p>
                {isSetup
                  ? 'Add this account in Google Authenticator, Authy, or a compatible app, then enter the 6-digit code.'
                  : 'Enter the 6-digit code from your authenticator app (or a backup code).'}
              </p>
            </div>
            {isSetup && setupSecret && (
              <div className="login-mfa-setup">
                <p className="text-muted">
                  Secret key (manual entry): <code>{setupSecret}</code>
                </p>
                {setupUri && (
                  <p className="text-muted login-mfa-uri">
                    <a href={setupUri}>Open in authenticator</a>
                  </p>
                )}
              </div>
            )}
            <form onSubmit={handleMfaVerify} className="login-form login-form--v2">
              <label className="login-field">
                <span>Authenticator code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                />
              </label>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="login-submit" disabled={loading || mfaCode.length < 6}>
                {loading ? (
                  <span className="btn-loading">
                    <ButtonSpinner />
                    Verifying…
                  </span>
                ) : isSetup ? (
                  'Confirm and continue'
                ) : (
                  'Verify and sign in'
                )}
              </button>
              <button
                type="button"
                className="login-forgot"
                onClick={() => {
                  setMfaChallenge(null);
                  setSetupSecret(null);
                  setSetupUri(null);
                  setSetupToken(null);
                  setMfaCode('');
                  setError('');
                }}
              >
                Back to sign-in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isControlPanel = portal === 'admin';

  return (
    <div className={`login-page login-page--v2${isControlPanel ? ' login-page--control-only' : ''}`}>
      <LoginPageChrome />

      <div className="login-page__inner">
        {!isControlPanel ? (
          <div className="login-page__logo">
            <BrandMark
              variant={portal === 'officer' ? 'officer' : 'portal'}
              href={false}
              showProduct={false}
            />
          </div>
        ) : null}

        <div className={`login-card login-card--v2${isControlPanel ? ' login-card--control' : ''}`}>
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
                <span>
                  I accept the <LegalPolicyLink label="terms of use & privacy notice" />
                </span>
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
            {passkeyReady && !mfaChallenge ? (
              <div className="login-passkey">
                <button
                  type="button"
                  className="login-passkey-btn"
                  disabled={loading || passkeyBusy}
                  onClick={() => void handlePasskeyLogin()}
                >
                  {passkeyBusy ? (
                    <span className="btn-loading">
                      <ButtonSpinner />
                      Waiting for Face ID / fingerprint…
                    </span>
                  ) : (
                    <>
                      <SketchIcon name="secure" size={18} />
                      {passkeyLabel}
                    </>
                  )}
                </button>
                <p className="login-passkey__hint">{passkeyHint}</p>
                <div className="login-divider">
                  <span>or use password</span>
                </div>
              </div>
            ) : null}
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
                  autoComplete="username webauthn"
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

          {/* Control panel /login is card-only — never show other portal links */}
          {!isControlPanel && !(portal === 'client' && oauthProvider) ? (
            <>
              <div className="login-divider">
                <span>or continue as</span>
              </div>

              <div className="login-portal-switch">
                {otherPortals.map((p) => {
                  const waiting = pendingPortal === p.href;
                  return (
                    <Link
                      key={p.href}
                      href={p.href}
                      className={`login-portal-btn${waiting ? ' login-portal-btn--busy' : ''}`}
                      aria-busy={waiting || undefined}
                      aria-label={waiting ? `Loading ${p.label}` : p.label}
                      onClick={(e) => {
                        if (pendingPortal) {
                          e.preventDefault();
                          return;
                        }
                        setPendingPortal(p.href);
                      }}
                    >
                      {waiting ? (
                        <ButtonSpinner />
                      ) : (
                        <>
                          <SketchIcon name={p.icon} size={17} />
                          {p.label}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="login-demo-hint login-demo-hint--v2">
                Demo:{' '}
                <code>
                  {demoEmail ??
                    (portal === 'officer' ? 'ndlovu@4ds.local' : 'client@demo.local')}
                </code>
                {' / '}
                <code>{DEMO_PASSWORD}</code>
                {portal !== 'client' && (
                  <>
                    {' · '}org <code>demo</code>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
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

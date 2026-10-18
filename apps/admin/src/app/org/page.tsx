'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ButtonSpinner } from '@/components/ButtonSpinner';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { LegalPolicyLink } from '@/components/legal/LegalPolicyLink';
import { DEMO_PASSWORD } from '@/lib/demo/users';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import {
  DEMO_ORG_ID,
  activateDemoOrgSession,
  ensureDemoOrgDirectory,
  getOrgSession,
  listOrganizations,
} from '@/lib/org';

const REMEMBER_KEY = '4ds-org-login-remember';

export default function OrgLoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('org.admin@demo.local');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [orgSlug, setOrgSlug] = useState('demo');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ensureDemoOrgDirectory();
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { email?: string; orgSlug?: string };
        if (saved.email) setEmail(saved.email);
        if (saved.orgSlug) setOrgSlug(saved.orgSlug);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }

    const existing = getOrgSession();
    if (existing?.activeOrganizationId) {
      router.replace(`/org/${existing.activeOrganizationId}/dashboard`);
      return;
    }
    setReady(true);
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      ensureDemoOrgDirectory();
      const orgs = listOrganizations();
      const slug = orgSlug.trim().toLowerCase();
      const matched =
        orgs.find((o) => o.id === slug || o.id.replace(/^org-/, '') === slug) ??
        orgs.find((o) => o.id === DEMO_ORG_ID) ??
        orgs[0];

      if (!matched) {
        throw new Error('No organization found for that login.');
      }
      if (!password.trim()) {
        throw new Error('Enter your password.');
      }
      // Demo org portal accepts the shared demo password (or any non-empty for local orgs).
      if (password !== DEMO_PASSWORD && matched.id === DEMO_ORG_ID) {
        throw new Error('Invalid email or password.');
      }

      const [firstName, ...rest] = email.split('@')[0]?.split(/[._-]/) ?? ['Org'];
      const session = activateDemoOrgSession({
        email: email.trim().toLowerCase(),
        firstName: firstName ? firstName.replace(/^\w/, (c) => c.toUpperCase()) : 'Org',
        lastName: rest[0] ? rest[0].replace(/^\w/, (c) => c.toUpperCase()) : 'Admin',
        organizationId: matched.id,
      });

      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, orgSlug: slug }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      router.push(`/org/${session.activeOrganizationId}/dashboard`);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'login'));
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="login-page login-page--v2">
        <LoginPageChrome />
        <div className="login-page__inner">
          <div className="login-page__logo">
            <BrandMark variant="portal" href={false} showProduct={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page login-page--v2">
      <LoginPageChrome />
      <div className="login-page__inner">
        <div className="login-page__logo">
          <BrandMark variant="portal" href={false} showProduct={false} />
        </div>
        <div className="login-card login-card--v2">
          <div className="login-brand login-brand--v2">
            <h1>Welcome back</h1>
            <p>Sign in to manage organization security, sites, CCTV, and incidents.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form login-form--v2">
            <label className="login-field">
              <span>Organization</span>
              <span className="login-input-wrap">
                <span className="login-input-icon" aria-hidden>
                  <SketchIcon name="building" size={18} />
                </span>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="demo"
                  required
                  autoComplete="organization"
                />
              </span>
            </label>

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
                  placeholder="you@company.com"
                  required
                  autoComplete="username"
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

            <div className="login-form__row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            {error ? <div className="login-error">{error}</div> : null}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <ButtonSpinner />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-legal text-muted">
            By signing in you agree to the <LegalPolicyLink label="terms of use & privacy notice" />.
          </p>

          <div className="login-register-links">
            <Link href="/portal/register/organisation">Create organization</Link>
            <span className="login-register-links__sep" aria-hidden>
              ·
            </span>
            <Link href="/portal/login">Personal portal</Link>
            <span className="login-register-links__sep" aria-hidden>
              ·
            </span>
            <Link href="/portals">All portals</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

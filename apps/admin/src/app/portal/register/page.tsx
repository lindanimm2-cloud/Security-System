'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ButtonSpinner } from '@/components/ButtonSpinner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SketchIcon } from '@/components/icons/SketchIcon';
import {
  completeClientRegistration,
  fetchClientInvite,
} from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';

const STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal' },
  { id: 3, label: 'Emergency' },
  { id: 4, label: 'Medical' },
  { id: 5, label: 'Review' },
] as const;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

type FormState = {
  tenantSlug: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  bloodType: string;
  allergies: string;
  medications: string;
  emergencyNotes: string;
  acceptTerms: boolean;
};

const INITIAL: FormState = {
  tenantSlug: 'demo',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phone: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  bloodType: '',
  allergies: '',
  medications: '',
  emergencyNotes: '',
  acceptTerms: false,
};

function RegisterWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get('token')?.trim() || '';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [inviteOrg, setInviteOrg] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));
  const [inviteError, setInviteError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setInviteLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setInviteLoading(true);
      setInviteError('');
      try {
        const preview = await fetchClientInvite(inviteToken);
        if (cancelled) return;
        setInviteOrg(preview.tenant.name);
        setForm((prev) => ({
          ...prev,
          email: preview.email,
          firstName: preview.firstName,
          lastName: preview.lastName,
          tenantSlug: preview.tenant.slug,
        }));
      } catch (err) {
        if (!cancelled) {
          setInviteError(friendlyErrorMessage(err, 'action'));
        }
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function submitInviteCode(e: FormEvent) {
    e.preventDefault();
    const code = codeDraft.trim().toUpperCase();
    if (!code) {
      setError('Enter the invite code from your 4DS advisor.');
      return;
    }
    setCodeChecking(true);
    setError('');
    try {
      await fetchClientInvite(code);
      router.replace(`/portal/register?token=${encodeURIComponent(code)}`);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setCodeChecking(false);
    }
  }

  const progressPct = useMemo(() => ((step - 1) / (STEPS.length - 1)) * 100, [step]);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
    setError('');
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!form.email.trim()) return 'Email is required.';
      if (form.password.length < 8) return 'Password must be at least 8 characters.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    if (current === 2) {
      if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
      if (!form.phone.trim()) return 'Phone number is required.';
    }
    if (current === 3) {
      if (!form.emergencyName.trim() || !form.emergencyPhone.trim() || !form.emergencyRelationship.trim()) {
        return 'Emergency contact name, phone, and relationship are required.';
      }
    }
    if (current === 5 && !form.acceptTerms) {
      return 'Please accept the terms to continue.';
    }
    return null;
  }

  function goNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inviteToken) {
      setError('A valid invite code is required.');
      return;
    }
    const msg = validateStep(5);
    if (msg) {
      setError(msg);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const emergencyContact = {
        name: form.emergencyName.trim(),
        phone: form.emergencyPhone.trim(),
        relationship: form.emergencyRelationship.trim(),
      };
      const medical = {
        ...(form.bloodType ? { bloodType: form.bloodType } : {}),
        ...(form.allergies.trim() ? { allergies: form.allergies.trim() } : {}),
        ...(form.medications.trim() ? { medications: form.medications.trim() } : {}),
        ...(form.emergencyNotes.trim() ? { emergencyNotes: form.emergencyNotes.trim() } : {}),
      };
      const hasMedical = Object.keys(medical).length > 0;

      await completeClientRegistration({
        token: inviteToken,
        password: form.password,
        phone: form.phone.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        emergencyContact,
        ...(hasMedical ? { medical } : {}),
        acceptTerms: true,
      });

      router.push('/portal');
      router.refresh();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        label="Creating your account…"
        hint="Signing you into the client portal…"
      />
    );
  }

  if (inviteLoading) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        label="Checking invite…"
        hint="Validating your registration code…"
      />
    );
  }

  if (!inviteToken) {
    return (
      <div className="login-page login-page--v2">
        <div className="login-theme-toggle">
          <ThemeToggle />
        </div>
        <div className="login-page__inner">
          <div className="login-page__logo">
            <BrandMark variant="portal" href={false} showProduct={false} />
          </div>
          <div className="login-card login-card--v2">
            <div className="login-card__icon" aria-hidden>
              <SketchIcon name="shield" size={28} />
            </div>
            <div className="login-brand login-brand--v2">
              <h1>Premium protection invite</h1>
              <p>
                The panic app is for activated premium clients (homes, stores,
                and work sites). Enter the invite code from your 4DS advisor,
                owner, or account manager — then complete your profile.
              </p>
            </div>
            <form className="login-form login-form--v2" onSubmit={submitInviteCode}>
              <label className="login-field">
                <span>Invite code</span>
                <span className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <SketchIcon name="lock" size={18} />
                  </span>
                  <input
                    value={codeDraft}
                    onChange={(e) => {
                      setCodeDraft(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="NX-XXXXXX"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </span>
              </label>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="login-submit" disabled={codeChecking}>
                {codeChecking ? 'Checking…' : 'Continue'}
              </button>
            </form>
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              Demo code: <code>NX-DEMO01</code>
            </p>
            <div className="login-register-links">
              <Link href="/portal/login">Already registered? Sign in</Link>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/account?mode=register">Store shop account</Link>
            </div>
          </div>
          <p className="login-footer-note">
            <SketchIcon name="secure" size={15} className="login-footer-note__icon" />
            Secure access · Trusted by 4DS Solutions
          </p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="login-page login-page--v2">
        <div className="login-theme-toggle">
          <ThemeToggle />
        </div>
        <div className="login-page__inner">
          <div className="login-page__logo">
            <BrandMark variant="portal" href={false} showProduct={false} />
          </div>
          <div className="login-card login-card--v2">
            <h1>Invite unavailable</h1>
            <p className="text-muted">{inviteError}</p>
            <Link href="/portal/register" className="login-submit" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Try another code
            </Link>
            <div className="login-register-links" style={{ marginTop: '1rem' }}>
              <Link href="/portal/login">Sign in</Link>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/account?mode=register">Store shop account</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page login-page--v2 register-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="login-page__inner register-page__inner">
        <div className="login-page__logo">
          <BrandMark variant="portal" href={false} showProduct={false} />
        </div>

        <div className="login-card login-card--v2 register-card">
          <div className="login-card__icon" aria-hidden>
            <SketchIcon name="shield" size={28} />
          </div>
          <div className="login-brand login-brand--v2">
            <h1>Activate panic app access</h1>
            <p>
              Finish your premium protection profile
              {inviteOrg ? ` with ${inviteOrg}` : ''} — personal, emergency, and
              medical details for rapid response.
            </p>
          </div>

          <div className="register-invite-banner" role="status">
            <SketchIcon name="mail" size={16} />
            <span>
              Invite for <strong>{form.email}</strong>
              {inviteOrg ? <> · {inviteOrg}</> : null}
              {' · '}
              Code <strong>{inviteToken}</strong>
            </span>
          </div>

          <nav className="register-progress" aria-label="Registration steps">
            <div className="register-progress__track" aria-hidden>
              <div className="register-progress__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <ol className="register-progress__steps">
              {STEPS.map((s) => (
                <li
                  key={s.id}
                  className={
                    s.id === step
                      ? 'is-current'
                      : s.id < step
                        ? 'is-done'
                        : undefined
                  }
                >
                  <span className="register-progress__num">{s.id}</span>
                  <span className="register-progress__label">{s.label}</span>
                </li>
              ))}
            </ol>
          </nav>

          <form
            className="login-form login-form--v2 register-form"
            onSubmit={step === 5 ? handleSubmit : (e) => { e.preventDefault(); goNext(); }}
          >
            {step === 1 && (
              <>
                <label className="login-field">
                  <span>Email</span>
                  <span className="login-input-wrap">
                    <span className="login-input-icon" aria-hidden>
                      <SketchIcon name="mail" size={18} />
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      placeholder="you@example.com"
                      required
                      readOnly
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
                      type="password"
                      value={form.password}
                      onChange={(e) => patch({ password: e.target.value })}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </span>
                </label>

                <label className="login-field">
                  <span>Confirm password</span>
                  <span className="login-input-wrap">
                    <span className="login-input-icon" aria-hidden>
                      <SketchIcon name="lock" size={18} />
                    </span>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => patch({ confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </span>
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <div className="register-row-2">
                  <label className="login-field">
                    <span>First name</span>
                    <span className="login-input-wrap">
                      <input
                        value={form.firstName}
                        onChange={(e) => patch({ firstName: e.target.value })}
                        required
                        autoComplete="given-name"
                      />
                    </span>
                  </label>
                  <label className="login-field">
                    <span>Last name</span>
                    <span className="login-input-wrap">
                      <input
                        value={form.lastName}
                        onChange={(e) => patch({ lastName: e.target.value })}
                        required
                        autoComplete="family-name"
                      />
                    </span>
                  </label>
                </div>
                <label className="login-field">
                  <span>Phone</span>
                  <span className="login-input-wrap">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="+27 82 000 0000"
                      required
                      autoComplete="tel"
                    />
                  </span>
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <p className="register-step-hint">
                  Who should we contact in an emergency? This is required for protection coverage.
                </p>
                <label className="login-field">
                  <span>Contact name</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.emergencyName}
                      onChange={(e) => patch({ emergencyName: e.target.value })}
                      required
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Contact phone</span>
                  <span className="login-input-wrap">
                    <input
                      type="tel"
                      value={form.emergencyPhone}
                      onChange={(e) => patch({ emergencyPhone: e.target.value })}
                      required
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Relationship</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.emergencyRelationship}
                      onChange={(e) => patch({ emergencyRelationship: e.target.value })}
                      placeholder="Spouse, parent, friend…"
                      required
                    />
                  </span>
                </label>
              </>
            )}

            {step === 4 && (
              <>
                <p className="register-step-hint">
                  Optional but encouraged — helps responders act faster in a medical emergency.
                </p>
                <label className="login-field">
                  <span>Blood type</span>
                  <span className="login-input-wrap">
                    <select
                      value={form.bloodType}
                      onChange={(e) => patch({ bloodType: e.target.value })}
                      className="register-select"
                    >
                      <option value="">Prefer not to say</option>
                      {BLOOD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="login-field">
                  <span>Allergies</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.allergies}
                      onChange={(e) => patch({ allergies: e.target.value })}
                      placeholder="e.g. penicillin"
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Medications</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.medications}
                      onChange={(e) => patch({ medications: e.target.value })}
                      placeholder="Current medications"
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Emergency notes</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.emergencyNotes}
                      onChange={(e) => patch({ emergencyNotes: e.target.value })}
                      placeholder="Anything responders should know"
                    />
                  </span>
                </label>
              </>
            )}

            {step === 5 && (
              <>
                <div className="register-review">
                  <h3>Account</h3>
                  <dl>
                    <dt>Email</dt>
                    <dd>{form.email}</dd>
                    <dt>Name</dt>
                    <dd>
                      {form.firstName} {form.lastName}
                    </dd>
                    <dt>Phone</dt>
                    <dd>{form.phone}</dd>
                  </dl>
                  <h3>Emergency contact</h3>
                  <dl>
                    <dt>Name</dt>
                    <dd>{form.emergencyName}</dd>
                    <dt>Phone</dt>
                    <dd>{form.emergencyPhone}</dd>
                    <dt>Relationship</dt>
                    <dd>{form.emergencyRelationship}</dd>
                  </dl>
                  <h3>Medical</h3>
                  <dl>
                    <dt>Blood type</dt>
                    <dd>{form.bloodType || '—'}</dd>
                    <dt>Allergies</dt>
                    <dd>{form.allergies || '—'}</dd>
                    <dt>Medications</dt>
                    <dd>{form.medications || '—'}</dd>
                    <dt>Notes</dt>
                    <dd>{form.emergencyNotes || '—'}</dd>
                  </dl>
                </div>

                <label className="login-remember register-terms">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => patch({ acceptTerms: e.target.checked })}
                  />
                  <span>
                    I accept the protection service terms and confirm my details are accurate.
                  </span>
                </label>
              </>
            )}

            {error && <div className="login-error">{error}</div>}

            <div className="register-actions">
              {step > 1 ? (
                <button type="button" className="btn-ghost register-actions__back" onClick={goBack}>
                  Back
                </button>
              ) : (
                <Link href="/portal/login" className="btn-ghost register-actions__back">
                  Sign in
                </Link>
              )}

              {step < 5 ? (
                <button type="submit" className="login-submit register-actions__next">
                  Continue
                  <SketchIcon name="sign-in" size={16} />
                </button>
              ) : (
                <button type="submit" className="login-submit register-actions__next" disabled={submitting}>
                  {submitting ? (
                    <span className="btn-loading">
                      <ButtonSpinner />
                      Creating account…
                    </span>
                  ) : (
                    <>
                      <SketchIcon name="secure" size={18} />
                      Complete registration
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="login-footer-note">
          <SketchIcon name="secure" size={15} className="login-footer-note__icon" />
          Secure access · Trusted by 4DS Solutions
        </p>
      </div>
    </div>
  );
}

export default function PortalRegisterPage() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          brand
          fullScreen
          label="Loading registration…"
          hint="Preparing your invite wizard…"
        />
      }
    >
      <RegisterWizard />
    </Suspense>
  );
}

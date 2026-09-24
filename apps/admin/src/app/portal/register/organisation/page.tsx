'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LegalPolicyLink } from '@/components/legal/LegalPolicyLink';
import { UiSelect } from '@/components/ui/UiSelect';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { fetchClientInvite } from '@/lib/auth';
import { setActionKind } from '@/lib/action-status';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import {
  ORG_TYPE_OPTIONS,
  completeOrganizationOnboarding,
  type OrganizationType,
} from '@/lib/org';
import {
  DEFAULT_PHONE_COUNTRY,
  formatInternationalPhone,
  formatSplitAddress,
} from '@/lib/phone-countries';
import { PhoneWithCountryField } from '@/components/ui/PhoneWithCountryField';
import { SplitAddressFields } from '@/components/ui/SplitAddressFields';

type OrgForm = {
  inviteCode: string;
  organisationName: string;
  siteType: OrganizationType;
  primarySiteName: string;
  primaryStreet: string;
  primarySuburb: string;
  primaryCity: string;
  primaryPostalCode: string;
  gateCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhoneCountry: string;
  contactPhone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const INITIAL: OrgForm = {
  inviteCode: '',
  organisationName: '',
  siteType: 'mall',
  primarySiteName: '',
  primaryStreet: '',
  primarySuburb: '',
  primaryCity: '',
  primaryPostalCode: '',
  gateCode: '',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhoneCountry: DEFAULT_PHONE_COUNTRY,
  contactPhone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

export default function OrganisationRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OrgForm>(INITIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [inviteOrg, setInviteOrg] = useState<string | null>(null);

  function patch(partial: Partial<OrgForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
    setError('');
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    const code = form.inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Enter your organisation activation code.');
      return;
    }
    setCodeChecking(true);
    setError('');
    try {
      const preview = await fetchClientInvite(code);
      setInviteOrg(preview.tenant.name);
      patch({
        inviteCode: code,
        contactEmail: preview.email || form.contactEmail,
        contactFirstName: preview.firstName || form.contactFirstName,
        contactLastName: preview.lastName || form.contactLastName,
      });
      setStep(2);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setCodeChecking(false);
    }
  }

  function validateDetails(): string | null {
    if (!form.organisationName.trim()) return 'Organisation / company name is required.';
    if (!form.siteType) return 'Select an organisation type.';
    if (!form.primarySiteName.trim()) return 'Primary site / custom name is required.';
    if (!form.primaryStreet.trim()) return 'Street address is required.';
    if (!form.primarySuburb.trim()) return 'Suburb is required.';
    if (!form.primaryCity.trim()) return 'City / town is required.';
    if (!form.primaryPostalCode.trim()) return 'Postal code is required.';
    if (!form.contactFirstName.trim() || !form.contactLastName.trim()) {
      return 'Contact first and last name are required.';
    }
    if (!form.contactEmail.trim()) return 'Work email is required.';
    if (!form.contactPhone.trim()) return 'Contact phone is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.acceptTerms) return 'Please accept the organisation terms to continue.';
    return null;
  }

  async function submitOrganisation(e: FormEvent) {
    e.preventDefault();
    const msg = validateDetails();
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const typeLabel =
        ORG_TYPE_OPTIONS.find((t) => t.value === form.siteType)?.label ?? form.siteType;
      const { organizationId } = completeOrganizationOnboarding({
        name: form.organisationName.trim(),
        type: form.siteType,
        primaryContactName: `${form.contactFirstName.trim()} ${form.contactLastName.trim()}`.trim(),
        primaryContactEmail: form.contactEmail.trim(),
        primaryContactPhone: formatInternationalPhone(
          form.contactPhoneCountry,
          form.contactPhone,
        ),
        siteName: form.primarySiteName.trim(),
        siteAddress: formatSplitAddress({
          street: form.primaryStreet,
          suburb: form.primarySuburb,
          city: form.primaryCity,
          postalCode: form.primaryPostalCode,
        }),
        siteTypeLabel: typeLabel,
        gateCode: form.gateCode.trim() || undefined,
      });

      setActionKind('sign-in');
      router.replace(`/org/${organizationId}/dashboard`);
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
        action="sign-in"
        label="Activating organisation account…"
        hints={[
          'Creating organization profile…',
          'Preparing multi-site operations…',
          'Opening organization dashboard.',
        ]}
      />
    );
  }

  if (codeChecking) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        action="page"
        label="Checking activation code…"
        hints={[
          'Validating organisation invite.',
          'System updates underway…',
          'Preparing business signup.',
        ]}
      />
    );
  }

  return (
    <div className="login-page login-page--v2 register-page">
      <LoginPageChrome />
      <div className="login-page__inner register-page__inner">
        <div className="login-page__logo">
          <BrandMark variant="portal" href={false} showProduct={false} />
        </div>

        <div className="login-card login-card--v2 register-card">
          <div className="login-card__icon" aria-hidden>
            <SketchIcon name="building" size={28} />
          </div>
          <div className="login-brand login-brand--v2">
            <h1>Organisation activation</h1>
            <p>
              Creates a separate Organization Portal for malls, estates, companies, and multi-site
              properties — not a personal client profile.
              {inviteOrg ? (
                <>
                  {' '}
                  Provider · <strong>{inviteOrg}</strong>.
                </>
              ) : null}
            </p>
          </div>

          {step === 1 ? (
            <form className="login-form login-form--v2" onSubmit={verifyCode}>
              <p className="register-step-hint">
                Use the organisation activation code from your 4DS account manager. Demo:{' '}
                <code>NX-DEMO01</code>
              </p>
              <label className="login-field">
                <span>Activation code</span>
                <span className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <SketchIcon name="lock" size={18} />
                  </span>
                  <input
                    value={form.inviteCode}
                    onChange={(e) => patch({ inviteCode: e.target.value.toUpperCase() })}
                    placeholder="NX-XXXXXX"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </span>
              </label>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="login-submit">
                Continue
              </button>
              <div className="login-register-links" style={{ marginTop: '1rem' }}>
                <Link href="/portal/register">← Personal / household instead</Link>
                <span className="login-register-links__sep" aria-hidden>
                  ·
                </span>
                <Link href="/org">Organization portal</Link>
              </div>
            </form>
          ) : (
            <form className="login-form login-form--v2" onSubmit={submitOrganisation}>
              <p className="register-step-hint">
                Step 2 of 2 — organization details and first site. You will land on the Organization
                Portal dashboard, not the personal panic app.
              </p>

              <label className="login-field">
                <span>Organisation / company name</span>
                <span className="login-input-wrap">
                  <input
                    value={form.organisationName}
                    onChange={(e) => patch({ organisationName: e.target.value })}
                    placeholder="e.g. Gateway Holdings"
                    required
                  />
                </span>
              </label>

              <label className="login-field">
                <span>Organisation type</span>
                <span className="login-input-wrap">
                  <UiSelect
                    value={form.siteType}
                    onChange={(siteType) => patch({ siteType: siteType as OrganizationType })}
                    compact={false}
                    className="form-field-select"
                    ariaLabel="Organisation type"
                    options={ORG_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
                  />
                </span>
              </label>

              <label className="login-field">
                <span>Primary site custom name</span>
                <span className="login-input-wrap">
                  <input
                    value={form.primarySiteName}
                    onChange={(e) => patch({ primarySiteName: e.target.value })}
                    placeholder="e.g. Main mall · North entrance"
                    required
                  />
                </span>
              </label>

              <SplitAddressFields
                variant="login"
                title="Primary site address"
                value={{
                  street: form.primaryStreet,
                  suburb: form.primarySuburb,
                  city: form.primaryCity,
                  postalCode: form.primaryPostalCode,
                }}
                onChange={(next) =>
                  patch({
                    primaryStreet: next.street,
                    primarySuburb: next.suburb,
                    primaryCity: next.city,
                    primaryPostalCode: next.postalCode,
                  })
                }
                showGate
                gateCode={form.gateCode}
                onGateCodeChange={(gateCode) => patch({ gateCode })}
              />

              <div className="register-row-2">
                <label className="login-field">
                  <span>Contact first name</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.contactFirstName}
                      onChange={(e) => patch({ contactFirstName: e.target.value })}
                      required
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Contact last name</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.contactLastName}
                      onChange={(e) => patch({ contactLastName: e.target.value })}
                      required
                    />
                  </span>
                </label>
              </div>

              <label className="login-field">
                <span>Work email</span>
                <span className="login-input-wrap">
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => patch({ contactEmail: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </span>
              </label>

              <PhoneWithCountryField
                label="Contact phone"
                countryIso={form.contactPhoneCountry}
                nationalNumber={form.contactPhone}
                onCountryChange={(contactPhoneCountry) => patch({ contactPhoneCountry })}
                onNumberChange={(contactPhone) => patch({ contactPhone })}
                required
                autoComplete="tel-national"
              />

              <label className="login-field">
                <span>Password</span>
                <span className="login-input-wrap">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => patch({ password: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                </span>
              </label>

              <label className="login-field">
                <span>Confirm password</span>
                <span className="login-input-wrap">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => patch({ confirmPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                </span>
              </label>

              <label className="register-terms">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => patch({ acceptTerms: e.target.checked })}
                />
                <span>
                  I confirm I am authorised to activate the Organization Portal for this organisation
                  and accept the <LegalPolicyLink label="service terms & privacy policy" />.
                </span>
              </label>

              {error && <div className="login-error">{error}</div>}

              <div className="register-actions">
                <button
                  type="button"
                  className="btn-ghost register-actions__back"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                >
                  Back
                </button>
                <button type="submit" className="login-submit register-actions__next">
                  Open organization portal
                  <SketchIcon name="arrow-right" size={16} />
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="login-footer-note">
          <SketchIcon name="secure" size={15} className="login-footer-note__icon" />
          Organization protection · Trusted by 4DS Solutions
        </p>
      </div>
    </div>
  );
}

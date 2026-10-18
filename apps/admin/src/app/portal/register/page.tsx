'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ButtonSpinner } from '@/components/ButtonSpinner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { LegalPolicyLink } from '@/components/legal/LegalPolicyLink';
import { UiSelect } from '@/components/ui/UiSelect';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { completeClientRegistration, fetchClientInvite } from '@/lib/auth';
import { setActionKind } from '@/lib/action-status';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { MEDICAL_AID_SELECT_OPTIONS, showsMedicalAidDetails } from '@/lib/medical-aid';
import { MEDICAL_PROFILE_CONSENT_NOTICE } from '@/lib/device-security';
import { FAMILY_RELATIONSHIP_OPTIONS } from '@/lib/family-relationships';
import { bootstrapRegistrationAssets } from '@/lib/register-bootstrap';
import {
  DEFAULT_PHONE_COUNTRY,
  formatInternationalPhone,
  formatSplitAddress,
} from '@/lib/phone-countries';
import { PhoneWithCountryField } from '@/components/ui/PhoneWithCountryField';

const STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal' },
  { id: 3, label: 'Emergency' },
  { id: 4, label: 'Medical' },
  { id: 5, label: 'Home & vehicle' },
  { id: 6, label: 'Household' },
  { id: 7, label: 'Review' },
] as const;

const REVIEW_STEP = 7;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;
const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Aunt / Uncle',
  'Cousin',
  'Guardian',
  'Caregiver',
  'Neighbor',
  'Friend',
] as const;

const FAMILY_OPTIONS = FAMILY_RELATIONSHIP_OPTIONS.filter((r) => r !== 'Account holder');

const ALARM_SERVICE_OPTIONS = [
  { id: 'evaluation', label: 'Site evaluation' },
  { id: 'install', label: 'New alarm install' },
  { id: 'check', label: 'Existing system check' },
  { id: 'monitoring', label: 'Armed response monitoring' },
  { id: 'cameras', label: 'CCTV / cameras' },
  { id: 'access', label: 'Access control' },
] as const;

const VEHICLE_TRACKING_OPTIONS = [
  { id: 'gps', label: 'GPS tracking' },
  { id: 'dashcam', label: 'Dash cam' },
  { id: 'recovery', label: 'Theft recovery' },
  { id: 'driver', label: 'Driver monitoring' },
  { id: 'geofence', label: 'Geofence alerts' },
  { id: 'immobiliser', label: 'Immobiliser' },
] as const;

function formatPropertyAddress(parts: {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
}) {
  return formatSplitAddress(parts);
}

function toggleIdInList(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

type FamilyDraft = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountry: string;
  phone: string;
  relationship: string;
};

type SafeZoneDraft = {
  id: string;
  name: string;
  radiusM: string;
};

type FormState = {
  tenantSlug: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneCountry: string;
  phone: string;
  emergencyName: string;
  emergencyPhoneCountry: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  includeSecondContact: boolean;
  emergencyName2: string;
  emergencyPhone2Country: string;
  emergencyPhone2: string;
  emergencyRelationship2: string;
  bloodType: string;
  allergies: string;
  medications: string;
  emergencyNotes: string;
  medicalAidType: string;
  medicalAidMemberNumber: string;
  medicalAidPlan: string;
  doctorContact: string;
  includeProperty: boolean;
  propertyName: string;
  propertyStreet: string;
  propertySuburb: string;
  propertyCity: string;
  propertyPostalCode: string;
  propertyGateCode: string;
  dogOnPremises: boolean;
  requestAlarmServices: boolean;
  alarmServiceInterests: string[];
  alarmRequestConfirmed: boolean;
  includeVehicle: boolean;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColour: string;
  requestVehicleTracking: boolean;
  vehicleTrackingInterests: string[];
  vehicleTrackingConfirmed: boolean;
  familyMembers: FamilyDraft[];
  safeZones: SafeZoneDraft[];
  acceptTerms: boolean;
};

const INITIAL: FormState = {
  tenantSlug: 'demo',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phoneCountry: DEFAULT_PHONE_COUNTRY,
  phone: '',
  emergencyName: '',
  emergencyPhoneCountry: DEFAULT_PHONE_COUNTRY,
  emergencyPhone: '',
  emergencyRelationship: '',
  includeSecondContact: false,
  emergencyName2: '',
  emergencyPhone2Country: DEFAULT_PHONE_COUNTRY,
  emergencyPhone2: '',
  emergencyRelationship2: '',
  bloodType: '',
  allergies: '',
  medications: '',
  emergencyNotes: '',
  medicalAidType: '',
  medicalAidMemberNumber: '',
  medicalAidPlan: '',
  doctorContact: '',
  includeProperty: false,
  propertyName: '',
  propertyStreet: '',
  propertySuburb: '',
  propertyCity: '',
  propertyPostalCode: '',
  propertyGateCode: '',
  dogOnPremises: false,
  requestAlarmServices: false,
  alarmServiceInterests: [],
  alarmRequestConfirmed: false,
  includeVehicle: false,
  vehicleRegistration: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleColour: '',
  requestVehicleTracking: false,
  vehicleTrackingInterests: [],
  vehicleTrackingConfirmed: false,
  familyMembers: [],
  safeZones: [],
  acceptTerms: false,
};

function newFamilyDraft(): FamilyDraft {
  return {
    id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: '',
    lastName: '',
    email: '',
    phoneCountry: DEFAULT_PHONE_COUNTRY,
    phone: '',
    relationship: '',
  };
}

function newSafeZoneDraft(): SafeZoneDraft {
  return {
    id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    radiusM: '500',
  };
}

function relationshipSelectValue(value: string) {
  if (!value.trim()) return '';
  return RELATIONSHIP_OPTIONS.includes(value as (typeof RELATIONSHIP_OPTIONS)[number])
    ? value
    : 'Other';
}

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
  const [signupPath, setSignupPath] = useState<'personal' | null>(null);

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
        return 'Primary emergency contact name, phone, and relationship are required.';
      }
      if (form.includeSecondContact) {
        if (
          !form.emergencyName2.trim() ||
          !form.emergencyPhone2.trim() ||
          !form.emergencyRelationship2.trim()
        ) {
          return 'Second contact name, phone, and relationship are required, or remove the second contact.';
        }
      }
    }
    if (current === 5) {
      if (form.includeProperty) {
        if (
          !form.propertyName.trim() ||
          !form.propertyStreet.trim() ||
          !form.propertySuburb.trim() ||
          !form.propertyCity.trim() ||
          !form.propertyPostalCode.trim()
        ) {
          return 'Home / property needs a custom name, street, suburb, city, and postal code — or turn off “Add a home / property”.';
        }
        if (form.requestAlarmServices && !form.alarmRequestConfirmed) {
          if (!form.alarmServiceInterests.length) {
            return 'Select at least one alarm service interest, or turn off the request.';
          }
          return 'Confirm your alarm service request (or turn it off) before continuing.';
        }
      }
      if (form.includeVehicle) {
        if (!form.vehicleRegistration.trim() || !form.vehicleMake.trim() || !form.vehicleModel.trim()) {
          return 'Vehicle registration, make, and model are required, or turn off “Add a vehicle”.';
        }
        if (form.requestVehicleTracking && !form.vehicleTrackingConfirmed) {
          if (!form.vehicleTrackingInterests.length) {
            return 'Select at least one vehicle tracking feature, or turn off the request.';
          }
          return 'Confirm your vehicle tracking request (or turn it off) before continuing.';
        }
      }
    }
    if (current === 6) {
      for (const member of form.familyMembers) {
        if (!member.firstName.trim() || !member.lastName.trim() || !member.email.trim() || !member.relationship.trim()) {
          return 'Each family member needs first name, last name, email, and relationship.';
        }
      }
      for (const zone of form.safeZones) {
        if (!zone.name.trim()) return 'Each safe zone needs a name.';
      }
    }
    if (current === REVIEW_STEP && !form.acceptTerms) {
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
    setStep((s) => Math.min(REVIEW_STEP, s + 1));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  function updateFamily(id: string, partial: Partial<FamilyDraft>) {
    setForm((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    }));
    setError('');
  }

  function updateSafeZone(id: string, partial: Partial<SafeZoneDraft>) {
    setForm((prev) => ({
      ...prev,
      safeZones: prev.safeZones.map((z) => (z.id === id ? { ...z, ...partial } : z)),
    }));
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inviteToken) {
      setError('A valid invite code is required.');
      return;
    }
    const msg = validateStep(REVIEW_STEP);
    if (msg) {
      setError(msg);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const emergencyContact = {
        name: form.emergencyName.trim(),
        phone: formatInternationalPhone(form.emergencyPhoneCountry, form.emergencyPhone),
        relationship: form.emergencyRelationship.trim(),
      };
      const emergencyContact2 =
        form.includeSecondContact &&
        form.emergencyName2.trim() &&
        form.emergencyPhone2.trim() &&
        form.emergencyRelationship2.trim()
          ? {
              name: form.emergencyName2.trim(),
              phone: formatInternationalPhone(form.emergencyPhone2Country, form.emergencyPhone2),
              relationship: form.emergencyRelationship2.trim(),
            }
          : undefined;
      const hasAidDetails = showsMedicalAidDetails(form.medicalAidType);
      const medical = {
        ...(form.bloodType ? { bloodType: form.bloodType } : {}),
        ...(form.allergies.trim() ? { allergies: form.allergies.trim() } : {}),
        ...(form.medications.trim() ? { medications: form.medications.trim() } : {}),
        ...(form.emergencyNotes.trim() ? { emergencyNotes: form.emergencyNotes.trim() } : {}),
        ...(form.doctorContact.trim() ? { doctorContact: form.doctorContact.trim() } : {}),
        ...(form.medicalAidType ? { medicalAidType: form.medicalAidType } : {}),
        ...(hasAidDetails && form.medicalAidMemberNumber.trim()
          ? { medicalAidMemberNumber: form.medicalAidMemberNumber.trim() }
          : {}),
        ...(hasAidDetails && form.medicalAidPlan.trim()
          ? { medicalAidPlan: form.medicalAidPlan.trim() }
          : {}),
      };
      const hasMedical = Object.keys(medical).length > 0;

      const propertyAddress = formatPropertyAddress({
        street: form.propertyStreet,
        suburb: form.propertySuburb,
        city: form.propertyCity,
        postalCode: form.propertyPostalCode,
      });
      const property =
        form.includeProperty && form.propertyName.trim() && propertyAddress
          ? {
              name: form.propertyName.trim(),
              address: propertyAddress,
              gateCode: form.propertyGateCode.trim() || undefined,
              ...(form.dogOnPremises ? { accessNotes: 'Dog on premises.' } : {}),
            }
          : undefined;

      const vehicleYear = form.vehicleYear.trim() ? Number(form.vehicleYear) : undefined;
      const vehicle =
        form.includeVehicle &&
        form.vehicleRegistration.trim() &&
        form.vehicleMake.trim() &&
        form.vehicleModel.trim()
          ? {
              registration: form.vehicleRegistration.trim(),
              make: form.vehicleMake.trim(),
              model: form.vehicleModel.trim(),
              year: Number.isFinite(vehicleYear) ? vehicleYear : undefined,
              colour: form.vehicleColour.trim() || undefined,
            }
          : undefined;

      const familyMembers = form.familyMembers
        .filter((m) => m.firstName.trim() && m.lastName.trim() && m.email.trim())
        .map((m) => ({
          firstName: m.firstName.trim(),
          lastName: m.lastName.trim(),
          email: m.email.trim(),
          phone: m.phone.trim()
            ? formatInternationalPhone(m.phoneCountry || DEFAULT_PHONE_COUNTRY, m.phone)
            : undefined,
          relationship: m.relationship.trim() || 'Other relative',
        }));

      const safeZones = form.safeZones
        .filter((z) => z.name.trim())
        .map((z) => ({
          name: z.name.trim(),
          radiusM: Number(z.radiusM) || 500,
        }));

      await completeClientRegistration({
        token: inviteToken,
        password: form.password,
        phone: formatInternationalPhone(form.phoneCountry, form.phone),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        emergencyContact,
        ...(emergencyContact2 ? { emergencyContact2 } : {}),
        ...(hasMedical ? { medical } : {}),
        ...(property ? { property } : {}),
        ...(vehicle ? { vehicle } : {}),
        ...(familyMembers.length ? { familyMembers } : {}),
        ...(safeZones.length ? { safeZones } : {}),
        acceptTerms: true,
      });

      try {
        await bootstrapRegistrationAssets({
          property,
          vehicle,
          familyMembers,
          safeZones,
        });
      } catch {
        // Account is already created — optional assets can be added later in the portal.
      }

      setActionKind('sign-in');
      router.replace('/portal');
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
        label="Creating your account…"
        hints={[
          'Signing you into the client portal…',
          'System updates underway…',
          'Setting up protection access.',
        ]}
      />
    );
  }

  if (inviteLoading) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        action="page"
        label="Checking your invite…"
        hints={[
          'Validating your registration code.',
          'System updates underway…',
          'Preparing the account wizard.',
        ]}
      />
    );
  }

  if (!inviteToken) {
    if (!signupPath) {
      return (
        <div className="login-page login-page--v2">
          <LoginPageChrome />
          <div className="login-page__inner">
            <div className="login-page__logo">
              <BrandMark variant="portal" href={false} showProduct={false} />
            </div>
            <div className="login-card login-card--v2">
              <div className="login-card__icon" aria-hidden>
                <SketchIcon name="shield" size={28} />
              </div>
              <div className="login-brand login-brand--v2">
                <h1>Activate protection</h1>
                <p>
                  Choose how you want to activate — personal / household panic access, or an
                  organisation account for malls, offices, and multi-site businesses.
                </p>
              </div>
              <div className="register-path-grid">
                <button
                  type="button"
                  className="register-path-card"
                  onClick={() => {
                    setSignupPath('personal');
                    setError('');
                  }}
                >
                  <span className="register-path-card__icon" aria-hidden>
                    <SketchIcon name="secure" size={22} />
                  </span>
                  <strong>Personal / household</strong>
                  <span>Homes, family panic access, vehicles, and medical profile.</span>
                </button>
                <Link href="/portal/register/organisation" className="register-path-card">
                  <span className="register-path-card__icon" aria-hidden>
                    <SketchIcon name="building" size={22} />
                  </span>
                  <strong>Organisation / business</strong>
                  <span>Malls, retail centres, offices, warehouses, and company sites.</span>
                </Link>
              </div>
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

    return (
      <div className="login-page login-page--v2">
        <LoginPageChrome />
        <div className="login-page__inner">
          <div className="login-page__logo">
            <BrandMark variant="portal" href={false} showProduct={false} />
          </div>
          <div className="login-card login-card--v2">
            <div className="login-card__icon" aria-hidden>
              <SketchIcon name="shield" size={28} />
            </div>
            <div className="login-brand login-brand--v2">
              <h1>Personal protection invite</h1>
              <p>
                Enter the invite code from your 4DS advisor, owner, or account manager — then
                complete your household profile (home, vehicle, medical, family).
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
              <button
                type="button"
                className="register-path-back"
                onClick={() => {
                  setSignupPath(null);
                  setError('');
                  setCodeDraft('');
                }}
              >
                ← Other activation options
              </button>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/portal/login">Sign in</Link>
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
        <LoginPageChrome />
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
              <Link href="/portal/register">Personal signup</Link>
              <span className="login-register-links__sep" aria-hidden>
                ·
              </span>
              <Link href="/portal/register/organisation">Organisation signup</Link>
            </div>
          </div>
        </div>
      </div>
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
            <SketchIcon name="shield" size={28} />
          </div>
          <div className="login-brand login-brand--v2">
            <h1>Activate panic app access</h1>
            <p>
              Finish your premium protection profile
              {inviteOrg ? ` with ${inviteOrg}` : ''} — personal, medical, home / property, vehicle,
              family, and safe-zone details for rapid response.
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
                  aria-current={s.id === step ? 'step' : undefined}
                >
                  <span className="register-progress__num" aria-hidden>
                    {s.id}
                  </span>
                  <span className="register-progress__label">{s.label}</span>
                </li>
              ))}
            </ol>
          </nav>

          <form
            className="login-form login-form--v2 register-form"
            onSubmit={step === REVIEW_STEP ? handleSubmit : (e) => { e.preventDefault(); goNext(); }}
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
                <PhoneWithCountryField
                  label="Phone"
                  countryIso={form.phoneCountry}
                  nationalNumber={form.phone}
                  onCountryChange={(phoneCountry) => patch({ phoneCountry })}
                  onNumberChange={(phone) => patch({ phone })}
                  required
                />
              </>
            )}

            {step === 3 && (
              <>
                <p className="register-step-hint">
                  Who should we contact in an emergency? At least one contact is required for
                  protection coverage.
                </p>

                <div className="register-contact-block">
                  <p className="register-contact-block__label">Primary contact</p>
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
                  <PhoneWithCountryField
                    label="Contact phone"
                    countryIso={form.emergencyPhoneCountry}
                    nationalNumber={form.emergencyPhone}
                    onCountryChange={(emergencyPhoneCountry) => patch({ emergencyPhoneCountry })}
                    onNumberChange={(emergencyPhone) => patch({ emergencyPhone })}
                    required
                  />
                  <label className="login-field">
                    <span>Relationship</span>
                    <span className="login-input-wrap">
                      <UiSelect
                        value={relationshipSelectValue(form.emergencyRelationship)}
                        onChange={(value) =>
                          patch({ emergencyRelationship: value === 'Other' ? '' : value })
                        }
                        options={[
                          { value: '', label: 'Select relationship' },
                          ...RELATIONSHIP_OPTIONS.map((option) => ({ value: option, label: option })),
                          { value: 'Other', label: 'Other' },
                        ]}
                        ariaLabel="Primary relationship"
                        compact={false}
                        className="form-field-select"
                      />
                    </span>
                  </label>
                  {relationshipSelectValue(form.emergencyRelationship) === 'Other' && (
                    <label className="login-field">
                      <span>Other relationship</span>
                      <span className="login-input-wrap">
                        <input
                          value={form.emergencyRelationship}
                          onChange={(e) => patch({ emergencyRelationship: e.target.value })}
                          placeholder="e.g. Fiance, godparent, family friend"
                          required
                        />
                      </span>
                    </label>
                  )}
                </div>

                {form.includeSecondContact ? (
                  <div className="register-contact-block">
                    <div className="register-contact-block__head">
                      <p className="register-contact-block__label">Second contact</p>
                      <button
                        type="button"
                        className="register-contact-toggle register-contact-toggle--remove"
                        onClick={() =>
                          patch({
                            includeSecondContact: false,
                            emergencyName2: '',
                            emergencyPhone2Country: DEFAULT_PHONE_COUNTRY,
                            emergencyPhone2: '',
                            emergencyRelationship2: '',
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <label className="login-field">
                      <span>Contact name</span>
                      <span className="login-input-wrap">
                        <input
                          value={form.emergencyName2}
                          onChange={(e) => patch({ emergencyName2: e.target.value })}
                          required
                        />
                      </span>
                    </label>
                    <PhoneWithCountryField
                      label="Contact phone"
                      countryIso={form.emergencyPhone2Country}
                      nationalNumber={form.emergencyPhone2}
                      onCountryChange={(emergencyPhone2Country) => patch({ emergencyPhone2Country })}
                      onNumberChange={(emergencyPhone2) => patch({ emergencyPhone2 })}
                      required
                    />
                    <label className="login-field">
                      <span>Relationship</span>
                      <span className="login-input-wrap">
                        <UiSelect
                          value={relationshipSelectValue(form.emergencyRelationship2)}
                          onChange={(value) =>
                            patch({ emergencyRelationship2: value === 'Other' ? '' : value })
                          }
                          options={[
                            { value: '', label: 'Select relationship' },
                            ...RELATIONSHIP_OPTIONS.map((option) => ({
                              value: option,
                              label: option,
                            })),
                            { value: 'Other', label: 'Other' },
                          ]}
                          ariaLabel="Second relationship"
                          compact={false}
                          className="form-field-select"
                        />
                      </span>
                    </label>
                    {relationshipSelectValue(form.emergencyRelationship2) === 'Other' && (
                      <label className="login-field">
                        <span>Other relationship</span>
                        <span className="login-input-wrap">
                          <input
                            value={form.emergencyRelationship2}
                            onChange={(e) => patch({ emergencyRelationship2: e.target.value })}
                            placeholder="e.g. Fiance, godparent, family friend"
                            required
                          />
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="register-contact-toggle"
                    onClick={() => patch({ includeSecondContact: true })}
                  >
                    + Add second contact
                  </button>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <p className="register-step-hint">
                  Optional — blood type, SA medical aid, and notes are shared with first responders
                  during medical emergencies only.
                </p>
                <label className="login-field">
                  <span>Blood type</span>
                  <span className="login-input-wrap">
                    <UiSelect
                      value={form.bloodType}
                      onChange={(bloodType) => patch({ bloodType })}
                      compact={false}
                      className="form-field-select"
                      ariaLabel="Blood type"
                      options={[
                        { value: '', label: 'Prefer not to say' },
                        ...BLOOD_TYPES.map((type) => ({ value: type, label: type })),
                      ]}
                    />
                  </span>
                </label>
                <label className="login-field">
                  <span>Medical aid</span>
                  <span className="login-input-wrap">
                    <UiSelect
                      value={form.medicalAidType}
                      onChange={(medicalAidType) => {
                        if (showsMedicalAidDetails(medicalAidType)) {
                          patch({ medicalAidType });
                        } else {
                          patch({
                            medicalAidType,
                            medicalAidMemberNumber: '',
                            medicalAidPlan: '',
                          });
                        }
                      }}
                      compact={false}
                      className="form-field-select"
                      ariaLabel="Medical aid"
                      options={MEDICAL_AID_SELECT_OPTIONS}
                    />
                  </span>
                </label>
                {showsMedicalAidDetails(form.medicalAidType) ? (
                  <>
                    <label className="login-field">
                      <span>Member number</span>
                      <span className="login-input-wrap">
                        <input
                          value={form.medicalAidMemberNumber}
                          onChange={(e) => patch({ medicalAidMemberNumber: e.target.value })}
                          placeholder="Scheme membership number"
                          autoComplete="off"
                        />
                      </span>
                    </label>
                    <label className="login-field">
                      <span>Plan / option (optional)</span>
                      <span className="login-input-wrap">
                        <input
                          value={form.medicalAidPlan}
                          onChange={(e) => patch({ medicalAidPlan: e.target.value })}
                          placeholder="e.g. Executive, Coastal Saver"
                          autoComplete="off"
                        />
                      </span>
                    </label>
                  </>
                ) : null}
                <p className="register-medical-note">
                  Medical aid and family-doctor details are for first responders during medical
                  emergencies — not used for day-to-day account access.
                </p>
                <label className="login-field">
                  <span>Family doctor (optional)</span>
                  <span className="login-input-wrap">
                    <input
                      value={form.doctorContact}
                      onChange={(e) => patch({ doctorContact: e.target.value })}
                      placeholder="Name and phone"
                      autoComplete="off"
                    />
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
                <p className="register-step-hint">
                  Optional — add a home / property and a vehicle now, or skip and finish later in the
                  portal.
                </p>

                <div className="register-asset-stack">
                  <section className={`register-asset ${form.includeProperty ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="register-asset__toggle"
                      aria-expanded={form.includeProperty}
                      onClick={() =>
                        patch({
                          includeProperty: !form.includeProperty,
                          ...(!form.includeProperty
                            ? {}
                            : {
                                dogOnPremises: false,
                                requestAlarmServices: false,
                                alarmServiceInterests: [],
                                alarmRequestConfirmed: false,
                              }),
                        })
                      }
                    >
                      <span className="register-asset__check" aria-hidden>
                        {form.includeProperty ? '✓' : ''}
                      </span>
                      <span className="register-asset__copy">
                        <strong>Add a home / property</strong>
                        <span>Address details and optional alarm service enquiry</span>
                      </span>
                    </button>

                    {form.includeProperty ? (
                      <div className="register-asset__body">
                        <div className="register-asset__section">
                          <p className="register-asset__section-title">Identity</p>
                          <label className="login-field">
                            <span>Custom name</span>
                            <span className="login-input-wrap">
                              <input
                                value={form.propertyName}
                                onChange={(e) => patch({ propertyName: e.target.value })}
                                placeholder="e.g. Home — Umhlanga"
                              />
                            </span>
                          </label>
                        </div>

                        <div className="register-asset__section">
                          <p className="register-asset__section-title">Address</p>
                          <label className="login-field">
                            <span>Street address</span>
                            <span className="login-input-wrap">
                              <input
                                value={form.propertyStreet}
                                onChange={(e) => patch({ propertyStreet: e.target.value })}
                                placeholder="12 Example Road"
                                autoComplete="street-address"
                              />
                            </span>
                          </label>
                          <div className="register-row-2">
                            <label className="login-field">
                              <span>Suburb</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.propertySuburb}
                                  onChange={(e) => patch({ propertySuburb: e.target.value })}
                                  placeholder="e.g. Umhlanga Rocks"
                                  autoComplete="address-level2"
                                />
                              </span>
                            </label>
                            <label className="login-field">
                              <span>City / town</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.propertyCity}
                                  onChange={(e) => patch({ propertyCity: e.target.value })}
                                  placeholder="e.g. Durban"
                                  autoComplete="address-level1"
                                />
                              </span>
                            </label>
                          </div>
                          <div className="register-row-2">
                            <label className="login-field">
                              <span>Postal code</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.propertyPostalCode}
                                  onChange={(e) =>
                                    patch({
                                      propertyPostalCode: e.target.value.replace(/[^\dA-Za-z ]/g, '').slice(0, 10),
                                    })
                                  }
                                  placeholder="e.g. 4319"
                                  inputMode="numeric"
                                  autoComplete="postal-code"
                                />
                              </span>
                            </label>
                            <label className="login-field">
                              <span>Gate / access code</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.propertyGateCode}
                                  onChange={(e) => patch({ propertyGateCode: e.target.value })}
                                  placeholder="Optional"
                                  autoComplete="off"
                                />
                              </span>
                            </label>
                          </div>

                          <label className="register-service-panel__toggle register-dog-check">
                            <input
                              type="checkbox"
                              checked={form.dogOnPremises}
                              onChange={(e) => patch({ dogOnPremises: e.target.checked })}
                            />
                            <span>
                              <strong>Dog on the premises</strong>
                              <em>Shown to responders before entry</em>
                            </span>
                          </label>
                        </div>

                        <div className="register-service-panel">
                          <label className="register-service-panel__toggle">
                            <input
                              type="checkbox"
                              checked={form.requestAlarmServices}
                              onChange={(e) =>
                                patch({
                                  requestAlarmServices: e.target.checked,
                                  alarmRequestConfirmed: false,
                                  ...(e.target.checked ? {} : { alarmServiceInterests: [] }),
                                })
                              }
                            />
                            <span>
                              <strong>Request alarm system services</strong>
                              <em>Evaluation, check, install, or monitoring quote</em>
                            </span>
                          </label>

                          {form.requestAlarmServices ? (
                            form.alarmRequestConfirmed ? (
                              <div className="register-confirm-wrap">
                                <p className="register-confirm-msg" role="status">
                                  Request received — a 4DS advisor will contact you soon about alarm
                                  services for this property.
                                </p>
                                <button
                                  type="button"
                                  className="register-service-edit"
                                  onClick={() => patch({ alarmRequestConfirmed: false })}
                                >
                                  Edit request
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="register-service-panel__hint">
                                  Select what you&apos;re interested in. Confirming notifies our team —
                                  no obligation.
                                </p>
                                <div className="register-chip-grid" role="group" aria-label="Alarm services">
                                  {ALARM_SERVICE_OPTIONS.map((opt) => {
                                    const active = form.alarmServiceInterests.includes(opt.id);
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        className={`register-chip ${active ? 'is-active' : ''}`}
                                        aria-pressed={active}
                                        onClick={() =>
                                          patch({
                                            alarmServiceInterests: toggleIdInList(
                                              form.alarmServiceInterests,
                                              opt.id,
                                            ),
                                            alarmRequestConfirmed: false,
                                          })
                                        }
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  className="register-service-confirm"
                                  disabled={!form.alarmServiceInterests.length}
                                  onClick={() => patch({ alarmRequestConfirmed: true })}
                                >
                                  Confirm request
                                </button>
                              </>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className={`register-asset ${form.includeVehicle ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="register-asset__toggle"
                      aria-expanded={form.includeVehicle}
                      onClick={() =>
                        patch({
                          includeVehicle: !form.includeVehicle,
                          ...(!form.includeVehicle
                            ? {}
                            : {
                                requestVehicleTracking: false,
                                vehicleTrackingInterests: [],
                                vehicleTrackingConfirmed: false,
                              }),
                        })
                      }
                    >
                      <span className="register-asset__check" aria-hidden>
                        {form.includeVehicle ? '✓' : ''}
                      </span>
                      <span className="register-asset__copy">
                        <strong>Add a vehicle</strong>
                        <span>Registration details and optional tracking enquiry</span>
                      </span>
                    </button>

                    {form.includeVehicle ? (
                      <div className="register-asset__body">
                        <div className="register-asset__section">
                          <p className="register-asset__section-title">Vehicle</p>
                          <label className="login-field">
                            <span>Registration</span>
                            <span className="login-input-wrap">
                              <input
                                value={form.vehicleRegistration}
                                onChange={(e) =>
                                  patch({ vehicleRegistration: e.target.value.toUpperCase() })
                                }
                                placeholder="ND 123-456"
                                autoComplete="off"
                              />
                            </span>
                          </label>
                          <div className="register-row-2">
                            <label className="login-field">
                              <span>Make</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.vehicleMake}
                                  onChange={(e) => patch({ vehicleMake: e.target.value })}
                                  placeholder="e.g. Toyota"
                                />
                              </span>
                            </label>
                            <label className="login-field">
                              <span>Model</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.vehicleModel}
                                  onChange={(e) => patch({ vehicleModel: e.target.value })}
                                  placeholder="e.g. Hilux"
                                />
                              </span>
                            </label>
                          </div>
                          <div className="register-row-2">
                            <label className="login-field">
                              <span>Year (optional)</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.vehicleYear}
                                  onChange={(e) =>
                                    patch({
                                      vehicleYear: e.target.value.replace(/[^\d]/g, '').slice(0, 4),
                                    })
                                  }
                                  placeholder="2024"
                                  inputMode="numeric"
                                />
                              </span>
                            </label>
                            <label className="login-field">
                              <span>Colour (optional)</span>
                              <span className="login-input-wrap">
                                <input
                                  value={form.vehicleColour}
                                  onChange={(e) => patch({ vehicleColour: e.target.value })}
                                  placeholder="e.g. White"
                                />
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="register-service-panel">
                          <label className="register-service-panel__toggle">
                            <input
                              type="checkbox"
                              checked={form.requestVehicleTracking}
                              onChange={(e) =>
                                patch({
                                  requestVehicleTracking: e.target.checked,
                                  vehicleTrackingConfirmed: false,
                                  ...(e.target.checked ? {} : { vehicleTrackingInterests: [] }),
                                })
                              }
                            />
                            <span>
                              <strong>Request vehicle tracking services</strong>
                              <em>Security company GPS, dash cam, recovery, and more</em>
                            </span>
                          </label>

                          {form.requestVehicleTracking ? (
                            form.vehicleTrackingConfirmed ? (
                              <div className="register-confirm-wrap">
                                <p className="register-confirm-msg" role="status">
                                  Request received — a 4DS advisor will contact you soon about vehicle
                                  tracking options.
                                </p>
                                <button
                                  type="button"
                                  className="register-service-edit"
                                  onClick={() => patch({ vehicleTrackingConfirmed: false })}
                                >
                                  Edit request
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="register-service-panel__hint">
                                  Choose features you might want. Confirming notifies our team — no
                                  obligation.
                                </p>
                                <div
                                  className="register-chip-grid"
                                  role="group"
                                  aria-label="Vehicle tracking features"
                                >
                                  {VEHICLE_TRACKING_OPTIONS.map((opt) => {
                                    const active = form.vehicleTrackingInterests.includes(opt.id);
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        className={`register-chip ${active ? 'is-active' : ''}`}
                                        aria-pressed={active}
                                        onClick={() =>
                                          patch({
                                            vehicleTrackingInterests: toggleIdInList(
                                              form.vehicleTrackingInterests,
                                              opt.id,
                                            ),
                                            vehicleTrackingConfirmed: false,
                                          })
                                        }
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  className="register-service-confirm"
                                  disabled={!form.vehicleTrackingInterests.length}
                                  onClick={() => patch({ vehicleTrackingConfirmed: true })}
                                >
                                  Confirm request
                                </button>
                              </>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <p className="register-step-hint">
                  Optional — invite family members and set safe zones (home, school, work). You can finish this later.
                </p>

                <div className="register-optional-card">
                  <div className="register-optional-card__head">
                    <strong>Family members</strong>
                    <button
                      type="button"
                      className="register-contact-toggle"
                      disabled={form.familyMembers.length >= 3}
                      onClick={() =>
                        patch({ familyMembers: [...form.familyMembers, newFamilyDraft()] })
                      }
                    >
                      + Add member
                    </button>
                  </div>
                  {form.familyMembers.length === 0 ? (
                    <p className="register-empty-hint">No family invites yet — skip if you only need your own panic access.</p>
                  ) : null}
                  {form.familyMembers.map((member, index) => (
                    <div key={member.id} className="register-contact-block">
                      <div className="register-contact-block__head">
                        <p className="register-contact-block__label">Member {index + 1}</p>
                        <button
                          type="button"
                          className="register-contact-toggle register-contact-toggle--remove"
                          onClick={() =>
                            patch({
                              familyMembers: form.familyMembers.filter((m) => m.id !== member.id),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <div className="register-row-2">
                        <label className="login-field">
                          <span>First name</span>
                          <span className="login-input-wrap">
                            <input
                              value={member.firstName}
                              onChange={(e) => updateFamily(member.id, { firstName: e.target.value })}
                            />
                          </span>
                        </label>
                        <label className="login-field">
                          <span>Last name</span>
                          <span className="login-input-wrap">
                            <input
                              value={member.lastName}
                              onChange={(e) => updateFamily(member.id, { lastName: e.target.value })}
                            />
                          </span>
                        </label>
                      </div>
                      <label className="login-field">
                        <span>Email</span>
                        <span className="login-input-wrap">
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateFamily(member.id, { email: e.target.value })}
                            placeholder="They will receive an invite"
                          />
                        </span>
                      </label>
                      <div className="register-row-2">
                        <label className="login-field">
                          <span>Phone (optional)</span>
                          <span className="login-input-wrap">
                            <input
                              type="tel"
                              value={member.phone}
                              onChange={(e) => updateFamily(member.id, { phone: e.target.value })}
                            />
                          </span>
                        </label>
                        <label className="login-field">
                          <span>Relationship</span>
                          <span className="login-input-wrap">
                            <UiSelect
                              value={member.relationship}
                              onChange={(relationship) => updateFamily(member.id, { relationship })}
                              compact={false}
                              className="form-field-select"
                              ariaLabel="Family relationship"
                              options={[
                                { value: '', label: 'Select…' },
                                ...FAMILY_OPTIONS.map((r) => ({ value: r, label: r })),
                              ]}
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="register-optional-card">
                  <div className="register-optional-card__head">
                    <strong>Safe zones</strong>
                    <button
                      type="button"
                      className="register-contact-toggle"
                      disabled={form.safeZones.length >= 3}
                      onClick={() => patch({ safeZones: [...form.safeZones, newSafeZoneDraft()] })}
                    >
                      + Add zone
                    </button>
                  </div>
                  {form.safeZones.length === 0 ? (
                    <p className="register-empty-hint">
                      Safe zones use a default Durban map pin for now — refine GPS later under Safe zones.
                    </p>
                  ) : null}
                  {form.safeZones.map((zone, index) => (
                    <div key={zone.id} className="register-contact-block">
                      <div className="register-contact-block__head">
                        <p className="register-contact-block__label">Zone {index + 1}</p>
                        <button
                          type="button"
                          className="register-contact-toggle register-contact-toggle--remove"
                          onClick={() =>
                            patch({ safeZones: form.safeZones.filter((z) => z.id !== zone.id) })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <div className="register-row-2">
                        <label className="login-field">
                          <span>Name</span>
                          <span className="login-input-wrap">
                            <input
                              value={zone.name}
                              onChange={(e) => updateSafeZone(zone.id, { name: e.target.value })}
                              placeholder="e.g. Home, School"
                            />
                          </span>
                        </label>
                        <label className="login-field">
                          <span>Radius (m)</span>
                          <span className="login-input-wrap">
                            <input
                              value={zone.radiusM}
                              onChange={(e) =>
                                updateSafeZone(zone.id, {
                                  radiusM: e.target.value.replace(/[^\d]/g, '').slice(0, 4) || '500',
                                })
                              }
                              inputMode="numeric"
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === REVIEW_STEP && (
              <>
                <p className="register-step-hint">
                  Confirm everything below, then accept the terms to activate access.
                </p>
                <div className="register-review">
                  <section className="register-review__section">
                    <header className="register-review__head">
                      <span className="register-review__icon" aria-hidden>
                        <SketchIcon name="mail" size={16} />
                      </span>
                      <div>
                        <h3>Account</h3>
                        <p>Sign-in identity</p>
                      </div>
                    </header>
                    <dl className="register-review__grid">
                      <div className="register-review__row">
                        <dt>Email</dt>
                        <dd>{form.email || '—'}</dd>
                      </div>
                      <div className="register-review__row">
                        <dt>Name</dt>
                        <dd>
                          {[form.firstName, form.lastName].filter(Boolean).join(' ') || '—'}
                        </dd>
                      </div>
                      <div className="register-review__row">
                        <dt>Phone</dt>
                        <dd>{form.phone || '—'}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="register-review__section">
                    <header className="register-review__head">
                      <span className="register-review__icon" aria-hidden>
                        <SketchIcon name="officer" size={16} />
                      </span>
                      <div>
                        <h3>Emergency contacts</h3>
                        <p>Who we call first</p>
                      </div>
                    </header>
                    <dl className="register-review__grid">
                      <div className="register-review__row register-review__row--full">
                        <dt>Primary</dt>
                        <dd>
                          {[form.emergencyName, form.emergencyPhone, form.emergencyRelationship]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </dd>
                      </div>
                      {form.includeSecondContact && form.emergencyName2.trim() ? (
                        <div className="register-review__row register-review__row--full">
                          <dt>Second</dt>
                          <dd>
                            {[form.emergencyName2, form.emergencyPhone2, form.emergencyRelationship2]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>

                  <section className="register-review__section">
                    <header className="register-review__head">
                      <span className="register-review__icon register-review__icon--medical" aria-hidden>
                        <SketchIcon name="secure" size={16} />
                      </span>
                      <div>
                        <h3>Medical</h3>
                        <p>Authorised responders only</p>
                      </div>
                    </header>
                    <dl className="register-review__grid">
                      <div className="register-review__row">
                        <dt>Blood type</dt>
                        <dd>{form.bloodType || '—'}</dd>
                      </div>
                      <div className="register-review__row">
                        <dt>Medical aid</dt>
                        <dd>{form.medicalAidType || '—'}</dd>
                      </div>
                      {showsMedicalAidDetails(form.medicalAidType) ? (
                        <>
                          <div className="register-review__row">
                            <dt>Member number</dt>
                            <dd>{form.medicalAidMemberNumber || '—'}</dd>
                          </div>
                          <div className="register-review__row">
                            <dt>Plan</dt>
                            <dd>{form.medicalAidPlan || '—'}</dd>
                          </div>
                        </>
                      ) : null}
                      <div className="register-review__row register-review__row--full">
                        <dt>Family doctor</dt>
                        <dd>{form.doctorContact || '—'}</dd>
                      </div>
                      <div className="register-review__row register-review__row--full">
                        <dt>Allergies</dt>
                        <dd>{form.allergies || '—'}</dd>
                      </div>
                      <div className="register-review__row register-review__row--full">
                        <dt>Medications</dt>
                        <dd>{form.medications || '—'}</dd>
                      </div>
                      <div className="register-review__row register-review__row--full">
                        <dt>Notes</dt>
                        <dd>{form.emergencyNotes || '—'}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="register-review__section">
                    <header className="register-review__head">
                      <span className="register-review__icon" aria-hidden>
                        <SketchIcon name="building" size={16} />
                      </span>
                      <div>
                        <h3>Home &amp; vehicle</h3>
                        <p>Property &amp; vehicle</p>
                      </div>
                    </header>
                    <dl className="register-review__grid">
                      <div className="register-review__row register-review__row--full">
                        <dt>Home / property</dt>
                        <dd>
                          {form.includeProperty
                            ? [
                                form.propertyName,
                                formatPropertyAddress({
                                  street: form.propertyStreet,
                                  suburb: form.propertySuburb,
                                  city: form.propertyCity,
                                  postalCode: form.propertyPostalCode,
                                }),
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'
                            : 'Skipped'}
                        </dd>
                      </div>
                      {form.includeProperty && form.dogOnPremises ? (
                        <div className="register-review__row register-review__row--full">
                          <dt>Access note</dt>
                          <dd>Dog on the premises</dd>
                        </div>
                      ) : null}
                      {form.includeProperty && form.alarmRequestConfirmed ? (
                        <div className="register-review__row register-review__row--full">
                          <dt>Alarm enquiry</dt>
                          <dd>
                            {form.alarmServiceInterests
                              .map((id) => ALARM_SERVICE_OPTIONS.find((o) => o.id === id)?.label ?? id)
                              .join(', ')}{' '}
                            — contact soon
                          </dd>
                        </div>
                      ) : null}
                      <div className="register-review__row register-review__row--full">
                        <dt>Vehicle</dt>
                        <dd>
                          {form.includeVehicle
                            ? [form.vehicleRegistration, form.vehicleMake, form.vehicleModel, form.vehicleColour]
                                .filter(Boolean)
                                .join(' · ') || '—'
                            : 'Skipped'}
                        </dd>
                      </div>
                      {form.includeVehicle && form.vehicleTrackingConfirmed ? (
                        <div className="register-review__row register-review__row--full">
                          <dt>Tracking enquiry</dt>
                          <dd>
                            {form.vehicleTrackingInterests
                              .map(
                                (id) => VEHICLE_TRACKING_OPTIONS.find((o) => o.id === id)?.label ?? id,
                              )
                              .join(', ')}{' '}
                            — contact soon
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>

                  <section className="register-review__section">
                    <header className="register-review__head">
                      <span className="register-review__icon" aria-hidden>
                        <SketchIcon name="officer" size={16} />
                      </span>
                      <div>
                        <h3>Household</h3>
                        <p>Family &amp; safe zones</p>
                      </div>
                    </header>
                    <dl className="register-review__grid">
                      <div className="register-review__row register-review__row--full">
                        <dt>Family</dt>
                        <dd>
                          {form.familyMembers.length
                            ? form.familyMembers
                                .map((m) =>
                                  [m.firstName, m.lastName, m.relationship].filter(Boolean).join(' '),
                                )
                                .join(' · ')
                            : 'None'}
                        </dd>
                      </div>
                      <div className="register-review__row register-review__row--full">
                        <dt>Safe zones</dt>
                        <dd>
                          {form.safeZones.length
                            ? form.safeZones.map((z) => `${z.name} (${z.radiusM || 500}m)`).join(' · ')
                            : 'None'}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>

                <label className="register-terms">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => patch({ acceptTerms: e.target.checked })}
                  />
                  <span>
                    I accept the{' '}
                    <LegalPolicyLink label="protection service terms & privacy policy" />,{' '}
                    including medical, home / property, vehicle, family, and safe-zone details I provide for emergency
                    response.
                  </span>
                </label>
                <p className="register-terms-note">{MEDICAL_PROFILE_CONSENT_NOTICE}</p>
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

              {step < REVIEW_STEP ? (
                <button type="submit" className="login-submit register-actions__next">
                  Continue
                  <SketchIcon name="arrow-right" size={16} />
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
          action="page"
          label="Loading registration…"
          hints={[
            'Preparing your invite wizard…',
            'System updates underway…',
          ]}
        />
      }
    >
      <RegisterWizard />
    </Suspense>
  );
}

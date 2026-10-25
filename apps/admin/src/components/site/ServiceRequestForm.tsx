'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { NxDateField, NxTimeField, todayIso } from '@/components/site/NxScheduleFields';
import { UiSelect } from '@/components/ui/UiSelect';
import { isMfaChallenge, login } from '@/lib/auth';
import { formatSplitAddress } from '@/lib/phone-countries';
import {
  activateEngagementPortalAccess,
  createTempEngagement,
  ENGAGEMENT_FLOW_STEPS,
  labelForEngagementKind,
  type TempEngagement,
} from '@/lib/temp-engagements';

type FieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'endDate'
  | 'people'
  | 'pickup'
  | 'destination'
  | 'site';

type FieldError = {
  key: FieldKey;
  section: 'contact' | 'when' | 'people' | 'trip' | 'site';
  label: string;
  message: string;
};

type DetailFlags = ReturnType<typeof detailFieldsFor>;

function addressIncomplete(parts: AddressParts) {
  return !parts.street.trim() || !parts.suburb.trim() || !parts.city.trim();
}

function validateServiceRequest(form: FormState, detail: DetailFlags): FieldError[] {
  const errors: FieldError[] = [];
  if (!form.name.trim()) {
    errors.push({ key: 'name', section: 'contact', label: 'Full name', message: 'Enter your full name' });
  }
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.push({
      key: 'email',
      section: 'contact',
      label: 'Email',
      message: 'Enter a valid email',
    });
  }
  if (!form.phone.trim()) {
    errors.push({ key: 'phone', section: 'contact', label: 'Phone', message: 'Enter a phone number' });
  }
  if (detail.showSchedule) {
    if (!form.date.trim()) {
      errors.push({
        key: 'date',
        section: 'when',
        label: detail.endDate ? 'Start date' : 'Date',
        message: 'Choose a date',
      });
    }
    if (detail.endDate && !form.endDate.trim()) {
      errors.push({
        key: 'endDate',
        section: 'when',
        label: 'End date',
        message: 'Choose an end date',
      });
    }
    if (!detail.endDate && !form.time.trim()) {
      errors.push({
        key: 'time',
        section: 'when',
        label: 'Preferred time',
        message: 'Choose a preferred time',
      });
    }
  }
  if (detail.showPeople) {
    const people = Number(form.people);
    if (!form.people.trim() || !Number.isFinite(people) || people < 1) {
      errors.push({
        key: 'people',
        section: 'people',
        label: 'Number of people',
        message: 'Enter how many people',
      });
    }
  }
  if (detail.showTrip) {
    if (addressIncomplete(form.pickup)) {
      errors.push({
        key: 'pickup',
        section: 'trip',
        label: 'Pickup',
        message: 'Add street, suburb, and city',
      });
    }
    if (addressIncomplete(form.destination)) {
      errors.push({
        key: 'destination',
        section: 'trip',
        label: 'Destination',
        message: 'Add street, suburb, and city',
      });
    }
  }
  if (detail.showLocation && addressIncomplete(form.site)) {
    errors.push({
      key: 'site',
      section: 'site',
      label: detail.locationTitle,
      message: 'Add street, suburb, and city',
    });
  }
  return errors;
}

function sectionTitle(section: FieldError['section']) {
  switch (section) {
    case 'contact':
      return 'Contact details';
    case 'when':
      return 'When';
    case 'people':
      return 'People';
    case 'trip':
      return 'Trip details';
    case 'site':
      return 'Site address';
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

export const SERVICE_OPTIONS = [
  { value: 'private-escort', label: 'Private escort / VIP transport' },
  { value: 'close-protection', label: 'Close protection / bodyguarding' },
  { value: 'personal-protection', label: 'Personal / family protection' },
  { value: 'armed-response', label: 'Armed & rapid response' },
  { value: 'fleet', label: 'Fleet & vehicle recovery' },
  { value: 'install', label: 'CCTV / alarm / access install' },
  { value: 'other', label: 'Something else' },
] as const;

export type ServiceInterest = (typeof SERVICE_OPTIONS)[number]['value'];

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'house', label: 'House / stand-alone home' },
  { value: 'apartment', label: 'Apartment / flat' },
  { value: 'estate', label: 'Estate / complex' },
  { value: 'office', label: 'Office / commercial' },
  { value: 'warehouse', label: 'Warehouse / industrial' },
  { value: 'retail', label: 'Retail / mall unit' },
  { value: 'other', label: 'Other' },
] as const;

type AddressParts = {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  landmark: string;
};

const EMPTY_ADDRESS: AddressParts = {
  street: '',
  suburb: '',
  city: '',
  postalCode: '',
  landmark: '',
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: ServiceInterest;
  date: string;
  time: string;
  endDate: string;
  people: string;
  pickup: AddressParts;
  destination: AddressParts;
  site: AddressParts;
  propertyType: string;
  returnTrip: string;
  vehicles: string;
  message: string;
};

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  interest: 'private-escort',
  date: '',
  time: '',
  endDate: '',
  people: '1',
  pickup: { ...EMPTY_ADDRESS },
  destination: { ...EMPTY_ADDRESS },
  site: { ...EMPTY_ADDRESS },
  propertyType: '',
  returnTrip: 'one-way',
  vehicles: '',
  message: '',
};

function normalizeInterest(value?: string | null): ServiceInterest {
  const match = SERVICE_OPTIONS.find((option) => option.value === value);
  if (match) return match.value;
  if (value === 'protection') return 'personal-protection';
  if (value === 'escort') return 'private-escort';
  if (value === 'supply') return 'other';
  return 'private-escort';
}

function composeAddress(parts: AddressParts) {
  const base = formatSplitAddress(parts);
  const landmark = parts.landmark.trim();
  if (!landmark) return base;
  return base ? `${base} (${landmark})` : landmark;
}

type ServiceRequestFormProps = {
  initialInterest?: string | null;
  className?: string;
};

export function ServiceRequestForm({
  initialInterest,
  className = '',
}: ServiceRequestFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [engagement, setEngagement] = useState<TempEngagement | null>(null);
  const [portalCreds, setPortalCreds] = useState<{ email: string; tempPassword: string } | null>(
    null,
  );
  const [portalError, setPortalError] = useState('');
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    interest: normalizeInterest(initialInterest),
  }));

  useEffect(() => {
    if (!initialInterest) return;
    setForm((prev) => ({ ...prev, interest: normalizeInterest(initialInterest) }));
  }, [initialInterest]);

  const detail = useMemo(() => detailFieldsFor(form.interest), [form.interest]);
  const errorByKey = useMemo(() => {
    const map = new Map<FieldKey, FieldError>();
    for (const error of errors) map.set(error.key, error);
    return map;
  }, [errors]);
  const incompleteSections = useMemo(() => {
    const seen = new Set<FieldError['section']>();
    const sections: { id: FieldError['section']; title: string }[] = [];
    for (const error of errors) {
      if (seen.has(error.section)) continue;
      seen.add(error.section);
      sections.push({ id: error.section, title: sectionTitle(error.section) });
    }
    return sections;
  }, [errors]);

  function clearFieldError(key: FieldKey) {
    setErrors((prev) => prev.filter((error) => error.key !== key));
  }

  function scrollToSection(section: FieldError['section']) {
    const node = formRef.current?.querySelector(`[data-section="${section}"]`);
    if (!(node instanceof HTMLElement)) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.remove('nx-section--flash');
    // Retrigger flash animation
    void node.offsetWidth;
    node.classList.add('nx-section--flash');
    const focusable = node.querySelector<HTMLElement>(
      'input:not([type="hidden"]), button.nx-schedule__trigger, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus({ preventScroll: true });
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (
      key === 'name' ||
      key === 'email' ||
      key === 'phone' ||
      key === 'date' ||
      key === 'time' ||
      key === 'endDate' ||
      key === 'people'
    ) {
      clearFieldError(key);
    }
  }

  function patchAddress(
    key: 'pickup' | 'destination' | 'site',
    field: keyof AddressParts,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    clearFieldError(key);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = validateServiceRequest(form, detail);
    if (nextErrors.length) {
      setErrors(nextErrors);
      window.setTimeout(() => scrollToSection(nextErrors[0].section), 40);
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          interest: form.interest,
          date: form.date,
          time: form.time,
          endDate: form.endDate,
          people: form.people,
          pickup: composeAddress(form.pickup),
          destination: composeAddress(form.destination),
          location: composeAddress(form.site),
          propertyType: form.propertyType || undefined,
          pickupDetails: form.pickup,
          destinationDetails: form.destination,
          siteDetails: form.site,
          returnTrip: form.returnTrip,
          vehicles: form.vehicles,
          message: form.message,
          kind: 'service-request',
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch {
      /* demo / offline — still show confirmation */
    } finally {
      const created = createTempEngagement({
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        kind: form.interest,
        date: form.date,
        time: form.time,
        endDate: form.endDate,
        people: form.people,
        pickup: composeAddress(form.pickup),
        destination: composeAddress(form.destination),
        location: composeAddress(form.site),
        message: form.message,
      });
      setEngagement(created);
      setSubmitting(false);
      setSent(true);
    }
  }

  async function enableWebPortal() {
    if (!engagement || openingPortal) return;
    setPortalError('');
    setOpeningPortal(true);
    const activated = activateEngagementPortalAccess(engagement.id);
    if (!activated) {
      setOpeningPortal(false);
      setPortalError('Could not create temporary portal access. Try again.');
      return;
    }
    setEngagement(activated.engagement);
    setPortalCreds({ email: activated.email, tempPassword: activated.tempPassword });
    try {
      const result = await login('client', activated.email, activated.tempPassword, 'demo', {
        authSource: 'portal',
      });
      if (isMfaChallenge(result)) {
        setOpeningPortal(false);
        setPortalError('Sign in from the client portal login page to continue.');
        return;
      }
      router.push(
        result.user.mustChangePassword ? '/portal/set-password' : '/portal',
      );
    } catch {
      setOpeningPortal(false);
      setPortalError('Portal login failed. Use the credentials below to sign in.');
    }
  }

  if (sent && engagement) {
    const kindLabel = labelForEngagementKind(engagement.kind);
    return (
      <div className={`nx-contact-form nx-engagement-followup ${className}`.trim()}>
        <div className="nx-success">
          Thanks — your {kindLabel.toLowerCase()} request is in. Download the app for live
          check-ins, or enable a temporary web portal login now.
        </div>

        <section className="nx-engagement-flow" aria-label="Engagement flow">
          <h3>Engagement flow</h3>
          <ol>
            {ENGAGEMENT_FLOW_STEPS.map((step, index) => (
              <li key={step}>
                <span className="nx-engagement-flow__n" aria-hidden>
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="nx-engagement-flow__note">
            Evidence-ready timeline if an incident occurs.
          </p>
        </section>

        <div className="nx-engagement-followup__actions">
          <Link
            href={`/apps?from=engagement&id=${encodeURIComponent(engagement.id)}`}
            className="nx-btn nx-btn--primary"
          >
            Download the 4DS app
          </Link>
          {!portalCreds ? (
            <button
              type="button"
              className="nx-btn nx-btn--ghost-light"
              disabled={openingPortal}
              onClick={() => void enableWebPortal()}
            >
              {openingPortal ? 'Opening portal…' : 'Enable web portal access'}
            </button>
          ) : null}
        </div>

        {portalError ? (
          <p className="nx-field-error" role="alert">
            {portalError}
          </p>
        ) : null}

        {portalCreds ? (
          <div className="nx-engagement-creds" role="status">
            <p>
              {openingPortal
                ? 'Signing you into the temporary client portal…'
                : 'Temporary login created. Sign in once, then create your own password.'}
            </p>
            <dl>
              <div>
                <dt>Organisation</dt>
                <dd>
                  <code>demo</code>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <code>{portalCreds.email}</code>
                </dd>
              </div>
              <div>
                <dt>Temp password</dt>
                <dd>
                  <code>{portalCreds.tempPassword}</code>
                </dd>
              </div>
            </dl>
            {!openingPortal ? (
              <button
                type="button"
                className="nx-btn nx-btn--primary"
                onClick={() => void enableWebPortal()}
              >
                Open temp client portal
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      className={`nx-contact-form nx-service-request ${className}`.trim()}
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="nx-service-request__intro">
        <h2>Request a service</h2>
        <p>
          Share the basics — date, people, and locations — so we can quote the
          right detail.
        </p>
      </div>

      {incompleteSections.length > 0 ? (
        <div className="nx-form-errors" role="alert">
          <p>
            {incompleteSections.length === 1
              ? 'Complete 1 incomplete section to submit.'
              : `Complete ${incompleteSections.length} incomplete sections to submit.`}
          </p>
          <div className="nx-form-errors__chips">
            {incompleteSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className="nx-form-errors__chip"
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        data-section="contact"
        className={`nx-service-request__section ${errorByKey.has('name') || errorByKey.has('email') || errorByKey.has('phone') ? 'is-invalid' : ''}`}
      >
        <label className={errorByKey.has('name') ? 'nx-field--invalid' : ''}>
          Full name
          <input
            autoComplete="name"
            aria-invalid={errorByKey.has('name')}
            value={form.name}
            onChange={(e) => patch('name', e.target.value)}
          />
          {errorByKey.get('name') ? (
            <span className="nx-field-error">{errorByKey.get('name')?.message}</span>
          ) : null}
        </label>

        <div className="nx-service-request__row">
          <label className={errorByKey.has('email') ? 'nx-field--invalid' : ''}>
            Email
            <input
              type="email"
              autoComplete="email"
              aria-invalid={errorByKey.has('email')}
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
            />
            {errorByKey.get('email') ? (
              <span className="nx-field-error">{errorByKey.get('email')?.message}</span>
            ) : null}
          </label>
          <label className={errorByKey.has('phone') ? 'nx-field--invalid' : ''}>
            Phone
            <input
              type="tel"
              autoComplete="tel"
              aria-invalid={errorByKey.has('phone')}
              value={form.phone}
              onChange={(e) => patch('phone', e.target.value)}
            />
            {errorByKey.get('phone') ? (
              <span className="nx-field-error">{errorByKey.get('phone')?.message}</span>
            ) : null}
          </label>
        </div>
      </div>

      <label>
        Company <span className="nx-service-request__optional">(optional)</span>
        <input
          autoComplete="organization"
          value={form.company}
          onChange={(e) => patch('company', e.target.value)}
        />
      </label>

      <label>
        Service needed
        <UiSelect
          compact={false}
          ariaLabel="Service needed"
          value={form.interest}
          onChange={(interest) => {
            patch('interest', normalizeInterest(interest));
            setErrors([]);
          }}
          options={[...SERVICE_OPTIONS]}
        />
      </label>

      {detail.showSchedule ? (
        <div
          data-section="when"
          className={`nx-service-request__block ${errorByKey.has('date') || errorByKey.has('time') || errorByKey.has('endDate') ? 'is-invalid' : ''}`}
        >
          <p className="nx-service-request__block-title">When</p>
          <div className="nx-service-request__row nx-service-request__row--schedule">
            <div className={errorByKey.has('date') ? 'nx-field--invalid' : ''}>
              <NxDateField
                label={detail.endDate ? 'Start date' : 'Date'}
                required
                value={form.date}
                min={todayIso()}
                onChange={(date) => {
                  patch('date', date);
                  if (form.endDate && form.endDate < date) patch('endDate', date);
                }}
              />
              {errorByKey.get('date') ? (
                <span className="nx-field-error">{errorByKey.get('date')?.message}</span>
              ) : null}
            </div>
            {detail.endDate ? (
              <div className={errorByKey.has('endDate') ? 'nx-field--invalid' : ''}>
                <NxDateField
                  label="End date"
                  required
                  value={form.endDate}
                  min={form.date || todayIso()}
                  onChange={(endDate) => patch('endDate', endDate)}
                />
                {errorByKey.get('endDate') ? (
                  <span className="nx-field-error">{errorByKey.get('endDate')?.message}</span>
                ) : null}
              </div>
            ) : (
              <div className={errorByKey.has('time') ? 'nx-field--invalid' : ''}>
                <NxTimeField
                  label="Preferred time"
                  required
                  value={form.time}
                  onChange={(time) => patch('time', time)}
                />
                {errorByKey.get('time') ? (
                  <span className="nx-field-error">{errorByKey.get('time')?.message}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {detail.showPeople ? (
        <div
          data-section="people"
          className={`nx-service-request__section ${errorByKey.has('people') ? 'is-invalid' : ''}`}
        >
          <label className={errorByKey.has('people') ? 'nx-field--invalid' : ''}>
            Number of people
            <input
              type="number"
              min={1}
              max={40}
              inputMode="numeric"
              aria-invalid={errorByKey.has('people')}
              value={form.people}
              onChange={(e) => patch('people', e.target.value)}
            />
            {errorByKey.get('people') ? (
              <span className="nx-field-error">{errorByKey.get('people')?.message}</span>
            ) : null}
          </label>
        </div>
      ) : null}

      {detail.showTrip ? (
        <div
          data-section="trip"
          className={`nx-service-request__block ${errorByKey.has('pickup') || errorByKey.has('destination') ? 'is-invalid' : ''}`}
        >
          <p className="nx-service-request__block-title">Trip details</p>

          <AddressSection
            title="Pickup"
            required
            invalid={errorByKey.has('pickup')}
            errorMessage={errorByKey.get('pickup')?.message}
            value={form.pickup}
            streetPlaceholder="e.g. OR Tambo International, Terminal A"
            onChange={(field, value) => patchAddress('pickup', field, value)}
          />

          <AddressSection
            title="Destination"
            required
            invalid={errorByKey.has('destination')}
            errorMessage={errorByKey.get('destination')?.message}
            value={form.destination}
            streetPlaceholder="e.g. 12 West Street or Sandton City"
            onChange={(field, value) => patchAddress('destination', field, value)}
          />

          <label>
            Trip type
            <UiSelect
              compact={false}
              ariaLabel="Trip type"
              value={form.returnTrip}
              onChange={(returnTrip) => patch('returnTrip', returnTrip)}
              options={[
                { value: 'one-way', label: 'One way' },
                { value: 'return', label: 'Return trip' },
                { value: 'standby', label: 'Escort with standby / wait' },
              ]}
            />
          </label>
        </div>
      ) : null}

      {detail.showLocation ? (
        <div
          data-section="site"
          className={`nx-service-request__block ${errorByKey.has('site') ? 'is-invalid' : ''}`}
        >
          <p className="nx-service-request__block-title">
            {detail.locationTitle}
          </p>

          <AddressSection
            title="Site address"
            required
            invalid={errorByKey.has('site')}
            errorMessage={errorByKey.get('site')?.message}
            value={form.site}
            streetPlaceholder="Street / complex / venue"
            onChange={(field, value) => patchAddress('site', field, value)}
          />

          {detail.showPropertyType ? (
            <label>
              Property type{' '}
              <span className="nx-service-request__optional">(optional)</span>
              <UiSelect
                compact={false}
                ariaLabel="Property type"
                value={form.propertyType}
                onChange={(propertyType) => patch('propertyType', propertyType)}
                options={[...PROPERTY_TYPE_OPTIONS]}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {detail.showVehicles ? (
        <label>
          Number of vehicles
          <input
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            value={form.vehicles}
            onChange={(e) => patch('vehicles', e.target.value)}
          />
        </label>
      ) : null}

      <label>
        Extra details{' '}
        <span className="nx-service-request__optional">(optional)</span>
        <textarea
          rows={4}
          placeholder={detail.messagePlaceholder}
          value={form.message}
          onChange={(e) => patch('message', e.target.value)}
        />
      </label>

      <button type="submit" className="nx-btn nx-btn--primary" disabled={submitting}>
        {submitting ? 'Sending…' : 'Submit request'}
      </button>
      <p className="nx-service-request__fine">
        We respond during sales hours (Mon–Fri 08:00–17:00). Urgent security
        emergencies: call the control room.
      </p>
    </form>
  );
}

function AddressSection({
  title,
  required,
  invalid,
  errorMessage,
  value,
  streetPlaceholder,
  onChange,
}: {
  title: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  value: AddressParts;
  streetPlaceholder: string;
  onChange: (field: keyof AddressParts, value: string) => void;
}) {
  return (
    <div className={`nx-service-request__address ${invalid ? 'is-invalid' : ''}`}>
      <p className="nx-service-request__address-title">{title}</p>
      {invalid && errorMessage ? <p className="nx-field-error">{errorMessage}</p> : null}
      <label className={invalid && !value.street.trim() ? 'nx-field--invalid' : ''}>
        Street / place {required ? null : <span className="nx-service-request__optional">(optional)</span>}
        <input
          autoComplete="street-address"
          aria-invalid={invalid && !value.street.trim()}
          placeholder={streetPlaceholder}
          value={value.street}
          onChange={(e) => onChange('street', e.target.value)}
        />
      </label>
      <div className="nx-service-request__row">
        <label className={invalid && !value.suburb.trim() ? 'nx-field--invalid' : ''}>
          Suburb
          <input
            autoComplete="address-level3"
            aria-invalid={invalid && !value.suburb.trim()}
            placeholder="e.g. Sandton"
            value={value.suburb}
            onChange={(e) => onChange('suburb', e.target.value)}
          />
        </label>
        <label className={invalid && !value.city.trim() ? 'nx-field--invalid' : ''}>
          City
          <input
            autoComplete="address-level2"
            aria-invalid={invalid && !value.city.trim()}
            placeholder="e.g. Johannesburg"
            value={value.city}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </label>
      </div>
      <div className="nx-service-request__row">
        <label>
          Postal code <span className="nx-service-request__optional">(optional)</span>
          <input
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="e.g. 2196"
            value={value.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
          />
        </label>
        <label>
          Landmark / gate <span className="nx-service-request__optional">(optional)</span>
          <input
            placeholder="Complex name, gate code hint, terminal…"
            value={value.landmark}
            onChange={(e) => onChange('landmark', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function detailFieldsFor(interest: ServiceInterest) {
  switch (interest) {
    case 'private-escort':
      return {
        showSchedule: true,
        endDate: false,
        showPeople: true,
        showTrip: true,
        showLocation: false,
        showPropertyType: false,
        locationTitle: 'Site address',
        showVehicles: false,
        messagePlaceholder:
          'Flight numbers, luggage, preferred vehicle type, special instructions…',
      };
    case 'close-protection':
      return {
        showSchedule: true,
        endDate: true,
        showPeople: true,
        showTrip: false,
        showLocation: true,
        showPropertyType: true,
        locationTitle: 'Primary venue / base',
        showVehicles: false,
        messagePlaceholder:
          'Principals, risk notes, venues, dress code, or advance requirements…',
      };
    case 'personal-protection':
      return {
        showSchedule: false,
        endDate: false,
        showPeople: true,
        showTrip: false,
        showLocation: true,
        showPropertyType: true,
        locationTitle: 'Home / protection site',
        showVehicles: false,
        messagePlaceholder:
          'Who needs cover, school runs, medical notes, or preferred start date…',
      };
    case 'armed-response':
      return {
        showSchedule: false,
        endDate: false,
        showPeople: false,
        showTrip: false,
        showLocation: true,
        showPropertyType: true,
        locationTitle: 'Protected property',
        showVehicles: false,
        messagePlaceholder: 'Current alarm provider, response expectations, access notes…',
      };
    case 'fleet':
      return {
        showSchedule: false,
        endDate: false,
        showPeople: false,
        showTrip: false,
        showLocation: false,
        showPropertyType: false,
        locationTitle: 'Site address',
        showVehicles: true,
        messagePlaceholder: 'Vehicle types, operating areas, current trackers…',
      };
    case 'install':
      return {
        showSchedule: true,
        endDate: false,
        showPeople: false,
        showTrip: false,
        showLocation: true,
        showPropertyType: true,
        locationTitle: 'Install site',
        showVehicles: false,
        messagePlaceholder: 'Cameras, alarms, access control, or monitoring needs…',
      };
    case 'other':
      return {
        showSchedule: false,
        endDate: false,
        showPeople: false,
        showTrip: false,
        showLocation: false,
        showPropertyType: false,
        locationTitle: 'Site address',
        showVehicles: false,
        messagePlaceholder: 'Tell us what you need…',
      };
    default: {
      const _exhaustive: never = interest;
      return _exhaustive;
    }
  }
}

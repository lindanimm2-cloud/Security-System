'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { NxDateField, NxTimeField, todayIso } from '@/components/site/NxScheduleFields';
import { UiSelect } from '@/components/ui/UiSelect';
import { formatSplitAddress } from '@/lib/phone-countries';
import {
  activateEngagementPortalAccess,
  createTempEngagement,
  ENGAGEMENT_FLOW_STEPS,
  labelForEngagementKind,
  type TempEngagement,
} from '@/lib/temp-engagements';

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
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [engagement, setEngagement] = useState<TempEngagement | null>(null);
  const [portalCreds, setPortalCreds] = useState<{ email: string; tempPassword: string } | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    interest: normalizeInterest(initialInterest),
  }));

  useEffect(() => {
    if (!initialInterest) return;
    setForm((prev) => ({ ...prev, interest: normalizeInterest(initialInterest) }));
  }, [initialInterest]);

  const detail = useMemo(() => detailFieldsFor(form.interest), [form.interest]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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

  function enableWebPortal() {
    if (!engagement) return;
    const activated = activateEngagementPortalAccess(engagement.id);
    if (!activated) return;
    setEngagement(activated.engagement);
    setPortalCreds({ email: activated.email, tempPassword: activated.tempPassword });
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
            <button type="button" className="nx-btn nx-btn--ghost-light" onClick={enableWebPortal}>
              Enable web portal access
            </button>
          ) : null}
        </div>

        {portalCreds ? (
          <div className="nx-engagement-creds" role="status">
            <p>
              Temporary login created. Sign in once, then create your own password.
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
            <Link href="/portal/login" className="nx-btn nx-btn--primary">
              Open client portal login
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
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

      <label>
        Full name
        <input
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => patch('name', e.target.value)}
        />
      </label>

      <div className="nx-service-request__row">
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => patch('email', e.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => patch('phone', e.target.value)}
          />
        </label>
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
          onChange={(interest) => patch('interest', normalizeInterest(interest))}
          options={[...SERVICE_OPTIONS]}
        />
      </label>

      {detail.showSchedule ? (
        <div className="nx-service-request__block">
          <p className="nx-service-request__block-title">When</p>
          <div className="nx-service-request__row nx-service-request__row--schedule">
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
            {detail.endDate ? (
              <NxDateField
                label="End date"
                required
                value={form.endDate}
                min={form.date || todayIso()}
                onChange={(endDate) => patch('endDate', endDate)}
              />
            ) : (
              <NxTimeField
                label="Preferred time"
                required
                value={form.time}
                onChange={(time) => patch('time', time)}
              />
            )}
          </div>
        </div>
      ) : null}

      {detail.showPeople ? (
        <label>
          Number of people
          <input
            type="number"
            required
            min={1}
            max={40}
            inputMode="numeric"
            value={form.people}
            onChange={(e) => patch('people', e.target.value)}
          />
        </label>
      ) : null}

      {detail.showTrip ? (
        <div className="nx-service-request__block">
          <p className="nx-service-request__block-title">Trip details</p>

          <AddressSection
            title="Pickup"
            required
            value={form.pickup}
            streetPlaceholder="e.g. OR Tambo International, Terminal A"
            onChange={(field, value) => patchAddress('pickup', field, value)}
          />

          <AddressSection
            title="Destination"
            required
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
        <div className="nx-service-request__block">
          <p className="nx-service-request__block-title">
            {detail.locationTitle}
          </p>

          <AddressSection
            title="Site address"
            required
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
  value,
  streetPlaceholder,
  onChange,
}: {
  title: string;
  required?: boolean;
  value: AddressParts;
  streetPlaceholder: string;
  onChange: (field: keyof AddressParts, value: string) => void;
}) {
  return (
    <div className="nx-service-request__address">
      <p className="nx-service-request__address-title">{title}</p>
      <label>
        Street / place {required ? null : <span className="nx-service-request__optional">(optional)</span>}
        <input
          required={required}
          autoComplete="street-address"
          placeholder={streetPlaceholder}
          value={value.street}
          onChange={(e) => onChange('street', e.target.value)}
        />
      </label>
      <div className="nx-service-request__row">
        <label>
          Suburb
          <input
            required={required}
            autoComplete="address-level3"
            placeholder="e.g. Sandton"
            value={value.suburb}
            onChange={(e) => onChange('suburb', e.target.value)}
          />
        </label>
        <label>
          City
          <input
            required={required}
            autoComplete="address-level2"
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
    default:
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
  }
}

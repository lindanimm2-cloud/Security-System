'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { UiSelect } from '@/components/ui/UiSelect';

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
  pickup: string;
  destination: string;
  location: string;
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
  pickup: '',
  destination: '',
  location: '',
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kind: 'service-request',
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch {
      /* demo / offline — still show confirmation */
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className={`nx-contact-form ${className}`.trim()}>
        <div className="nx-success">
          Thanks — we have your request details. A Nexus advisor will confirm
          availability and next steps shortly.
        </div>
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
          <div className="nx-service-request__row">
            <label>
              {detail.endDate ? 'Start date' : 'Date'}
              <input
                type="date"
                required
                value={form.date}
                min={todayIso()}
                onChange={(e) => patch('date', e.target.value)}
              />
            </label>
            {detail.endDate ? (
              <label>
                End date
                <input
                  type="date"
                  required
                  value={form.endDate}
                  min={form.date || todayIso()}
                  onChange={(e) => patch('endDate', e.target.value)}
                />
              </label>
            ) : (
              <label>
                Preferred time
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => patch('time', e.target.value)}
                />
              </label>
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
          <label>
            Pickup location
            <input
              required
              placeholder="e.g. OR Tambo International, Terminal A"
              value={form.pickup}
              onChange={(e) => patch('pickup', e.target.value)}
            />
          </label>
          <label>
            Destination
            <input
              required
              placeholder="e.g. Sandton City / private residence"
              value={form.destination}
              onChange={(e) => patch('destination', e.target.value)}
            />
          </label>
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
        <label>
          Primary location / venue
          <input
            required
            placeholder="Address, suburb, or venue name"
            value={form.location}
            onChange={(e) => patch('location', e.target.value)}
          />
        </label>
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

function detailFieldsFor(interest: ServiceInterest) {
  switch (interest) {
    case 'private-escort':
      return {
        showSchedule: true,
        endDate: false,
        showPeople: true,
        showTrip: true,
        showLocation: false,
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
        showVehicles: false,
        messagePlaceholder: 'Site type, current alarm provider, response expectations…',
      };
    case 'fleet':
      return {
        showSchedule: false,
        endDate: false,
        showPeople: false,
        showTrip: false,
        showLocation: false,
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
        showVehicles: false,
        messagePlaceholder: 'Tell us what you need…',
      };
  }
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

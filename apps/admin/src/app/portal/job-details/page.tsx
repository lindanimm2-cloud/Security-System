'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getActiveEngagementForEmail,
  markJobDetailsDone,
  updateTempEngagement,
  type TempEngagement,
} from '@/lib/temp-engagements';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalJobDetailsPage() {
  const router = useRouter();
  const [engagement, setEngagement] = useState<TempEngagement | null>(null);
  const [ready, setReady] = useState(false);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [contactProtocol, setContactProtocol] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  useEffect(() => {
    const session = getSession('client');
    if (!session) {
      router.replace('/portal/login');
      return;
    }
    const active = getActiveEngagementForEmail(session.user.email);
    if (!active) {
      router.replace('/portal');
      return;
    }
    setEngagement(active);
    setEmergencyContactName(active.answers?.emergencyContactName ?? '');
    setEmergencyContactPhone(active.answers?.emergencyContactPhone ?? '');
    setMedicalNotes(active.answers?.medicalNotes ?? '');
    setContactProtocol(active.answers?.contactProtocol ?? '');
    setExtraNotes(active.answers?.extraNotes ?? '');
    setReady(true);
  }, [router]);

  function finish() {
    const session = getSession('client');
    if (session) markJobDetailsDone(session.user.email);
    router.replace('/portal');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!engagement) return;
    updateTempEngagement(engagement.id, {
      answers: {
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
        contactProtocol: contactProtocol.trim() || undefined,
        extraNotes: extraNotes.trim() || undefined,
      },
      questionsCompletedAt: new Date().toISOString(),
    });
    finish();
  }

  if (!ready || !engagement) {
    return <LoadingSpinner label="Loading…" fullScreen />;
  }

  return (
    <PortalLayout>
      <div className="portal-card portal-job-details">
        <header className="card-header-row">
          <div>
            <h1>Job details for control room</h1>
            <p className="text-muted">
              Optional — add anything ops still needs for this temporary engagement. You can skip
              and update later.
            </p>
          </div>
        </header>

        <form className="portal-job-details__form" onSubmit={onSubmit}>
          <label>
            Emergency contact name
            <input
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Emergency contact phone
            <input
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <label>
            Contact protocol
            <input
              value={contactProtocol}
              onChange={(e) => setContactProtocol(e.target.value)}
              placeholder="Who to call first, silent check-ins, code words…"
            />
          </label>
          <label>
            Medical notes
            <textarea
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Allergies, conditions, or meds officers should know"
            />
          </label>
          <label>
            Extra notes
            <textarea
              rows={3}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Gate codes, dress code, VIP preferences…"
            />
          </label>

          <div className="portal-job-details__actions">
            <button type="submit" className="btn-ok">
              Save for control room
            </button>
            <button type="button" className="btn-ghost" onClick={finish}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}

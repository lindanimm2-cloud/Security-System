'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmergencyTestCard } from '@/components/security/EmergencyTestCard';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowTracker } from '@/components/ui/WorkflowTracker';
import { clientApi } from '@/lib/api-client';
import { detectWebNativeSos, getOrCreateLocalDeviceId, NATIVE_SOS_DISCLAIMER } from '@/lib/device-security';

const STEPS = [
  { id: 'register', label: 'Register device' },
  { id: 'protect', label: 'Protection' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'medical', label: 'Medical' },
  { id: 'sos', label: 'Native SOS' },
  { id: 'test', label: 'Test panic' },
  { id: 'done', label: 'Complete' },
];

const INCLUDED = [
  'Panic button',
  'Emergency location',
  'Control room calling',
  'Notifications',
  'Emergency contacts',
  'Medical profile',
  'Native SOS where a real OS integration exists',
];

export default function SetupPage() {
  return (
    <PortalLayout>
      <SetupContent />
    </PortalLayout>
  );
}

function SetupContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const sos = detectWebNativeSos();
  const deviceId = typeof window === 'undefined' ? '' : getOrCreateLocalDeviceId();

  async function register() {
    await clientApi.post('/client/security/devices/register', {
      publicId: deviceId,
      makePrimary: true,
      trustBrowser: true,
      userAgent: navigator.userAgent,
    });
    setStep(1);
  }

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SOP-SETUP-01"
        kicker="Commissioning"
        title="Set up emergency protection"
        summary="Complete each article in order. Native SOS is recorded as a capability, not as a requirement for in-app Panic."
        toc={STEPS.map((item) => ({ id: item.id, label: item.label }))}
      >
        <div className="sec-doc-progress">
          <StatusBadge status={`Article ${step + 1} of ${STEPS.length}`} tone="neutral" />
          <WorkflowTracker steps={STEPS} currentIndex={step} />
        </div>

        {step === 0 ? (
          <SecurityArticle id="register" number="01" title="Register device">
            <p>This browser will become your primary security device. IMEI is not used as the identifier.</p>
            <dl className="sec-doc-status__grid">
              <div>
                <dt>Device ID</dt>
                <dd>{deviceId || '—'}</dd>
              </div>
              <div>
                <dt>App</dt>
                <dd>4.2.1</dd>
              </div>
            </dl>
            <div className="sec-device__actions">
              <button type="button" className="btn-primary" onClick={() => void register()}>
                Register device
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Not my device
              </button>
            </div>
          </SecurityArticle>
        ) : null}

        {step === 1 ? (
          <SecurityArticle id="protect" number="02" title="Included protection">
            <ol className="sec-clauses sec-clauses--tight">
              {INCLUDED.map((item, i) => (
                <li key={item}>
                  <em>2.{i + 1}</em>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>
              Continue
            </button>
          </SecurityArticle>
        ) : null}

        {step === 2 ? (
          <SecurityArticle id="contacts" number="03" title="Contacts">
            <p>Personal contacts stay separate from the 4DS Control Room line.</p>
            <div className="sec-device__actions">
              <button type="button" className="btn-primary" onClick={() => router.push('/portal/contacts')}>
                Open contacts
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </SecurityArticle>
        ) : null}

        {step === 3 ? (
          <SecurityArticle id="medical" number="04" title="Medical profile">
            <p>Medical information is protected and audited. Skip if you do not wish to share it.</p>
            <div className="sec-device__actions">
              <button type="button" className="btn-primary" onClick={() => router.push('/portal/medical')}>
                Open medical profile
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep(4)}>
                Continue
              </button>
            </div>
          </SecurityArticle>
        ) : null}

        {step === 4 ? (
          <SecurityArticle id="sos" number="05" title="Native Emergency SOS">
            <p>
              <StatusBadge status="Not available" tone="warning" /> on this web application.
            </p>
            <p>{sos.note}</p>
            <p className="sec-article__note">{NATIVE_SOS_DISCLAIMER}</p>
            <button type="button" className="btn-primary" onClick={() => setStep(5)}>
              Continue
            </button>
          </SecurityArticle>
        ) : null}

        {step === 5 ? (
          <SecurityArticle id="test" number="06" title="Controlled drill">
            <EmergencyTestCard
              embedded
              onTest={async () => {
                await clientApi.post('/client/security/emergency/test', { source: 'TEST' });
                setStep(6);
              }}
            />
          </SecurityArticle>
        ) : null}

        {step === 6 ? (
          <SecurityArticle id="done" number="07" title="Commissioning complete">
            <p>App Panic is ready. Native SOS remains device-controlled.</p>
            <div className="sec-sheet__actions">
              <button
                type="button"
                className="btn-primary btn-primary--calm"
                onClick={async () => {
                  await clientApi.post('/client/security/setup/complete');
                  router.push('/portal/security');
                }}
              >
                Open protection file
              </button>
              <Link href="/portal/protect">Open Protect</Link>
            </div>
          </SecurityArticle>
        ) : null}
      </SecurityDocFrame>
    </div>
  );
}

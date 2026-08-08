'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

export default function EmergencyPage() {
  return (
    <PortalLayout>
      <EmergencyContent />
    </PortalLayout>
  );
}

function EmergencyContent() {
  const { data: contactsMeta } = useApi(
    () =>
      clientApi.get<
        ApiResponse<unknown> & { meta?: { dispatchLine: { name: string; phone: string } } }
      >('/client/contacts'),
    [],
  );

  const [panicLoading, setPanicLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const anyLoading = panicLoading || silentLoading || medicalLoading || fireLoading;

  async function trigger(silent: boolean) {
    if (silent) setSilentLoading(true);
    else setPanicLoading(true);
    setMsg('');
    try {
      await clientApi.post('/client/panic', { silent });
      setMsg(silent ? 'Silent alert sent to control room.' : 'Panic alert sent. Help is on the way.');
    } finally {
      setPanicLoading(false);
      setSilentLoading(false);
    }
  }

  async function requestAmbulance() {
    setMedicalLoading(true);
    setMsg('');
    try {
      await clientApi.post('/client/medical/emergency');
      setMsg('Ambulance requested. Medical profile shared with responders.');
    } finally {
      setMedicalLoading(false);
    }
  }

  async function requestFire() {
    setFireLoading(true);
    setMsg('');
    try {
      await clientApi.post('/client/fire/emergency');
      setMsg('Fire response requested. Fire unit and dispatch notified.');
    } finally {
      setFireLoading(false);
    }
  }

  return (
    <FeatureHub
      title="Emergency Hub"
      subtitle="One-touch emergency activation and discreet silent alerts."
      features={[
        { title: 'Panic Button', description: 'Immediately alerts the control room with your details and location.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Activate below' },
        { title: 'Silent Panic', description: 'Discreet activation — appears normal on device while notifying dispatch.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Activate below' },
        { title: 'Emergency Contacts', description: 'Trusted contacts who receive alerts during emergencies.', href: '/portal/contacts', action: 'Manage contacts' },
        { title: 'Medical Emergency', description: 'Automatically requests ambulance and shares your medical profile.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Request below' },
        { title: 'Fire Emergency', description: 'Requests fire response and notifies the nearest fire unit and dispatch.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Request below' },
        { title: 'Home Panic', description: 'Trigger emergency response for your registered property.', href: '/portal/home', action: 'Go to home security' },
        { title: 'Incident History', description: 'Complete record of alerts, responses, and outcomes.', href: '/portal/incidents', action: 'View history' },
      ]}
    >
      {contactsMeta?.meta?.dispatchLine && (
        <EmergencyDispatchCallCard
          name={contactsMeta.meta.dispatchLine.name}
          phone={contactsMeta.meta.dispatchLine.phone}
        />
      )}

      <div id="emergency-actions" className="emergency-actions">
        <button
          type="button"
          className={`panic-button ${panicLoading ? 'panic-button--loading' : ''}`}
          onClick={() => trigger(false)}
          disabled={anyLoading}
        >
          {panicLoading ? <LoadingSpinner label="" size="sm" /> : (
            <span className="panic-button-inner">
              <span className="panic-icon">!</span>
              <span className="panic-label">PANIC</span>
            </span>
          )}
        </button>
        <div className="emergency-actions__secondary panic-orbit">
          <button
            type="button"
            className="panic-orbit-btn panic-orbit-btn--silent"
            onClick={() => trigger(true)}
            disabled={anyLoading}
          >
            {silentLoading ? <LoadingSpinner label="" size="sm" /> : (
              <>
                <span className="panic-orbit-btn__glyph">S</span>
                <span className="panic-orbit-btn__label">Silent Panic</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="panic-orbit-btn panic-orbit-btn--medical"
            onClick={requestAmbulance}
            disabled={anyLoading}
          >
            {medicalLoading ? <LoadingSpinner label="" size="sm" /> : (
              <>
                <span className="panic-orbit-btn__glyph">+</span>
                <span className="panic-orbit-btn__label">Request Ambulance</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="panic-orbit-btn panic-orbit-btn--fire"
            onClick={requestFire}
            disabled={anyLoading}
          >
            {fireLoading ? <LoadingSpinner label="" size="sm" /> : (
              <>
                <span className="panic-orbit-btn__glyph">F</span>
                <span className="panic-orbit-btn__label">Fire Emergency</span>
              </>
            )}
          </button>
        </div>
      </div>
      {msg && <p className="alert alert--success">{msg}</p>}
      <p className="text-muted medical-emergency-hint">
        Set up your medical profile under <a href="/portal/medical">Medical</a> so responders receive allergies, medications, and instructions.
      </p>
    </FeatureHub>
  );
}

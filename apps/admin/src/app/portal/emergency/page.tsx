'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
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
      subtitle="Hold Panic in a real emergency. Silent Panic is a 2-second hold."
      features={[
        { title: 'Panic Button', description: 'Hold to alert control room with your details and location.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Hold Panic below' },
        { title: 'Silent Panic', description: 'Hold 2 seconds. Control room is notified discreetly.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Hold Silent below' },
        { title: 'Emergency Contacts', description: 'People we can contact if you are unavailable.', href: '/portal/contacts', action: 'Manage contacts' },
        { title: 'Medical Emergency', description: 'Requests ambulance and shares your medical profile.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Request ambulance below' },
        { title: 'Fire Emergency', description: 'Requests fire response and notifies dispatch.', status: 'Ready', href: '/portal/emergency#emergency-actions', action: 'Hold Fire below' },
        { title: 'Home security', description: 'Alarms and CCTV for a registered property. Use Fire below for a property emergency.', href: '/portal/home', action: 'Open home security' },
        { title: 'Trusted devices', description: 'Primary phone, lock, mark lost, or replace.', href: '/portal/security/devices', action: 'Open devices' },
        { title: 'Emergency access', description: 'Recover from another phone without weakening authentication.', href: '/portal/security/emergency-access', action: 'Open recovery' },
        { title: 'Incident History', description: 'Alerts, responses, and outcomes.', href: '/portal/incidents', action: 'View history' },
      ]}
    >
      <EmergencyDispatchCallCard
        name={contactsMeta?.meta?.dispatchLine?.name}
        phone={contactsMeta?.meta?.dispatchLine?.phone}
      />

      <EmergencyProtectionBanner compact />

      <div id="emergency-actions" className="emergency-actions panic-tray">
        <HoldToActivate
          label="Panic"
          holdMs={3000}
          hideHint
          keepLabel
          loading={panicLoading}
          disabled={anyLoading}
          className="hold-activate--circle panic-knob"
          onActivate={() => trigger(false)}
        >
          <span className="panic-knob__title">Panic</span>
          <span className="panic-knob__sub">Hold 3 seconds</span>
        </HoldToActivate>
        <p className="panic-note">Release to cancel</p>
        <div className="emergency-actions__secondary panic-orbit">
          <HoldToActivate
            label="Silent Panic. Hold 2 seconds to notify control room discreetly."
            holdMs={2000}
            tone="warn"
            hideHint
            keepLabel
            className="panic-orbit-btn panic-orbit-btn--silent panic-knob"
            loading={silentLoading}
            disabled={anyLoading && !silentLoading}
            onActivate={() => trigger(true)}
          >
            <span className="panic-knob__kicker">Hold 2s</span>
            <span className="panic-knob__title">Silent</span>
          </HoldToActivate>
          <button
            type="button"
            className="panic-orbit-btn panic-orbit-btn--medical panic-knob"
            onClick={requestAmbulance}
            disabled={anyLoading}
          >
            {medicalLoading ? <LoadingSpinner label="" size="sm" /> : (
              <>
                <span className="panic-knob__kicker">Hold 2s</span>
                <span className="panic-knob__title">Medical</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="panic-orbit-btn panic-orbit-btn--fire panic-knob"
            onClick={requestFire}
            disabled={anyLoading}
          >
            {fireLoading ? <LoadingSpinner label="" size="sm" /> : (
              <>
                <span className="panic-knob__kicker">Hold 2s</span>
                <span className="panic-knob__title">Fire</span>
              </>
            )}
          </button>
        </div>
      </div>
      {msg && <p className="alert alert--success">{msg}</p>}
          <p className="text-muted medical-emergency-hint">
            Set up your medical profile under <Link href="/portal/medical">Medical</Link> so responders receive
            allergies, medications, and instructions.
          </p>
    </FeatureHub>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { PanicNeuConsole, type PanicNeuBusy } from '@/components/portal/PanicNeuConsole';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
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

  const { data: vehiclesPayload } = useApi(
    () => clientApi.get<ApiResponse<{ id: string }[]>>('/client/vehicles'),
    [],
  );
  const vehicleId = vehiclesPayload?.data?.[0]?.id;

  const [panicLoading, setPanicLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const undo = useUndoToast();

  async function trigger(silent: boolean) {
    if (silent) setSilentLoading(true);
    else setPanicLoading(true);
    setMsg('');
    try {
      await clientApi.post('/client/panic', { silent });
      setMsg(silent ? 'Silent alert sent to control room.' : 'Panic alert sent. Help is on the way.');
      undo.show(
        silent ? 'Silent alert sent' : 'Panic alert sent',
        async () => {
          await clientApi.post('/client/panic/cancel');
        },
        silent
          ? { kind: 'silent', detail: 'Control room notified discreetly' }
          : { kind: 'critical', detail: 'Help is on the way' },
      );
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
      undo.show('Ambulance requested', undefined, {
        kind: 'medical',
        detail: 'Medical profile shared with responders',
      });
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
      undo.show('Fire response requested', undefined, {
        kind: 'fire',
        detail: 'Fire unit and dispatch notified',
      });
    } finally {
      setFireLoading(false);
    }
  }

  async function requestVehiclePanic() {
    if (!vehicleId) return;
    setVehicleLoading(true);
    setMsg('');
    try {
      const res = await clientApi.post<ApiResponse<{ message?: string }>>(
        `/client/vehicles/${vehicleId}/remote`,
        { action: 'panic' },
      );
      setMsg(res.data?.message ?? 'Vehicle panic sent. Control room viewing dash cameras.');
      undo.show('Vehicle panic sent', undefined, {
        kind: 'critical',
        detail: 'Control room viewing dash cameras',
      });
    } finally {
      setVehicleLoading(false);
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
        { title: 'Response history', description: 'Alerts, responses, and outcomes.', href: '/portal/incidents', action: 'View history' },
      ]}
    >
      <EmergencyDispatchCallCard
        name={contactsMeta?.meta?.dispatchLine?.name}
        phone={contactsMeta?.meta?.dispatchLine?.phone}
      />

      <EmergencyProtectionBanner compact />

      <PanicNeuConsole
        id="emergency-actions"
        className="emergency-actions"
        busy={
          (panicLoading
            ? 'panic'
            : silentLoading
              ? 'silent'
              : medicalLoading
                ? 'medical'
                : fireLoading
                  ? 'fire'
                  : vehicleLoading
                    ? 'vehicle'
                    : null) satisfies PanicNeuBusy
        }
        onPanic={() => trigger(false)}
        onSilent={() => trigger(true)}
        onMedical={() => void requestAmbulance()}
        onFire={() => void requestFire()}
        onVehicle={vehicleId ? () => void requestVehiclePanic() : undefined}
      />
      {msg && <p className="alert alert--success">{msg}</p>}
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
      <p className="text-muted medical-emergency-hint">
        Set up your medical profile under <Link href="/portal/medical">Medical</Link> so responders receive
        allergies, medications, and instructions.
      </p>
    </FeatureHub>
  );
}

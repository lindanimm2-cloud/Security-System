'use client';

import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { getOrCreateLocalDeviceId } from '@/lib/device-security';

type Device = { id: string; name: string; isPrimary: boolean; status: string };

const STEPS = [
  {
    id: 'verify',
    title: 'Verify identity',
    detail: 'This signed-in session is treated as the account holder for the replacement.',
  },
  {
    id: 'old',
    title: 'Confirm current primary',
    detail: 'The device named below will be revoked when activation completes.',
  },
  {
    id: 'register',
    title: 'Register this device',
    detail: 'This browser is enrolled as a trusted device with an internal ID. IMEI is not used.',
  },
  {
    id: 'test',
    title: 'Confirm Panic path',
    detail: 'Silent Panic remains in the safety dock. Native Emergency SOS is not claimed on web.',
  },
  {
    id: 'activate',
    title: 'Activate new primary',
    detail: 'Hold the control to make this device the primary security device.',
  },
  {
    id: 'revoke',
    title: 'Revoke previous primary',
    detail: 'The outgoing device loses primary standing and trusted access.',
  },
] as const;

export default function ReplaceDevicePage() {
  return (
    <PortalLayout>
      <ReplaceDevice />
    </PortalLayout>
  );
}

function ReplaceDevice() {
  const { data, reload } = useApi(
    () => clientApi.get<ApiResponse<Device[]>>('/client/security/devices'),
    [],
  );
  const [done, setDone] = useState<{ old: string; neu: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const primary = (data?.data ?? []).find((d) => d.isPrimary);
  const currentStep = done ? STEPS.length : 4;

  async function activate() {
    if (!primary || busy) return;
    setBusy(true);
    try {
      const res = await clientApi.post<ApiResponse<{ oldDevice: { id: string }; newDevice: { name: string } }>>(
        `/client/security/devices/${primary.id}/replace-primary`,
        { newPublicId: getOrCreateLocalDeviceId(), name: 'This browser', userAgent: navigator.userAgent },
      );
      setDone({ old: primary.name, neu: res.data.newDevice.name });
      void reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SOP-REPL-01"
        kicker="Procedure"
        stamp={done ? 'Completed · Restricted' : 'Restricted · Client'}
        title="Replace primary device"
        summary="Use this procedure when the phone that holds primary standing is lost, replaced, or no longer in your possession."
        toc={[
          { id: 'standing', label: 'Standing' },
          { id: 'path', label: 'Path' },
          { id: 'execute', label: 'Execution' },
          { id: 'devices', label: 'Device schedule', href: '/portal/security/devices' },
        ]}
      >
        <SecurityArticle id="standing" number="01" title="Current standing">
          <dl className="sec-doc-status__grid">
            <div>
              <dt>Current primary</dt>
              <dd>{done ? 'Revoked — see record below' : primary?.name ?? 'None recorded'}</dd>
            </div>
            <div>
              <dt>This session</dt>
              <dd>This browser</dd>
            </div>
            <div>
              <dt>Procedure</dt>
              <dd>{done ? 'Completed' : 'Awaiting hold-to-activate'}</dd>
            </div>
            <div>
              <dt>Outgoing device</dt>
              <dd>{done ? 'Revoked' : 'Will be revoked on activation'}</dd>
            </div>
          </dl>
        </SecurityArticle>

        <SecurityArticle id="path" number="02" title="Replacement path">
          <ol className="sec-sop">
            {STEPS.map((step, index) => {
              const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'pending';
              return (
                <li key={step.id} className={`sec-sop__step sec-sop__step--${state}`}>
                  <span className="sec-sop__n" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="sec-sop__title">
                      <strong>{step.title}</strong>
                      <StatusBadge
                        status={state}
                        label={state === 'done' ? 'Complete' : state === 'current' ? 'Now' : 'Next'}
                        tone={state === 'done' ? 'success' : state === 'current' ? 'warning' : 'neutral'}
                      />
                    </div>
                    <p>{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </SecurityArticle>

        <SecurityArticle id="execute" number="03" title={done ? 'Record of replacement' : 'Execution'}>
          {done ? (
            <dl className="sec-doc-status__grid">
              <div>
                <dt>Outgoing device</dt>
                <dd>
                  {done.old} · <StatusBadge status="REVOKED" tone="danger" />
                </dd>
              </div>
              <div>
                <dt>New primary</dt>
                <dd>
                  {done.neu} · <StatusBadge status="PRIMARY" tone="success" />
                </dd>
              </div>
            </dl>
          ) : (
            <div className="sec-execute">
              <p>
                Hold to confirm. The previous primary device will be revoked and this browser becomes the primary
                security device.
              </p>
              <HoldToActivate
                label="Activate new primary device"
                holdMs={3000}
                tone="warn"
                keepLabel
                className="hold-activate--console hold-activate--folio"
                loading={busy}
                disabled={!primary}
                onActivate={() => void activate()}
              />
            </div>
          )}
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

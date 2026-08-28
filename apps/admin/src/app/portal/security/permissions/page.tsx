'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PortalPermissionsSection } from '@/components/portal/PortalPermissions';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { detectWebNativeSos, NATIVE_SOS_DISCLAIMER } from '@/lib/device-security';
import { clientApi } from '@/lib/api-client';

const PERMS = [
  {
    id: 'location',
    label: 'Location',
    why: 'Location helps the control room determine where you are during an emergency.',
    required: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    why: 'Notifications allow us to send security alerts and emergency updates.',
    required: true,
  },
  {
    id: 'phone',
    label: 'Phone',
    why: 'This allows you to quickly contact your security control room.',
    required: true,
  },
  {
    id: 'sos',
    label: 'Emergency SOS integration',
    why: 'This feature allows the application to use supported emergency capabilities provided by your device and operating system. Availability varies by device.',
    required: false,
  },
  {
    id: 'background',
    label: 'Background operation',
    why: 'Keeps emergency retry available if a panic is queued while offline. The app does not continuously track you unless you choose continuous tracking.',
    required: false,
  },
  {
    id: 'biometric',
    label: 'Biometric authentication',
    why: 'Used for strong confirmation of sensitive device and emergency actions where the browser supports it.',
    required: false,
  },
  {
    id: 'camera',
    label: 'Camera',
    why: 'Optional. Used for property CCTV and evidence, not for Emergency SOS.',
    required: false,
  },
  {
    id: 'contacts',
    label: 'Contacts',
    why: 'Optional. Helps you pick personal emergency contacts. Control room remains a separate contact.',
    required: false,
  },
];

export default function PermissionsPage() {
  return (
    <PortalLayout>
      <PermissionsContent />
    </PortalLayout>
  );
}

function PermissionsContent() {
  const sos = detectWebNativeSos();
  const [mode, setMode] = useState<'EMERGENCY_ONLY' | 'OFF' | 'CONTINUOUS'>('EMERGENCY_ONLY');
  const [duress, setDuress] = useState(false);

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SCH-PERM-01"
        kicker="Schedule C"
        title="Permissions & device capabilities"
        summary={NATIVE_SOS_DISCLAIMER}
        toc={[
          { id: 'native', label: 'Native SOS' },
          { id: 'schedule', label: 'Capability schedule' },
          { id: 'browser', label: 'Browser grants' },
          { id: 'location', label: 'Location privacy' },
          { id: 'duress', label: 'Duress' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="native" number="01" title="Native Emergency SOS">
          <p>
            <StatusBadge status="Not available" tone="warning" /> on this web application.
          </p>
          <p>{sos.note}</p>
          <p className="sec-article__note">
            Use <Link href="/portal/protect">Protect</Link>,{' '}
            <Link href="/portal/security/emergency-access">Emergency access</Link>, or Call control room instead.
            Native SOS is not available on this web application.
          </p>
        </SecurityArticle>

        <SecurityArticle id="schedule" number="02" title="Capability schedule">
          <ol className="sec-clauses">
            {PERMS.map((p, i) => (
              <li key={p.id}>
                <em>2.{i + 1}</em>
                <div>
                  <strong>
                    {p.label}
                    {p.required ? null : <span className="sec-optional"> Optional</span>}
                  </strong>
                  <p>{p.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </SecurityArticle>

        <SecurityArticle id="browser" number="03" title="Browser grants">
          <PortalPermissionsSection />
        </SecurityArticle>

        <SecurityArticle id="location" number="04" title="Location privacy">
          <p>Do not enable continuous tracking unless your contracted service requires it.</p>
          <div className="sec-device__actions">
            {(['OFF', 'EMERGENCY_ONLY', 'CONTINUOUS'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={mode === value ? 'btn-primary' : 'btn-secondary'}
                onClick={() => {
                  setMode(value);
                  void clientApi.post('/client/security/settings', { trackingMode: value });
                }}
              >
                {value === 'OFF' ? 'Off' : value === 'EMERGENCY_ONLY' ? 'Emergency only' : 'Continuous'}
              </button>
            ))}
          </div>
        </SecurityArticle>

        <SecurityArticle id="duress" number="05" title="Duress protection">
          <p>
            Optional. If enabled, a configured duress authentication can silently notify the control room. This must not
            create false confidence. You can disable it at any time.
          </p>
          <button
            type="button"
            className={duress ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              const next = !duress;
              setDuress(next);
              void clientApi.post('/client/security/settings', { duressEnabled: next });
            }}
          >
            {duress ? 'Duress enabled' : 'Enable duress protection'}
          </button>
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

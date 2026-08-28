'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
import { EmergencyReadinessCard } from '@/components/security/EmergencyReadinessCard';
import { EmergencyTestCard } from '@/components/security/EmergencyTestCard';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type Status = {
  protected: boolean;
  lockdownActive: boolean;
  nativeSos: { status: string; note: string };
  readiness: {
    score: number;
    items: { id: string; ok: boolean; warn?: boolean; label: string; detail?: string }[];
  };
  activePanic: { id: string; transmissionStatus: string; workflowStatus: string } | null;
  trackingMode: string;
  duressEnabled: boolean;
  disclaimer: string;
};

const TOC = [
  { id: 'standing', label: 'Standing' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'procedure', label: 'Procedure' },
  { id: 'drill', label: 'Controlled drill' },
  { id: 'instruments', label: 'Related instruments' },
  { id: 'policy', label: 'Policy & consent', href: '/portal/security/legal' },
];

const FLOW = [
  { n: '01', t: 'Initiation', d: 'App Panic, Silent Panic, or a supported device integration.' },
  { n: '02', t: 'Platform', d: '4DS receives the event, identity and any permitted location.' },
  { n: '03', t: 'Control room', d: 'An operator acknowledges and runs the contracted response.' },
  { n: '04', t: 'Field', d: 'Assigned units respond under the service agreement.' },
];

const INSTRUMENTS = [
  { href: '/portal/protect', code: 'P', title: 'Protect', body: 'Live Panic, Silent Panic, medical and fire holds.' },
  { href: '/portal/security/devices', code: 'A', title: 'Trusted devices', body: 'Primary, trusted, temporary, lost and revoked.' },
  { href: '/portal/security/replace-device', code: 'R', title: 'Replace primary', body: 'Revoke the outgoing phone and activate this device as primary.' },
  { href: '/portal/security/emergency-access', code: 'B', title: 'Emergency access', body: 'Recover from another phone or the web without weakening authentication.' },
  { href: '/portal/security/permissions', code: 'C', title: 'Permissions schedule', body: 'What this application can and cannot do on the device.' },
  { href: '/portal/security/legal', code: 'D', title: 'Policy & consent', body: 'SOS limitations, data use, and recorded consent.' },
  { href: '/portal/contacts', code: 'E', title: 'Emergency contacts', body: 'Control room remains a separate instrument from personal contacts.' },
  { href: '/portal/medical', code: 'F', title: 'Medical profile', body: 'Protected health information for authorised responders only.' },
  { href: '/portal/security/lockdown', code: 'G', title: 'Lockdown directive', body: 'Revoke sessions and restrict trusted-device access.' },
  { href: '/portal/security/activity', code: 'H', title: 'Activity register', body: 'Audited security events on this file.' },
  { href: '/portal/security/setup', code: 'S', title: 'Commissioning', body: 'Register this device and complete the protection checklist.' },
];

export default function SecurityHubPage() {
  return (
    <PortalLayout>
      <SecurityHub />
    </PortalLayout>
  );
}

function SecurityHub() {
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Status>>('/client/security/status'),
    [],
  );
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);

  async function testPanic() {
    setTesting(true);
    setMsg('');
    try {
      await clientApi.post('/client/security/emergency/test', { source: 'TEST' });
      setMsg('Test successful. Control room received a labelled test. This was not a real emergency.');
      void reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading protection file…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const status = data?.data;

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SEC-PROT-4DS-001"
        title="Emergency protection"
        summary="This file records the standing of your contracted emergency protection: devices, access, readiness and the procedure used if you raise an alert."
        toc={TOC}
      >
        <SecurityArticle id="standing" number="01" title="Standing">
          <p>
            Protection is verified against your primary device, permitted location, emergency access and control-room
            contacts. Silent Panic remains in the safety dock and is not replaced by this document.
          </p>
          <EmergencyProtectionBanner variant="doc" />
        </SecurityArticle>

        <SecurityArticle id="readiness" number="02" title="Readiness schedule">
          <EmergencyReadinessCard
            embedded
            score={status?.readiness.score ?? 0}
            items={status?.readiness.items ?? []}
          />
        </SecurityArticle>

        <SecurityArticle id="procedure" number="03" title="Operating procedure">
          <ol className="sec-clauses">
            {FLOW.map((step) => (
              <li key={step.n}>
                <em>{step.n}</em>
                <div>
                  <strong>{step.t}</strong>
                  <p>{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="sec-article__note">
            Native device SOS may operate separately, depending on the device and operating system. This application
            does not replace emergency services. Response is subject to your security service agreement and network
            availability.
          </p>
        </SecurityArticle>

        <SecurityArticle id="drill" number="04" title="Controlled drill">
          <EmergencyTestCard embedded loading={testing} message={msg} onTest={() => void testPanic()} />
        </SecurityArticle>

        <SecurityArticle id="instruments" number="05" title="Related instruments">
          <ol className="sec-annex">
            {INSTRUMENTS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <span>Annex {item.code}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </Link>
              </li>
            ))}
          </ol>
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

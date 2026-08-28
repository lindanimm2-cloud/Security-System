'use client';

import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { clientApi } from '@/lib/api-client';
import { CONSENT_VERSION, NATIVE_SOS_DISCLAIMER, POLICY_VERSION } from '@/lib/device-security';

const CLAUSES = [
  'Native Emergency SOS is controlled by the operating system and device manufacturer.',
  'Functionality varies by device, OS version and region.',
  'The application does not replace emergency services.',
  'Native Emergency SOS may operate independently of this application.',
  'The application cannot guarantee reception of native SOS events.',
  'Network availability affects emergency communications.',
  'Location may be unavailable or inaccurate.',
  'You must maintain appropriate permissions and keep the app updated.',
  'Test alerts are not real emergencies.',
  'False or abusive alarms may be handled according to the service agreement.',
  'Security response is subject to contracted services and operational availability.',
];

const DATA = [
  'Device information and internal device identifiers (not IMEI as a primary ID)',
  'Authentication information and security logs',
  'Emergency events and control-room actions',
  'Location data where permission exists',
  'Emergency contacts',
  'Medical information where voluntarily supplied',
];

export default function LegalPage() {
  return (
    <PortalLayout>
      <LegalContent />
    </PortalLayout>
  );
}

function LegalContent() {
  const [accepted, setAccepted] = useState(false);
  const [saved, setSaved] = useState('');

  async function save() {
    if (!accepted) return;
    await clientApi.post('/client/security/consent', { kind: 'EMERGENCY_SOS', accepted: true });
    setSaved(`Consent recorded · version ${CONSENT_VERSION} · policy ${POLICY_VERSION}`);
  }

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="PP-EMERG-01"
        kicker="Policy instrument"
        title="Emergency SOS, privacy & consent"
        summary={NATIVE_SOS_DISCLAIMER}
        toc={[
          { id: 'limitations', label: 'Limitations' },
          { id: 'data', label: 'Data processed' },
          { id: 'consent', label: 'Record of consent' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="limitations" number="01" title="Limitations of native SOS">
          <ol className="sec-clauses sec-clauses--tight">
            {CLAUSES.map((text, i) => (
              <li key={text}>
                <em>1.{i + 1}</em>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </SecurityArticle>

        <SecurityArticle id="data" number="02" title="Emergency & security data">
          <p>Where permitted and necessary for contracted response, the security company may process:</p>
          <ol className="sec-clauses sec-clauses--tight">
            {DATA.map((text, i) => (
              <li key={text}>
                <em>2.{i + 1}</em>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="sec-article__note">
            Medical and emergency data are under stricter access controls. Ordinary security employees cannot view
            medical information unless authorised. Access is audited. Retention follows company policy and applicable
            law.
          </p>
        </SecurityArticle>

        <SecurityArticle id="consent" number="03" title="Record of consent">
          <p>
            I understand that Emergency SOS functionality depends on my device and operating system, and that my
            security company may process emergency information to provide contracted emergency response services.
          </p>
          <label className="sec-check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            I have read this instrument and agree.
          </label>
          <button type="button" className="btn-primary" disabled={!accepted} onClick={() => void save()}>
            Record consent
          </button>
          {saved ? <p className="sec-test__msg is-ok">{saved}</p> : null}
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

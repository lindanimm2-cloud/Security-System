'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { clientApi } from '@/lib/api-client';
import {
  CONSENT_VERSION,
  MEDICAL_PROFILE_CONSENT_NOTICE,
  NATIVE_SOS_DISCLAIMER,
  POLICY_VERSION,
} from '@/lib/device-security';
import {
  EMERGENCY_DATA_CLAUSES as DATA,
  MEDICAL_CLAUSES,
  NATIVE_SOS_CLAUSES as CLAUSES,
  PUBLIC_LEGAL_PATH,
} from '@/lib/legal-content';

export default function LegalPage() {
  return (
    <PortalLayout>
      <LegalContent />
    </PortalLayout>
  );
}

function LegalContent() {
  const [accepted, setAccepted] = useState(false);
  const [acceptedMedical, setAcceptedMedical] = useState(false);
  const [saved, setSaved] = useState('');
  const [savedMedical, setSavedMedical] = useState('');

  async function save() {
    if (!accepted) return;
    await clientApi.post('/client/security/consent', { kind: 'EMERGENCY_SOS', accepted: true });
    setSaved(`Consent recorded · version ${CONSENT_VERSION} · policy ${POLICY_VERSION}`);
  }

  async function saveMedical() {
    if (!acceptedMedical) return;
    await clientApi.post('/client/security/consent', { kind: 'MEDICAL_PROFILE', accepted: true });
    setSavedMedical(`Medical data consent recorded · version ${CONSENT_VERSION} · policy ${POLICY_VERSION}`);
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
          { id: 'medical', label: 'Medical & medical aid' },
          { id: 'consent', label: 'Record of consent' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
          { id: 'public', label: 'Public version', href: PUBLIC_LEGAL_PATH },
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
            law (including POPIA).
          </p>
        </SecurityArticle>

        <SecurityArticle id="medical" number="03" title="Medical profile & medical aid">
          <p>
            If you voluntarily provide a medical profile — including South African medical scheme (medical aid)
            type, plan and membership number — you authorise use of that information for emergency response only.
          </p>
          <ol className="sec-clauses sec-clauses--tight">
            {MEDICAL_CLAUSES.map((text, i) => (
              <li key={text}>
                <em>3.{i + 1}</em>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="sec-article__note">{MEDICAL_PROFILE_CONSENT_NOTICE}</p>
          <p>
            Manage your profile anytime under <Link href="/portal/medical">Medical</Link>.
          </p>
          <label className="sec-check">
            <input
              type="checkbox"
              checked={acceptedMedical}
              onChange={(e) => setAcceptedMedical(e.target.checked)}
            />
            I consent to processing of my medical and medical-aid details as described above.
          </label>
          <button type="button" className="btn-primary" disabled={!acceptedMedical} onClick={() => void saveMedical()}>
            Record medical consent
          </button>
          {savedMedical ? <p className="sec-test__msg is-ok">{savedMedical}</p> : null}
        </SecurityArticle>

        <SecurityArticle id="consent" number="04" title="Record of consent — Emergency SOS">
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

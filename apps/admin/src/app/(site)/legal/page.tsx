import type { Metadata } from 'next';
import Link from 'next/link';
import {
  LegalDocumentMeta,
  LegalDocumentSections,
} from '@/components/legal/LegalDocumentSections';
import { LEGAL_CONTACT, LEGAL_SECTIONS } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Terms & privacy',
  description:
    'Service terms, emergency SOS limitations, medical data handling and POPIA privacy notice for 4DS Nexus protection services.',
};

export default function LegalPage() {
  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Legal</p>
          <h1>Service terms, privacy &amp; consent</h1>
          <p>
            The full protection service terms and privacy notice — readable without an
            account, and the same text shown when you accept terms during registration.
          </p>
        </div>
      </section>

      <section className="nx-section">
        <div className="nx-about-grid">
          <div className="nx-prose">
            <LegalDocumentMeta />
            <LegalDocumentSections />
          </div>

          <aside className="nx-about-aside">
            <div className="nx-aside-card">
              <h3>On this page</h3>
              <ul className="nx-check-list">
                {LEGAL_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="nx-aside-card">
              <h3>Privacy &amp; POPIA requests</h3>
              <p className="nx-muted">
                Access, correction, deletion or consent-withdrawal requests are handled by{' '}
                {LEGAL_CONTACT.company}.
              </p>
              <p className="nx-muted">
                <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a>
                <br />
                {LEGAL_CONTACT.phone}
              </p>
            </div>
            <div className="nx-aside-card">
              <h3>Recording consent</h3>
              <p className="nx-muted">
                Consent is captured when you register, and can be re-confirmed any time under
                Policy &amp; consent in your protection portal.
              </p>
              <Link href="/portal/register" className="nx-btn nx-btn--outline nx-btn--sm">
                Start registration
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

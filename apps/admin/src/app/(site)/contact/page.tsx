'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SiteDispatchStrip } from '@/components/site/SiteDispatchStrip';
import { ServiceRequestForm } from '@/components/site/ServiceRequestForm';

function ContactFormPanel() {
  const searchParams = useSearchParams();
  const service = searchParams.get('service');

  return <ServiceRequestForm initialInterest={service} />;
}

export default function ContactPage() {
  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Contact</p>
          <h1>Tell us what you need protected</h1>
          <p>
            Book private escort, close protection, installs, or monitoring —
            include dates, people, and locations so we can respond with a clear
            plan.
          </p>
        </div>
      </section>

      <section className="nx-section nx-contact">
        <div className="nx-contact-details">
          <SiteDispatchStrip />
          <h2>Reach us</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:hello@4dsnexus.co.za">hello@4dsnexus.co.za</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>+27 11 100 4400</dd>
            </div>
            <div>
              <dt>HQ</dt>
              <dd>
                4DS Nexus House
                <br />
                115 West Street, Sandton
                <br />
                Johannesburg, 2196
              </dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>Control room 24/7 · Sales Mon–Fri 08:00–17:00</dd>
            </div>
          </dl>
          <Link href="/portals" className="nx-btn nx-btn--outline">
            Existing client? Open portals
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="nx-contact-form">
              <p className="nx-service-request__fine">Loading request form…</p>
            </div>
          }
        >
          <ContactFormPanel />
        </Suspense>
      </section>
    </>
  );
}

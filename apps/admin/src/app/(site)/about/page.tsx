import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteDispatchStrip } from '@/components/site/SiteDispatchStrip';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About 4DS Nexus — integrated protection, response, installs, and security supply.',
};

export default function AboutPage() {
  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">About 4DS Nexus</p>
          <h1>Security operations, built as one company</h1>
          <p>
            4DS Nexus unifies mobile protection, control-room dispatch,
            technician installs, and professional supply — so families, fleets,
            and sites are covered by the same operating standard.
          </p>
        </div>
      </section>

      <section className="nx-section">
        <div className="nx-about-grid">
          <div className="nx-prose">
            <h2>Our story</h2>
            <p>
              Most people experience security as disconnected pieces: a tracker
              app that only notifies, a guarding company that only responds, a
              camera installer who never sees the alarm again. Incidents fall
              through the gaps between those vendors.
            </p>
            <p>
              4DS Nexus was built to close that gap. We run the subscriber
              experience, the 24/7 control room, the response units, the install
              technicians, and a vetted gear catalog under one model — so when
              something happens, the next step is already defined.
            </p>

            <h2>Mission</h2>
            <p>
              Deliver protection people can feel: fast enough for real
              emergencies, clear enough for families under stress, and robust
              enough for commercial sites that need audit trails, not just
              promises.
            </p>

            <h2>How we operate</h2>
            <p>
              Alerts are triaged by priority, units are dispatched with a full
              brief (location, medical context, site notes), and every close-out
              is recorded in the client portal. Installs are designed to feed
              that same loop — cameras and alarms that create actionable events,
              not orphaned footage.
            </p>

            <h2>Where we operate</h2>
            <p>
              Primary coverage centres on the Johannesburg / Pretoria metro,
              with corridor expansion and partner-assisted coverage available for
              fleets and multi-site clients. Exact suburb SLAs are confirmed
              during onboarding.
            </p>
          </div>

          <aside className="nx-about-aside">
            <div className="nx-aside-card">
              <h3>At a glance</h3>
              <ul className="nx-check-list">
                <li>24/7 monitored control room</li>
                <li>Mobile protection subscriptions</li>
                <li>Armed / rapid response units</li>
                <li>In-house CCTV &amp; alarm technicians</li>
                <li>Corporate duty-gear supply</li>
                <li>Readiness training for sites &amp; families</li>
              </ul>
            </div>
            <div className="nx-aside-card">
              <h3>Compliance posture</h3>
              <p className="nx-muted">
                Response and guarding activities are structured for PSIRA-aligned
                operations. Licence-required equipment in the catalog is flagged
                for sales verification before fulfilment.
              </p>
            </div>
          </aside>
        </div>

        <div className="nx-stat-row">
          <div>
            <strong>24/7</strong>
            <span>Control room monitoring</span>
          </div>
          <div>
            <strong>4</strong>
            <span>Core service lines</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Integrated incident record</span>
          </div>
          <div>
            <strong>Gauteng</strong>
            <span>Primary metro coverage</span>
          </div>
        </div>

        <SiteDispatchStrip />

        <div className="nx-section-cta">
          <Link href="/services" className="nx-btn nx-btn--primary">
            Explore services
          </Link>
          <Link href="/careers" className="nx-btn nx-btn--outline">
            Join Nexus
          </Link>
          <Link href="/contact" className="nx-btn nx-btn--outline">
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}

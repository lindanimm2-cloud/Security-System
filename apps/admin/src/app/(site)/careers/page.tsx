import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Careers at 4DS Nexus — control room, response, installs, and sales.',
};

const ROLES = [
  {
    title: 'Control room operator',
    loc: 'Johannesburg · Shift work',
    blurb:
      'Triage panics and site alarms, brief responding units, and keep subscribers updated through the incident lifecycle.',
  },
  {
    title: 'Response officer',
    loc: 'Gauteng metro · Field',
    blurb:
      'Rapid response to panic and site incidents with live navigation, on-scene reporting, and professional client contact.',
  },
  {
    title: 'Install technician',
    loc: 'Johannesburg · Field',
    blurb:
      'Survey, install, and commission CCTV, intrusion alarms, and access control for Nexus residential and commercial clients.',
  },
  {
    title: 'Sales advisor',
    loc: 'Hybrid',
    blurb:
      'Convert inbound leads for protection plans, fleet packages, and corporate supply — with clear handoff to ops and installs.',
  },
];

export default function CareersPage() {
  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Careers</p>
          <h1>Build protection that actually connects</h1>
          <p>
            Join a company where control room, field response, technicians, and
            supply work as one system — not four disconnected vendors.
          </p>
        </div>
      </section>

      <section className="nx-section">
        <div className="nx-section-head">
          <p className="nx-eyebrow">Open roles</p>
          <h2>Where you can make an impact</h2>
          <p>
            Sample openings for the client demo — swap in live vacancies,
            benefits, and application links when you go to market.
          </p>
        </div>
        <div className="nx-career-list">
          {ROLES.map((role) => (
            <article key={role.title} className="nx-career-row">
              <div>
                <h2>{role.title}</h2>
                <p className="nx-muted">{role.loc}</p>
                <p>{role.blurb}</p>
              </div>
              <Link
                href="/contact"
                className="nx-btn nx-btn--outline nx-btn--sm"
              >
                Apply
              </Link>
            </article>
          ))}
        </div>
        <div className="nx-section-cta">
          <Link href="/contact" className="nx-btn nx-btn--primary">
            General applications
          </Link>
          <Link href="/about" className="nx-btn nx-btn--outline">
            About the company
          </Link>
        </div>
      </section>
    </>
  );
}

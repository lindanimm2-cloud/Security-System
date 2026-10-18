import Link from 'next/link';
import { SiteDispatchStrip } from '@/components/site/SiteDispatchStrip';

const SOLUTIONS = [
  {
    href: '/contact?service=close-protection',
    kicker: 'Close protection',
    title: 'Bodyguards when presence matters',
    body: 'Trained close-protection officers for executives, families, and high-visibility events — briefed, tracked, and backed by the same control room.',
    cta: 'Request close protection',
    tone: 'cctv' as const,
    image: '/brand/nx-story-cctv.jpg',
  },
  {
    href: '/contact?service=private-escort',
    kicker: 'Private escort',
    title: 'Secure moves, airports, and venues',
    body: 'Private escort and VIP transport for airport runs, court appearances, medical transfers, and discreet point-to-point movements across Gauteng.',
    cta: 'Request private escort',
    tone: 'access' as const,
    image: '/brand/nx-story-access.png',
  },
  {
    href: '/contact?service=personal-protection',
    kicker: 'Always-on monitoring',
    title: 'Panic, GPS, and family safety',
    body: 'Subscriber protection with one-tap panic, live tracking, medical context, and trusted-contact alerts — monitored 24/7.',
    cta: 'Request protection plan',
    tone: 'pack' as const,
    image: '/brand/nx-story-pack.png',
  },
];

const CAPABILITIES = [
  {
    title: '24/7 control room',
    body: 'Priority triage, live briefings, and verified emergency dispatch from one operating desk.',
  },
  {
    title: 'Close protection',
    body: 'Bodyguards and protective details coordinated with live location and incident context.',
  },
  {
    title: 'Private escort',
    body: 'Planned secure movements with advance routes, check-ins, and rapid backup if needed.',
  },
  {
    title: 'Field response',
    body: 'Officers navigate with incident context — status, chat, and close-out on the same platform.',
  },
];

const SERVICE_LINKS = [
  {
    href: '/services#close-protection',
    title: 'Close protection / bodyguarding',
    body: 'Executive and personal protective details',
  },
  {
    href: '/services#private-escort',
    title: 'Private escort',
    body: 'Airport, venue, and VIP transport security',
  },
  {
    href: '/services#personal-protection',
    title: 'Personal & family protection',
    body: 'Panic, GPS, and monitored safety plans',
  },
  {
    href: '/services#rapid-response',
    title: 'Armed & rapid response',
    body: 'Dispatch linked to alerts and sites',
  },
  {
    href: '/services#fleet-recovery',
    title: 'Fleet & vehicle recovery',
    body: 'Tracking and recovery workflows',
  },
  {
    href: '/services#cctv-installs',
    title: 'CCTV, alarms & access',
    body: 'Site systems built to be monitored',
  },
  {
    href: '/services#training',
    title: 'Training & readiness',
    body: 'Practical briefings for households and sites',
  },
  {
    href: '/services#install-services',
    title: 'Installs & monitoring',
    body: 'Survey, fit, and control-room handover',
  },
];

export default function HomePage() {
  return (
    <div className="nx-enterprise">
      <section className="nx-ent-hero" aria-label="4DS Nexus">
        <div className="nx-ent-hero__media" aria-hidden />
        <div className="nx-ent-hero__veil" aria-hidden />
        <div className="nx-ent-hero__inner">
          <p className="nx-ent-hero__brand">4DS Nexus</p>
          <h1>Protection and response — one operating standard</h1>
          <p className="nx-ent-hero__lead">
            Close protection, private escort, monitoring, and rapid response for
            homes, executives, and multi-site properties across Gauteng.
          </p>
          <div className="nx-ent-hero__actions">
            <Link href="/services" className="nx-btn nx-btn--primary nx-btn--lg">
              Explore services
            </Link>
            <Link href="/contact?service=private-escort" className="nx-btn nx-btn--ghost-light nx-btn--lg">
              Request a quote
            </Link>
          </div>
        </div>
      </section>

      <section className="nx-ent-solutions" aria-label="Featured services">
        {SOLUTIONS.map((s, i) => (
          <article
            key={s.href}
            className={`nx-ent-story nx-ent-story--${s.tone}${i % 2 === 1 ? ' nx-ent-story--flip' : ''}`}
          >
            <div className="nx-ent-story__visual" aria-hidden>
              <img
                className="nx-ent-story__img"
                src={s.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="nx-ent-story__glow" />
            </div>
            <div className="nx-ent-story__copy">
              <p className="nx-eyebrow">{s.kicker}</p>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              <Link href={s.href} className="nx-btn nx-btn--primary">
                {s.cta}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="nx-section nx-ent-capabilities">
        <div className="nx-section-head">
          <p className="nx-eyebrow">Platform</p>
          <h2>Core capabilities</h2>
          <p>
            From the moment an alert fires — or a detail is booked — apps,
            officers, and the control room run as one company.
          </p>
        </div>
        <div className="nx-ent-cap-grid">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="nx-ent-cap">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="nx-section nx-ent-catalog">
        <div className="nx-dept-head">
          <h2>Browse services</h2>
          <Link href="/services">View all services →</Link>
        </div>
        <div className="nx-ent-cat-grid">
          {SERVICE_LINKS.map((d) => (
            <Link key={d.href} href={d.href} className="nx-ent-cat">
              <strong>{d.title}</strong>
              <span>{d.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="nx-ent-dispatch">
        <SiteDispatchStrip />
      </div>

      <section className="nx-band nx-ent-band">
        <div className="nx-band-inner">
          <h2>Client &amp; staff access</h2>
          <p>
            Subscribers use the protection portal. Operators and officers sign
            in through staff portals.
          </p>
          <div className="nx-hero-actions">
            <Link href="/login" className="nx-btn nx-btn--primary">
              Login
            </Link>
            <Link href="/contact?service=private-escort" className="nx-btn nx-btn--ghost-light">
              Request a quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

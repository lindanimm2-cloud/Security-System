import Link from 'next/link';
import { FeaturedProducts } from '@/components/site/FeaturedProducts';
import { SiteDispatchStrip } from '@/components/site/SiteDispatchStrip';
import { STORE_DEPARTMENTS } from '@/lib/store-catalog';

const DEPARTMENTS = [
  ...STORE_DEPARTMENTS.slice(0, 15).map((d) => ({
    href: `/store?category=${d.id}`,
    icon: d.icon,
    title: d.label,
    body: d.blurb,
  })),
  {
    href: '/services',
    icon: '🛠️',
    title: 'Installation services',
    body: 'CCTV, alarms, fencing & more',
  },
];

const QUICK = [
  {
    href: '/store?category=CCTV',
    title: 'CCTV & NVR',
    body: 'Cameras, recorders, PoE kits',
  },
  {
    href: '/store?category=PACKAGES',
    title: 'Security packages',
    body: 'Home, business & industrial bundles',
  },
  {
    href: '/services#install-services',
    title: 'Install & repairs',
    body: 'Fence, gates, access, networking',
  },
  {
    href: '/portals',
    title: 'Staff portals',
    body: 'Control room, officers, techs',
  },
];

const TRUST = [
  { label: 'Control room', value: '24/7' },
  { label: 'Departments', value: `${STORE_DEPARTMENTS.length}+` },
  { label: 'Install team', value: 'In-house' },
  { label: 'Supply', value: 'Licensed lines' },
];

export default function HomePage() {
  return (
    <div className="nx-hub">
      <div className="nx-promo-grid">
        <Link href="/store" className="nx-promo">
          <span className="nx-promo-kicker">Nexus Supply</span>
          <h2>One-stop security catalogue</h2>
          <p>
            CCTV, alarms, access control, electric fencing, guard kit, body
            armour, and licensed equipment — plus install services.
          </p>
          <span className="nx-btn nx-btn--primary nx-btn--sm">Shop catalog</span>
        </Link>
        <div className="nx-promo-side">
          <Link
            href="/store?category=CCTV"
            className="nx-promo nx-promo--sm nx-promo--cctv"
          >
            <span className="nx-promo-kicker">Largest aisle</span>
            <h2>CCTV cameras</h2>
            <p>IP, PTZ, thermal, doorbell — with optional Nexus install.</p>
          </Link>
          <Link
            href="/store?category=PACKAGES"
            className="nx-promo nx-promo--sm nx-promo--armor"
          >
            <span className="nx-promo-kicker">Bundles</span>
            <h2>Home & site packages</h2>
            <p>Cameras + alarm + access packages ready to quote.</p>
          </Link>
        </div>
      </div>

      <section className="nx-trust-strip nx-trust-strip--hub" aria-label="Capabilities">
        {TRUST.map((t) => (
          <div key={t.label} className="nx-trust-item">
            <strong>{t.value}</strong>
            <span>{t.label}</span>
          </div>
        ))}
      </section>

      <section>
        <div className="nx-dept-head">
          <h2>Shop by department</h2>
          <Link href="/store">View full catalogue →</Link>
        </div>
        <div className="nx-dept-grid">
          {DEPARTMENTS.map((d) => (
            <Link key={d.href + d.title} href={d.href} className="nx-dept">
              <span className="nx-dept-icon" aria-hidden>
                {d.icon}
              </span>
              <strong>{d.title}</strong>
              <span>{d.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <FeaturedProducts dense />

      <section className="nx-rail">
        <div className="nx-rail-head">
          <div>
            <h2>Protection & install services</h2>
            <p>Same company behind the catalogue — apps, response, and installs.</p>
          </div>
          <Link href="/services" className="nx-btn nx-btn--outline nx-btn--sm">
            All services
          </Link>
        </div>
        <div className="nx-quick-services">
          {QUICK.map((s) => (
            <Link key={s.href} href={s.href} className="nx-quick-service">
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <SiteDispatchStrip />

      <section className="nx-band" style={{ borderRadius: 10, margin: 0 }}>
        <div className="nx-band-inner">
          <h2>Employee & client portals</h2>
          <p>
            Staff: control room, officer, and technician access. Clients: panic,
            tracking, and incident history.
          </p>
          <div className="nx-hero-actions">
            <Link href="/portals" className="nx-btn nx-btn--primary">
              Employee login
            </Link>
            <Link href="/contact" className="nx-btn nx-btn--ghost-light">
              Request a quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

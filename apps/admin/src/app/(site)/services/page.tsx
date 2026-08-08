import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Personal protection, fleet recovery, armed response, CCTV installs, corporate supply, and readiness training from 4DS Nexus.',
};

const SERVICES = [
  {
    id: 'personal-protection',
    index: '01',
    title: 'Personal & family protection',
    tagline: 'Always-on safety for people who move.',
    summary:
      'A subscription layer that turns a phone into a monitored panic device — with live location, medical context, and a family circle that stays informed when something goes wrong.',
    who: [
      'Executives and high-visibility individuals',
      'Families with school-age children',
      'Lone workers and late-shift staff',
      'Anyone who wants a faster path to help than dialling emergency services alone',
    ],
    includes: [
      'One-tap panic alert to the 4DS Nexus control room',
      'Live GPS tracking during an active incident',
      'Medical profile shared with responders (allergies, conditions, blood type)',
      'Family / trusted-contact notifications and shared safe status',
      'Safe-zone and curfew alerts for dependents',
      'Full incident timeline kept for follow-up and insurance',
    ],
    process: [
      'Activate your plan and invite family members',
      'Complete medical and emergency profiles',
      'Control room verifies coverage and response routing',
      'In an emergency, panic triggers dispatch + live track',
    ],
    note: 'Plans typically tier by number of protected profiles and add-ons such as vehicle tracking. Pricing confirmed on consultation.',
  },
  {
    id: 'fleet-recovery',
    index: '02',
    title: 'Fleet & vehicle recovery',
    tagline: 'Know where assets are — and act when they move wrong.',
    summary:
      'Telematics-linked monitoring for cars, bakkies, and commercial fleets. When theft or hijacking is suspected, Nexus runs a structured recovery workflow with control-room oversight, not a dead-end tracker app.',
    who: [
      'Fleet managers and logistics operators',
      'Dealerships and rental fleets',
      'High-value personal vehicles',
      'Companies with field sales or service vans',
    ],
    includes: [
      'Live and historical vehicle location',
      'Geofence breach and after-hours movement alerts',
      'Theft / hijack incident workflow with evidence capture',
      'Coordination with response units during active recovery',
      'Driver and vehicle assignment visibility for managers',
      'Post-incident report pack for insurers and SAPS case notes',
    ],
    process: [
      'Fit or link approved tracking hardware',
      'Map vehicles to drivers and operating zones',
      'Alerts route to control room + fleet contact',
      'Recovery playbook runs until asset is secured',
    ],
    note: 'Coverage is strongest across Gauteng metro corridors; national corridors available via partner network — confirmed per fleet size.',
  },
  {
    id: 'rapid-response',
    index: '03',
    title: 'Armed & rapid response',
    tagline: 'Dispatch that starts the moment the alert hits.',
    summary:
      'PSIRA-aligned response units linked directly to subscriber panics, site alarms, and control-room escalations. Officers arrive with context — location, medical notes, and incident type — not a cold radio call.',
    who: [
      'Residential estates and complexes',
      'Retail and warehouse sites',
      'Personal-protection subscribers',
      'Businesses needing after-hours armed backup',
    ],
    includes: [
      '24/7 control-room triage and escalation',
      'GPS-guided officer navigation to the alert point',
      'Status updates back to subscribers and site managers',
      'On-scene situation reporting into the Nexus platform',
      'Hand-off protocols with SAPS / medical where required',
      'Recorded incident chain for audits and compliance',
    ],
    process: [
      'Alert received and classified by priority',
      'Nearest capable unit assigned with full brief',
      'Live ETA and on-scene status shared',
      'Close-out report filed in the client portal',
    ],
    note: 'Response SLAs are mapped by suburb and time-of-day. Metro targets are agreed in your service-level schedule.',
  },
  {
    id: 'cctv-installs',
    index: '04',
    title: 'CCTV, alarms & access control',
    tagline: 'Site systems designed to be monitored — not just recorded.',
    summary:
      'From site survey to commissioning: IP cameras, NVRs, intrusion alarms, and access control installed by Nexus technicians and optionally tied into control-room monitoring so alarms become actionable events.',
    who: [
      'Homes and residential complexes',
      'Offices, warehouses, and yards',
      'Retail shopfronts and stockrooms',
      'Sites upgrading from outdated DVR / standalone kits',
    ],
    includes: [
      'On-site risk survey and camera placement plan',
      'PoE IP camera systems with NVR / cloud options',
      'Perimeter, driveway, and entry-point coverage',
      'Intrusion alarm zones with panic and duress points',
      'Access control (readers, remotes, biometric where suitable)',
      'Remote viewing for owners + optional 24/7 monitoring link',
    ],
    process: [
      'Survey and quote with coverage map',
      'Hardware procurement and install booking',
      'Cabling, mounting, and system commissioning',
      'Handover training and maintenance schedule',
    ],
    note: 'Typical residential installs complete in 1–3 days after survey; multi-building commercial sites scheduled in phases.',
  },
  {
    id: 'corporate-supply',
    index: '05',
    title: 'Corporate security supply',
    tagline: 'Duty gear and site kit — ordered, licensed, delivered.',
    summary:
      'A professional catalog for security teams and protected sites: soft armor and plate carriers, batons, CEDs, radios, CCTV kits, and licensed firearms pathways — with account billing and install add-ons where needed.',
    who: [
      'In-house security departments',
      'Guarding companies outfitting units',
      'Estate and facilities managers',
      'Corporate HSE / risk teams',
    ],
    includes: [
      'Curated catalog with stock visibility',
      'Bulk and account pricing for repeat buyers',
      'Licence-required SKU flagging and sales follow-up',
      'Optional technician install for camera and alarm kits',
      'Consolidated invoicing and order history',
      'Advice on armor ratings, duty kit, and site packages',
    ],
    process: [
      'Browse the Nexus Supply catalog or request a kit list',
      'Cart checkout or sales-assisted quote for large orders',
      'Licence verification where firearms / CEDs apply',
      'Delivery or scheduled install job created',
    ],
    note: 'Minimum order quantities apply on some bulk lines. Open an account for net-term billing.',
    cta: { href: '/store', label: 'Browse the catalog' },
  },
  {
    id: 'training',
    index: '06',
    title: 'Training & readiness',
    tagline: 'Technology only works if people know what to do.',
    summary:
      'Short, practical briefings so families, gate staff, and site teams understand panic flows, safe zones, false-alarm discipline, and how to work with the control room under pressure.',
    who: [
      'New subscriber households',
      'Estate security and boom operators',
      'Reception and after-hours site staff',
      'Fleet supervisors adopting recovery workflows',
    ],
    includes: [
      'Panic-button and app walkthrough for households',
      'Safe-zone, check-in, and escalation etiquette',
      'False alarm reduction for monitored sites',
      'On-scene cooperation with responding officers',
      'Tabletop drills for high-risk locations',
      'Refresher packs after major system upgrades',
    ],
    process: [
      'Identify audience (family, gate, warehouse floor)',
      'Book on-site or remote session',
      'Run scenario-based practice',
      'Leave a one-page readiness card with contacts',
    ],
    note: 'Included at onboarding for many protection plans; standalone sessions available for estates and corporates.',
  },
  {
    id: 'install-services',
    index: '07',
    title: 'Installation, repairs & monitoring',
    tagline: 'Electronic + physical security fitted by Nexus techs.',
    summary:
      'CCTV, alarms, access control, gate automation, electric fencing, intercoms, networking, security lighting, and system upgrades — surveyed, installed, and optionally linked to 24/7 control-room monitoring.',
    who: [
      'Homeowners and estates needing full site systems',
      'Warehouses and industrial yards',
      'Retail and commercial shopfronts',
      'Clients buying hardware from Nexus Supply who need commissioning',
    ],
    includes: [
      'CCTV installation, repairs, and maintenance',
      'Alarm, sensor, and panic-point commissioning',
      'Access control, maglocks, and visitor systems',
      'Gate motors, boom gates, and safety sensors',
      'Electric-fence energisers and fence monitoring',
      'Intercoms, networking, PoE, and fibre runs',
      'Security lighting and smart-home security setup',
      'Remote monitoring / control-room handover',
      'Security audits and system upgrades',
    ],
    process: [
      'Site survey and coverage / risk quote',
      'Hardware from Nexus Supply or client-supplied kit',
      'Install, test, and train on-site contacts',
      'Optional monitoring link and maintenance schedule',
    ],
    note: 'Residential installs often complete in 1–3 days after survey; multi-building sites are phased. Browse the catalogue for packages that include optional install.',
    cta: { href: '/store?category=PACKAGES', label: 'View security packages' },
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner nx-page-hero-inner--wide">
          <p className="nx-eyebrow">Services</p>
          <h1>Protection across people, vehicles, and sites</h1>
          <p>
            4DS Nexus runs a connected security stack: subscriber apps, 24/7
            control room, rapid response, professional installs, and duty
            supply — so every alert has a clear next step.
          </p>
          <div className="nx-hero-actions" style={{ marginTop: '1.5rem' }}>
            <Link href="/contact" className="nx-btn nx-btn--primary">
              Request a quote
            </Link>
            <a href="#personal-protection" className="nx-btn nx-btn--ghost-light">
              Explore services
            </a>
          </div>
        </div>
      </section>

      <section className="nx-section nx-toc-section">
        <div className="nx-toc">
          {SERVICES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="nx-toc-item">
              <span>{s.index}</span>
              {s.title}
            </a>
          ))}
        </div>
      </section>

      <section className="nx-section nx-section--tight">
        <div className="nx-section-head">
          <p className="nx-eyebrow">How Nexus works</p>
          <h2>From signal to resolution</h2>
          <p>
            Whether the trigger is a panic tap, a geofence breach, or a site
            alarm — the same operating loop applies.
          </p>
        </div>
        <ol className="nx-flow">
          <li>
            <strong>Detect</strong>
            <span>App panic, tracker alert, or installed sensor event</span>
          </li>
          <li>
            <strong>Triage</strong>
            <span>Control room classifies priority and opens the brief</span>
          </li>
          <li>
            <strong>Dispatch</strong>
            <span>Nearest capable unit moves with live navigation</span>
          </li>
          <li>
            <strong>Resolve</strong>
            <span>On-scene update, handover, and portal incident record</span>
          </li>
        </ol>
      </section>

      {SERVICES.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`nx-service-block ${i % 2 === 1 ? 'nx-service-block--alt' : ''}`}
        >
          <div className="nx-service-block-inner">
            <header className="nx-service-block-head">
              <span className="nx-service-index">{s.index}</span>
              <div>
                <h2>{s.title}</h2>
                <p className="nx-service-tagline">{s.tagline}</p>
              </div>
            </header>

            <p className="nx-service-summary">{s.summary}</p>

            <div className="nx-service-columns">
              <div>
                <h3>Who it&apos;s for</h3>
                <ul className="nx-check-list">
                  {s.who.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>What&apos;s included</h3>
                <ul className="nx-check-list">
                  {s.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="nx-service-process">
              <h3>Engagement flow</h3>
              <ol>
                {s.process.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <p className="nx-service-note">{s.note}</p>

            <div className="nx-section-cta">
              {'cta' in s && s.cta ? (
                <Link href={s.cta.href} className="nx-btn nx-btn--primary">
                  {s.cta.label}
                </Link>
              ) : null}
              <Link href="/contact" className="nx-btn nx-btn--outline">
                Ask about {s.title.toLowerCase()}
              </Link>
            </div>
          </div>
        </section>
      ))}

      <section className="nx-band">
        <div className="nx-band-inner">
          <h2>Need a mixed package?</h2>
          <p>
            Most commercial clients combine protection plans, site installs, and
            response cover. Tell us how you operate — we&apos;ll map a stack.
          </p>
          <div className="nx-hero-actions">
            <Link href="/contact" className="nx-btn nx-btn--primary">
              Book a discovery call
            </Link>
            <Link href="/store" className="nx-btn nx-btn--ghost-light">
              Shop equipment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

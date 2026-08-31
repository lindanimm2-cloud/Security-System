import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PortalsPage() {
  return (
    <div className="landing">
      <div className="landing-topbar">
        <Link href="/" className="landing-back">
          ← 4DS Nexus website
        </Link>
        <ThemeToggle />
      </div>
      <div className="landing-glow" />
      <div className="landing-inner">
        <BrandMark variant="portal" href={false} showProduct={false} />
        <h1>Client &amp; staff portals</h1>
        <p>
          Operational access for 4DS Nexus subscribers, control room, officers,
          and technicians.
        </p>

        <div className="landing-cards landing-cards--wide">
          <Link href="/portal/login" className="landing-card landing-card--portal">
            <p className="ec-kicker">Subscriber</p>
            <BrandMark variant="portal" href={false} compact />
            <h2>Client Portal</h2>
            <p>
              For subscribers — panic button, tracking, family safety, and
              incident history.
            </p>
            <span className="landing-card-cta">Sign in as client</span>
          </Link>

          <Link href="/login" className="landing-card landing-card--admin">
            <p className="ec-kicker">Operations</p>
            <BrandMark variant="control" href={false} compact />
            <h2>Control Panel</h2>
            <p>
              Owner, sales CRM, dispatch, store inventory, and install job
              scheduling.
            </p>
            <span className="landing-card-cta">Sign in as operator</span>
          </Link>

          <Link href="/officer/login" className="landing-card landing-card--officer">
            <p className="ec-kicker">Field</p>
            <BrandMark variant="officer" href={false} compact />
            <h2>Officer App</h2>
            <p>
              For field officers — incident queue, navigation, status updates,
              and dispatch chat.
            </p>
            <span className="landing-card-cta">Sign in as officer</span>
          </Link>

          <Link href="/tech/login" className="landing-card landing-card--tech">
            <p className="ec-kicker">Install</p>
            <BrandMark variant="officer" href={false} compact />
            <h2>Technician Team</h2>
            <p>
              Install cameras, alarms, and access control — job board for the
              install tech unit.
            </p>
            <span className="landing-card-cta">Sign in as technician</span>
          </Link>

          <Link href="/login" className="landing-card landing-card--admin">
            <p className="ec-kicker">Supervision</p>
            <BrandMark variant="officer" href={false} compact />
            <h2>Supervisor</h2>
            <p>Field supervision — incidents, shifts, patrol, officer index.</p>
            <span className="landing-card-cta">Sign in as supervisor@4ds.local</span>
          </Link>

          <Link href="/medical/login" className="landing-card landing-card--portal">
            <p className="ec-kicker">Medical</p>
            <BrandMark variant="control" href={false} compact />
            <h2>Medical</h2>
            <p>Medical queue, ALS/BLS recommend, ambulance crew flow.</p>
            <span className="landing-card-cta">Sign in as medical@4ds.local</span>
          </Link>

          <Link href="/login?as=developer" className="landing-card landing-card--admin">
            <p className="ec-kicker">Platform</p>
            <BrandMark variant="control" href={false} compact />
            <h2>Developer</h2>
            <p>
              Platform developer desk — error reports, ops visibility, internal support chat,
              and your profile toolkit.
            </p>
            <span className="landing-card-cta">Sign in as developer@4ds.local</span>
          </Link>
        </div>

        <p className="landing-demo">
          Demo password <code>Demo123!</code> · tenant <code>demo</code>
          <br />
          Owner <code>owner@4ds.local</code> · Supervisor <code>supervisor@4ds.local</code> · Medical{' '}
          <code>medical@4ds.local</code> · Developer <code>developer@4ds.local</code> · Sales{' '}
          <code>sales@4ds.local</code>{' '}
          · Tech <code>tech.cameras@4ds.local</code>
        </p>
      </div>
    </div>
  );
}

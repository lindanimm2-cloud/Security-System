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
            <BrandMark variant="portal" href={false} compact />
            <h2>Client Portal</h2>
            <p>
              For subscribers — panic button, tracking, family safety, and
              incident history.
            </p>
            <span className="landing-card-cta">Sign in as client →</span>
          </Link>

          <Link href="/login" className="landing-card landing-card--admin">
            <BrandMark variant="control" href={false} compact />
            <h2>Control Panel</h2>
            <p>
              Owner, sales CRM, dispatch, store inventory, and install job
              scheduling.
            </p>
            <span className="landing-card-cta">Sign in as operator →</span>
          </Link>

          <Link href="/officer/login" className="landing-card landing-card--officer">
            <BrandMark variant="officer" href={false} compact />
            <h2>Officer App</h2>
            <p>
              For field officers — incident queue, navigation, status updates,
              and dispatch chat.
            </p>
            <span className="landing-card-cta">Sign in as officer →</span>
          </Link>

          <Link href="/tech/login" className="landing-card landing-card--tech">
            <BrandMark variant="officer" href={false} compact />
            <h2>Technician Team</h2>
            <p>
              Install cameras, alarms, and access control — job board for the
              install tech unit.
            </p>
            <span className="landing-card-cta">Sign in as technician →</span>
          </Link>
        </div>

        <p className="landing-demo">
          Demo password <code>Demo123!</code> · tenant <code>demo</code>
          <br />
          Owner <code>owner@4ds.local</code> · Developer <code>developer@4ds.local</code> · Sales{' '}
          <code>sales@4ds.local</code>{' '}
          · Tech <code>tech.cameras@4ds.local</code>
        </p>
      </div>
    </div>
  );
}

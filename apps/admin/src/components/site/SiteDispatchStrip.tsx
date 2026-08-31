import Link from 'next/link';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';

export function SiteDispatchStrip() {
  return (
    <section className="nx-dispatch" aria-label="4DS Control Room">
      <div className="nx-dispatch__top">
        <p className="nx-dispatch__kicker">4DS Control Room</p>
        <span className="nx-dispatch__live">
          <span className="nx-dispatch__dot" aria-hidden />
          Online · 24/7 response
        </span>
      </div>
      <h2>24/7 security response</h2>
      <p className="nx-dispatch__phone">+27 11 100 4400</p>
      <a href={`tel:${CONTROL_ROOM_LINE.phone}`} className="nx-dispatch__cta">
        Call Control Room
      </a>
      <p className="nx-dispatch__note">
        Your contracted security response line. Available 24/7 for verified security emergencies.{' '}
        <Link href="/contact">Request monitoring</Link>
      </p>
    </section>
  );
}

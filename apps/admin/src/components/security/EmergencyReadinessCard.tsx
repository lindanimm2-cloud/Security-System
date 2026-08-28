'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type ReadinessItem = {
  id: string;
  ok: boolean;
  warn?: boolean;
  label: string;
  detail?: string;
};

const READINESS_HREF: Record<string, (ok: boolean) => { href: string; action: string }> = {
  primary: (ok) =>
    ok
      ? { href: '/portal/security/devices', action: 'Open devices' }
      : { href: '/portal/security/setup', action: 'Register device' },
  location: () => ({ href: '/portal/security/permissions#location', action: 'Location settings' }),
  notifications: () => ({ href: '/portal/security/permissions', action: 'Permissions' }),
  'native-sos': () => ({ href: '/portal/security/legal', action: 'Policy' }),
  contacts: () => ({ href: '/portal/contacts', action: 'Contacts' }),
  'panic-test': () => ({ href: '/portal/security#drill', action: 'Run drill' }),
  consent: () => ({ href: '/portal/security/legal', action: 'Record consent' }),
};

export function EmergencyReadinessCard({
  score,
  items,
  embedded = false,
}: {
  score: number;
  items: ReadinessItem[];
  embedded?: boolean;
}) {
  const required = items.filter((item) => item.id !== 'native-sos');
  const readyCount = required.filter((item) => item.ok).length;
  const blocked = required.some((item) => !item.ok && !item.warn);
  const tone = blocked ? 'warning' : 'success';

  return (
    <section className={`sec-ready${embedded ? ' sec-ready--embed' : ''}`} aria-label="Emergency readiness">
      <header className="sec-ready__head">
        <div>
          {embedded ? null : (
            <>
              <p className="sec-kicker">Readiness</p>
              <h2>Emergency readiness</h2>
            </>
          )}
          <p className="sec-ready__lede">
            {blocked
              ? 'Finish required items so control room can verify a response.'
              : 'App protection is ready. Native SOS is device-controlled and not required for in-app Panic.'}
          </p>
        </div>
        <div className="sec-ready__score">
          <strong>{score}%</strong>
          <StatusBadge status={blocked ? 'Setup' : 'Ready'} tone={blocked ? 'warning' : 'success'} />
        </div>
      </header>

      <ProgressBar value={score} max={100} tone={tone} label={`${readyCount} of ${required.length} required`} />

      <ul className="sec-ready__list">
        {items.map((item) => {
          const info = item.id === 'native-sos' || (item.warn && !item.ok);
          const state = item.ok ? 'ok' : info ? 'info' : 'fail';
          const dest = READINESS_HREF[item.id]?.(item.ok);
          const inner = (
            <>
              <span className="sec-ready__mark" aria-hidden>
                {state === 'ok' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === 'info' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <span>
                <strong>{item.label}</strong>
                {item.detail ? <small>{item.detail}</small> : null}
                {dest ? <small className="sec-ready__go">{dest.action}</small> : null}
              </span>
            </>
          );
          return (
            <li key={item.id} className={`sec-ready__row sec-ready__row--${state}`}>
              {dest ? (
                <Link href={dest.href} className="sec-ready__link">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

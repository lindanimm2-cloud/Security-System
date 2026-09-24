'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { EmPermIcon } from '@/components/security/EmPermIcon';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useEmergencyPermissions } from '@/hooks/useEmergencyPermissions';
import { runtimeNote } from '@/lib/emergency-permissions';
import { NATIVE_SOS_DISCLAIMER } from '@/lib/device-security';

function statusLabel(state: string): string {
  if (state === 'granted') return 'On';
  if (state === 'denied') return 'Blocked';
  if (state === 'unsupported') return 'Native';
  if (state === 'checking') return '…';
  return 'Off';
}

function statusClass(state: string): string {
  if (state === 'granted') return 'em-setup__chip--ok';
  if (state === 'denied') return 'em-setup__chip--bad';
  if (state === 'unsupported') return 'em-setup__chip--muted';
  return 'em-setup__chip--warn';
}

export default function EmergencySetupPage() {
  return (
    <PortalLayout>
      <EmergencySetupContent />
    </PortalLayout>
  );
}

function EmergencySetupContent() {
  const router = useRouter();
  const { access, loading } = useSubscriptionAccess();
  const { recommended, allowRecommended, setupBusy, missingRequired } = useEmergencyPermissions(access);

  if (loading || !access) {
    return (
      <div className="page-content">
        <p className="text-muted">Loading emergency setup…</p>
      </div>
    );
  }

  return (
    <div className="page-content em-setup">
      <header className="em-setup__hero">
        <p className="em-setup__kicker">Device readiness</p>
        <h1>Emergency protection</h1>
        <p className="em-setup__lead">
          Grant the channels control room needs for alerts, location, and voice. One pass through
          the system prompts, then refine vibration under permissions.
        </p>
      </header>

      <section className="em-setup__card">
        <p className="em-setup__section-label">Required &amp; recommended</p>
        <ul className="em-setup__list">
          {recommended.map((row) => (
            <li key={row.id}>
              <span className="em-setup__icon" aria-hidden>
                <EmPermIcon id={row.id} size={18} />
              </span>
              <div>
                <strong>
                  {row.label}
                  {row.required ? null : <span className="em-setup__opt"> optional</span>}
                </strong>
                <p>{row.why}</p>
              </div>
              <span className={`em-setup__chip ${statusClass(row.state)}`}>{statusLabel(row.state)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="ops-act ops-act--dispatch em-setup__cta"
          disabled={setupBusy}
          onClick={() => void allowRecommended().then(() => router.push('/portal/security/permissions'))}
        >
          {setupBusy ? 'Enabling…' : 'Enable emergency protection'}
        </button>

        {missingRequired.length > 0 ? (
          <p className="em-setup__note text-muted">
            {missingRequired.length} required channel
            {missingRequired.length === 1 ? '' : 's'} still need attention after the prompts.
          </p>
        ) : (
          <p className="em-setup__note text-muted">You can refine vibration patterns next.</p>
        )}
      </section>

      <aside className="em-setup__aside">
        <p className="text-muted">{NATIVE_SOS_DISCLAIMER}</p>
        <ul className="em-setup__runtime">
          {recommended.slice(0, 4).map((row) => (
            <li key={`note-${row.id}`}>
              <strong>{row.label}</strong> — {runtimeNote(row)}
            </li>
          ))}
        </ul>
        <Link href="/portal/security/permissions" className="link-sm">
          Skip to Emergency Permissions
        </Link>
      </aside>
    </div>
  );
}

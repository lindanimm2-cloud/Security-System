'use client';

import { HoldToActivate } from '@/components/ops/EmergencyMode';

export function EmergencyTestCard({
  loading,
  message,
  onTest,
  embedded = false,
}: {
  loading?: boolean;
  message?: string;
  onTest: () => void | Promise<void>;
  embedded?: boolean;
}) {
  return (
    <section className={`sec-test${embedded ? ' sec-test--embed' : ''}`} aria-label="Test emergency system">
      <header>
        {embedded ? null : (
          <>
            <p className="sec-kicker">Drill</p>
            <h2>Test emergency system</h2>
          </>
        )}
        <p>
          Sends a labelled test to the control room. Never use your phone’s native Emergency SOS to test this
          application.
        </p>
      </header>
      <HoldToActivate
        label="Test panic system"
        holdMs={3000}
        tone="warn"
        className="hold-activate--console"
        loading={loading}
        onActivate={onTest}
      />
      {message ? (
        <p className={`sec-test__msg ${message.toLowerCase().includes('successful') ? 'is-ok' : 'is-err'}`} role="status">
          {message}
        </p>
      ) : (
        <p className="sec-test__note">Hold 3 seconds. This is not a live emergency.</p>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import type { EngagementAccessMeta } from '@/hooks/useSubscriptionAccess';
import { jobKickerForEngagementKind } from '@/lib/temp-engagements';

export function TempEngagementBanner({
  engagement,
  onChanged,
}: {
  engagement: EngagementAccessMeta;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const jobKicker = engagement.jobKicker || jobKickerForEngagementKind(engagement.kind);

  async function togglePanic(enabled: boolean) {
    setBusy(true);
    setError('');
    try {
      await clientApi.post('/client/engagement/panic', { enabled });
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update panic');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-card temp-engagement-banner" aria-label={jobKicker}>
      <div className="temp-engagement-banner__head">
        <div>
          <p className="temp-engagement-banner__kicker">{jobKicker}</p>
          <h2>{engagement.kindLabel}</h2>
          <p className="text-muted">
            {engagement.status === 'ACTIVE' ? 'Engagement active' : engagement.status.replace(/_/g, ' ')}
            {engagement.date ? ` · ${engagement.date}` : ''}
            {engagement.time ? ` · ${engagement.time}` : ''}
          </p>
          {engagement.pickup || engagement.destination ? (
            <p className="temp-engagement-banner__route">
              {[engagement.pickup, engagement.destination].filter(Boolean).join(' → ')}
            </p>
          ) : null}
        </div>
        <Link href="/portal/job-details" className="btn-sm btn-secondary">
          Job details
        </Link>
      </div>

      {!engagement.panicEnabled ? (
        <div className="temp-engagement-banner__panic">
          <p>
            Panic is off until you arm it for this {jobKicker.toLowerCase()}. Control room can turn
            it off when the job closes.
          </p>
          <button
            type="button"
            className="btn-ok"
            disabled={busy}
            onClick={() => void togglePanic(true)}
          >
            {busy ? 'Enabling…' : 'Enable panic'}
          </button>
        </div>
      ) : (
        <div className="temp-engagement-banner__panic temp-engagement-banner__panic--on">
          <p>Panic is armed for this {jobKicker.toLowerCase()}.</p>
          <div className="temp-engagement-banner__panic-actions">
            <Link href="/portal/protect" className="btn-ok">
              Open Protect
            </Link>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => void togglePanic(false)}
            >
              Turn off panic
            </button>
          </div>
        </div>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </section>
  );
}

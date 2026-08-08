'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { adminApi } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { OFFICER_STATUSES, officerStatusLabel, officerStatusSlug } from '@/lib/officer-status';

type Props = {
  officerId: string;
  status: string;
  variant?: 'buttons' | 'select';
  onUpdated?: () => void;
};

export function OfficerStatusControl({
  officerId,
  status,
  variant = 'buttons',
  onUpdated,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  async function setStatus(next: string) {
    if (next === status || updating) return;
    setUpdating(true);
    setError('');
    try {
      await adminApi.patch(`/control-room/officers/${officerId}/status`, { status: next });
      onUpdated?.();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setUpdating(false);
    }
  }

  if (variant === 'select') {
    return (
      <div className="officer-status-select-wrap">
        <select
          className="officer-status-select"
          value={status}
          disabled={updating}
          onChange={(e) => void setStatus(e.target.value)}
          aria-label="Officer status"
        >
          {OFFICER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {updating && <LoadingSpinner label="" size="sm" />}
        {error && <span className="officer-status-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="officer-status-control">
      <div className="officer-status-buttons" role="group" aria-label="Set officer status">
        {OFFICER_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`officer-status-btn officer-status-btn--${officerStatusSlug(s.value)} ${
              status === s.value ? 'officer-status-btn--active' : ''
            }`}
            title={s.hint}
            disabled={updating}
            onClick={() => void setStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {updating && <span className="officer-status-saving">Updating…</span>}
      {error && <span className="officer-status-error">{error}</span>}
    </div>
  );
}

export function OfficerStatusDot({ status }: { status: string }) {
  return (
    <div
      className={`officer-dot officer-dot--${officerStatusSlug(status)}`}
      title={officerStatusLabel(status)}
    />
  );
}

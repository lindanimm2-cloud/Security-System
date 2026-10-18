'use client';

import { useState } from 'react';
import {
  isSameOfficerStatus,
  nextOfficerStatus,
  officerStatusLabel,
  officerStatusSlug,
} from '@/lib/officer-status';
import { officerApi } from '@/lib/api-client';
import { useOfficerStatus } from '@/components/officer/OfficerStatusProvider';

type Props = {
  status: string;
  onUpdated?: () => void;
  /** @deprecated Unused — status is a single cycle button */
  layout?: 'grid' | 'buttons';
};

export function OfficerStatusPicker({ status, onUpdated }: Props) {
  const { reload: reloadHeaderStatus } = useOfficerStatus();
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  async function setStatus(next: string) {
    if (isSameOfficerStatus(next, status) || updating) return;
    setUpdating(true);
    setMsg('');
    try {
      await officerApi.patch('/officer/status', { status: next });
      setMsg(`Status updated to ${officerStatusLabel(next).toLowerCase()}.`);
      onUpdated?.();
      reloadHeaderStatus();
    } finally {
      setUpdating(false);
    }
  }

  const slug = officerStatusSlug(status);
  const next = nextOfficerStatus(status);
  const nextLabel = officerStatusLabel(next);

  return (
    <div className="officer-status-picker">
      {msg && <div className="alert alert--success">{msg}</div>}
      <button
        type="button"
        className={`officer-status-btn officer-status-btn--cycle officer-status-btn--${slug} officer-status-btn--active`}
        disabled={updating}
        title={`Tap to set ${nextLabel}`}
        aria-label={`Status ${officerStatusLabel(status)}. Tap to change to ${nextLabel}`}
        onClick={() => void setStatus(next)}
      >
        {updating ? 'Updating…' : officerStatusLabel(status)}
      </button>
    </div>
  );
}

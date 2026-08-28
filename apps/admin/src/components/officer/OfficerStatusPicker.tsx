'use client';

import { useState } from 'react';
import { OFFICER_STATUSES, isSameOfficerStatus, officerStatusSlug } from '@/lib/officer-status';
import { officerApi } from '@/lib/api-client';
import { useOfficerStatus } from '@/components/officer/OfficerStatusProvider';

type Props = {
  status: string;
  onUpdated?: () => void;
  layout?: 'grid' | 'buttons';
};

export function OfficerStatusPicker({ status, onUpdated, layout = 'grid' }: Props) {
  const { reload: reloadHeaderStatus } = useOfficerStatus();
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  async function setStatus(next: string) {
    if (isSameOfficerStatus(next, status) || updating) return;
    setUpdating(true);
    setMsg('');
    try {
      await officerApi.patch('/officer/status', { status: next });
      setMsg(`Status updated to ${next.replace(/_/g, ' ').toLowerCase()}.`);
      onUpdated?.();
      reloadHeaderStatus();
    } finally {
      setUpdating(false);
    }
  }

  const wrapClass = layout === 'grid' ? 'officer-status-grid' : 'officer-status-buttons';

  return (
    <div className="officer-status-picker">
      {msg && <div className="alert alert--success">{msg}</div>}
      <div className={wrapClass} role="group" aria-label="Shift status">
        {OFFICER_STATUSES.map((s) => {
          const slug = officerStatusSlug(s.value);
          const active = isSameOfficerStatus(status, s.value);
          return (
            <button
              key={s.value}
              type="button"
              className={`officer-status-btn officer-status-btn--${slug} ${active ? 'officer-status-btn--active' : ''}`}
              disabled={updating}
              title={s.hint}
              onClick={() => void setStatus(s.value)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

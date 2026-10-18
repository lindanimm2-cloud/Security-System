'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';
import { adminApi } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import {
  OFFICER_STATUSES,
  isSameOfficerStatus,
  nextOfficerStatus,
  officerStatusLabel,
  officerStatusSlug,
} from '@/lib/officer-status';

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
    if (isSameOfficerStatus(next, status) || updating) return;
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
        <OpsMenuDropdown
          className={`officer-status-menu officer-status-menu--ops officer-status-menu--${officerStatusSlug(status)}`}
          triggerClassName={`officer-status-menu__trigger officer-status-menu__trigger--${officerStatusSlug(status)}`}
          compact
          align="right"
          ariaLabel="Officer status"
          disabled={updating}
          label={<OpsMarqueeText>{officerStatusLabel(status)}</OpsMarqueeText>}
          leading={<OfficerStatusDot status={status} />}
          items={OFFICER_STATUSES.map((s) => ({
            id: s.value,
            label: s.label,
            description: s.hint,
            active: isSameOfficerStatus(status, s.value),
            tone: s.value === 'OFF_DUTY' ? 'danger' : s.value === 'AVAILABLE' ? 'ok' : 'default',
            className: `officer-status-item officer-status-item--${officerStatusSlug(s.value)}`,
            leading: <OfficerStatusDot status={s.value} />,
            onClick: () => void setStatus(s.value),
          }))}
        />
        {updating && <LoadingSpinner label="" size="sm" />}
        {error && <span className="officer-status-error">{error}</span>}
      </div>
    );
  }

  const slug = officerStatusSlug(status);
  const next = nextOfficerStatus(status);
  const nextLabel = officerStatusLabel(next);

  return (
    <div className="officer-status-control">
      <button
        type="button"
        className={`officer-status-btn officer-status-btn--cycle officer-status-btn--${slug} officer-status-btn--active`}
        title={`Tap to set ${nextLabel}`}
        aria-label={`Status ${officerStatusLabel(status)}. Tap to change to ${nextLabel}`}
        disabled={updating}
        onClick={() => void setStatus(next)}
      >
        {updating ? 'Updating…' : officerStatusLabel(status)}
      </button>
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

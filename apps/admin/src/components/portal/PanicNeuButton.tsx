'use client';

import { type ReactNode } from 'react';
import { HoldToActivate } from '@/components/ops/EmergencyMode';

type Props = {
  label: string;
  holdMs?: number;
  onActivate: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'danger' | 'warn' | 'medical';
  size?: 'lg' | 'sm';
  variant?: 'panic' | 'silent' | 'medical' | 'fire' | 'vehicle' | 'hub';
  icon: ReactNode;
  showIndicator?: boolean;
};

export function PanicNeuButton({
  label,
  holdMs = 2000,
  onActivate,
  disabled,
  loading,
  tone = 'danger',
  size = 'sm',
  variant = 'panic',
  icon,
  showIndicator = false,
}: Props) {
  const isLg = size === 'lg';

  return (
    <div
      className={`panic-neu__well ${isLg ? 'panic-neu__well--lg' : ''} panic-neu__well--${variant}`.trim()}
    >
      {showIndicator ? <span className="panic-neu__indicator" aria-hidden /> : null}
      <HoldToActivate
        label={label}
        holdMs={holdMs}
        tone={tone}
        hideHint
        keepLabel
        loading={loading}
        disabled={disabled}
        onActivate={onActivate}
        className={`panic-neu__knob ${isLg ? 'panic-neu__knob--lg' : ''}`}
      >
        {icon}
      </HoldToActivate>
    </div>
  );
}

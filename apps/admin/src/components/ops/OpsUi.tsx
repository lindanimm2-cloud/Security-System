'use client';

import type { ReactNode } from 'react';
import { HoldToActivate } from '@/components/ops/EmergencyMode';

export type OpsStatusTone =
  | 'ok'
  | 'info'
  | 'warn'
  | 'danger'
  | 'muted'
  | 'purple';

const TONE_CLASS: Record<OpsStatusTone, string> = {
  ok: 'ops-status--ok',
  info: 'ops-status--info',
  warn: 'ops-status--warn',
  danger: 'ops-status--danger',
  muted: 'ops-status--muted',
  purple: 'ops-status--purple',
};

export function OpsStatusBadge({
  label,
  tone = 'muted',
  className = '',
}: {
  label: string;
  tone?: OpsStatusTone;
  className?: string;
}) {
  return (
    <span className={`ops-status ${TONE_CLASS[tone]} ${className}`.trim()}>
      <span className="ops-status__dot" aria-hidden />
      {label}
    </span>
  );
}

export function OpsMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: OpsStatusTone;
}) {
  return (
    <div className={`ops-metric ${tone ? TONE_CLASS[tone] : ''}`.trim()}>
      <strong className="ops-metric__value">{value}</strong>
      <span className="ops-metric__label">
        {tone ? <span className="ops-status__dot" aria-hidden /> : null}
        {label}
      </span>
    </div>
  );
}

export function OpsPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ops-page-header">
      <div>
        <h1 className="ops-page-header__title">{title}</h1>
        {subtitle ? <p className="ops-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ops-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function OpsCommandTile({
  title,
  description,
  stateLabel,
  tone = 'muted',
  icon,
  active,
  danger,
  disabled,
  holdMs,
  onClick,
}: {
  title: string;
  description: string;
  stateLabel: string;
  tone?: OpsStatusTone;
  icon: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** When set, requires press-and-hold instead of a tap. */
  holdMs?: number;
  onClick?: () => void;
}) {
  const className = `ops-cmd-tile ${TONE_CLASS[tone]} ${active ? 'ops-cmd-tile--active' : ''} ${
    danger ? 'ops-cmd-tile--danger' : ''
  } ${holdMs ? 'hold-activate--ops-tile' : ''}`.trim();

  const body = (
    <>
      <span className="ops-cmd-tile__icon" aria-hidden>
        {icon}
      </span>
      <span className="ops-cmd-tile__copy">
        <strong className="ops-cmd-tile__title">{title}</strong>
        <span className="ops-cmd-tile__desc">{description}</span>
      </span>
      <span className="ops-cmd-tile__state">
        <span className="ops-status__dot" aria-hidden />
        {stateLabel}
      </span>
    </>
  );

  if (holdMs && holdMs > 0) {
    const holdTone = tone === 'danger' ? 'danger' : 'warn';
    return (
      <HoldToActivate
        label={title}
        holdMs={holdMs}
        keepLabel
        tone={holdTone}
        disabled={disabled}
        className={className}
        onActivate={() => onClick?.()}
      >
        {body}
      </HoldToActivate>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
    </button>
  );
}

export function OpsActivityRow({
  time,
  title,
  actor,
}: {
  time: string;
  title: string;
  actor: string;
}) {
  return (
    <li className="ops-activity-row">
      <time className="ops-activity-row__time">{time}</time>
      <div className="ops-activity-row__body">
        <strong>{title}</strong>
        <span className="text-muted">{actor}</span>
      </div>
    </li>
  );
}

export function officerTone(status: string): OpsStatusTone {
  const s = status.toUpperCase();
  if (s === 'AVAILABLE' || s === 'ON_DUTY') return 'ok';
  if (s === 'EN_ROUTE' || s === 'RETURNING') return 'info';
  if (s === 'BUSY' || s === 'ON_SCENE') return 'warn';
  if (s === 'OFF_DUTY') return 'muted';
  return 'muted';
}

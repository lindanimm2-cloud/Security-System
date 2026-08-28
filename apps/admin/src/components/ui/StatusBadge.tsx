'use client';

export type StatusTone = 'success' | 'active' | 'warning' | 'danger' | 'neutral';

const SUCCESS = new Set([
  'COMPLETED',
  'COMPLETE',
  'ONLINE',
  'APPROVED',
  'INSTALLED',
  'RESOLVED',
  'AVAILABLE',
  'ARMED',
  'OK',
  'SUCCESS',
  'OPERATIONAL',
  'DONE',
]);

const ACTIVE = new Set([
  'IN_PROGRESS',
  'INSTALL',
  'EN_ROUTE',
  'WORKING',
  'ACTIVE',
  'TESTING',
  'ARRIVED',
  'SITE_CHECK',
  'CLIENT_APPROVAL',
  'BUSY',
  'DEPLOYED',
  'ON_DUTY',
  'ON_SCENE',
  'SCOPED',
]);

const WARNING = new Set([
  'SCHEDULED',
  'PENDING',
  'WAITING',
  'ATTENTION',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'MAINTENANCE',
]);

const DANGER = new Set([
  'CRITICAL',
  'OFFLINE',
  'FAILED',
  'ESCALATED',
  'CANCELLED',
  'CANCELED',
  'PANIC',
  'DEFECTIVE',
  'BLOCKED',
  'TRIGGERED',
]);

export function toneForStatus(status: string): StatusTone {
  const key = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (SUCCESS.has(key)) return 'success';
  if (ACTIVE.has(key)) return 'active';
  if (WARNING.has(key)) return 'warning';
  if (DANGER.has(key)) return 'danger';
  return 'neutral';
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function StatusBadge({
  status,
  label,
  tone,
  pulse,
}: {
  status?: string;
  label?: string;
  tone?: StatusTone;
  pulse?: boolean;
}) {
  const text = label ?? (status ? formatStatusLabel(status) : '');
  const resolved = tone ?? toneForStatus(status ?? text);
  return (
    <span className={`ds-status ds-status--${resolved} ${pulse ? 'ds-status--pulse' : ''}`}>
      <span className="ds-status__dot" aria-hidden />
      <span className="ds-status__label">{text}</span>
    </span>
  );
}

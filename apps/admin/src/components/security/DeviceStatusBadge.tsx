import { deviceStatusMeta } from '@/lib/device-security';

export function DeviceStatusBadge({
  status,
  isPrimary,
}: {
  status: string;
  isPrimary?: boolean;
}) {
  const meta = deviceStatusMeta(status, Boolean(isPrimary));
  const primaryTrusted = Boolean(isPrimary) && status === 'TRUSTED';
  return (
    <span className={`sec-status sec-status--${meta.tone}`}>
      <span className="sec-status__dot" aria-hidden />
      {primaryTrusted ? (
        <span className="sec-status__label">
          Primary<span className="sec-status__sep">•</span>Trusted
        </span>
      ) : (
        meta.label
      )}
    </span>
  );
}

import Link from 'next/link';
import { formatDispatchPhase, officerTaskStatusClass } from '@/lib/officer-task-theme';
import { officerStatusLabel, officerStatusSlug } from '@/lib/officer-status';

export function fleetStatusSlug(status: string): string {
  return status.toLowerCase().replace(/_/g, '-');
}

export function OfficerStatusBadge({
  status,
  linkToProfile,
}: {
  status: string;
  linkToProfile?: boolean;
}) {
  const slug = officerStatusSlug(status);
  const className = `officer-status-badge officer-status-badge--${slug}`;
  const label = officerStatusLabel(status);

  if (linkToProfile) {
    return (
      <Link href="/officer/profile#shift" className={`${className} officer-status-badge--link`} title="Update shift status">
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}

export function FleetStatusBadge({ status }: { status: string }) {
  const slug = fleetStatusSlug(status);
  return (
    <span className={`badge badge--fleet badge--fleet-${slug}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function DispatchStatusBadge({ status }: { status: string }) {
  return (
    <span className={`dispatch-status-badge ${officerTaskStatusClass(status)}`}>
      <span className="dispatch-status-badge__dot" aria-hidden />
      {formatDispatchPhase(status)}
    </span>
  );
}

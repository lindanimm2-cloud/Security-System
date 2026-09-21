'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOfficerActiveIncident } from '@/hooks/useOfficerActiveIncident';

export function OfficerQuickRecordFab() {
  const pathname = usePathname();
  const { data } = useOfficerActiveIncident();
  const hasActiveIncident = !!data?.data;

  if (
    pathname === '/officer/login' ||
    pathname.startsWith('/officer/record') ||
    !hasActiveIncident
  ) {
    return null;
  }

  return (
    <Link
      href="/officer/record?quick=1"
      className="officer-record-fab"
      aria-label="Field recording — open camera for active incident"
      title="Field recording"
    >
      <span className="officer-record-fab__ring" aria-hidden />
      <span className="officer-record-fab__icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="5.5" fill="currentColor" />
        </svg>
      </span>
      <span className="officer-record-fab__label">REC</span>
    </Link>
  );
}

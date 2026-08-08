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

      aria-label="Quick record — open camera for active incident"

      title="Quick record evidence"

    >

      <span className="officer-record-fab__ring" aria-hidden />

      <span className="officer-record-fab__icon" aria-hidden>

        <svg viewBox="0 0 24 24" width="28" height="28">

          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.95" />

          <circle cx="12" cy="12" r="4" fill="#0a0a0a" />

        </svg>

      </span>

      <span className="officer-record-fab__label">REC</span>

    </Link>

  );

}


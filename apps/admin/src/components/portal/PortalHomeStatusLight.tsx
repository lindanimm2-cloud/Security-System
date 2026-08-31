'use client';

import Link from 'next/link';
import { PORTAL_AMBIENT_LABEL } from '@/lib/portal-ambient';
import { usePortalAmbientOptional } from './PortalAmbientProvider';

export function PortalHomeStatusLight({ compact = false }: { compact?: boolean }) {
  const ctx = usePortalAmbientOptional();
  const ambient = ctx?.ambient ?? 'none';
  if (ambient === 'none') return null;

  return (
    <Link
      href="/portal/home"
      className={`portal-status-light ${compact ? 'portal-status-light--compact' : ''}`}
      data-ambient={ambient}
      title={`Home is ${PORTAL_AMBIENT_LABEL[ambient]}`}
    >
      <span className="portal-status-light__dot" aria-hidden />
      <span className="portal-status-light__label">{PORTAL_AMBIENT_LABEL[ambient]}</span>
    </Link>
  );
}

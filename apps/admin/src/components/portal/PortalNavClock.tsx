'use client';

import { NavClock } from '@/components/NavClock';

type PortalNavClockProps = {
  compact?: boolean;
};

/** Portal clock — no LIVE tag; protection status is shown on PortalProtectionBadge */
export function PortalNavClock({ compact = false }: PortalNavClockProps) {
  return <NavClock compact={compact} futuristTag={null} />;
}

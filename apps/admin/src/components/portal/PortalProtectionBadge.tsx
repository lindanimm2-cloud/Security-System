'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type SubscriptionSummary = {
  status: string;
  planName?: string;
} | null;

type PortalProtectionBadgeProps = {
  compact?: boolean;
};

export function PortalProtectionBadge({ compact = false }: PortalProtectionBadgeProps) {
  const { data } = useApi(
    () => clientApi.get<ApiResponse<SubscriptionSummary>>('/client/subscription'),
    [],
  );

  const active = data?.data?.status === 'ACTIVE';

  return (
    <Link
      href="/portal/subscription"
      className={`protection-badge protection-badge--topbar ${compact ? 'protection-badge--compact' : ''}`}
      title={active ? 'Your protection plan is active' : 'Complete your protection setup'}
    >
      <span className="protection-dot" />
      {active ? 'Protected' : 'Setup'}
    </Link>
  );
}

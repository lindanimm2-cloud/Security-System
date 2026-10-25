'use client';

import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import type { AccessMap } from '@/lib/subscription-plans';
import type { TempEngagementKind, TempEngagementStatus } from '@/lib/temp-engagements';

export type EngagementAccessMeta = {
  id: string;
  kind: TempEngagementKind;
  kindLabel: string;
  jobKicker?: string;
  status: TempEngagementStatus;
  panicEnabled: boolean;
  existingClient?: boolean;
  pickup?: string;
  destination?: string;
  date?: string;
  time?: string;
};

type AccessData = {
  tierCode: string;
  addons: string[];
  access: AccessMap;
  jobOnly?: boolean;
  engagement?: EngagementAccessMeta | null;
};

export function useSubscriptionAccess() {
  const result = useApi(
    () => clientApi.get<ApiResponse<AccessData>>('/client/subscription/access'),
    [],
  );
  const engagement = result.data?.data.engagement ?? null;
  const jobOnly =
    result.data?.data.jobOnly ??
    Boolean(engagement && !engagement.existingClient && result.data?.data.tierCode === 'TEMP_ENGAGEMENT');

  return {
    ...result,
    access: result.data?.data.access ?? null,
    tierCode: result.data?.data.tierCode,
    addons: result.data?.data.addons ?? [],
    engagement,
    jobOnly,
  };
}

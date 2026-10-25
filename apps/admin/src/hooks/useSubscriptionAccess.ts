'use client';

import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import type { AccessMap } from '@/lib/subscription-plans';
import type { TempEngagementKind, TempEngagementStatus } from '@/lib/temp-engagements';

export type EngagementAccessMeta = {
  id: string;
  kind: TempEngagementKind;
  kindLabel: string;
  status: TempEngagementStatus;
  panicEnabled: boolean;
  pickup?: string;
  destination?: string;
  date?: string;
  time?: string;
};

type AccessData = {
  tierCode: string;
  addons: string[];
  access: AccessMap;
  engagement?: EngagementAccessMeta | null;
};

export function useSubscriptionAccess() {
  const result = useApi(
    () => clientApi.get<ApiResponse<AccessData>>('/client/subscription/access'),
    [],
  );

  return {
    ...result,
    access: result.data?.data.access ?? null,
    tierCode: result.data?.data.tierCode,
    addons: result.data?.data.addons ?? [],
    engagement: result.data?.data.engagement ?? null,
  };
}

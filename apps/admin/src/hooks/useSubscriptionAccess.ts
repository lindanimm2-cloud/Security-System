'use client';

import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import type { AccessMap } from '@/lib/subscription-plans';

type AccessData = {
  tierCode: string;
  addons: string[];
  access: AccessMap;
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
  };
}

'use client';

import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { portalAmbientFromAlarm, type PortalAmbientKey } from '@/lib/portal-ambient';
import { useEffect } from 'react';

type Overview = {
  properties: { alarmStatus: string }[];
};

export function usePortalHomeAmbient(): PortalAmbientKey {
  const { data, reload } = useApi(
    () => clientApi.get<ApiResponse<Overview>>('/client/overview'),
    [],
  );

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  const status = data?.data?.properties?.[0]?.alarmStatus;
  return portalAmbientFromAlarm(status);
}

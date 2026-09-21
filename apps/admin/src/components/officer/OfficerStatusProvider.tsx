'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { collectDutyDeviceTelemetry } from '@/lib/officer-duty';

type OfficerStatusContextValue = {
  status: string;
  dutyModeActive: boolean;
  deviceLink: string;
  reload: () => void;
};

const OfficerStatusContext = createContext<OfficerStatusContextValue>({
  status: 'AVAILABLE',
  dutyModeActive: false,
  deviceLink: 'STANDBY',
  reload: () => {},
});

const HEARTBEAT_MS = 60_000;

type DashboardOfficer = {
  status: string;
  dutyModeActive?: boolean;
  deviceLink?: string;
};

export function OfficerStatusProvider({ children }: { children: React.ReactNode }) {
  const { data, reload } = useApi(
    () =>
      officerApi.get<ApiResponse<{ officer: DashboardOfficer }>>('/officer/dashboard'),
    [],
  );

  const status = data?.data?.officer?.status ?? 'AVAILABLE';
  const dutyModeActive = Boolean(data?.data?.officer?.dutyModeActive);
  const deviceLink = data?.data?.officer?.deviceLink ?? 'STANDBY';
  const dutyRef = useRef(dutyModeActive);
  dutyRef.current = dutyModeActive;

  useEffect(() => {
    if (!dutyModeActive) return;

    let cancelled = false;

    async function beat() {
      if (cancelled || !dutyRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const telemetry = await collectDutyDeviceTelemetry();
        await officerApi.post('/officer/duty/heartbeat', telemetry);
      } catch {
        /* network blip — Control Room treats missing heartbeats as offline */
      }
    }

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [dutyModeActive]);

  return (
    <OfficerStatusContext.Provider value={{ status, dutyModeActive, deviceLink, reload }}>
      {children}
    </OfficerStatusContext.Provider>
  );
}

export function useOfficerStatus() {
  return useContext(OfficerStatusContext);
}

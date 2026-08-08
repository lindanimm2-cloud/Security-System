'use client';

import { createContext, useContext } from 'react';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';

type OfficerStatusContextValue = {
  status: string;
  reload: () => void;
};

const OfficerStatusContext = createContext<OfficerStatusContextValue>({
  status: 'AVAILABLE',
  reload: () => {},
});

export function OfficerStatusProvider({ children }: { children: React.ReactNode }) {
  const { data, reload } = useApi(
    () => officerApi.get<ApiResponse<{ officer: { status: string } }>>('/officer/dashboard'),
    [],
  );

  const status = data?.data?.officer?.status ?? 'AVAILABLE';

  return (
    <OfficerStatusContext.Provider value={{ status, reload }}>
      {children}
    </OfficerStatusContext.Provider>
  );
}

export function useOfficerStatus() {
  return useContext(OfficerStatusContext);
}

import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';

export type OfficerActiveIncident = {
  incidentId: string;
  type: string;
  status: string;
  client: string;
  address: string | null;
};

export function useOfficerActiveIncident() {
  return useApi(
    () => officerApi.get<ApiResponse<OfficerActiveIncident | null>>('/officer/active-incident'),
    [],
  );
}

'use client';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';

type DispatchOptionsSummary = {
  availableCount: number;
};

type AvailableOfficersButtonProps = {
  incidentId: string;
  active?: boolean;
  onClick: () => void;
};

export function AvailableOfficersButton({
  incidentId,
  active = false,
  onClick,
}: AvailableOfficersButtonProps) {
  const { data, loading } = useApi(
    () =>
      adminApi.get<ApiResponse<DispatchOptionsSummary>>(
        `/control-room/dispatch/options/${incidentId}`,
      ),
    [incidentId],
  );

  const count = data?.data?.availableCount;

  return (
    <button
      type="button"
      className={`btn-available ${active ? 'btn-available--active' : ''}`}
      onClick={onClick}
      title="View available officers for this incident"
    >
      {loading && count == null ? (
        <LoadingSpinner label="" size="sm" />
      ) : (
        <>
          Available
          {count != null && <span className="btn-available__count">{count}</span>}
        </>
      )}
    </button>
  );
}

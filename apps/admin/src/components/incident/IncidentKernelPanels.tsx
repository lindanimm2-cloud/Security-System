'use client';

import { useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { adminApi, clientApi, officerApi, type ApiResponse } from '@/lib/api-client';
import type { AuthPortal } from '@/lib/auth';
import { IncidentChat } from './IncidentChat';
import { IncidentTimeline, type TimelineItem } from './IncidentTimeline';
import { RespondingResources, type RespondingResource } from './RespondingResources';

function apiFor(portal: AuthPortal) {
  if (portal === 'officer') return officerApi;
  if (portal === 'client') return clientApi;
  return adminApi;
}

export function IncidentKernelPanels({
  incidentId,
  portal,
  compact = false,
  showChat = true,
}: {
  incidentId: string;
  portal: AuthPortal;
  compact?: boolean;
  showChat?: boolean;
}) {
  const api = apiFor(portal);
  const { data: timelineData, reload: reloadTimeline } = useApi(
    () => api.get<ApiResponse<TimelineItem[]>>(`/incidents/${incidentId}/timeline`),
    [incidentId, portal],
  );
  const { data: resourceData, reload: reloadResources } = useApi(
    () => api.get<ApiResponse<RespondingResource[]>>(`/incidents/${incidentId}/resources`),
    [incidentId, portal],
  );

  const onEvent = useCallback(() => {
    reloadTimeline();
    reloadResources();
  }, [reloadTimeline, reloadResources]);

  usePlatformEvents(
    portal,
    [
      'incident.created',
      'incident.updated',
      'incident.assigned',
      'dispatch.created',
      'dispatch.accepted',
      'dispatch.en_route',
      'dispatch.arrived',
      'dispatch.completed',
      'message.created',
    ],
    onEvent,
    incidentId,
  );

  return (
    <div className={`incident-kernel-panels${compact ? ' incident-kernel-panels--compact' : ''}`}>
      <div>
        <h3>Responding</h3>
        <RespondingResources resources={resourceData?.data ?? []} compact={compact} />
      </div>
      <div>
        <h3>What happened</h3>
        <IncidentTimeline items={timelineData?.data ?? []} compact={compact} />
      </div>
      {showChat ? <IncidentChat incidentId={incidentId} portal={portal} /> : null}
    </div>
  );
}

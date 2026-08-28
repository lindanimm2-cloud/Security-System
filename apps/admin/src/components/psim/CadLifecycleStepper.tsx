'use client';

import { IncidentLifecycle, INCIDENT_LIFECYCLE_STEPS } from '@/components/control-room/IncidentLifecycle';
import {
  CAD_STATES,
  cadStateIndex,
  cadStateLabel,
  mapIncidentStatusToTimelineIndex,
  OPS_TIMELINE_STEPS,
} from '@/lib/psim/cad-workflow';

export function CadLifecycleStepper({
  status,
  priority,
  variant = 'ops',
}: {
  status?: string;
  priority?: string;
  variant?: 'ops' | 'full';
}) {
  if (variant === 'full') {
    const idx = cadStateIndex(status ?? 'NEW');
    return (
      <IncidentLifecycle
        currentIndex={idx}
        steps={CAD_STATES.map((s) => cadStateLabel(s))}
      />
    );
  }

  const idx = mapIncidentStatusToTimelineIndex(status, priority);
  return <IncidentLifecycle currentIndex={idx} steps={INCIDENT_LIFECYCLE_STEPS} />;
}

export { OPS_TIMELINE_STEPS, mapIncidentStatusToTimelineIndex };

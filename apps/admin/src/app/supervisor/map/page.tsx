'use client';

import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { DashboardLiveMap } from '@/components/control-room/DashboardLiveMap';

export default function SupervisorMapPage() {
  return (
    <SupervisorLayout title="Officers + SLA">
      <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
        Live officer positions. SLA-breached jobs are highlighted on the ops queue.
      </p>
      <div className="ops-board__map" style={{ minHeight: '62vh' }}>
        <DashboardLiveMap />
      </div>
    </SupervisorLayout>
  );
}

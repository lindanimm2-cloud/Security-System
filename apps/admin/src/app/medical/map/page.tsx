'use client';

import { MedicalLayout } from '@/components/medical/MedicalLayout';
import { DashboardLiveMap } from '@/components/control-room/DashboardLiveMap';

export default function MedicalMapPage() {
  return (
    <MedicalLayout title="Medical ops map">
      <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
        Ambulance units, medical tickets, and linked security incidents. Dual response view only.
      </p>
      <div className="ops-board__map" style={{ minHeight: '62vh' }}>
        <DashboardLiveMap className="dash-live-map--medical" />
      </div>
    </MedicalLayout>
  );
}

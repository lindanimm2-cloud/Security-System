'use client';

import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { StaffSelfProfile } from '@/components/ops/StaffSelfProfile';

export default function SupervisorProfilePage() {
  return (
    <SupervisorLayout title="My profile">
      <StaffSelfProfile
        heading="Supervisor profile"
        homeHref="/supervisor"
        homeLabel="Supervisor desk"
      />
    </SupervisorLayout>
  );
}

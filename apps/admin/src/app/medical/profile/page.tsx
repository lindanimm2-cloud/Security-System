'use client';

import { MedicalLayout } from '@/components/medical/MedicalLayout';
import { StaffSelfProfile } from '@/components/ops/StaffSelfProfile';

export default function MedicalProfilePage() {
  return (
    <MedicalLayout title="My profile">
      <StaffSelfProfile
        heading="Medical profile"
        homeHref="/medical"
        homeLabel="Medical queue"
      />
    </MedicalLayout>
  );
}

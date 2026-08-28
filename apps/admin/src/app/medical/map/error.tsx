'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function MedicalMapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProfessionalErrorPage
      error={error}
      reset={reset}
      homeHref="/medical/map"
      homeLabel="Reload map"
      title="Medical map unavailable"
      description="The ops map could not load. Try again or return to the medical queue."
    />
  );
}

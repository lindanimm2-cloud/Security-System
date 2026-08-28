'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function SupervisorMapError({
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
      homeHref="/supervisor/map"
      homeLabel="Reload map"
      title="Officer map unavailable"
      description="The field map could not load. Try again or return to the supervisor board."
    />
  );
}

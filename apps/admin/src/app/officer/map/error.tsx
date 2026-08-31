'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function OfficerMapError({
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
      homeHref="/officer/map"
      homeLabel="Reload map"
      title="Navigation map unavailable"
      description="This map could not load. Try again — your assignment is still on Your Jobs."
    />
  );
}

'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function TechMapError({
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
      homeHref="/tech/map"
      homeLabel="Reload job map"
      title="Job map unavailable"
      description="Install locations could not load. Try again or open Jobs instead."
    />
  );
}

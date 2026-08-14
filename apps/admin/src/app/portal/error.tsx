'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function PortalError({
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
      title="We couldn't load this page"
      description="Your protection cover is still active. Try again or head back to your dashboard."
    />
  );
}

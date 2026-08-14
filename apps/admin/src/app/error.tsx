'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ProfessionalErrorPage error={error} reset={reset} />;
}

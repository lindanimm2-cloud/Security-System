'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

/** Error boundary for login routes — never requires a session to recover. */
export function LoginBoundaryError({
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
      title="Couldn't load sign-in"
      description="This did not lock you out. Try again to bring the sign-in form back."
      homeLabel="Back to sign in"
    />
  );
}

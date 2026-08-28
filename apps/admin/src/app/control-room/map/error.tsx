'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function ControlRoomMapError({
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
      homeHref="/control-room/map"
      homeLabel="Reload live map"
      title="Live map unavailable"
      description="The operations map hit a problem. Your incidents are still in the queue — reload this view or go back to the control room."
    />
  );
}

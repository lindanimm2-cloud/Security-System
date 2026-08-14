"use client";

import { ProfessionalErrorPage } from "@/components/ProfessionalErrorPage";

export default function OfficerError({
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
      homeHref="/officer"
      homeLabel="Back to officer home"
      title="Something went wrong"
      description="This screen could not load. Try again or send details to the developer team so we can fix it quickly."
    />
  );
}

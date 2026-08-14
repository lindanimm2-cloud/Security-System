"use client";

import { ProfessionalErrorPage } from "@/components/ProfessionalErrorPage";

export default function MedicalError({
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
      homeHref="/medical"
      homeLabel="Back to medical home"
      title="Something went wrong"
      description="This medical portal screen could not load. Try again or send details to the developer team."
    />
  );
}

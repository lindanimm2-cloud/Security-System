"use client";

import { ProfessionalErrorPage } from "@/components/ProfessionalErrorPage";

export default function TechError({
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
      homeHref="/tech"
      homeLabel="Back to tech home"
      title="Something went wrong"
      description="This install workflow screen hit an error. Try again or send details to the developer team."
    />
  );
}

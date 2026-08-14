"use client";

import { ProfessionalErrorPage } from "@/components/ProfessionalErrorPage";

export default function ControlRoomError({
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
      homeHref="/control-room"
      homeLabel="Back to control room"
      title="Control room unavailable"
      description="The operations console hit a problem. Your live data is safe — use the options below or send details to the developer desk."
    />
  );
}

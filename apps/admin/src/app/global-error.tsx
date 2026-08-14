'use client';

import { ProfessionalErrorPage } from '@/components/ProfessionalErrorPage';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ margin: 0, background: '#000' }}>
        <ProfessionalErrorPage error={error} reset={reset} />
      </body>
    </html>
  );
}

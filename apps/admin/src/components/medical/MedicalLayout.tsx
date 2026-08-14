'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { MedicalShell } from '@/components/MedicalShell';

export function MedicalLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AuthGuard portal="admin" loginPath="/login">
      {(session) => (
        <MedicalShell session={session} title={title}>
          {children}
        </MedicalShell>
      )}
    </AuthGuard>
  );
}

'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { SupervisorShell } from '@/components/SupervisorShell';

export function SupervisorLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AuthGuard portal="admin" loginPath="/login">
      {(session) => (
        <SupervisorShell session={session} title={title}>
          {children}
        </SupervisorShell>
      )}
    </AuthGuard>
  );
}

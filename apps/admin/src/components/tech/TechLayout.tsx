'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { TechShell } from '@/components/TechShell';

export function TechLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AuthGuard portal="technician" loginPath="/tech/login">
      {(session) => (
        <TechShell session={session} title={title}>
          {children}
        </TechShell>
      )}
    </AuthGuard>
  );
}

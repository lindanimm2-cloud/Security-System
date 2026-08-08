'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { OfficerShell } from '@/components/OfficerShell';
import { OfficerStatusProvider } from '@/components/officer/OfficerStatusProvider';

export function OfficerLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AuthGuard portal="officer" loginPath="/officer/login">
      {(session) => (
        <OfficerStatusProvider>
          <OfficerShell session={session} title={title}>
            {children}
          </OfficerShell>
        </OfficerStatusProvider>
      )}
    </AuthGuard>
  );
}

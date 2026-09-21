'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { OfficerShell } from '@/components/OfficerShell';
import { OfficerStatusProvider } from '@/components/officer/OfficerStatusProvider';
import { OperationalReadyGate } from '@/components/officer/OperationalReadyGate';

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
          <OperationalReadyGate>
            <OfficerShell session={session} title={title}>
              {children}
            </OfficerShell>
          </OperationalReadyGate>
        </OfficerStatusProvider>
      )}
    </AuthGuard>
  );
}

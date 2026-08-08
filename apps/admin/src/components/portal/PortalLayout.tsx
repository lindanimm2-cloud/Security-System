'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { PortalShell } from '@/components/PortalShell';

export function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard portal="client" loginPath="/portal/login">
      {(session) => <PortalShell session={session}>{children}</PortalShell>}
    </AuthGuard>
  );
}

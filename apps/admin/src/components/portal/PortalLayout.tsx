'use client';

import { useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { PortalShell } from '@/components/PortalShell';
import { ensureEmergencyServiceWorker } from '@/lib/client-push';

export function PortalLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void ensureEmergencyServiceWorker();
  }, []);

  return (
    <AuthGuard portal="client" loginPath="/portal/login">
      {(session) => <PortalShell session={session}>{children}</PortalShell>}
    </AuthGuard>
  );
}

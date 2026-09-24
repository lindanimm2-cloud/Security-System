'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ensureDemoOrgDirectory } from '@/lib/org/demo-data';
import { getOrgSession, type OrgSession } from '@/lib/org/session';

export function OrgAuthGuard({
  children,
  organizationId,
}: {
  children: (session: OrgSession) => React.ReactNode;
  organizationId?: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<OrgSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureDemoOrgDirectory();

    function sync() {
      const s = getOrgSession();
      if (!s) {
        setSession(null);
        setReady(false);
        router.replace('/org');
        return;
      }
      if (organizationId && !s.memberships.some((m) => m.organizationId === organizationId)) {
        setSession(null);
        setReady(false);
        router.replace('/org');
        return;
      }
      setSession(s);
      setReady(true);
    }

    sync();
    window.addEventListener('4ds-org-session-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('4ds-org-session-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, [organizationId, router]);

  if (!ready || !session) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        action="open-portal"
        label="Opening organization portal…"
        hints={['Loading organization context.', 'Preparing operations dashboard.']}
      />
    );
  }

  return <>{children(session)}</>;
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AuthSession,
  AuthPortal,
  canUseClientSessionForPortal,
  getSession,
} from '@/lib/auth';
import { LoadingSpinner } from './LoadingSpinner';

export function AuthGuard({
  portal,
  loginPath,
  children,
}: {
  portal: AuthPortal;
  loginPath: string;
  children: (session: AuthSession) => React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function syncSession() {
      const s = getSession(portal);
      if (!s) {
        setSession(null);
        setReady(false);
        router.replace(loginPath);
        return;
      }
      // Site-origin client logins must re-authenticate for the protection portal
      if (portal === 'client' && !canUseClientSessionForPortal()) {
        setSession(null);
        setReady(false);
        router.replace(`${loginPath}?reason=site-session`);
        return;
      }
      setSession(s);
      setReady(true);
    }

    syncSession();

    function onFocus() {
      syncSession();
    }
    function onStorage(e: StorageEvent) {
      if (!e.key || e.key.includes('4ds_') || e.key.includes('session')) {
        syncSession();
      }
    }

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [portal, loginPath, router]);

  if (!ready || !session) {
    const labels: Record<AuthPortal, { label: string; hint: string }> = {
      admin: {
        label: 'Opening control room…',
        hint: 'Verifying your session and live ops access.',
      },
      client: {
        label: 'Opening client portal…',
        hint: 'Checking your protection profile.',
      },
      officer: {
        label: 'Opening officer app…',
        hint: 'Loading your assignment queue.',
      },
      technician: {
        label: 'Opening technician desk…',
        hint: 'Loading your install queue.',
      },
    };
    const copy = labels[portal];
    return (
      <LoadingSpinner brand fullScreen label={copy.label} hint={copy.hint} />
    );
  }

  return <>{children(session)}</>;
}

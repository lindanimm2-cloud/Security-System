'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AuthSession,
  AuthPortal,
  canUseClientSessionForPortal,
  getSession,
} from '@/lib/auth';
import { applyTabTitle, bootTabSession } from '@/lib/tab-session';
import { LoadingSpinner } from './LoadingSpinner';
import {
  PORTAL_BOOT_COPY,
  actionCopy,
  getActionKind,
} from '@/lib/action-status';

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
    bootTabSession();

    function syncSession() {
      const s = getSession(portal);
      if (!s) {
        setSession(null);
        setReady(false);
        applyTabTitle(null, portal);
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
      applyTabTitle(s, portal);
    }

    syncSession();

    function onFocus() {
      syncSession();
    }

    window.addEventListener('focus', onFocus);
    window.addEventListener('4ds-auth-changed', syncSession);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('4ds-auth-changed', syncSession);
    };
  }, [portal, loginPath, router]);

  if (!ready || !session) {
    const live = typeof window !== 'undefined' ? getSession(portal) : null;
    const action = getActionKind();
    const copy =
      action === 'sign-out' || action === 'session-expired' || action === 'sign-in'
        ? actionCopy(action)
        : live
          ? (PORTAL_BOOT_COPY[portal] ?? actionCopy('open-portal'))
          : {
              label: 'Redirecting to sign-in…',
              hints: [
                'Your session is no longer active.',
                'Taking you to the login screen.',
                'System updates underway…',
              ],
            };
    return (
      <LoadingSpinner
        brand
        fullScreen
        action={action ?? undefined}
        label={copy.label}
        hints={copy.hints}
      />
    );
  }

  return <>{children(session)}</>;
}

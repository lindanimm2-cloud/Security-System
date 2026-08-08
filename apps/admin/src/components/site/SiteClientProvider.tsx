'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  getSession,
  login as authLogin,
  type AuthSession,
} from '@/lib/auth';
import { clientApi, type ApiResponse } from '@/lib/api-client';

export type ClientProfile = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  trackingEnabled: boolean;
  tenant: { name: string; slug: string };
};

type SiteClientContextValue = {
  ready: boolean;
  session: AuthSession | null;
  profile: ClientProfile | null;
  fullName: string | null;
  refresh: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
    tenantSlug?: string,
  ) => Promise<void>;
  signOut: () => void;
};

const SiteClientContext = createContext<SiteClientContextValue | null>(null);

export function SiteClientProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  const loadProfile = useCallback(async (active: AuthSession | null) => {
    if (!active) {
      setProfile(null);
      return;
    }
    try {
      const res = await clientApi.get<ApiResponse<ClientProfile>>(
        '/client/profile',
      );
      setProfile(res.data);
    } catch {
      // Session may be stale
      clearSession('client');
      setSession(null);
      setProfile(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const active = getSession('client');
    setSession(active);
    await loadProfile(active);
  }, [loadProfile]);

  useEffect(() => {
    void (async () => {
      await refresh();
      setReady(true);
    })();

    function onStorage(e: StorageEvent) {
      if (e.key === '4ds_client_session') void refresh();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string, tenantSlug = 'demo') => {
      const next = await authLogin('client', email, password, tenantSlug, {
        authSource: 'site',
      });
      setSession(next);
      await loadProfile(next);
    },
    [loadProfile],
  );

  const signOut = useCallback(() => {
    clearSession('client');
    setSession(null);
    setProfile(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('4ds-client-session-changed'));
    }
  }, []);

  useEffect(() => {
    function onLocalChange() {
      void refresh();
    }
    window.addEventListener('4ds-client-session-changed', onLocalChange);
    return () =>
      window.removeEventListener('4ds-client-session-changed', onLocalChange);
  }, [refresh]);

  const value = useMemo<SiteClientContextValue>(() => {
    const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : session
        ? `${session.user.firstName} ${session.user.lastName}`.trim()
        : null;
    return {
      ready,
      session,
      profile,
      fullName,
      refresh,
      signIn,
      signOut,
    };
  }, [ready, session, profile, refresh, signIn, signOut]);

  return (
    <SiteClientContext.Provider value={value}>
      {children}
    </SiteClientContext.Provider>
  );
}

export function useSiteClient() {
  const ctx = useContext(SiteClientContext);
  if (!ctx) throw new Error('useSiteClient must be used within SiteClientProvider');
  return ctx;
}

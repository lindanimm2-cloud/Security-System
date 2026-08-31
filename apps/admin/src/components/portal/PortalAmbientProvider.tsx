'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePortalHomeAmbient } from '@/hooks/usePortalHomeAmbient';
import { type PortalAmbientKey } from '@/lib/portal-ambient';

type PortalAmbientContextValue = {
  ambient: PortalAmbientKey;
  setAmbientOverride: (key: PortalAmbientKey | null) => void;
};

const PortalAmbientContext = createContext<PortalAmbientContextValue | null>(null);

export function PortalAmbientProvider({ children }: { children: ReactNode }) {
  const fetched = usePortalHomeAmbient();
  const [override, setOverride] = useState<PortalAmbientKey | null>(null);
  const ambient = override ?? fetched;

  const setAmbientOverride = useCallback((key: PortalAmbientKey | null) => {
    setOverride(key);
  }, []);

  const value = useMemo(
    () => ({ ambient, setAmbientOverride }),
    [ambient, setAmbientOverride],
  );

  return <PortalAmbientContext.Provider value={value}>{children}</PortalAmbientContext.Provider>;
}

export function usePortalAmbient() {
  const ctx = useContext(PortalAmbientContext);
  if (!ctx) {
    throw new Error('usePortalAmbient must be used within PortalAmbientProvider');
  }
  return ctx;
}

/** Safe optional hook for components that may render outside the provider. */
export function usePortalAmbientOptional() {
  return useContext(PortalAmbientContext);
}

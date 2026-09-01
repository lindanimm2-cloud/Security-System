'use client';

import { useCallback, useEffect, useState } from 'react';

export type LayoutView = 'grid' | 'list';

export function useLayoutView(storageKey: string, defaultView: LayoutView = 'grid') {
  const [view, setView] = useState<LayoutView>(defaultView);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`layout-view:${storageKey}`);
      if (stored === 'grid' || stored === 'list') setView(stored);
    } catch {
      /* ignore storage errors */
    }
  }, [storageKey]);

  const setLayoutView = useCallback(
    (next: LayoutView) => {
      setView(next);
      try {
        localStorage.setItem(`layout-view:${storageKey}`, next);
      } catch {
        /* ignore storage errors */
      }
    },
    [storageKey],
  );

  return [view, setLayoutView] as const;
}

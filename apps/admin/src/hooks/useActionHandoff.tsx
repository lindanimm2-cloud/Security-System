'use client';

import { useCallback, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { type ActionKind, setActionKind } from '@/lib/action-status';

export function useActionHandoff() {
  const [kind, setKind] = useState<ActionKind | null>(null);

  const begin = useCallback((next: ActionKind, then: () => void, delayMs = 0) => {
    setActionKind(next);
    setKind(next);
    window.setTimeout(then, delayMs);
  }, []);

  const overlay = kind ? <LoadingSpinner brand fullScreen action={kind} /> : null;

  return { begin, overlay, active: Boolean(kind) };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcher();
      setData(result);
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError(friendlyErrorMessage(err, 'load'));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

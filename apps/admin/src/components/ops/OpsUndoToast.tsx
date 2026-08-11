'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type UndoToastState = {
  message: string;
  onUndo: () => void | Promise<void>;
} | null;

export function useUndoToast(ttlMs = 5000) {
  const [toast, setToast] = useState<UndoToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, onUndo: () => void | Promise<void>) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, onUndo });
      timer.current = setTimeout(() => {
        setToast(null);
        timer.current = null;
      }, ttlMs);
    },
    [ttlMs],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, clear };
}

export function OpsUndoToast({
  toast,
  onDismiss,
}: {
  toast: UndoToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div className="ops-undo-toast" role="status">
      <span>{toast.message}</span>
      <button
        type="button"
        className="ops-undo-toast__undo"
        onClick={() => {
          void toast.onUndo();
          onDismiss();
        }}
      >
        Undo
      </button>
      <button
        type="button"
        className="ops-undo-toast__close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { incidentHref } from '@/lib/control-room-routes';

export type IncidentChatToastItem = {
  id: string;
  incidentId: string;
  title: string;
  body: string;
  createdAt: string;
};

const MAX_TOASTS = 4;
const TOAST_MS = 7000;

let externalPush: ((toast: IncidentChatToastItem) => void) | null = null;

export function pushIncidentChatToast(
  toast: Omit<IncidentChatToastItem, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  },
) {
  externalPush?.({
    id: toast.id ?? `inc-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    incidentId: toast.incidentId,
    title: toast.title,
    body: toast.body,
    createdAt: toast.createdAt ?? new Date().toISOString(),
  });
}

export function IncidentChatToastStack() {
  const [toasts, setToasts] = useState<IncidentChatToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast: IncidentChatToastItem) => {
    setToasts((prev) => [toast, ...prev.filter((t) => t.id !== toast.id)].slice(0, MAX_TOASTS));
  }, []);

  useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), TOAST_MS),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="incident-chat-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="incident-chat-toast" role="status">
          <div className="incident-chat-toast__main">
            <span className="incident-chat-toast__tag">Incident chat</span>
            <strong className="incident-chat-toast__title">{toast.title}</strong>
            <p className="incident-chat-toast__body">{toast.body}</p>
          </div>
          <div className="incident-chat-toast__actions">
            <Link
              href={incidentHref(toast.incidentId)}
              className="incident-chat-toast__link"
              onClick={() => dismiss(toast.id)}
            >
              Open
            </Link>
            <button
              type="button"
              className="incident-chat-toast__dismiss"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSession, type AuthPortal } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

type Handler = (payload: Record<string, unknown>) => void;

export function usePlatformEvents(
  portal: AuthPortal,
  events: string[],
  handler: Handler,
  incidentId?: string | null,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const eventsKey = events.join('|');

  useEffect(() => {
    const session = getSession(portal);
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;
    const names = eventsKey.split('|').filter(Boolean);

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    const onNamed = (name: string) => (payload: Record<string, unknown>) => {
      handlerRef.current({ event: name, ...payload });
    };
    for (const name of names) socket.on(name, onNamed(name));
    socket.on('platform:event', (wrapped: { event?: string; payload?: Record<string, unknown> }) => {
      if (wrapped?.event && names.includes(wrapped.event)) {
        handlerRef.current({ event: wrapped.event, ...(wrapped.payload ?? {}) });
      }
    });
    if (incidentId) socket.emit('incident:subscribe', { incidentId });

    return () => {
      if (incidentId) socket.emit('incident:unsubscribe', { incidentId });
      socket.disconnect();
    };
  }, [portal, eventsKey, incidentId]);
}

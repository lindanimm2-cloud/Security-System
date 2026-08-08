'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import type { ControlRoomNotification } from '@/components/maps/map-types';
import {
  incidentSocketToAlert,
  looseNotificationToAlert,
  notificationToAlert,
  type PriorityAlert,
} from '@/lib/alert-priority';
import { adminApi } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

type PriorityAlertContextValue = {
  criticalAlert: PriorityAlert | null;
  criticalQueue: number;
  highToasts: PriorityAlert[];
  dismissCritical: () => void;
  dismissToast: (id: string) => void;
};

const PriorityAlertContext = createContext<PriorityAlertContextValue | null>(null);

const HIGH_TOAST_MS = 12_000;
const MAX_HIGH_TOASTS = 3;

let externalPushAlert: ((alert: PriorityAlert) => void) | null = null;

export function pushPriorityAlert(alert: PriorityAlert) {
  externalPushAlert?.(alert);
}

export function PriorityAlertProvider({ children }: { children: React.ReactNode }) {
  const [criticalQueue, setCriticalQueue] = useState<PriorityAlert[]>([]);
  const [highToasts, setHighToasts] = useState<PriorityAlert[]>([]);

  const pushAlert = useCallback((alert: PriorityAlert) => {
    if (alert.tier === 'critical') {
      setCriticalQueue((prev) => {
        if (alert.incidentId && prev.some((item) => item.incidentId === alert.incidentId)) {
          return prev;
        }
        return [alert, ...prev];
      });
      return;
    }

    if (alert.tier === 'high') {
      setHighToasts((prev) => {
        const next = [alert, ...prev.filter((item) => item.id !== alert.id)];
        return next.slice(0, MAX_HIGH_TOASTS);
      });
    }
  }, []);

  const dismissCritical = useCallback(() => {
    setCriticalQueue((prev) => {
      const current = prev[0];
      if (current && !current.id.startsWith('incident-') && !current.id.startsWith('socket-')) {
        void adminApi.patch(`/control-room/notifications/${current.id}/read`).catch(() => undefined);
      }
      return prev.slice(1);
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setHighToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    externalPushAlert = pushAlert;
    return () => {
      externalPushAlert = null;
    };
  }, [pushAlert]);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', (payload: Record<string, unknown> | ControlRoomNotification) => {
      const alert =
        'category' in payload && payload.title
          ? notificationToAlert(payload as ControlRoomNotification)
          : looseNotificationToAlert(payload as Record<string, unknown>);
      if (alert) pushAlert(alert);
    });

    socket.on('incident:created', (payload: Parameters<typeof incidentSocketToAlert>[0]) => {
      const alert = incidentSocketToAlert(payload);
      if (alert) pushAlert(alert);
    });

    return () => {
      socket.disconnect();
    };
  }, [pushAlert]);

  useEffect(() => {
    if (!highToasts.length) return;
    const timers = highToasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), HIGH_TOAST_MS),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [highToasts, dismissToast]);

  const criticalAlert = criticalQueue[0] ?? null;

  const value = useMemo(
    () => ({
      criticalAlert,
      criticalQueue: criticalQueue.length,
      highToasts,
      dismissCritical,
      dismissToast,
    }),
    [criticalAlert, criticalQueue.length, highToasts, dismissCritical, dismissToast],
  );

  return <PriorityAlertContext.Provider value={value}>{children}</PriorityAlertContext.Provider>;
}

export function usePriorityAlerts() {
  return useContext(PriorityAlertContext);
}

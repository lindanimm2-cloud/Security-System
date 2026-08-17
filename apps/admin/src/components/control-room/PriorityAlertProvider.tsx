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
import {
  DEMO_DEV_TICKET_EVENT,
  DEMO_ERROR_REPORTS_KEY,
  developerTicketCode,
} from '@/lib/developer-tickets';
import { getSocketUrl } from '@/lib/socket';
import {
  acknowledgeAnnouncement,
  isOpsQuietMode,
  markAnnounced,
  shouldAnnounce,
} from '@/lib/ops-alert-memory';

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
    const eventId = alert.incidentId
      ? `incident:${alert.incidentId}:${alert.tier}`
      : `alert:${alert.id}`;

    if (alert.tier === 'critical') {
      if (!shouldAnnounce(eventId, 30_000)) return;
      markAnnounced(eventId);
      setCriticalQueue((prev) => {
        if (alert.incidentId && prev.some((item) => item.incidentId === alert.incidentId)) {
          return prev;
        }
        return [alert, ...prev];
      });
      return;
    }

    // Quiet mode: non-critical stay badge/digest only — no interrupt toasts
    if (isOpsQuietMode()) return;

    if (alert.tier === 'high') {
      if (!shouldAnnounce(eventId)) return;
      markAnnounced(eventId);
      setHighToasts((prev) => {
        const next = [alert, ...prev.filter((item) => item.id !== alert.id)];
        return next.slice(0, MAX_HIGH_TOASTS);
      });
    }
  }, []);

  const dismissCritical = useCallback(() => {
    setCriticalQueue((prev) => {
      const current = prev[0];
      if (current) {
        const eventId = current.incidentId
          ? `incident:${current.incidentId}:critical`
          : `alert:${current.id}`;
        acknowledgeAnnouncement(eventId);
      }
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
      const forRoles = (payload as Record<string, unknown>).forRoles;
      if (Array.isArray(forRoles) && forRoles.length) {
        const role = getSession('admin')?.user.role;
        if (role && !forRoles.includes(role)) return;
      }
      const alert =
        'category' in payload && payload.title
          ? notificationToAlert(payload as ControlRoomNotification)
          : looseNotificationToAlert(payload as Record<string, unknown>);
      if (alert) pushAlert(alert);
    });

    socket.on('developer:error-report', (payload: Record<string, unknown>) => {
      const role = getSession('admin')?.user.role;
      if (role && !['DEVELOPER', 'OWNER', 'SUPER_ADMIN'].includes(role)) return;
      const alert = looseNotificationToAlert({
        ...payload,
        type: 'ERROR_REPORT',
      });
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
    function toastFromReport(report: {
      id: string;
      message: string;
      status?: string;
      createdAt?: string;
      reporter?: { name?: string };
    }) {
      const role = getSession('admin')?.user.role;
      if (role && !['DEVELOPER', 'OWNER', 'SUPER_ADMIN'].includes(role)) return;
      if (report.status && report.status !== 'OPEN') return;
      if (report.createdAt && Date.now() - new Date(report.createdAt).getTime() > 12_000) return;
      pushAlert({
        id: `ticket-${report.id}`,
        tier: 'high',
        kind: 'high',
        category: 'DEVELOPER',
        title: `Issue ticket ${developerTicketCode(report.id)}`,
        subtitle: `${report.reporter?.name ?? 'Reporter'} · ${report.message}`,
        link: `/control-room/developer?ticket=${encodeURIComponent(report.id)}`,
        createdAt: report.createdAt ?? new Date().toISOString(),
      });
    }

    function onTicket(e: Event) {
      const detail = (e as CustomEvent<{ action?: string; report?: { id: string; message: string; reporter?: { name?: string } } }>).detail;
      if (detail?.action !== 'created' || !detail.report) return;
      toastFromReport(detail.report);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== DEMO_ERROR_REPORTS_KEY || !e.newValue) return;
      try {
        const reports = JSON.parse(e.newValue) as Array<{
          id: string;
          message: string;
          status?: string;
          createdAt?: string;
          reporter?: { name?: string };
        }>;
        const newest = reports[0];
        if (newest) toastFromReport(newest);
      } catch {
        /* ignore */
      }
    }

    window.addEventListener(DEMO_DEV_TICKET_EVENT, onTicket);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DEMO_DEV_TICKET_EVENT, onTicket);
      window.removeEventListener('storage', onStorage);
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

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ControlRoomNotification } from '@/components/maps/map-types';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import {
  classifyNotificationTier,
  sortNotificationsForOps,
} from '@/lib/alert-priority';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

type NotificationData = {
  notifications: ControlRoomNotification[];
  unreadCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  PANIC: 'Panic Alerts',
  SILENT_PANIC: 'Silent Panic',
  THEFT_RECOVERY: 'Theft Recovery',
  OFFICER: 'Officer Updates',
  VEHICLE: 'Vehicle Alerts',
  ALARM: 'Alarm Events',
  MEDICAL: 'Medical',
  FAMILY: 'Family Safety',
  SYSTEM: 'System',
  BILLING: 'Billing',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

export function NotificationCenter() {
  const { data, reload } = useApi(
    () => adminApi.get<ApiResponse<NotificationData>>('/control-room/notifications'),
    [],
  );
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications = data?.data?.notifications ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;

  const sorted = useMemo(
    () => sortNotificationsForOps(notifications),
    [notifications],
  );

  const criticalUnread = useMemo(
    () =>
      sorted.filter(
        (n) =>
          !n.isRead &&
          classifyNotificationTier(n.category, n.priority) === 'critical',
      ),
    [sorted],
  );

  const filtered = useMemo(() => {
    const base =
      filter === 'ALL'
        ? sorted
        : filter === 'CRITICAL'
          ? sorted.filter(
              (n) => classifyNotificationTier(n.category, n.priority) === 'critical',
            )
          : sorted.filter((n) => n.category === filter);
    return base;
  }, [sorted, filter]);

  const markRead = useCallback(
    async (id: string) => {
      await adminApi.patch(`/control-room/notifications/${id}/read`);
      reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    await adminApi.patch('/control-room/notifications/read-all');
    reload();
  }, [reload]);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('incident:created', () => reload());
    socket.on('notification:new', () => reload());

    return () => {
      socket.disconnect();
    };
  }, [reload]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="notification-center notification-center--control-room" ref={panelRef}>
      <button
        type="button"
        className={`notification-bell ${criticalUnread.length > 0 ? 'notification-bell--critical' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            fill="currentColor"
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.71V4a2 2 0 1 0-4 0v.29A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel notification-panel--control-room">
          <div className="notification-panel__header">
            <div>
              <h3>Notification Centre</h3>
              <p className="notification-panel__subtitle">
                {criticalUnread.length > 0
                  ? `${criticalUnread.length} critical need attention`
                  : unreadCount > 0
                    ? `${unreadCount} unread · prioritized by severity`
                    : 'All clear · newest updates below'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {criticalUnread.length > 0 && filter !== 'CRITICAL' && (
            <button
              type="button"
              className="notification-critical-strip"
              onClick={() => setFilter('CRITICAL')}
            >
              <span className="notification-critical-strip__pulse" aria-hidden />
              <strong>{criticalUnread.length} critical</strong>
              <span>Panic / silent / life-safety — tap to focus</span>
            </button>
          )}

          <div className="notification-filters">
            <button
              type="button"
              className={`notification-filter ${filter === 'ALL' ? 'notification-filter--active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={`notification-filter notification-filter--critical ${filter === 'CRITICAL' ? 'notification-filter--active' : ''}`}
              onClick={() => setFilter('CRITICAL')}
            >
              Critical{criticalUnread.length > 0 ? ` (${criticalUnread.length})` : ''}
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`notification-filter ${filter === key ? 'notification-filter--active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="notification-list">
            {filtered.length === 0 && (
              <li className="notification-empty">No notifications in this category</li>
            )}
            {filtered.map((n) => (
              <li
                key={n.id}
                className={`notification-item notification-item--${n.priority} ${
                  !n.isRead ? 'notification-item--unread' : 'notification-item--read'
                }`}
              >
                <div className="notification-item__top">
                  <span className={`notification-cat notification-cat--${n.category.toLowerCase()}`}>
                    {CATEGORY_LABELS[n.category] ?? n.category}
                  </span>
                  <span className={`notification-priority notification-priority--${n.priority}`}>
                    {n.priority}
                  </span>
                </div>
                <p className="notification-item__title">{n.title}</p>
                <p className="notification-item__body">{n.body}</p>
                <div className="notification-item__footer">
                  <span className="notification-item__time">{formatTime(n.createdAt)}</span>
                  <div className="notification-item__actions">
                    {n.link && (
                      <Link
                        href={n.link}
                        className="notification-action notification-action--primary"
                        onClick={() => {
                          if (!n.isRead) markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        Open
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        type="button"
                        className="notification-action notification-action--secondary"
                        onClick={() => markRead(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

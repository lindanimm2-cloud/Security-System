'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { useApi } from '@/hooks/useApi';
import {
  CLIENT_NOTIFICATION_FILTERS,
  enrichClientNotification,
  filterClientNotifications,
  formatClientNotificationTime,
  type ClientNotificationFilter,
  type ClientNotificationRecord,
} from '@/lib/client-notifications';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

type NotificationData = {
  notifications: ClientNotificationRecord[];
  unreadCount: number;
};

export function PortalNotificationCenter() {
  const { data, reload } = useApi(
    () => clientApi.get<ApiResponse<NotificationData>>('/client/notifications'),
    [],
  );
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ClientNotificationFilter>('ALL');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const notifications = (data?.data?.notifications ?? []).map(enrichClientNotification);
  const unreadCount = data?.data?.unreadCount ?? 0;
  const filtered = filterClientNotifications(notifications, filter);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await clientApi.patch(`/client/notifications/${id}/read`);
        window.dispatchEvent(new Event('4ds-notifications-changed'));
        void reload({ silent: true });
      } catch {
        /* keep panel open so user can retry */
      }
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    try {
      await clientApi.patch('/client/notifications/read-all');
      window.dispatchEvent(new Event('4ds-notifications-changed'));
      void reload({ silent: true });
    } catch {
      /* keep panel open so user can retry */
    }
  }, [reload]);

  useEffect(() => {
    const session = getSession('client');
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    const refresh = () => void reload({ silent: true });
    socket.on('notification:new', refresh);

    return () => {
      socket.disconnect();
    };
  }, [reload]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const panel = open ? (
        <div
          ref={panelRef}
          className="notification-panel notification-panel--portal"
          role="dialog"
          aria-label="Your updates"
        >
          <div className="notification-panel__header notification-panel__header--portal">
            <div className="notification-panel__header-text">
              <h3>Your updates</h3>
              <p className="notification-panel__subtitle">Personal alerts for your account</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-filters notification-filters--portal">
            {CLIENT_NOTIFICATION_FILTERS.map(({ key, label }) => (
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

          <ul className="notification-list notification-list--portal">
            {filtered.length === 0 && (
              <li className="notification-empty">No updates in this category</li>
            )}
            {filtered.map((n) => {
              const cat = n.category?.toLowerCase() ?? 'updates';
              return (
              <li
                key={n.id}
                className={`portal-notification-item portal-notification-item--cat-${cat} ${
                  !n.isRead ? 'portal-notification-item--unread' : 'portal-notification-item--read'
                }`}
              >
                <div className="portal-notification-item__head">
                  <span className={`portal-notification-tag portal-notification-tag--${cat}`}>
                    {n.label}
                  </span>
                  <span className="portal-notification-item__time">{formatClientNotificationTime(n.createdAt)}</span>
                </div>
                <p className="portal-notification-item__title">{n.title}</p>
                <p className="portal-notification-item__body">{n.body}</p>
                <div className="portal-notification-item__actions">
                  <Link
                    href={n.href ?? '/portal/updates'}
                    className="portal-notification-btn portal-notification-btn--primary"
                    onClick={() => {
                      if (!n.isRead) void markRead(n.id);
                      setOpen(false);
                    }}
                  >
                    View
                  </Link>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="portal-notification-btn portal-notification-btn--secondary"
                      onClick={() => void markRead(n.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            );
            })}
          </ul>

          <div className="notification-panel__footer notification-panel__footer--portal">
            <Link
              href="/portal/updates"
              className="portal-notification-btn portal-notification-btn--link"
              onClick={() => setOpen(false)}
            >
              All security updates
            </Link>
          </div>
        </div>
  ) : null;

  return (
    <div className="notification-center notification-center--portal" ref={rootRef}>
      <button
        type="button"
        className="notification-bell notification-bell--portal"
        onClick={() => setOpen((v) => !v)}
        aria-label="Your notifications"
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
      {mounted && open
        ? createPortal(
            <>
              <button
                type="button"
                className="notification-scrim"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
              />
              {panel}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

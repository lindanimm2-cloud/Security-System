'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import {
  enrichClientNotification,
  formatClientNotificationTime,
  type ClientNotificationRecord,
} from '@/lib/client-notifications';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';

type NotificationPayload = {
  notifications: ClientNotificationRecord[];
  unreadCount: number;
};

export default function UpdatesPage() {
  return (
    <PortalLayout>
      <UpdatesContent />
    </PortalLayout>
  );
}

function UpdatesContent() {
  const { data, loading, error , reload } = useApi(
    () => clientApi.get<ApiResponse<NotificationPayload>>('/client/notifications'),
    [],
  );
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const markRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      try {
        await clientApi.patch(`/client/notifications/${id}/read`);
        window.dispatchEvent(new Event('4ds-notifications-changed'));
        void reload({ silent: true });
      } catch {
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [reload],
  );

  if (loading) return <LoadingSpinner label="Loading updates..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const notifications = (data!.data.notifications ?? []).map(enrichClientNotification);
  const filtered = notifications.filter((n) =>
    matchesSearch(search, n.title, n.body, n.category, n.type),
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Security Updates</h1>
          <p className="text-muted">
            Your personal alerts, incident updates, and account notifications.
          </p>
        </div>
      </div>

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search updates…"
          resultCount={filtered.length}
          totalCount={notifications.length}
        />
      </div>

      <ul className="portal-updates-list">
        {filtered.length === 0 ? (
          <li className="portal-updates-empty">
            {search.trim() ? 'No matching updates.' : 'No updates yet — you are all caught up.'}
          </li>
        ) : (
          filtered.map((n) => {
            const cat = n.category?.toLowerCase() ?? 'updates';
            const read = n.isRead || readIds.has(n.id);
            return (
            <li
              key={n.id}
              className={`portal-notification-item portal-notification-item--page portal-notification-item--cat-${cat} ${
                read ? 'portal-notification-item--read' : 'portal-notification-item--unread'
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
                    if (!read) void markRead(n.id);
                  }}
                >
                  View details
                </Link>
                {!read && (
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
          })
        )}
      </ul>
    </div>
  );
}

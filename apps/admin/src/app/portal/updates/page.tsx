'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import {
  enrichClientNotification,
  formatClientNotificationTime,
  type ClientNotificationRecord,
} from '@/lib/client-notifications';
import { clientApi, type ApiResponse } from '@/lib/api-client';

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

  if (loading) return <LoadingSpinner label="Loading updates..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const notifications = (data!.data.notifications ?? []).map(enrichClientNotification);

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

      <ul className="portal-updates-list">
        {notifications.length === 0 ? (
          <li className="portal-updates-empty">No updates yet — you are all caught up.</li>
        ) : (
          notifications.map((n) => {
            const cat = n.category?.toLowerCase() ?? 'updates';
            return (
            <li
              key={n.id}
              className={`portal-notification-item portal-notification-item--page portal-notification-item--cat-${cat} ${
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
                <Link href={n.href ?? '/portal/updates'} className="portal-notification-btn portal-notification-btn--primary">
                  View details
                </Link>
              </div>
            </li>
          );
          })
        )}
      </ul>
    </div>
  );
}

/** Client-portal notification helpers — not for control room / officer surfaces. */

export type ClientNotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  href?: string;
  category?: string;
  label?: string;
};

export const CLIENT_PORTAL_NOTIFICATION_TYPES = new Set([
  'PANIC_ALERT',
  'THEFT_ALERT',
  'INCIDENT_UPDATE',
  'DISPATCH_ASSIGNED',
  'FAMILY_ALERT',
  'SYSTEM',
  'MESSAGE',
]);

export type ClientNotificationFilter = 'ALL' | 'ALERTS' | 'THEFT' | 'FAMILY' | 'UPDATES';

export const CLIENT_NOTIFICATION_FILTERS: {
  key: ClientNotificationFilter;
  label: string;
}[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ALERTS', label: 'Your alerts' },
  { key: 'THEFT', label: 'Theft' },
  { key: 'FAMILY', label: 'Family' },
  { key: 'UPDATES', label: 'Updates' },
];

export function clientNotificationCategory(type: string): string {
  if (type === 'PANIC_ALERT' || type === 'INCIDENT_UPDATE' || type === 'DISPATCH_ASSIGNED') {
    return 'ALERTS';
  }
  if (type === 'THEFT_ALERT') return 'THEFT';
  if (type === 'FAMILY_ALERT' || type === 'MESSAGE') return 'FAMILY';
  return 'UPDATES';
}

export function clientNotificationLabel(type: string): string {
  const labels: Record<string, string> = {
    PANIC_ALERT: 'Emergency',
    THEFT_ALERT: 'Theft',
    INCIDENT_UPDATE: 'Incident update',
    DISPATCH_ASSIGNED: 'Response team',
    FAMILY_ALERT: 'Family',
    SYSTEM: 'Account',
    MESSAGE: 'Family message',
  };
  return labels[type] ?? 'Update';
}

export function clientNotificationHref(type: string, title: string): string {
  switch (type) {
    case 'PANIC_ALERT':
    case 'INCIDENT_UPDATE':
    case 'DISPATCH_ASSIGNED':
      return '/portal/incidents';
    case 'THEFT_ALERT':
      return '/portal/theft';
    case 'FAMILY_ALERT':
    case 'MESSAGE':
      return '/portal/family';
    case 'SYSTEM':
      if (title.toLowerCase().includes('subscription') || title.toLowerCase().includes('plan')) {
        return '/portal/subscription';
      }
      return '/portal/updates';
    default:
      return '/portal/updates';
  }
}

export function enrichClientNotification(n: ClientNotificationRecord): ClientNotificationRecord {
  return {
    ...n,
    category: clientNotificationCategory(n.type),
    label: clientNotificationLabel(n.type),
    href: n.href ?? clientNotificationHref(n.type, n.title),
  };
}

export function filterClientNotifications(
  notifications: ClientNotificationRecord[],
  filter: ClientNotificationFilter,
): ClientNotificationRecord[] {
  if (filter === 'ALL') return notifications;
  return notifications.filter((n) => clientNotificationCategory(n.type) === filter);
}

export function formatClientNotificationTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

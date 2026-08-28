import type { ControlRoomNotification, NotificationCategory } from '@/components/maps/map-types';

export type AlertTier = 'critical' | 'high' | 'normal';

export type PriorityAlertKind =
  | 'panic'
  | 'silent'
  | 'medical'
  | 'theft'
  | 'alarm'
  | 'fire'
  | 'call'
  | 'critical'
  | 'high';

export type PriorityAlert = {
  id: string;
  tier: AlertTier;
  kind: PriorityAlertKind;
  category: NotificationCategory | 'INCIDENT';
  title: string;
  subtitle: string;
  link?: string;
  incidentId?: string;
  createdAt: string;
  /** Bypass quiet mode / announce cooldown (settings “Test alert”). */
  force?: boolean;
};

const HIGH_CATEGORIES: NotificationCategory[] = [
  'MEDICAL',
  'THEFT_RECOVERY',
  'ALARM',
  'VEHICLE',
  'FAMILY',
  'DEVELOPER',
];

export function classifyNotificationTier(
  category: NotificationCategory,
  priority: ControlRoomNotification['priority'],
): AlertTier {
  if (priority === 'critical' || category === 'PANIC' || category === 'SILENT_PANIC') {
    return 'critical';
  }
  if (priority === 'high' || HIGH_CATEGORIES.includes(category)) {
    return 'high';
  }
  return 'normal';
}

export function kindFromCategory(category: NotificationCategory): PriorityAlertKind {
  if (category === 'PANIC') return 'panic';
  if (category === 'SILENT_PANIC') return 'silent';
  if (category === 'MEDICAL') return 'medical';
  if (category === 'THEFT_RECOVERY') return 'theft';
  if (category === 'ALARM') return 'alarm';
  if (category === 'OFFICER') return 'call';
  if (category === 'DEVELOPER') return 'high';
  return 'high';
}

export function notificationToAlert(notification: ControlRoomNotification): PriorityAlert | null {
  const tier = classifyNotificationTier(notification.category, notification.priority);
  if (tier === 'normal') return null;

  return {
    id: notification.id,
    tier,
    kind: kindFromCategory(notification.category),
    category: notification.category,
    title: notification.title,
    subtitle: notification.body,
    link: notification.link ?? undefined,
    incidentId: notification.entityType === 'incident' ? notification.entityId ?? undefined : undefined,
    createdAt: notification.createdAt,
  };
}

type IncidentSocketPayload = {
  id: string;
  type: string;
  priority: string;
  status: string;
  name: string;
  address: string | null;
  isSilent?: boolean;
  createdAt?: string;
};

function incidentCategoryFromType(type: string, isSilent: boolean): NotificationCategory {
  if (type === 'PANIC') return isSilent ? 'SILENT_PANIC' : 'PANIC';
  if (type === 'MEDICAL') return 'MEDICAL';
  if (type === 'THEFT') return 'THEFT_RECOVERY';
  if (type === 'FIRE') return 'ALARM';
  if (type === 'INTRUSION') return 'ALARM';
  return 'SYSTEM';
}

export function incidentSocketToAlert(raw: IncidentSocketPayload): PriorityAlert | null {
  const isSilent = raw.isSilent ?? false;
  const category = incidentCategoryFromType(raw.type, isSilent);

  const priority: ControlRoomNotification['priority'] =
    raw.priority === 'CRITICAL'
      ? 'critical'
      : raw.priority === 'HIGH'
        ? 'high'
        : raw.priority === 'LOW'
          ? 'low'
          : 'medium';

  const tier = classifyNotificationTier(category, priority);
  if (tier === 'normal') return null;

  const label =
    category === 'SILENT_PANIC'
      ? 'Silent panic'
      : category === 'PANIC'
        ? 'Panic alert'
        : raw.type === 'FIRE'
          ? 'Fire emergency'
          : raw.type.replace(/_/g, ' ');

  return {
    id: `incident-${raw.id}-${Date.now()}`,
    tier,
    kind: raw.type === 'FIRE' ? 'fire' : kindFromCategory(category),
    category: 'INCIDENT',
    title: raw.name,
    subtitle: `${label} · ${raw.address ?? 'Location updating'} · ${raw.status.replace(/_/g, ' ')}`,
    link: `/control-room/map?incident=${raw.id}`,
    incidentId: raw.id,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export function looseNotificationToAlert(raw: Record<string, unknown>): PriorityAlert | null {
  if (raw.category && raw.title && raw.priority) {
    return notificationToAlert(raw as ControlRoomNotification);
  }

  const title = String(raw.title ?? 'Operator alert');
  const body = String(raw.body ?? '');
  const incidentId = typeof raw.incidentId === 'string' ? raw.incidentId : undefined;
  const type = String(raw.type ?? '').toLowerCase();

  if (type.includes('error_report') || type.includes('error-report') || raw.reportId) {
    const reportId = typeof raw.reportId === 'string' ? raw.reportId : undefined;
    return {
      id: `dev-ticket-${reportId ?? title}-${Date.now()}`,
      tier: 'high',
      kind: 'high',
      category: 'DEVELOPER',
      title,
      subtitle: body,
      link: reportId
        ? `/control-room/developer?ticket=${encodeURIComponent(reportId)}`
        : '/control-room/developer',
      createdAt: new Date().toISOString(),
    };
  }

  const priority = String(raw.priority ?? '').toUpperCase();
  let tier: AlertTier = 'high';
  let kind: PriorityAlertKind = 'high';
  if (
    priority === 'P0' ||
    type.includes('emergency') ||
    type.includes('panic') ||
    type.includes('critical')
  ) {
    tier = 'critical';
    kind = type.includes('silent') ? 'silent' : type.includes('medical') ? 'medical' : type.includes('fire') ? 'fire' : 'critical';
  } else if (priority === 'P1') {
    tier = 'high';
  } else if (priority === 'P2' || priority === 'P3') {
    return null;
  }

  return {
    id: `socket-${incidentId ?? title}-${Date.now()}`,
    tier,
    kind,
    category: 'INCIDENT',
    title,
    subtitle: body,
    link: incidentId ? `/control-room/map?incident=${incidentId}` : '/control-room/incidents',
    incidentId,
    createdAt: new Date().toISOString(),
  };
}

export const ALERT_KIND_LABELS: Record<PriorityAlertKind, string> = {
  panic: 'Panic',
  silent: 'Silent panic',
  medical: 'Medical',
  theft: 'Theft recovery',
  alarm: 'Alarm',
  fire: 'Fire',
  call: 'Officer',
  critical: 'Critical',
  high: 'Alert',
};

const PRIORITY_RANK: Record<ControlRoomNotification['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Everyday ops order: unread → severity → newest. */
export function sortNotificationsForOps<
  T extends Pick<ControlRoomNotification, 'priority' | 'category' | 'isRead' | 'createdAt'>,
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const unreadDelta = Number(a.isRead) - Number(b.isRead);
    if (unreadDelta !== 0) return unreadDelta;

    const tierA = classifyNotificationTier(a.category, a.priority);
    const tierB = classifyNotificationTier(b.category, b.priority);
    const tierRank = { critical: 0, high: 1, normal: 2 } as const;
    if (tierRank[tierA] !== tierRank[tierB]) return tierRank[tierA] - tierRank[tierB];

    const pDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pDelta !== 0) return pDelta;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const INCIDENT_PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  CRITICAL: 0,
  high: 1,
  HIGH: 1,
  medium: 2,
  MEDIUM: 2,
  low: 3,
  LOW: 3,
};

/** Pin life-safety incidents above routine ones. */
export function sortIncidentsForOps<
  T extends { priority: string; type?: string; time?: string; createdAt?: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const typeRank = (t?: string) => {
      const x = (t ?? '').toUpperCase();
      if (x.includes('PANIC')) return 0;
      if (x === 'MEDICAL' || x === 'FIRE') return 1;
      return 2;
    };
    const ta = typeRank(a.type);
    const tb = typeRank(b.type);
    if (ta !== tb) return ta - tb;
    const pa = INCIDENT_PRIORITY_RANK[a.priority] ?? 9;
    const pb = INCIDENT_PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const ha = new Date(a.createdAt ?? a.time ?? 0).getTime();
    const hb = new Date(b.createdAt ?? b.time ?? 0).getTime();
    return hb - ha;
  });
}

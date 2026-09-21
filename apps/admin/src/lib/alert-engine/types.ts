import type { PriorityAlert, PriorityAlertKind } from '@/lib/alert-priority';

/** Escalation / delivery severity used by the Control Room AlertEngine. */
export type AlertLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertSoundId =
  | 'panic'
  | 'high'
  | 'medical'
  | 'fire'
  | 'theft'
  | 'officer_sos'
  | 'device_offline'
  | 'message'
  | 'call'
  | 'sla'
  | 'system'
  | 'silent';

export type AlertChannel = 'sound' | 'overlay' | 'toast' | 'bell' | 'desktop' | 'title' | 'lens';

export type AlertCategoryKey =
  | 'panic'
  | 'silent'
  | 'medical'
  | 'fire'
  | 'theft'
  | 'officer'
  | 'vehicle'
  | 'device'
  | 'sla'
  | 'message'
  | 'call'
  | 'billing'
  | 'system'
  | 'developer';

export type CategoryPref = {
  sound: boolean;
  push: boolean;
  email: boolean;
};

export type AlertEngineEvent = {
  id: string;
  level: AlertLevel;
  kind: PriorityAlertKind;
  category: AlertCategoryKey;
  soundId: AlertSoundId;
  title: string;
  subtitle: string;
  link?: string;
  incidentId?: string;
  createdAt: string;
  force?: boolean;
  testMode?: boolean;
  channels: AlertChannel[];
  /** Critical repeating sound stops only on ACK. */
  requiresAck: boolean;
};

export type AlertHistoryEntry = {
  id: string;
  alertId: string;
  time: string;
  alert: string;
  actor: string;
  action: string;
  detail?: string;
};

export type EscalationStep = {
  afterMs: number;
  action: 'sound' | 'visual' | 'supervisor' | 'manager';
  label: string;
};

export function levelFromTier(tier: PriorityAlert['tier']): AlertLevel {
  if (tier === 'critical') return 'critical';
  if (tier === 'high') return 'high';
  return 'medium';
}

export function soundForKind(kind: PriorityAlertKind): AlertSoundId {
  switch (kind) {
    case 'panic':
      return 'panic';
    case 'silent':
      return 'silent';
    case 'medical':
      return 'medical';
    case 'fire':
      return 'fire';
    case 'theft':
      return 'theft';
    case 'alarm':
      return 'fire';
    case 'call':
      return 'call';
    case 'critical':
      return 'panic';
    case 'high':
    default:
      return 'high';
  }
}

export function categoryFromKind(kind: PriorityAlertKind): AlertCategoryKey {
  switch (kind) {
    case 'panic':
      return 'panic';
    case 'silent':
      return 'silent';
    case 'medical':
      return 'medical';
    case 'fire':
    case 'alarm':
      return 'fire';
    case 'theft':
      return 'theft';
    case 'call':
      return 'officer';
    default:
      return 'system';
  }
}

export function channelsForLevel(level: AlertLevel): AlertChannel[] {
  switch (level) {
    case 'critical':
      return ['sound', 'overlay', 'bell', 'desktop', 'title', 'lens'];
    case 'high':
      return ['sound', 'toast', 'bell', 'desktop', 'title'];
    case 'medium':
      return ['sound', 'toast', 'bell'];
    case 'low':
      return ['bell'];
    case 'info':
    default:
      return ['bell'];
  }
}

export function alertFromPriority(alert: PriorityAlert, testMode = false): AlertEngineEvent {
  const level = levelFromTier(alert.tier);
  return {
    id: alert.id,
    level,
    kind: alert.kind,
    category: categoryFromKind(alert.kind),
    soundId: soundForKind(alert.kind),
    title: alert.title,
    subtitle: alert.subtitle,
    link: alert.link,
    incidentId: alert.incidentId,
    createdAt: alert.createdAt,
    force: alert.force,
    testMode,
    channels: channelsForLevel(level),
    requiresAck: level === 'critical',
  };
}

/** Default escalation ladder for unacked critical alerts. */
export const DEFAULT_ESCALATION: EscalationStep[] = [
  { afterMs: 0, action: 'sound', label: 'Control room sound' },
  { afterMs: 15_000, action: 'visual', label: 'Escalate visually' },
  { afterMs: 30_000, action: 'supervisor', label: 'Notify supervisor' },
  { afterMs: 60_000, action: 'manager', label: 'Notify manager / escalation list' },
];

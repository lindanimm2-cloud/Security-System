/** Shared types/helpers for WinCRAM-inspired ARC desk on the ops wall. */

export type ArcOperatorResponse = {
  id?: string;
  code: string;
  label: string;
  mandatory: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type ArcDeskEvent = {
  id: string;
  propertyId: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  requiresAck: boolean;
  triggeredAt: string;
  sensorId?: string | null;
  sensorName?: string | null;
  zoneNumber?: number | null;
  requiredAction?: string | null;
  reportAsType?: string | null;
  claimedByUserId?: string | null;
  claimedByName?: string | null;
  claimedAt?: string | null;
  responses?: Array<{
    code: string;
    label: string;
    answer: string;
    note?: string | null;
    createdAt?: string;
  }>;
};

export type ArcMonitoringFile = {
  id: string;
  name: string;
  address: string;
  alarmStatus?: string;
  keyHolder?: string | null;
  gateCode?: string | null;
  accessNotes?: string | null;
  checkInHours?: number | null;
  lastCheckInAt?: string | null;
  monitoringSchedule?: {
    toleranceMinutes?: number;
    days?: Record<string, { open?: string; close?: string }>;
  };
  owner?: { id?: string; name?: string; email?: string; phone?: string | null };
  contacts: Array<{
    name: string;
    phone?: string | null;
    relationship?: string | null;
    priority?: number;
  }>;
  sensors: Array<{
    id: string;
    name: string;
    zoneNumber: number;
    sensorType?: string;
    status?: string;
    locationLabel?: string;
    reportAsType?: string | null;
    requiredAction?: string | null;
    requiresAck?: boolean;
    bypassed?: boolean;
  }>;
  history: {
    events: ArcDeskEvent[];
    incidents: Array<{
      id: string;
      type: string;
      title?: string;
      status?: string;
      priority?: string;
      createdAt?: string;
    }>;
  };
};

export function isInformativeEvent(event: Pick<ArcDeskEvent, 'requiresAck' | 'type' | 'reportAsType'>) {
  if (event.requiresAck === false) return true;
  const t = `${event.type} ${event.reportAsType ?? ''}`.toUpperCase();
  return t.includes('INFORMATIVE') || t.includes('AC_FAIL') || t.includes('LOW_BATTERY') || t.includes('SUPERVISORY');
}

export function eventIsOpen(status?: string) {
  const s = (status ?? '').toUpperCase();
  return !['RESOLVED', 'FALSE_ALARM', 'CLOSED', 'CANCELLED'].includes(s);
}

export function mandatoryIncomplete(
  event: ArcDeskEvent,
  templates: ArcOperatorResponse[],
): ArcOperatorResponse[] {
  if (!event.requiresAck || isInformativeEvent(event)) return [];
  const done = new Set((event.responses ?? []).map((r) => r.code));
  return templates.filter((t) => t.mandatory && t.isActive !== false && !done.has(t.code));
}

export function relativeEventTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

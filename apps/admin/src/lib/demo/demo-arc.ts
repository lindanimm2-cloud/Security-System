/** WinCRAM-inspired ARC desk state for demo mode. */

export type DemoOperatorResponse = {
  id: string;
  code: string;
  label: string;
  mandatory: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type DemoAlarmDeskEvent = {
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
  incidentId?: string | null;
  responses: Array<{
    code: string;
    label: string;
    answer: string;
    note?: string | null;
    createdAt: string;
  }>;
};

export type DemoMonitoringSchedule = {
  toleranceMinutes: number;
  days: Record<string, { open?: string; close?: string }>;
};

const DEFAULT_RESPONSES: DemoOperatorResponse[] = [
  { id: 'ort-1', code: '1', label: 'Contacted customer', mandatory: true, sortOrder: 1, isActive: true },
  { id: 'ort-2', code: '2', label: 'Verified on CCTV', mandatory: false, sortOrder: 2, isActive: true },
  { id: 'ort-3', code: '3', label: 'Dispatched response', mandatory: false, sortOrder: 3, isActive: true },
  { id: 'ort-4', code: '4', label: 'False alarm', mandatory: false, sortOrder: 4, isActive: true },
  { id: 'ort-5', code: '5', label: 'Keyholder notified', mandatory: false, sortOrder: 5, isActive: true },
  { id: 'ort-a', code: 'A', label: 'Police / emergency services', mandatory: false, sortOrder: 10, isActive: true },
  { id: 'ort-b', code: 'B', label: 'Technical follow-up', mandatory: false, sortOrder: 11, isActive: true },
];

function minsAgo(n: number) {
  return new Date(Date.now() - n * 60_000).toISOString();
}

let operatorResponses: DemoOperatorResponse[] = DEFAULT_RESPONSES.map((r) => ({ ...r }));

/** Mutable desk events seeded with zone-type mapping examples. */
let deskEvents: DemoAlarmDeskEvent[] = [
  {
    id: 'demo-ev-1',
    propertyId: 'demo-prop-1',
    title: 'Motion detected — front gate',
    type: 'MOTION',
    severity: 'HIGH',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: minsAgo(8),
    sensorId: 'demo-sens-3',
    sensorName: 'Back gate PIR',
    zoneNumber: 3,
    reportAsType: 'INTRUSION',
    requiredAction: 'Verify on CCTV then contact subscriber',
    responses: [],
  },
  {
    id: 'demo-ev-2',
    propertyId: 'demo-prop-1',
    title: 'Fire Alarm — Zone 6 kitchen',
    type: 'FIRE',
    severity: 'CRITICAL',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: minsAgo(3),
    sensorId: 'demo-sens-6',
    sensorName: 'Kitchen smoke',
    zoneNumber: 6,
    reportAsType: 'FIRE',
    requiredAction: 'Confirm fire signal; evacuate guidance if verified',
    responses: [],
  },
  {
    id: 'demo-ev-3',
    propertyId: 'demo-prop-1',
    title: 'Medical Alarm — Zone 4 garage',
    type: 'MEDICAL',
    severity: 'CRITICAL',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: minsAgo(5),
    sensorId: 'demo-sens-4',
    sensorName: 'Garage side door',
    zoneNumber: 4,
    reportAsType: 'MEDICAL',
    requiredAction: 'Call subscriber / medical contact immediately',
    responses: [],
  },
  {
    id: 'demo-ev-info-1',
    propertyId: 'demo-prop-1',
    title: 'AC fail — panel mains',
    type: 'AC_FAIL',
    severity: 'LOW',
    status: 'NEW',
    requiresAck: false,
    triggeredAt: minsAgo(20),
    sensorId: null,
    reportAsType: 'INFORMATIVE',
    requiredAction: null,
    responses: [],
  },
  {
    id: 'demo-ev-41',
    propertyId: 'demo-prop-4',
    title: 'Break-glass — shopfront',
    type: 'INTRUSION',
    severity: 'CRITICAL',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: minsAgo(6),
    sensorId: 'demo-sens-41',
    sensorName: 'Shopfront break-glass',
    zoneNumber: 1,
    reportAsType: 'INTRUSION',
    requiredAction: 'Dispatch armed response if verified',
    responses: [],
  },
  {
    id: 'demo-ev-checkin',
    propertyId: 'demo-prop-4',
    title: 'Failed to check-in — Retail Gateway',
    type: 'FAILED_CHECK_IN',
    severity: 'HIGH',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: minsAgo(45),
    sensorId: null,
    reportAsType: 'FAILED_CHECK_IN',
    requiredAction: 'Contact site technician / keyholder',
    responses: [],
  },
];

const siteSchedules: Record<
  string,
  { checkInHours: number | null; lastCheckInAt: string | null; monitoringSchedule: DemoMonitoringSchedule }
> = {
  'demo-prop-1': {
    checkInHours: 24,
    lastCheckInAt: minsAgo(60 * 6),
    monitoringSchedule: {
      toleranceMinutes: 30,
      days: {
        mon: { open: '07:00', close: '18:00' },
        tue: { open: '07:00', close: '18:00' },
        wed: { open: '07:00', close: '18:00' },
        thu: { open: '07:00', close: '18:00' },
        fri: { open: '07:00', close: '18:00' },
        sat: { open: '08:00', close: '13:00' },
        sun: {},
      },
    },
  },
  'demo-prop-4': {
    checkInHours: 12,
    lastCheckInAt: minsAgo(60 * 18),
    monitoringSchedule: {
      toleranceMinutes: 20,
      days: {
        mon: { open: '08:00', close: '21:00' },
        tue: { open: '08:00', close: '21:00' },
        wed: { open: '08:00', close: '21:00' },
        thu: { open: '08:00', close: '21:00' },
        fri: { open: '08:00', close: '22:00' },
        sat: { open: '09:00', close: '18:00' },
        sun: { open: '09:00', close: '14:00' },
      },
    },
  },
};

const sensorZoneMeta: Record<
  string,
  { reportAsType?: string | null; requiredAction?: string | null; requiresAck?: boolean; name?: string }
> = {
  'demo-sens-4': {
    reportAsType: 'MEDICAL',
    requiredAction: 'Call subscriber / medical contact immediately',
    requiresAck: true,
  },
  'demo-sens-6': {
    reportAsType: 'FIRE',
    requiredAction: 'Confirm fire signal; evacuate guidance if verified',
    requiresAck: true,
  },
};

export function getDemoOperatorResponses() {
  return operatorResponses.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function putDemoOperatorResponses(
  rows: Array<{ code: string; label: string; mandatory?: boolean; sortOrder?: number; isActive?: boolean }>,
) {
  operatorResponses = rows.map((row, index) => ({
    id: `ort-${row.code}`,
    code: row.code.trim().toUpperCase(),
    label: row.label.trim(),
    mandatory: Boolean(row.mandatory),
    sortOrder: row.sortOrder ?? index + 1,
    isActive: row.isActive !== false,
  }));
  return getDemoOperatorResponses();
}

export function demoSiteOpenEvents(siteId: string) {
  return deskEvents
    .filter(
      (e) =>
        e.propertyId === siteId &&
        !['RESOLVED', 'FALSE_ALARM', 'CLOSED'].includes(e.status.toUpperCase()),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      severity: e.severity,
      status: e.status,
      requiresAck: e.requiresAck,
      triggeredAt: e.triggeredAt,
      claimedByUserId: e.claimedByUserId ?? null,
      claimedByName: e.claimedByName ?? null,
      sensorId: e.sensorId ?? null,
      zoneNumber: e.zoneNumber ?? null,
      requiredAction: e.requiredAction ?? null,
      reportAsType: e.reportAsType ?? null,
      responses: e.responses,
    }));
}

export function listDemoDeskEvents() {
  return deskEvents.slice();
}

export function findDemoDeskEvent(id: string) {
  return deskEvents.find((e) => e.id === id) ?? null;
}

export function pushDemoDeskEvent(event: Omit<DemoAlarmDeskEvent, 'responses'>) {
  const row: DemoAlarmDeskEvent = { ...event, responses: [] };
  deskEvents.unshift(row);
  return row;
}

export function acknowledgeDemoDeskEvent(eventId: string) {
  const event = findDemoDeskEvent(eventId);
  if (!event) return null;
  if (event.status === 'NEW' || event.status === 'OPEN') event.status = 'ACKNOWLEDGED';
  return event;
}

export function claimDemoEvent(eventId: string, user: { id: string; name: string }) {
  const event = findDemoDeskEvent(eventId);
  if (!event) throw new Error('Alarm event not found');
  if (['RESOLVED', 'FALSE_ALARM'].includes(event.status)) throw new Error('Event already closed');
  if (event.claimedByUserId && event.claimedByUserId !== user.id) {
    throw new Error('Event already claimed by another operator');
  }
  event.claimedByUserId = user.id;
  event.claimedByName = user.name;
  event.claimedAt = event.claimedAt ?? new Date().toISOString();
  if (event.status === 'NEW' || event.status === 'OPEN') event.status = 'ACKNOWLEDGED';
  return event;
}

export function releaseDemoEvent(eventId: string, userId: string) {
  const event = findDemoDeskEvent(eventId);
  if (!event) throw new Error('Alarm event not found');
  if (event.claimedByUserId && event.claimedByUserId !== userId) {
    throw new Error('Only the claiming operator can release this event');
  }
  event.claimedByUserId = null;
  event.claimedByName = null;
  event.claimedAt = null;
  return event;
}

export function respondDemoEvent(
  eventId: string,
  body: { code: string; answer: string; note?: string },
) {
  const event = findDemoDeskEvent(eventId);
  if (!event) throw new Error('Alarm event not found');
  if (['RESOLVED', 'FALSE_ALARM'].includes(event.status)) throw new Error('Event already closed');
  const code = body.code.trim().toUpperCase();
  const template = getDemoOperatorResponses().find((r) => r.code === code);
  const existing = event.responses.find((r) => r.code === code);
  const row = {
    code,
    label: template?.label ?? code,
    answer: body.answer.trim(),
    note: body.note ?? null,
    createdAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else event.responses.push(row);
  return event;
}

export function closeDemoEvent(eventId: string, body?: { falseAlarm?: boolean; force?: boolean }) {
  const event = findDemoDeskEvent(eventId);
  if (!event) throw new Error('Alarm event not found');
  if (['RESOLVED', 'FALSE_ALARM'].includes(event.status)) throw new Error('Event already closed');
  if (event.requiresAck && !body?.force) {
    const mandatory = getDemoOperatorResponses().filter((r) => r.mandatory);
    const done = new Set(event.responses.map((r) => r.code));
    const missing = mandatory.filter((r) => !done.has(r.code));
    if (missing.length) {
      throw new Error(`Complete mandatory responses first: ${missing.map((m) => m.label).join(', ')}`);
    }
  }
  event.status = body?.falseAlarm ? 'FALSE_ALARM' : 'RESOLVED';
  return event;
}

/** Create / reuse a linked demo incident for unit dispatch from an alarm event. */
export function dispatchDemoEvent(
  eventId: string,
  actor: { id: string; name: string },
  ensureIncident: (event: DemoAlarmDeskEvent) => string,
) {
  const event = findDemoDeskEvent(eventId);
  if (!event) throw new Error('Alarm event not found');
  if (['RESOLVED', 'FALSE_ALARM', 'CLOSED'].includes(event.status)) {
    throw new Error('Event already closed');
  }
  if (!event.claimedByUserId) {
    event.claimedByUserId = actor.id;
    event.claimedByName = actor.name;
    event.claimedAt = event.claimedAt ?? new Date().toISOString();
  }
  const incidentId = event.incidentId || ensureIncident(event);
  event.incidentId = incidentId;
  event.status = 'DISPATCHED';
  return { event, incidentId };
}

export function getDemoSiteSchedule(siteId: string) {
  return (
    siteSchedules[siteId] ?? {
      checkInHours: null,
      lastCheckInAt: null,
      monitoringSchedule: { toleranceMinutes: 30, days: {} },
    }
  );
}

export function patchDemoSiteSchedule(
  siteId: string,
  body: {
    checkInHours?: number | null;
    monitoringSchedule?: DemoMonitoringSchedule;
    lastCheckInAt?: string | null;
  },
) {
  const current = getDemoSiteSchedule(siteId);
  const next = {
    checkInHours: body.checkInHours !== undefined ? body.checkInHours : current.checkInHours,
    lastCheckInAt: body.lastCheckInAt !== undefined ? body.lastCheckInAt : current.lastCheckInAt,
    monitoringSchedule: body.monitoringSchedule ?? current.monitoringSchedule,
  };
  siteSchedules[siteId] = next;
  return next;
}

export function getDemoSensorZoneMeta(sensorId: string) {
  return sensorZoneMeta[sensorId] ?? {};
}

export function patchDemoSensorZone(
  sensorId: string,
  body: {
    name?: string;
    reportAsType?: string | null;
    requiredAction?: string | null;
    requiresAck?: boolean;
  },
) {
  sensorZoneMeta[sensorId] = {
    ...sensorZoneMeta[sensorId],
    ...body,
    reportAsType:
      body.reportAsType === undefined
        ? sensorZoneMeta[sensorId]?.reportAsType
        : body.reportAsType?.toUpperCase() ?? null,
  };
  for (const event of deskEvents) {
    if (event.sensorId !== sensorId) continue;
    if (body.reportAsType !== undefined) event.reportAsType = body.reportAsType?.toUpperCase() ?? null;
    if (body.requiredAction !== undefined) event.requiredAction = body.requiredAction;
    if (body.requiresAck !== undefined) event.requiresAck = body.requiresAck;
    if (body.name) event.sensorName = body.name;
  }
  return { id: sensorId, ...sensorZoneMeta[sensorId] };
}

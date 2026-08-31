export const PlatformEvent = {
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_UPDATED: 'incident.updated',
  INCIDENT_ASSIGNED: 'incident.assigned',
  INCIDENT_ACKNOWLEDGED: 'incident.acknowledged',
  INCIDENT_ESCALATED: 'incident.escalated',
  INCIDENT_RESOLVED: 'incident.resolved',
  DISPATCH_CREATED: 'dispatch.created',
  DISPATCH_ACCEPTED: 'dispatch.accepted',
  DISPATCH_EN_ROUTE: 'dispatch.en_route',
  DISPATCH_ARRIVED: 'dispatch.arrived',
  DISPATCH_COMPLETED: 'dispatch.completed',
  UNIT_LOCATION_UPDATED: 'unit.location.updated',
  UNIT_STATUS_UPDATED: 'unit.status.updated',
  PANIC_CREATED: 'panic.created',
  PANIC_CANCELLED: 'panic.cancelled',
  DEVICE_REGISTERED: 'device.registered',
  DEVICE_LOGIN: 'device.login',
  DEVICE_LOGIN_FAILED: 'device.login_failed',
  DEVICE_REVOKED: 'device.revoked',
  DEVICE_LOST: 'device.lost',
  DEVICE_STOLEN: 'device.stolen',
  DEVICE_REPLACED: 'device.replaced',
  EMERGENCY_SESSION_CREATED: 'emergency.session_created',
  EMERGENCY_SESSION_EXPIRED: 'emergency.session_expired',
  DURESS_CREATED: 'duress.created',
  SECURITY_LOCKDOWN: 'security.lockdown',
  SOS_CAPABILITY_CHANGED: 'device.sos_capability_changed',
  ALARM_TRIGGERED: 'alarm.triggered',
  ALARM_ACKNOWLEDGED: 'alarm.acknowledged',
  VEHICLE_REMOTE: 'vehicle.remote',
  VEHICLE_PANIC: 'vehicle.panic',
  MESSAGE_CREATED: 'message.created',
  CALL_STARTED: 'call.started',
  CALL_ENDED: 'call.ended',
  NOTE_ADDED: 'note.added',
} as const;

export type PlatformEventType = (typeof PlatformEvent)[keyof typeof PlatformEvent];

export type EventSource = 'portal' | 'control-room' | 'officer' | 'tech' | 'medical' | 'system';

export const DISPATCH_EVENT_BY_STATUS: Record<string, PlatformEventType> = {
  ASSIGNED: PlatformEvent.DISPATCH_CREATED,
  ACCEPTED: PlatformEvent.DISPATCH_ACCEPTED,
  EN_ROUTE: PlatformEvent.DISPATCH_EN_ROUTE,
  ON_SCENE: PlatformEvent.DISPATCH_ARRIVED,
  COMPLETED: PlatformEvent.DISPATCH_COMPLETED,
};

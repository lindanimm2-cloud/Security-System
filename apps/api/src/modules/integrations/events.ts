/** Canonical internal events — adapters normalize platform payloads into these. */

export type VoiceCommandLevel = 'INFO' | 'ASSISTANCE' | 'EMERGENCY' | 'SILENT_SOS';

export type VoicePlatform =
  | 'alexa'
  | 'google-home'
  | 'siri'
  | 'smartthings'
  | 'home-assistant'
  | 'matter'
  | 'generic';

export type CrashConfidence = 'OS_CONFIRMED' | 'SENSOR_SUSPECTED' | 'MANUAL';

export type CrashPlatform =
  | 'apple-safetykit'
  | 'android-vehicle-safety'
  | 'telematics'
  | 'oem'
  | 'fleet-tracker'
  | 'dashcam'
  | 'iot-impact'
  | 'manual-panic';

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  label?: string | null;
};

export type VoiceCommandEvent = {
  type: 'VOICE_COMMAND';
  level: VoiceCommandLevel;
  platform: VoicePlatform;
  tenantId: string;
  userId: string;
  deviceId?: string | null;
  accountId?: string | null;
  propertyId?: string | null;
  vehicleId?: string | null;
  location?: GeoPoint | null;
  requireConfirm?: boolean;
  /** Benign spoken reply for silent SOS (never announce SOS). */
  silentReply?: string | null;
  rawPhrase?: string | null;
  occurredAt?: string;
};

export type VehicleCrashDetectedEvent = {
  type: 'VEHICLE_CRASH_DETECTED';
  confidence: CrashConfidence;
  platform: CrashPlatform;
  tenantId: string;
  userId: string;
  vehicleId?: string | null;
  deviceId?: string | null;
  /** Primary crash point when available. */
  crashLocation?: GeoPoint | null;
  lastKnownGps?: GeoPoint | null;
  vehicleGps?: GeoPoint | null;
  officerLocation?: GeoPoint | null;
  phoneLocation?: GeoPoint | null;
  driverId?: string | null;
  officerId?: string | null;
  occurredAt?: string;
};

export type InternalIntegrationEvent = VoiceCommandEvent | VehicleCrashDetectedEvent;

export const VOICE_SPOKEN_REPLY = {
  ASSISTANCE:
    '4DS assistance has been requested. Your security provider has been notified.',
  EMERGENCY: '4DS emergency alert activated. Assistance has been notified.',
  INFO: '4DS security status is available in your app.',
  SILENT_SOS: '',
} as const;

export function crashOpsLabel(confidence: CrashConfidence): string {
  if (confidence === 'OS_CONFIRMED') return 'SEVERE VEHICULAR CRASH DETECTED';
  if (confidence === 'SENSOR_SUSPECTED') return 'POSSIBLE VEHICLE IMPACT DETECTED';
  return 'VEHICLE PANIC ACTIVATED';
}

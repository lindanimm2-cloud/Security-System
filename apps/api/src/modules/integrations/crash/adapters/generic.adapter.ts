import type { CrashAdapter, CrashAdapterContext } from '../crash-adapter';
import type { CrashConfidence, CrashPlatform, GeoPoint, VehicleCrashDetectedEvent } from '../../events';

function asConfidence(raw: unknown, platform: CrashPlatform): CrashConfidence {
  const v = String(raw ?? '').toUpperCase();
  if (v === 'OS_CONFIRMED' || v === 'CONFIRMED' || v === 'SEVERE') return 'OS_CONFIRMED';
  if (v === 'SENSOR_SUSPECTED' || v === 'SUSPECTED' || v === 'POSSIBLE') return 'SENSOR_SUSPECTED';
  if (v === 'MANUAL' || v === 'PANIC') return 'MANUAL';
  if (platform === 'apple-safetykit') return 'OS_CONFIRMED';
  if (platform === 'manual-panic') return 'MANUAL';
  return 'SENSOR_SUSPECTED';
}

function point(obj: unknown, label?: string): GeoPoint | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const lat = Number(o.lat ?? o.latitude);
  const lng = Number(o.lng ?? o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    accuracyM: o.accuracyM != null ? Number(o.accuracyM) : null,
    label: label ?? (o.label != null ? String(o.label) : null),
  };
}

export function createGenericCrashAdapter(platform: CrashPlatform): CrashAdapter {
  return {
    platform,
    normalize(payload, ctx?: CrashAdapterContext): VehicleCrashDetectedEvent | null {
      const tenantId = String(payload.tenantId ?? ctx?.tenantId ?? '');
      const userId = String(payload.userId ?? ctx?.userId ?? '');
      if (!tenantId || !userId) return null;
      const crashLocation =
        point(payload.crashLocation, 'crash') ??
        point({ lat: payload.lat, lng: payload.lng }, 'crash');
      return {
        type: 'VEHICLE_CRASH_DETECTED',
        confidence: asConfidence(payload.confidence, platform),
        platform,
        tenantId,
        userId,
        vehicleId: payload.vehicleId != null ? String(payload.vehicleId) : null,
        deviceId: payload.deviceId != null ? String(payload.deviceId) : null,
        crashLocation,
        lastKnownGps: point(payload.lastKnownGps, 'lastKnown'),
        vehicleGps: point(payload.vehicleGps, 'vehicle'),
        officerLocation: point(payload.officerLocation, 'officer'),
        phoneLocation: point(payload.phoneLocation, 'phone'),
        driverId: payload.driverId != null ? String(payload.driverId) : null,
        officerId: payload.officerId != null ? String(payload.officerId) : null,
        occurredAt: payload.occurredAt != null ? String(payload.occurredAt) : new Date().toISOString(),
      };
    },
  };
}

export const appleSafetyKitAdapter = createGenericCrashAdapter('apple-safetykit');
export const androidVehicleSafetyAdapter = createGenericCrashAdapter('android-vehicle-safety');
export const telematicsAdapter = createGenericCrashAdapter('telematics');
export const oemAdapter = createGenericCrashAdapter('oem');
export const fleetTrackerAdapter = createGenericCrashAdapter('fleet-tracker');
export const dashcamAdapter = createGenericCrashAdapter('dashcam');
export const iotImpactAdapter = createGenericCrashAdapter('iot-impact');
export const manualPanicCrashAdapter = createGenericCrashAdapter('manual-panic');

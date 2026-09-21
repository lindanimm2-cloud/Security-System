/**
 * DeviceAdapter — standard interface for phones, watches, BLE, vehicle, CCTV, etc.
 * Each platform implements only supported methods; others return unsupported.
 */

import type { CapabilityLevel, DeviceCapabilityMap, DeviceClass, DeviceHeartbeat, PlatformFamily } from './platform';

export type AdapterResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; reason: 'unsupported' | 'denied' | 'offline' | 'error'; message?: string };

export type AdapterAlertPayload = {
  incidentId: string;
  publicRef?: string | null;
  title: string;
  body: string;
  urgency: 'critical' | 'high' | 'normal';
  deepLink?: string | null;
  sound?: boolean;
  vibrate?: boolean;
  haptic?: boolean;
};

export interface DeviceAdapter {
  readonly platform: PlatformFamily;
  readonly deviceClass: DeviceClass;
  readonly packageId: string;

  register(): Promise<AdapterResult<{ devicePublicId: string }>>;
  authenticate(token: string): Promise<AdapterResult>;
  getCapabilities(): Promise<AdapterResult<DeviceCapabilityMap>>;
  getStatus(): Promise<AdapterResult<DeviceHeartbeat>>;
  sendNotification(alert: AdapterAlertPayload): Promise<AdapterResult>;
  sendAlert(alert: AdapterAlertPayload): Promise<AdapterResult>;
  getLocation(): Promise<AdapterResult<{ lat: number; lng: number; accuracy?: number }>>;
  getBattery(): Promise<AdapterResult<{ percent: number | null }>>;
  getHeartbeat(): Promise<AdapterResult<DeviceHeartbeat>>;
  disconnect(): Promise<AdapterResult>;
  revoke(): Promise<AdapterResult>;
}

export function unsupported<T = void>(message?: string): AdapterResult<T> {
  return { ok: false, reason: 'unsupported', message };
}

export function capabilityDefaults(level: CapabilityLevel = 'UNKNOWN'): DeviceCapabilityMap {
  return {
    notifications: level,
    sound: level,
    haptics: level,
    vibration: level,
    location: level,
    backgroundLocation: level,
    bluetooth: level,
    camera: level,
    microphone: level,
    phone: level,
    sos: level,
    background: level,
    independentNetwork: level,
    sensors: level,
  };
}

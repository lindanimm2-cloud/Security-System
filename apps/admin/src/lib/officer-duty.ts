/** Cloud source-of-truth types for 4DS Persistent Operational Mode / Duty Mode. */

export type OfficerDeviceLink = 'STANDBY' | 'ONLINE' | 'OFFLINE' | 'NO_SIGNAL';

export type DutyOperationalChecks = Record<string, boolean | string> & {
  checkedAt?: string;
};

export type OfficerDutySnapshot = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  zone: string | null;
  dutyModeActive: boolean;
  dutyStartedAt: string | null;
  lastHeartbeatAt: string | null;
  deviceLabel: string | null;
  batteryPct: number | null;
  networkType: string | null;
  hasPushToken?: boolean;
  appVersion: string | null;
  operationalChecks: DutyOperationalChecks | null;
  deviceLink: OfficerDeviceLink;
  deviceTrusted?: boolean;
  lat: number | null;
  lng: number | null;
};

export const DUTY_CHECKLIST: Array<{ key: string; label: string }> = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'sound', label: 'Sound' },
  { key: 'vibration', label: 'Vibration' },
  { key: 'location', label: 'Location' },
  { key: 'background', label: 'Background operation' },
  { key: 'network', label: 'Network' },
  { key: 'deviceRegistered', label: 'Device registered' },
  { key: 'pushToken', label: 'Push token' },
  { key: 'controlRoom', label: 'Control-room connection' },
  { key: 'emergencyContact', label: 'Emergency contact' },
  { key: 'battery', label: 'Battery status' },
];

export const OPS_READY_ACK_KEY = '4ds-ops-ready-ack';

export function deviceLinkLabel(link: OfficerDeviceLink | string | undefined): string {
  switch (link) {
    case 'ONLINE':
      return 'Connected';
    case 'OFFLINE':
      return 'Device offline';
    case 'NO_SIGNAL':
      return 'No heartbeat';
    case 'STANDBY':
    default:
      return 'Standby';
  }
}

export async function probeOperationalChecks(): Promise<Record<string, boolean>> {
  const checks: Record<string, boolean> = {
    notifications: typeof Notification === 'undefined' ? true : Notification.permission === 'granted',
    sound: true,
    vibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    location: false,
    background: typeof document !== 'undefined',
    network: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    deviceRegistered: true,
    pushToken: true,
    controlRoom: true,
    emergencyContact: true,
    battery: true,
  };

  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' });
      checks.location = geo.state === 'granted';
    } catch {
      checks.location = false;
    }
  }

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const bat = await (
        navigator as Navigator & { getBattery: () => Promise<{ level: number }> }
      ).getBattery();
      checks.battery = typeof bat.level === 'number';
    } catch {
      checks.battery = true;
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      const perm = await Notification.requestPermission();
      checks.notifications = perm === 'granted';
    } catch {
      /* keep prior */
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          checks.location = true;
          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
      );
    });
  }

  return checks;
}

export async function collectDutyDeviceTelemetry(): Promise<{
  deviceLabel?: string;
  batteryPct?: number;
  networkType?: string;
  appVersion?: string;
  lat?: number;
  lng?: number;
}> {
  const out: {
    deviceLabel?: string;
    batteryPct?: number;
    networkType?: string;
    appVersion?: string;
    lat?: number;
    lng?: number;
  } = {
    deviceLabel:
      typeof navigator !== 'undefined'
        ? `${navigator.platform || 'Device'} · Web`
        : '4DS Web Officer',
    networkType:
      typeof navigator !== 'undefined'
        ? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
            ?.effectiveType ?? (navigator.onLine ? 'online' : 'offline')
        : undefined,
    appVersion: '1.4.0',
  };

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const bat = await (
        navigator as Navigator & { getBattery: () => Promise<{ level: number }> }
      ).getBattery();
      out.batteryPct = Math.round(bat.level * 100);
    } catch {
      /* optional */
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          out.lat = pos.coords.latitude;
          out.lng = pos.coords.longitude;
          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30_000 },
      );
    });
  }

  return out;
}

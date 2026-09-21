/**
 * 4DS cross-platform ecosystem — web client contracts.
 * Shared with packages/shared-types for native clients later.
 * One account / org / incident / alert / realtime — multiple platform clients.
 */

export type PlatformFamily =
  | 'web'
  | 'pwa'
  | 'android'
  | 'ios'
  | 'ipados'
  | 'watchos'
  | 'wearos'
  | 'desktop'
  | 'ble'
  | 'vehicle'
  | 'cctv'
  | 'alarm'
  | 'gps'
  | 'other';

export type DeviceClass =
  | 'PHONE'
  | 'TABLET'
  | 'WATCH'
  | 'DESKTOP'
  | 'VEHICLE'
  | 'BLE'
  | 'CCTV'
  | 'ALARM'
  | 'GPS'
  | 'OTHER';

export type CapabilityLevel = 'YES' | 'LIMITED' | 'NO' | 'UNKNOWN';

export type DeviceCapabilityMap = {
  notifications: CapabilityLevel;
  sound: CapabilityLevel;
  haptics: CapabilityLevel;
  vibration: CapabilityLevel;
  location: CapabilityLevel;
  backgroundLocation: CapabilityLevel;
  bluetooth: CapabilityLevel;
  camera: CapabilityLevel;
  microphone: CapabilityLevel;
  phone: CapabilityLevel;
  sos: CapabilityLevel;
  background: CapabilityLevel;
  independentNetwork: CapabilityLevel;
  sensors: CapabilityLevel;
};

export type DeviceHeartbeat = {
  devicePublicId: string;
  deviceClass: DeviceClass;
  platform: PlatformFamily;
  osName: string;
  osVersion?: string | null;
  appVersion: string;
  packageId: string;
  capabilities: DeviceCapabilityMap;
  permissions: Record<string, 'granted' | 'denied' | 'prompt' | 'unsupported'>;
  connection: 'online' | 'offline' | 'cellular' | 'wifi' | 'unknown';
  batteryPercent?: number | null;
  lastHeartbeatAt: string;
};

export const PACKAGE_IDS = {
  mobile: 'com.fourds.security',
  watchApple: 'com.fourds.security.watch',
  watchWear: 'com.fourds.security.wear',
  desktop: 'com.fourds.security.desktop',
  web: 'com.fourds.security.web',
} as const;

export type AppReleaseStatus = 'live' | 'beta' | 'planned' | 'web_fallback';

export type AppCatalogEntry = {
  id: string;
  name: string;
  family: PlatformFamily;
  deviceClass: DeviceClass;
  packageId: string;
  status: AppReleaseStatus;
  latestVersion: string;
  storeLabel: string;
  storeUrl: string | null;
  href: string;
  summary: string;
  uxRole: string;
};

export const APP_CATALOG: AppCatalogEntry[] = [
  {
    id: 'web-control',
    name: '4DS Control',
    family: 'web',
    deviceClass: 'DESKTOP',
    packageId: PACKAGE_IDS.web,
    status: 'live',
    latestVersion: '4.2.1',
    storeLabel: 'Open in browser',
    storeUrl: null,
    href: '/control-room',
    summary: 'Central operational hub — map, CCTV, dispatch, incidents, analytics.',
    uxRole: 'Full operations interface',
  },
  {
    id: 'pwa',
    name: '4DS Web App (PWA)',
    family: 'pwa',
    deviceClass: 'PHONE',
    packageId: PACKAGE_IDS.web,
    status: 'live',
    latestVersion: '4.2.1',
    storeLabel: 'Install as web app',
    storeUrl: null,
    href: '/apps#pwa',
    summary: 'Installable web client with push where supported. Not a substitute for native SOS.',
    uxRole: 'Emergency + account interface',
  },
  {
    id: 'android',
    name: '4DS Mobile for Android',
    family: 'android',
    deviceClass: 'PHONE',
    packageId: PACKAGE_IDS.mobile,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'Google Play',
    storeUrl: null,
    href: '/apps#android',
    summary: 'Native Android phone/tablet — push, vibration, BLE, SOS, lone-worker, live response.',
    uxRole: 'Emergency + operational mobile',
  },
  {
    id: 'ios',
    name: '4DS Mobile for iPhone',
    family: 'ios',
    deviceClass: 'PHONE',
    packageId: PACKAGE_IDS.mobile,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'App Store',
    storeUrl: null,
    href: '/apps#ios',
    summary: 'Native iOS — APNs, haptics, location, SOS where Apple permits, live response.',
    uxRole: 'Emergency + operational mobile',
  },
  {
    id: 'ipados',
    name: '4DS for iPad',
    family: 'ipados',
    deviceClass: 'TABLET',
    packageId: PACKAGE_IDS.mobile,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'App Store',
    storeUrl: null,
    href: '/apps#ipad',
    summary: 'Tablet layouts for incidents, map, CCTV, and communications — not a stretched phone UI.',
    uxRole: 'Tablet operations',
  },
  {
    id: 'watchos',
    name: '4DS Watch for Apple Watch',
    family: 'watchos',
    deviceClass: 'WATCH',
    packageId: PACKAGE_IDS.watchApple,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'App Store / watchOS',
    storeUrl: null,
    href: '/apps#apple-watch',
    summary: 'Glanceable P1 alerts, SOS, haptics, accept/arrive — not a full Control Panel.',
    uxRole: 'Glanceable emergency',
  },
  {
    id: 'wearos',
    name: '4DS Watch for Wear OS',
    family: 'wearos',
    deviceClass: 'WATCH',
    packageId: PACKAGE_IDS.watchWear,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'Google Play / Wear OS',
    storeUrl: null,
    href: '/apps#wear-os',
    summary: 'Wear OS watches — P1 alerts, SOS, vibration, dispatch actions where hardware allows.',
    uxRole: 'Glanceable emergency',
  },
  {
    id: 'desktop',
    name: '4DS Control Desktop',
    family: 'desktop',
    deviceClass: 'DESKTOP',
    packageId: PACKAGE_IDS.desktop,
    status: 'web_fallback',
    latestVersion: '4.2.1',
    storeLabel: 'Use secure web Control Panel',
    storeUrl: null,
    href: '/control-room',
    summary: 'Native Windows/macOS/Linux packaging planned. Until then, use the signed-in web Control Panel.',
    uxRole: 'Full operations interface',
  },
  {
    id: 'connect',
    name: '4DS Connect',
    family: 'ble',
    deviceClass: 'BLE',
    packageId: PACKAGE_IDS.mobile,
    status: 'planned',
    latestVersion: '0.0.0',
    storeLabel: 'Via 4DS Mobile',
    storeUrl: null,
    href: '/apps#connect',
    summary: 'Adapter layer for BLE panic buttons, vehicle, GPS, CCTV, alarm, and third-party hardware.',
    uxRole: 'Minimal trigger / telemetry',
  },
];

export const PLATFORM_DISCLAIMER =
  '4DS supports compatible devices and platforms. Capabilities vary by manufacturer, OS, permissions, and regional availability.';

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

export type DetectedClient = {
  platform: PlatformFamily;
  deviceClass: DeviceClass;
  label: string;
  osName: string;
  recommendedAppIds: string[];
  primaryCta: { label: string; href: string };
  notes: string[];
};

export function detectClient(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): DetectedClient {
  const value = ua;
  const isWatchHint = /Watch|Wear OS|CrOS Watch/i.test(value);
  const android = /Android/i.test(value);
  const iphone = /iPhone/i.test(value);
  const ipad =
    /iPad/i.test(value) ||
    (/Macintosh/i.test(value) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  const windows = /Windows NT/i.test(value);
  const mac = /Mac OS X/i.test(value) && !iphone && !ipad;
  const linux = /Linux/i.test(value) && !android;

  if (isWatchHint && android) {
    return {
      platform: 'wearos',
      deviceClass: 'WATCH',
      label: 'Wear OS watch',
      osName: 'Wear OS',
      recommendedAppIds: ['wearos'],
      primaryCta: { label: 'Get 4DS for Wear OS', href: '/apps#wear-os' },
      notes: [
        'Watch apps ship via Google Play / Wear OS — not a phone “watch mode”.',
        PLATFORM_DISCLAIMER,
      ],
    };
  }

  if (android && !/Mobile/i.test(value)) {
    return {
      platform: 'android',
      deviceClass: 'TABLET',
      label: 'Android tablet',
      osName: 'Android',
      recommendedAppIds: ['android', 'pwa'],
      primaryCta: { label: 'Download 4DS for Android', href: '/apps#android' },
      notes: ['Tablet layouts ship with the native Android app.', PLATFORM_DISCLAIMER],
    };
  }

  if (android) {
    return {
      platform: 'android',
      deviceClass: 'PHONE',
      label: 'Android phone',
      osName: 'Android',
      recommendedAppIds: ['android', 'pwa'],
      primaryCta: { label: 'Download 4DS for Android', href: '/apps#android' },
      notes: [
        'Native Android is required for full SOS, background location, and BLE.',
        'Install the PWA for account + alerts where supported until the store build ships.',
        PLATFORM_DISCLAIMER,
      ],
    };
  }

  if (ipad) {
    return {
      platform: 'ipados',
      deviceClass: 'TABLET',
      label: 'iPad',
      osName: 'iPadOS',
      recommendedAppIds: ['ipados', 'pwa'],
      primaryCta: { label: 'Download 4DS for iPad', href: '/apps#ipad' },
      notes: ['iPad uses tablet layouts — not a stretched phone UI.', PLATFORM_DISCLAIMER],
    };
  }

  if (iphone) {
    return {
      platform: 'ios',
      deviceClass: 'PHONE',
      label: 'iPhone',
      osName: 'iOS',
      recommendedAppIds: ['ios', 'watchos', 'pwa'],
      primaryCta: { label: 'Download 4DS for iPhone', href: '/apps#ios' },
      notes: [
        'Apple Watch companion distributes with the iOS app via App Store / watchOS.',
        'Native SOS remains controlled by iOS and may operate independently.',
        PLATFORM_DISCLAIMER,
      ],
    };
  }

  if (windows || mac || linux) {
    return {
      platform: 'desktop',
      deviceClass: 'DESKTOP',
      label: windows ? 'Windows PC' : mac ? 'Mac' : 'Linux desktop',
      osName: windows ? 'Windows' : mac ? 'macOS' : 'Linux',
      recommendedAppIds: ['web-control', 'desktop'],
      primaryCta: { label: 'Open 4DS Control Panel', href: '/control-room' },
      notes: [
        'No fake desktop installer — use the secure web Control Panel until official builds ship.',
        PLATFORM_DISCLAIMER,
      ],
    };
  }

  return {
    platform: 'web',
    deviceClass: 'OTHER',
    label: 'Web browser',
    osName: 'Unknown',
    recommendedAppIds: ['pwa', 'web-control'],
    primaryCta: { label: 'Open 4DS portal', href: '/portal' },
    notes: [PLATFORM_DISCLAIMER],
  };
}

export function catalogForDetection(detected: DetectedClient): AppCatalogEntry[] {
  const preferred = detected.recommendedAppIds
    .map((id) => APP_CATALOG.find((a) => a.id === id))
    .filter(Boolean) as AppCatalogEntry[];
  const rest = APP_CATALOG.filter((a) => !detected.recommendedAppIds.includes(a.id));
  return [...preferred, ...rest];
}

export type CompatibilityReport = {
  deviceLabel: string;
  platform: PlatformFamily;
  support: 'supported' | 'limited' | 'planned' | 'unsupported';
  supportLabel: string;
  capabilities: DeviceCapabilityMap;
  reasons: string[];
};

export function webCapabilitySnapshot(): DeviceCapabilityMap {
  const map = capabilityDefaults('NO');
  if (typeof window === 'undefined') return map;
  map.notifications = 'Notification' in window ? 'YES' : 'NO';
  map.sound = 'AudioContext' in window || 'webkitAudioContext' in window ? 'LIMITED' : 'NO';
  map.vibration = typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'LIMITED' : 'NO';
  map.haptics = map.vibration;
  map.location = 'geolocation' in navigator ? 'LIMITED' : 'NO';
  map.backgroundLocation = 'NO';
  map.bluetooth = 'bluetooth' in navigator ? 'LIMITED' : 'NO';
  map.camera = navigator.mediaDevices?.getUserMedia ? 'LIMITED' : 'NO';
  map.microphone = navigator.mediaDevices?.getUserMedia ? 'LIMITED' : 'NO';
  map.phone = 'LIMITED';
  map.sos = 'NO';
  map.background = 'serviceWorker' in navigator ? 'LIMITED' : 'NO';
  map.independentNetwork = 'YES';
  map.sensors = 'LIMITED';
  return map;
}

export function compatibilityFor(
  platform: PlatformFamily,
  caps?: Partial<DeviceCapabilityMap>,
): CompatibilityReport {
  const merged = { ...webCapabilitySnapshot(), ...caps };

  if (platform === 'web' || platform === 'pwa') {
    return {
      deviceLabel: platform === 'pwa' ? 'Progressive Web App' : 'Web browser',
      platform,
      support: 'limited',
      supportLabel: 'Limited (web)',
      capabilities: merged,
      reasons: [
        'Web cannot guarantee SOS-style lock-screen alerts, background execution, or hardware triggers.',
        'Use native Android/iOS/watch apps for full emergency channels.',
      ],
    };
  }

  if (platform === 'android' || platform === 'ios' || platform === 'ipados') {
    return {
      deviceLabel: platform.toUpperCase(),
      platform,
      support: 'planned',
      supportLabel: 'Native app planned',
      capabilities: {
        ...capabilityDefaults('YES'),
        sos: platform === 'ios' || platform === 'ipados' ? 'LIMITED' : 'YES',
        backgroundLocation: 'LIMITED',
        independentNetwork: 'YES',
      },
      reasons: [`Package ID reserved: ${PACKAGE_IDS.mobile}`, PLATFORM_DISCLAIMER],
    };
  }

  if (platform === 'watchos' || platform === 'wearos') {
    return {
      deviceLabel: platform === 'watchos' ? 'Apple Watch' : 'Wear OS',
      platform,
      support: 'planned',
      supportLabel: 'Watch app planned',
      capabilities: {
        ...capabilityDefaults('LIMITED'),
        notifications: 'YES',
        haptics: 'YES',
        vibration: 'YES',
        sos: 'LIMITED',
        location: 'LIMITED',
        independentNetwork: 'LIMITED',
        background: 'LIMITED',
      },
      reasons: [
        'Watch UX is glanceable only — not a Control Panel clone.',
        'Hardware and networking vary by manufacturer.',
        PLATFORM_DISCLAIMER,
      ],
    };
  }

  if (platform === 'desktop') {
    return {
      deviceLabel: 'Desktop',
      platform,
      support: 'limited',
      supportLabel: 'Web Control Panel (desktop packaging later)',
      capabilities: merged,
      reasons: ['Use the browser Control Panel until official desktop builds ship.'],
    };
  }

  return {
    deviceLabel: 'Other / hardware',
    platform,
    support: 'planned',
    supportLabel: 'Via 4DS Connect adapters',
    capabilities: capabilityDefaults('UNKNOWN'),
    reasons: ['Hardware integrations use DeviceAdapter — not hard-coded to one vendor.'],
  };
}

export function capabilityGlyph(level: CapabilityLevel): string {
  if (level === 'YES') return '✓';
  if (level === 'LIMITED') return '◐';
  if (level === 'NO') return '—';
  return '?';
}

export class WebDeviceAdapter implements DeviceAdapter {
  readonly platform: PlatformFamily = 'web';
  readonly deviceClass: DeviceClass = 'DESKTOP';
  readonly packageId = PACKAGE_IDS.web;

  constructor(private readonly devicePublicId: string) {}

  async register() {
    return { ok: true as const, data: { devicePublicId: this.devicePublicId } };
  }

  async authenticate() {
    return { ok: true as const, data: undefined as void };
  }

  async getCapabilities() {
    return { ok: true as const, data: webCapabilitySnapshot() };
  }

  async getStatus() {
    const caps = await this.getCapabilities();
    if (!caps.ok) return caps;
    const hb: DeviceHeartbeat = {
      devicePublicId: this.devicePublicId,
      deviceClass: this.deviceClass,
      platform: this.platform,
      osName: typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Web',
      appVersion: '4.2.1',
      packageId: this.packageId,
      capabilities: caps.data,
      permissions: {},
      connection: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
      batteryPercent: null,
      lastHeartbeatAt: new Date().toISOString(),
    };
    return { ok: true as const, data: hb };
  }

  async sendNotification() {
    return unsupported('Use showClientEmergencyNotification / service worker.');
  }

  async sendAlert() {
    return this.sendNotification();
  }

  async getLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return unsupported('Geolocation unavailable');
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            ok: true,
            data: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          }),
        () => resolve({ ok: false, reason: 'denied' as const }),
        { timeout: 10000 },
      );
    });
  }

  async getBattery() {
    return { ok: true as const, data: { percent: null } };
  }

  async getHeartbeat() {
    return this.getStatus();
  }

  async disconnect() {
    return { ok: true as const, data: undefined as void };
  }

  async revoke() {
    return { ok: true as const, data: undefined as void };
  }
}

export type AlertRouteTarget = {
  deviceClass: DeviceClass;
  channels: Array<'full_alert' | 'sound' | 'push' | 'vibration' | 'haptic' | 'desktop' | 'lens'>;
};

/** P1 routing: Control Panel full alert · phone push+sound+vib · watch haptic · supervisor push */
export function routeP1Alert(): AlertRouteTarget[] {
  return [
    { deviceClass: 'DESKTOP', channels: ['full_alert', 'sound', 'desktop', 'lens'] },
    { deviceClass: 'PHONE', channels: ['push', 'sound', 'vibration'] },
    { deviceClass: 'WATCH', channels: ['haptic', 'push'] },
    { deviceClass: 'TABLET', channels: ['push', 'sound', 'vibration'] },
  ];
}

/** Example cross-device incident card model (e.g. INC-184 watch SOS). */
export type ConnectedDeviceChip = {
  id: string;
  icon: string;
  label: string;
  kind: DeviceClass | 'SOURCE';
};

export type CrossDeviceIncidentView = {
  publicRef: string;
  title: string;
  sourceLabel: string;
  sourceIcon: string;
  unitLabel?: string | null;
  status: string;
  connected: ConnectedDeviceChip[];
  timeline: { at: string; label: string }[];
};

export const DEMO_WATCH_SOS_INCIDENT: CrossDeviceIncidentView = {
  publicRef: 'INC-184',
  title: 'P1 OFFICER SOS',
  sourceLabel: 'Apple Watch',
  sourceIcon: '⌚',
  unitLabel: 'Unit 14',
  status: 'ACTIVE',
  connected: [
    { id: 'phone', icon: '📱', label: 'iPhone', kind: 'PHONE' },
    { id: 'watch', icon: '⌚', label: 'Apple Watch', kind: 'WATCH' },
    { id: 'vehicle', icon: '🚗', label: 'Vehicle 27', kind: 'VEHICLE' },
    { id: 'gps', icon: '📍', label: 'GPS', kind: 'GPS' },
    { id: 'cctv', icon: '📹', label: 'Nearby CCTV', kind: 'CCTV' },
  ],
  timeline: [
    { at: '11:42:01', label: 'SOS activated' },
    { at: '11:42:02', label: '4DS received event' },
    { at: '11:42:03', label: 'Control Room notified' },
    { at: '11:42:07', label: 'Dispatcher ACK' },
    { at: '11:42:15', label: 'Unit dispatched' },
    { at: '11:44:31', label: 'Officer en route' },
  ],
};

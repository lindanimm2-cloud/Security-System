/**
 * 4DS cross-platform ecosystem contracts.
 * One account / org / incident / alert / realtime system — multiple native clients.
 * Web uses browser capabilities; native apps implement full OS adapters.
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

/** Official package / bundle identifiers — do not change after production release. */
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
  /** Official store URL when published; null = not yet listed */
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
  '4DS supports compatible devices and platforms. Capabilities vary by manufacturer, OS, permissions, and regional availability. Do not assume identical behaviour on every device.';

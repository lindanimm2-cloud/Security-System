import { Injectable } from '@nestjs/common';
import { parseUserAgent } from '../device-security/device-security.logic';

const PACKAGE_IDS = {
  mobile: 'com.fourds.security',
  watchApple: 'com.fourds.security.watch',
  watchWear: 'com.fourds.security.wear',
  desktop: 'com.fourds.security.desktop',
  web: 'com.fourds.security.web',
} as const;

const DISCLAIMER =
  '4DS supports compatible devices and platforms. Capabilities vary by manufacturer, OS, permissions, and regional availability.';

@Injectable()
export class PlatformService {
  listApps() {
    return {
      success: true,
      data: {
        disclaimer: DISCLAIMER,
        packages: PACKAGE_IDS,
        apps: [
          {
            id: 'web-control',
            name: '4DS Control',
            status: 'live',
            packageId: PACKAGE_IDS.web,
            version: '4.2.1',
            href: '/control-room',
          },
          {
            id: 'pwa',
            name: '4DS Web App (PWA)',
            status: 'live',
            packageId: PACKAGE_IDS.web,
            version: '4.2.1',
            href: '/apps#pwa',
          },
          {
            id: 'android',
            name: '4DS Mobile for Android',
            status: 'planned',
            packageId: PACKAGE_IDS.mobile,
            store: 'Google Play',
          },
          {
            id: 'ios',
            name: '4DS Mobile for iPhone',
            status: 'planned',
            packageId: PACKAGE_IDS.mobile,
            store: 'App Store',
          },
          {
            id: 'watchos',
            name: '4DS Watch for Apple Watch',
            status: 'planned',
            packageId: PACKAGE_IDS.watchApple,
            store: 'App Store / watchOS',
          },
          {
            id: 'wearos',
            name: '4DS Watch for Wear OS',
            status: 'planned',
            packageId: PACKAGE_IDS.watchWear,
            store: 'Google Play / Wear OS',
          },
          {
            id: 'desktop',
            name: '4DS Control Desktop',
            status: 'web_fallback',
            packageId: PACKAGE_IDS.desktop,
            href: '/control-room',
            note: 'No unofficial installer — use the secure web Control Panel until official builds ship.',
          },
          {
            id: 'connect',
            name: '4DS Connect',
            status: 'planned',
            note: 'DeviceAdapter for BLE, vehicle, GPS, CCTV, alarm, and third-party hardware.',
          },
        ],
      },
    };
  }

  compatibility(ua: string) {
    const parsed = parseUserAgent(ua);
    const family = parsed.platformFamily ?? 'unknown';
    const support =
      family === 'unknown'
        ? 'limited'
        : parsed.deviceType === 'watch'
          ? 'planned'
          : parsed.isBrowser
            ? 'limited'
            : 'planned';

    return {
      success: true,
      data: {
        device: {
          name: parsed.name,
          deviceType: parsed.deviceType,
          osName: parsed.osName,
          osVersion: parsed.osVersion,
          platformFamily: family,
        },
        support,
        supportLabel:
          support === 'limited'
            ? 'Limited (web/PWA capabilities)'
            : support === 'planned'
              ? 'Native client planned'
              : 'Supported',
        disclaimer: DISCLAIMER,
        routing: {
          p1: [
            { deviceClass: 'DESKTOP', channels: ['full_alert', 'sound', 'desktop', 'lens'] },
            { deviceClass: 'PHONE', channels: ['push', 'sound', 'vibration'] },
            { deviceClass: 'WATCH', channels: ['haptic', 'push'] },
          ],
        },
      },
    };
  }

  ecosystem() {
    return {
      success: true,
      data: {
        principle: 'ONE account · ONE org · ONE incident/alert/realtime system · MULTIPLE native clients',
        layers: [
          '4DS CLOUD / API',
          'CORE SERVICES',
          'ALERT ENGINE',
          'INCIDENT ENGINE',
          'REALTIME ENGINE',
          'WEB / PWA',
          'MOBILE (Android / iOS / tablet)',
          'WATCH (watchOS / Wear OS)',
          'CONNECT (BLE / vehicle / GPS / CCTV / alarm)',
        ],
        environments: ['development', 'staging', 'production'],
        disclaimer: DISCLAIMER,
        packages: PACKAGE_IDS,
      },
    };
  }
}

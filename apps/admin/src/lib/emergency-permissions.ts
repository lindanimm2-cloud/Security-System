/**
 * Emergency permission architecture for 4DS.
 * Web uses what's available; native Android/iOS can map the same ids to OS channels later.
 */

import type { AccessMap } from '@/lib/subscription-plans';

export type EmergencyPermissionId =
  | 'notifications'
  | 'alert_sound'
  | 'vibration'
  | 'location'
  | 'phone'
  | 'microphone'
  | 'camera'
  | 'contacts'
  | 'bluetooth'
  | 'background'
  | 'sos';

export type EmergencyPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'
  | 'checking'
  | 'recommended';

/** How this capability is delivered on each runtime. */
export type RuntimeSupport = 'os_prompt' | 'preference' | 'partial' | 'unavailable';

export type EmergencyPermissionDef = {
  id: EmergencyPermissionId;
  label: string;
  why: string;
  required: boolean;
  recommended: boolean;
  group: 'recommended' | 'optional';
  web: RuntimeSupport;
  native: RuntimeSupport;
  /** Empty = always shown for subscribed clients */
  requiresAny: (keyof AccessMap)[];
};

export const EMERGENCY_PERMISSION_DEFS: EmergencyPermissionDef[] = [
  {
    id: 'notifications',
    label: 'Notifications',
    why: 'Receive security alerts and live response updates.',
    required: true,
    recommended: true,
    group: 'recommended',
    web: 'os_prompt',
    native: 'os_prompt',
    requiresAny: [],
  },
  {
    id: 'alert_sound',
    label: 'Alert sound',
    why: 'Hear emergency alerts even when the screen is locked (where the OS allows).',
    required: true,
    recommended: true,
    group: 'recommended',
    web: 'preference',
    native: 'os_prompt',
    requiresAny: [],
  },
  {
    id: 'vibration',
    label: 'Vibration',
    why: 'Feel emergency alerts with configurable vibration patterns.',
    required: true,
    recommended: true,
    group: 'recommended',
    web: 'preference',
    native: 'os_prompt',
    requiresAny: [],
  },
  {
    id: 'location',
    label: 'Location',
    why: 'Share location during emergencies so responders can reach you.',
    required: true,
    recommended: true,
    group: 'recommended',
    web: 'os_prompt',
    native: 'os_prompt',
    requiresAny: ['personal', 'family', 'vehicle', 'emergency'],
  },
  {
    id: 'phone',
    label: 'Phone',
    why: 'Call control room or emergency services quickly from the response screen.',
    required: true,
    recommended: true,
    group: 'recommended',
    web: 'partial',
    native: 'os_prompt',
    requiresAny: ['emergency'],
  },
  {
    id: 'microphone',
    label: 'Microphone',
    why: 'Emergency calls and voice communication with the control room.',
    required: false,
    recommended: true,
    group: 'recommended',
    web: 'os_prompt',
    native: 'os_prompt',
    requiresAny: ['emergency'],
  },
  {
    id: 'camera',
    label: 'Camera',
    why: 'Evidence capture and incident reporting when needed.',
    required: false,
    recommended: false,
    group: 'optional',
    web: 'os_prompt',
    native: 'os_prompt',
    requiresAny: ['home', 'emergency'],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    why: 'Pick personal emergency and family contacts faster.',
    required: false,
    recommended: false,
    group: 'optional',
    web: 'partial',
    native: 'os_prompt',
    requiresAny: ['family', 'emergency'],
  },
  {
    id: 'bluetooth',
    label: 'Bluetooth',
    why: 'Optional connected emergency devices (wearables, panic buttons).',
    required: false,
    recommended: false,
    group: 'optional',
    web: 'partial',
    native: 'os_prompt',
    requiresAny: ['emergency'],
  },
  {
    id: 'background',
    label: 'Background activity',
    why: 'Keep emergency features responsive when the app is in the background.',
    required: false,
    recommended: true,
    group: 'recommended',
    web: 'partial',
    native: 'os_prompt',
    requiresAny: [],
  },
  {
    id: 'sos',
    label: 'SOS',
    why: 'Enable emergency activation. Native SOS remains controlled by the phone OS.',
    required: false,
    recommended: true,
    group: 'recommended',
    web: 'unavailable',
    native: 'os_prompt',
    requiresAny: ['emergency'],
  },
];

export function emergencyPermissionApplies(
  def: EmergencyPermissionDef,
  access: AccessMap | null,
): boolean {
  if (!access) return false;
  if (def.requiresAny.length === 0) return true;
  return def.requiresAny.some((key) => access[key]);
}

export function runtimeNote(def: EmergencyPermissionDef): string {
  if (def.web === 'unavailable') {
    return 'Full SOS integration requires the native 4DS app. On web, use Protect / Panic instead.';
  }
  if (def.web === 'partial') {
    return 'Web support is limited; a native Android/iOS app can use the full OS capability.';
  }
  if (def.web === 'preference') {
    return 'Enabled in 4DS preferences. Native apps can use stronger OS emergency channels.';
  }
  return 'Uses the browser or OS permission prompt when available.';
}

export const EMERGENCY_SETUP_DONE_KEY = '4ds-emergency-setup-done';
export const EMERGENCY_PERMS_HASH = '#emergency-permissions';

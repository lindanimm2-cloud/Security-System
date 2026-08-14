import type { AccessMap } from '@/lib/subscription-plans';

export type PortalPermissionKind = 'location' | 'notifications' | 'microphone' | 'camera';

export type PortalPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

export type PortalPermissionDef = {
  id: PortalPermissionKind;
  label: string;
  description: string;
  features: string;
  /** At least one access flag must be true (empty = always for subscribed clients). */
  requiresAny: (keyof AccessMap)[];
};

export const PORTAL_PERMISSION_DEFS: PortalPermissionDef[] = [
  {
    id: 'location',
    label: 'Location',
    description: 'Share GPS during panic, tracking, and vehicle recovery.',
    features: 'Personal · Family · Vehicle · Emergency',
    requiresAny: ['personal', 'family', 'vehicle', 'emergency'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Dispatch updates, incident alerts, and family safety messages.',
    features: 'All protection plans',
    requiresAny: [],
  },
  {
    id: 'microphone',
    label: 'Microphone',
    description: 'Speak to control room on call and silent safety line.',
    features: 'Emergency · Dispatch calls',
    requiresAny: ['emergency'],
  },
  {
    id: 'camera',
    label: 'Camera',
    description: 'View live home CCTV and share evidence when needed.',
    features: 'Home security',
    requiresAny: ['home'],
  },
];

export function permissionAppliesToPlan(
  def: PortalPermissionDef,
  access: AccessMap | null,
): boolean {
  if (!access) return false;
  if (def.requiresAny.length === 0) return true;
  return def.requiresAny.some((key) => access[key]);
}

export function permissionNeedsAttention(state: PortalPermissionState): boolean {
  return state === 'prompt' || state === 'denied';
}

export const PORTAL_PERMISSIONS_PROFILE_HASH = '#device-permissions';

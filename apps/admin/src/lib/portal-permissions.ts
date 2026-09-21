/**
 * Legacy portal permission defs — kept for profile section compatibility.
 * Full emergency catalog lives in emergency-permissions.ts.
 */

import type { AccessMap } from '@/lib/subscription-plans';
import {
  EMERGENCY_PERMISSION_DEFS,
  type EmergencyPermissionId,
} from '@/lib/emergency-permissions';

export type PortalPermissionKind = Extract<
  EmergencyPermissionId,
  'location' | 'notifications' | 'microphone' | 'camera'
>;

export type PortalPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

export type PortalPermissionDef = {
  id: PortalPermissionKind;
  label: string;
  description: string;
  features: string;
  requiresAny: (keyof AccessMap)[];
};

const CORE_IDS: PortalPermissionKind[] = ['location', 'notifications', 'microphone', 'camera'];

export const PORTAL_PERMISSION_DEFS: PortalPermissionDef[] = EMERGENCY_PERMISSION_DEFS.filter((d) =>
  CORE_IDS.includes(d.id as PortalPermissionKind),
).map((d) => ({
  id: d.id as PortalPermissionKind,
  label: d.label,
  description: d.why,
  features: d.group === 'recommended' ? 'Emergency protection' : 'Optional',
  requiresAny: d.requiresAny,
}));

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

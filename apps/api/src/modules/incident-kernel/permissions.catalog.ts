import { UserRole } from '@prisma/client';

export const PERMISSIONS = [
  'incidents.view',
  'incidents.create',
  'incidents.dispatch',
  'incidents.resolve',
  'clients.view',
  'clients.edit',
  'medical.view',
  'medical.edit',
  'fire.view',
  'fleet.manage',
  'billing.view',
  'revenue.view',
  'developer.access',
  'comms.incident',
  'security.devices.view',
  'security.devices.manage',
  'security.devices.revoke',
  'security.devices.lock',
  'security.devices.replace',
  'security.emergency.view',
  'security.emergency.activate',
  'security.emergency.acknowledge',
  'security.emergency.dispatch',
  'security.emergency.resolve',
  'security.medical.view',
  'security.medical.manage',
  'security.audit.view',
  'security.lockdown.activate',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

const CLIENT_SECURITY: PermissionCode[] = [
  'security.devices.view',
  'security.devices.manage',
  'security.devices.revoke',
  'security.devices.lock',
  'security.devices.replace',
  'security.emergency.view',
  'security.emergency.activate',
  'security.lockdown.activate',
  'security.medical.manage',
  'security.audit.view',
];

const OPS = [
  'incidents.view',
  'incidents.create',
  'incidents.dispatch',
  'incidents.resolve',
  'clients.view',
  'medical.view',
  'fire.view',
  'comms.incident',
  'security.devices.view',
  'security.emergency.view',
  'security.emergency.acknowledge',
  'security.emergency.dispatch',
  'security.emergency.resolve',
] as const satisfies PermissionCode[];

export const ROLE_PERMISSION_DEFAULTS: Record<UserRole, PermissionCode[]> = {
  USER: ['incidents.view', 'incidents.create', 'comms.incident', ...CLIENT_SECURITY],
  FAMILY_MEMBER: ['incidents.view', 'comms.incident', 'security.emergency.view', 'security.emergency.activate'],
  OFFICER: ['incidents.view', 'incidents.create', 'incidents.dispatch', 'comms.incident', 'security.emergency.view'],
  DISPATCHER: [...OPS, 'fleet.manage'],
  SUPERVISOR: [...OPS, 'fleet.manage', 'clients.edit', 'security.devices.manage', 'security.audit.view'],
  MANAGER: [...OPS, 'fleet.manage', 'clients.edit', 'billing.view', 'security.devices.manage', 'security.audit.view'],
  TENANT_ADMIN: [...ALL.filter((p) => p !== 'developer.access')],
  OWNER: [...ALL],
  SUPER_ADMIN: [...ALL],
  SALES: ['clients.view', 'clients.edit', 'billing.view', 'comms.incident'],
  TECHNICIAN: ['incidents.view', 'comms.incident'],
  DEVELOPER: [...ALL],
  MEDICAL_DISPATCHER: [
    'incidents.view',
    'incidents.dispatch',
    'medical.view',
    'medical.edit',
    'comms.incident',
    'security.emergency.view',
    'security.medical.view',
    'security.medical.manage',
  ],
  MEDICAL_CREW: ['incidents.view', 'medical.view', 'comms.incident', 'security.medical.view'],
  FIRE_DISPATCHER: ['incidents.view', 'incidents.dispatch', 'fire.view', 'comms.incident'],
  FIRE_CREW: ['incidents.view', 'fire.view', 'comms.incident'],
  FIRE_SUPERVISOR: ['incidents.view', 'incidents.dispatch', 'fire.view', 'comms.incident', 'fleet.manage'],
};

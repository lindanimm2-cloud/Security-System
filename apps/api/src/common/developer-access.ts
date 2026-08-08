import { UserRole } from '@prisma/client';

/** Staff who may sign into the control-room / CRM admin portal */
export const ADMIN_PORTAL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.MANAGER,
  UserRole.SUPERVISOR,
  UserRole.DISPATCHER,
  UserRole.SALES,
  UserRole.DEVELOPER,
];

/** Ops roles that may use control-room surveillance / dispatch tools */
export const OPS_ROLES: UserRole[] = [
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.TENANT_ADMIN,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
];

/** Store / inventory admins (POS, stock, product catalog) */
export const STORE_ADMIN_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.MANAGER,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
];

/**
 * Who may notify, chat with, and call the developer.
 * Officers and end clients are excluded on purpose.
 */
export const DEVELOPER_CONTACT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.TENANT_ADMIN,
  UserRole.MANAGER,
  UserRole.SUPERVISOR,
  UserRole.DISPATCHER,
  UserRole.SALES,
  UserRole.TECHNICIAN,
  UserRole.DEVELOPER,
];

export function canContactDeveloper(role: UserRole | string): boolean {
  return DEVELOPER_CONTACT_ROLES.includes(role as UserRole);
}

export function isDeveloper(role: UserRole | string): boolean {
  return role === UserRole.DEVELOPER;
}

type TenantSettings = {
  features?: Record<string, unknown>;
  developerCanViewRevenue?: boolean;
};

export function developerCanViewRevenue(
  role: UserRole | string,
  tenantSettings: unknown,
): boolean {
  if (!isDeveloper(role)) return true;
  const settings = (tenantSettings ?? {}) as TenantSettings;
  return settings.developerCanViewRevenue === true;
}

export const REVENUE_HIDDEN_LABEL = 'Hidden — owner approval required';

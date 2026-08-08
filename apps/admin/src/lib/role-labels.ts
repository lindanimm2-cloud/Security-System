/** Friendly labels for UserRole values shown in UI chrome. */
export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  USER: 'Client',
  FAMILY_MEMBER: 'Family Member',
  OFFICER: 'Officer',
  DISPATCHER: 'Dispatcher',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  TENANT_ADMIN: 'Tenant Admin',
  OWNER: 'Owner',
  SUPER_ADMIN: 'Super Admin',
  SALES: 'Sales',
  TECHNICIAN: 'Technician',
  DEVELOPER: 'Developer',
};

export function roleDisplayLabel(role: string | null | undefined): string {
  if (!role) return '';
  return ROLE_DISPLAY_LABELS[role] ?? role.replace(/_/g, ' ');
}

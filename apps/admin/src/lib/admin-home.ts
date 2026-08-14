/** Control-room login lands on a role-specific home. */
export function adminHomeForRole(role: string): string {
  if (role === 'SUPERVISOR') return '/supervisor';
  if (role === 'MEDICAL_DISPATCHER' || role === 'MEDICAL_CREW') return '/medical';
  if (role === 'DEVELOPER') return '/control-room/profile';
  return '/control-room';
}

export function isMedicalStaffRole(role: string) {
  return role === 'MEDICAL_DISPATCHER' || role === 'MEDICAL_CREW';
}

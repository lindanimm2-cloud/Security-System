/** Control-panel roles allowed to set / reset another user's password. */
export const PASSWORD_MANAGER_ROLES = [
  'OWNER',
  'SUPER_ADMIN',
  'DEVELOPER',
  'TENANT_ADMIN',
  /** Legacy demo / Owner alias used by some control-panel sessions. */
  'ADMIN',
] as const;

export type PasswordManagerRole = (typeof PASSWORD_MANAGER_ROLES)[number];

export function canManageUserPasswords(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PASSWORD_MANAGER_ROLES as readonly string[]).includes(role);
}

export const PASSWORD_MIN_LENGTH = 8;

export function validateNewPassword(password: string): string | null {
  const value = password.trim();
  if (!value) return 'Enter a new password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

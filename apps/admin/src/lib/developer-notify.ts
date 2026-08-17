import { getSession, type AuthPortal, type AuthSession } from './auth';
import { adminApi, clientApi, officerApi, techApi } from './api-client';

const DEVELOPER_CONTACT_ROLES = new Set([
  'OWNER',
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
  'SALES',
  'TECHNICIAN',
  'DEVELOPER',
  'MEDICAL_DISPATCHER',
  'MEDICAL_CREW',
]);

export function canNotifyDeveloper(role: string | null | undefined): boolean {
  if (!role) return false;
  return DEVELOPER_CONTACT_ROLES.has(role);
}

/** Prefer the portal matching the current path; fall back across staff sessions. */
export function resolveStaffSession(pathname: string | null): {
  portal: AuthPortal;
  session: AuthSession;
} | null {
  const preferred: AuthPortal =
    pathname?.startsWith('/tech')
      ? 'technician'
      : pathname?.startsWith('/officer')
        ? 'officer'
        : pathname?.startsWith('/portal')
          ? 'client'
          : 'admin';

  const order: AuthPortal[] = [preferred, 'admin', 'technician', 'officer', 'client'];
  const seen = new Set<AuthPortal>();
  for (const portal of order) {
    if (seen.has(portal)) continue;
    seen.add(portal);
    const session = getSession(portal);
    if (session && canNotifyDeveloper(session.user.role)) {
      return { portal, session };
    }
  }
  return null;
}

export async function submitDeveloperErrorReport(input: {
  message: string;
  path?: string;
  context?: string;
  portal: AuthPortal;
  accessToken: string;
}): Promise<void> {
  const api =
    input.portal === 'officer'
      ? officerApi
      : input.portal === 'technician'
        ? techApi
        : input.portal === 'client'
          ? clientApi
          : adminApi;

  await api.post('/developer/error-reports', {
    message: input.message,
    path: input.path,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    context: input.context,
  });
}

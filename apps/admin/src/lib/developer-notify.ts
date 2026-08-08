import { clearSession, getSession, type AuthPortal, type AuthSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

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
  let res: Response;
  try {
    res = await fetch(`${API_URL}/developer/error-reports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input.message,
        path: input.path,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        context: input.context,
      }),
    });
  } catch {
    throw new Error('Could not reach the API to notify the developer');
  }

  if (res.status === 401) {
    clearSession(input.portal);
    throw new Error('Session expired');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Could not notify developer');
  }
}

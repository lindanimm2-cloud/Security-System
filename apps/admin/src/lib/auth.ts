import { demoLogin, demoRegisterSession, getDemoInvite } from './demo/users';
import { isDemoMode } from './demo/is-demo-mode';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  jobTitle?: string | null;
  phone?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string | null;
  };
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  /** Where this client session was established — site logins cannot open portal without re-auth */
  authSource?: 'site' | 'portal';
};

const CLIENT_KEY = '4ds_client_session';
const ADMIN_KEY = '4ds_admin_session';
const OFFICER_KEY = '4ds_officer_session';
const TECH_KEY = '4ds_tech_session';
const CLIENT_AUTH_SOURCE_KEY = '4ds_client_auth_source';

export type AuthPortal = 'client' | 'admin' | 'officer' | 'technician';
export type ClientAuthSource = 'site' | 'portal';

function sessionKey(portal: AuthPortal) {
  if (portal === 'client') return CLIENT_KEY;
  if (portal === 'officer') return OFFICER_KEY;
  if (portal === 'technician') return TECH_KEY;
  return ADMIN_KEY;
}

function loginEndpoint(portal: AuthPortal) {
  if (portal === 'client') return '/auth/client/login';
  if (portal === 'officer') return '/auth/officer/login';
  if (portal === 'technician') return '/auth/technician/login';
  return '/auth/admin/login';
}

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';
}

export function getClientAuthSource(): ClientAuthSource | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(CLIENT_AUTH_SOURCE_KEY);
  return v === 'site' || v === 'portal' ? v : null;
}

export function setClientAuthSource(source: ClientAuthSource) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLIENT_AUTH_SOURCE_KEY, source);
}

export function clearClientAuthSource() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_AUTH_SOURCE_KEY);
}

/** Persist a client session and mark whether it came from portal or site auth. */
export function persistClientSession(session: AuthSession, source: ClientAuthSource) {
  if (typeof window === 'undefined') return;
  const next: AuthSession = { ...session, authSource: source };
  localStorage.setItem(CLIENT_KEY, JSON.stringify(next));
  setClientAuthSource(source);
}

/** Portal may reuse session only if it was created via portal login (or CRM staff is unrelated). */
export function canUseClientSessionForPortal(): boolean {
  const session = getSession('client');
  if (!session) return false;
  const source = session.authSource ?? getClientAuthSource();
  return source === 'portal';
}

export async function login(
  portal: AuthPortal,
  email: string,
  password: string,
  tenantSlug: string,
  options?: { authSource?: ClientAuthSource },
): Promise<AuthSession> {
  const authSource =
    portal === 'client' ? (options?.authSource ?? 'portal') : undefined;

  if (isDemoMode()) {
    const session = {
      ...demoLogin(portal, email, password, tenantSlug),
      ...(authSource ? { authSource } : {}),
    } as AuthSession;
    if (typeof window !== 'undefined') {
      if (portal === 'client' && authSource) {
        persistClientSession(session, authSource);
      } else {
        localStorage.setItem(sessionKey(portal), JSON.stringify(session));
      }
    }
    return session;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${loginEndpoint(portal)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug }),
    });
  } catch {
    throw new Error('Request failed');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? json?.error?.message ?? 'Login failed');
  }

  const session: AuthSession = {
    user: json.data.user,
    accessToken: json.data.tokens.accessToken,
    ...(authSource ? { authSource } : {}),
  };

  if (typeof window !== 'undefined') {
    if (portal === 'client' && authSource) {
      persistClientSession(session, authSource);
    } else {
      localStorage.setItem(sessionKey(portal), JSON.stringify(session));
    }
  }

  return session;
}

export type ClientRegisterPayload = {
  tenantSlug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountKind?: 'store' | 'protection';
  emergencyContact?: { name: string; phone: string; relationship: string };
  medical?: {
    bloodType?: string;
    allergies?: string;
    medications?: string;
    emergencyNotes?: string;
  };
  acceptTerms: boolean;
};

export type ClientOAuthPayload = {
  provider: 'google' | 'apple';
  tenantSlug: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  accountKind?: 'store' | 'protection';
  acceptTerms: boolean;
};

export type ClientRegisterCompletePayload = {
  token: string;
  password: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
  medical?: {
    bloodType?: string;
    allergies?: string;
    medications?: string;
    emergencyNotes?: string;
  };
  acceptTerms: boolean;
};

export type ClientInvitePreview = {
  email: string;
  firstName: string;
  lastName: string;
  tenant: { name: string; slug: string };
  expiresAt: string | null;
  status: string;
};

function parseAuthError(json: unknown, fallback: string) {
  const body = json as { message?: string | string[]; error?: { message?: string } };
  const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return msg ?? body?.error?.message ?? fallback;
}

export async function fetchClientInvite(token: string): Promise<ClientInvitePreview> {
  if (isDemoMode()) {
    return getDemoInvite(token);
  }
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/auth/client/invite/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
  } catch {
    throw new Error('Request failed');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseAuthError(json, 'Invite not found'));
  return json.data as ClientInvitePreview;
}

export async function registerClient(
  payload: ClientRegisterPayload,
  options?: { authSource?: ClientAuthSource },
): Promise<AuthSession> {
  if (isDemoMode()) {
    const authSource = options?.authSource ?? 'portal';
    const session = {
      ...demoRegisterSession(payload),
      authSource,
    } as AuthSession;
    persistClientSession(session, authSource);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('4ds-client-session-changed'));
    }
    return session;
  }
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/auth/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Request failed');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseAuthError(json, 'Registration failed'));

  const authSource = options?.authSource ?? 'portal';
  const session: AuthSession = {
    user: json.data.user,
    accessToken: json.data.tokens.accessToken,
    authSource,
  };
  persistClientSession(session, authSource);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('4ds-client-session-changed'));
  }
  return session;
}

export async function oauthClientSignIn(
  payload: ClientOAuthPayload,
  options?: { authSource?: ClientAuthSource },
): Promise<AuthSession> {
  if (isDemoMode()) {
    const authSource = options?.authSource ?? 'site';
    const session = {
      ...demoRegisterSession({
        email: payload.email,
        firstName: payload.firstName ?? 'OAuth',
        lastName: payload.lastName ?? 'User',
        phone: payload.phone,
      }),
      authSource,
    } as AuthSession;
    persistClientSession(session, authSource);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('4ds-client-session-changed'));
    }
    return session;
  }
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/auth/client/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Request failed');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseAuthError(json, 'Sign-in failed'));

  const authSource = options?.authSource ?? 'site';
  const session: AuthSession = {
    user: json.data.user,
    accessToken: json.data.tokens.accessToken,
    authSource,
  };
  persistClientSession(session, authSource);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('4ds-client-session-changed'));
  }
  return session;
}

export async function completeClientRegistration(
  payload: ClientRegisterCompletePayload,
): Promise<AuthSession> {
  if (isDemoMode()) {
    getDemoInvite(payload.token);
    const session = {
      ...demoRegisterSession({
        email: 'invitee@demo.local',
        firstName: payload.firstName ?? 'Invite',
        lastName: payload.lastName ?? 'Client',
        phone: payload.phone,
      }),
      authSource: 'portal' as const,
    } as AuthSession;
    persistClientSession(session, 'portal');
    return session;
  }
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/auth/client/register/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Request failed');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseAuthError(json, 'Registration failed'));

  const session: AuthSession = {
    user: json.data.user,
    accessToken: json.data.tokens.accessToken,
    authSource: 'portal',
  };
  persistClientSession(session, 'portal');
  return session;
}

export function getSession(portal: AuthPortal): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const key = sessionKey(portal);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (portal === 'client' && !session.authSource) {
      const source = getClientAuthSource();
      if (source) session.authSource = source;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(portal: AuthPortal) {
  if (typeof window === 'undefined') return;
  const key = sessionKey(portal);
  localStorage.removeItem(key);
  if (portal === 'client') clearClientAuthSource();
}

export async function fetchWithAuth<T>(
  portal: AuthPortal,
  path: string,
): Promise<T> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    const { handleDemoRequest } = await import('./demo/handler');
    return handleDemoRequest<T>({
      portal,
      path,
      method: 'GET',
      session,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Request failed');
  }

  if (res.status === 401) {
    clearSession(portal);
    throw new Error('Session expired');
  }

  if (!res.ok) throw new Error('Request failed');
  return res.json() as Promise<T>;
}

import { clearSession, getSession, type AuthPortal } from './auth';
import { handleDemoRequest } from './demo/handler';
import { isDemoMode } from './demo/is-demo-mode';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

async function request<T>(
  portal: AuthPortal,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    return handleDemoRequest<T>({
      portal,
      path,
      method: options.method ?? 'GET',
      body: options.body,
      session,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Request failed');
  }

  if (res.status === 401) {
    clearSession(portal);
    throw new Error('Session expired');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Request failed');
  }

  return json as T;
}

export const clientApi = {
  get: <T>(path: string) => request<T>('client', path),
  post: <T>(path: string, body?: unknown) =>
    request<T>('client', path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('client', path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>('client', path, { method: 'DELETE' }),
};

export const adminApi = {
  get: <T>(path: string) => request<T>('admin', path),
  post: <T>(path: string, body?: unknown) =>
    request<T>('admin', path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('admin', path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>('admin', path, { method: 'DELETE' }),
};

export const officerApi = {
  get: <T>(path: string) => request<T>('officer', path),
  post: <T>(path: string, body?: unknown) =>
    request<T>('officer', path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('officer', path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};

export const techApi = {
  get: <T>(path: string) => request<T>('technician', path),
  post: <T>(path: string, body?: unknown) =>
    request<T>('technician', path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('technician', path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};

export async function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode()) {
    return handleDemoRequest<T>({
      path,
      method: options.method ?? 'GET',
      body: options.body,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Request failed');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Request failed');
  }
  return json as T;
}

export type ApiResponse<T> = { success: boolean; data: T };

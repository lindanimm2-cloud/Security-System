import { isDemoMode } from './demo/is-demo-mode';

/** Base URL for Socket.IO. Returns null in demo mode (no local/private network calls). */
export function getSocketUrl(): string | null {
  if (isDemoMode()) return null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';
  if (!apiUrl || /localhost|127\.0\.0\.1/.test(apiUrl)) {
    // Never probe the user's machine from a public Vercel URL
    if (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      return null;
    }
  }
  return apiUrl.replace(/\/v1\/?$/, '');
}

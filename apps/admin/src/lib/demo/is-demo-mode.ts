/**
 * Pitch / Vercel demo mode — no Nest API required.
 * Defaults ON so a shareable Vercel link always shows products + login.
 * Only off when NEXT_PUBLIC_DEMO_MODE=false and a real (non-localhost) API URL is set.
 */
export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') return true;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!apiUrl || /localhost|127\.0\.0\.1/i.test(apiUrl)) return true;
  return false;
}

/** Demo data is already in memory — background refetch just janks the UI. */
export function shouldBackgroundPoll(): boolean {
  return !isDemoMode();
}

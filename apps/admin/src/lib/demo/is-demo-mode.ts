/** Pitch / Vercel demo mode — no Nest API required when enabled. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

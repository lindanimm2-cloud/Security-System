/** Ambient atmosphere keys for the client portal — not brand colors. */
export type PortalAmbientKey = 'none' | 'away' | 'stay' | 'night' | 'disarm' | 'triggered';

export const PORTAL_AMBIENT_LABEL: Record<Exclude<PortalAmbientKey, 'none'>, string> = {
  away: 'Away',
  stay: 'Stay',
  night: 'Night',
  disarm: 'Disarmed',
  triggered: 'Alarm',
};

export function portalAmbientFromAlarm(status?: string | null): PortalAmbientKey {
  const s = (status ?? '').toUpperCase();
  if (s === 'TRIGGERED') return 'triggered';
  if (s === 'ARMED' || s === 'EXIT_DELAY') return 'away';
  if (s === 'STAY' || s === 'ENTRY_DELAY') return 'stay';
  if (s === 'NIGHT') return 'night';
  if (s === 'DISARMED' || s === 'OFFLINE') return 'disarm';
  return 'none';
}

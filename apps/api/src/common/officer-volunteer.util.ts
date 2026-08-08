export const OFFICER_AVAILABLE_MARKER_PREFIX = '[OFFICER_AVAILABLE:';

export const VOLUNTEER_NOTE_MAX_AGE_MS = 30 * 60 * 1000;

export function officerAvailableMarker(officerId: string) {
  return `${OFFICER_AVAILABLE_MARKER_PREFIX}${officerId}]`;
}

export function parseOfficerIdFromVolunteerNote(content: string): string | null {
  const match = content.match(/^\[OFFICER_AVAILABLE:([^\]]+)\]/);
  return match?.[1] ?? null;
}

export function volunteerNoteCutoff() {
  return new Date(Date.now() - VOLUNTEER_NOTE_MAX_AGE_MS);
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

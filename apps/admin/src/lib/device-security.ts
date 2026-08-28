const DEVICE_KEY = '4ds-sec-device-id';

export const CONSENT_VERSION = '2026-08-18';
export const POLICY_VERSION = '1.0';
export const NATIVE_SOS_DISCLAIMER =
  'Emergency SOS functionality is dependent on the device manufacturer, operating system, device model, operating-system version, permissions and regional availability. Native Emergency SOS may operate independently of this application.';

export function getOrCreateLocalDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const id = `SEC-DEVICE-${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function detectWebNativeSos(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): {
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'NOT_AVAILABLE' | 'PERMISSION_REQUIRED';
  note: string;
  platform: 'ios' | 'android' | 'web';
} {
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const platform = ios ? 'ios' : android ? 'android' : 'web';
  const note = ios
    ? "Apple's Emergency SOS is controlled by iOS. Some Emergency SOS actions may operate independently from this application. This web app cannot receive Apple's Emergency SOS event."
    : android
      ? "Your device's native Emergency SOS operates independently from this application. This web app cannot intercept protected Android Emergency SOS functionality."
      : NATIVE_SOS_DISCLAIMER;
  return { status: 'NOT_AVAILABLE', note, platform };
}

export function deviceStatusMeta(status: string, isPrimary: boolean) {
  if (status === 'LOST' || status === 'STOLEN') {
    return { label: status === 'STOLEN' ? 'Stolen' : 'Lost', tone: 'danger' as const, glyph: '🔴' };
  }
  if (status === 'BLOCKED') return { label: 'Blocked', tone: 'danger' as const, glyph: '🔴' };
  if (status === 'REVOKED') return { label: 'Revoked', tone: 'revoked' as const, glyph: '⚫' };
  if (status === 'PENDING_VERIFICATION') {
    return { label: 'Pending verification', tone: 'pending' as const, glyph: '🟠' };
  }
  if (status === 'TEMPORARY') return { label: 'Temporary', tone: 'temporary' as const, glyph: '🟡' };
  if (isPrimary) return { label: 'Primary', tone: 'primary' as const, glyph: '🔵' };
  return { label: 'Trusted', tone: 'trusted' as const, glyph: '🟢' };
}

import { createHash, randomBytes } from 'crypto';

export const DEVICE_PUBLIC_PREFIX = 'SEC-DEVICE-';
export const CONSENT_VERSION = '2026-08-18';
export const POLICY_VERSION = '1.0';
export const DEFAULT_EMERGENCY_SESSION_MS = 10 * 60 * 1000;
export const DEFAULT_PANIC_HOLD_MS = 3000;
export const APP_VERSION = '4.2.1';

export const COMPROMISED_STATUSES = new Set(['LOST', 'STOLEN', 'REVOKED', 'BLOCKED']);
export const ACTIVE_PANIC_STATUSES = new Set([
  'NEW',
  'ACKNOWLEDGED',
  'CONTACTING_CLIENT',
  'DISPATCHED',
  'RESPONDING',
  'ON_SCENE',
  'ESCALATED',
]);

export const PANIC_WORKFLOW = [
  'NEW',
  'ACKNOWLEDGED',
  'CONTACTING_CLIENT',
  'DISPATCHED',
  'RESPONDING',
  'ON_SCENE',
  'RESOLVED',
] as const;

export const PANIC_TERMINAL = new Set([
  'RESOLVED',
  'FALSE_ALARM',
  'CANCELLED',
  'UNABLE_TO_CONTACT',
]);

export type ParsedUserAgent = {
  name: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  osName: string;
  osVersion: string | null;
  isBrowser: boolean;
};

export type ReadinessInput = {
  hasPrimary: boolean;
  locationConfigured: boolean;
  notificationsConfigured: boolean;
  nativeSosAvailable: boolean;
  contactsConfigured: boolean;
  panicTested: boolean;
  consentRecorded: boolean;
};

export function generateDevicePublicId(random: () => Buffer = () => randomBytes(6)): string {
  return `${DEVICE_PUBLIC_PREFIX}${random().toString('hex').toUpperCase()}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function fingerprintFromHints(parts: Array<string | null | undefined>): string {
  return createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 32);
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const value = ua ?? '';
  const android = value.match(/Android\s+([\d.]+)/i);
  const ios = value.match(/OS (\d+)[_.](\d+)/i);
  const windows = /Windows NT/i.test(value);
  const mac = /Mac OS X/i.test(value);
  const iphone = /iPhone/i.test(value);
  const ipad = /iPad/i.test(value);
  const samsung = value.match(/SM-[A-Z0-9]+|Samsung[^;)]+/i);

  if (android) {
    return {
      name: samsung ? prettySamsung(samsung[0]) : 'Android device',
      deviceType: /Mobile/i.test(value) ? 'mobile' : 'tablet',
      osName: 'Android',
      osVersion: android[1] ?? null,
      isBrowser: true,
    };
  }
  if (iphone || ipad) {
    return {
      name: ipad ? 'iPad' : 'iPhone',
      deviceType: ipad ? 'tablet' : 'mobile',
      osName: 'iOS',
      osVersion: ios ? `${ios[1]}.${ios[2]}` : null,
      isBrowser: true,
    };
  }
  if (windows) {
    return {
      name: browserName(value) + ' / Windows',
      deviceType: 'desktop',
      osName: 'Windows',
      osVersion: null,
      isBrowser: true,
    };
  }
  if (mac) {
    return {
      name: browserName(value) + ' / macOS',
      deviceType: 'desktop',
      osName: 'macOS',
      osVersion: null,
      isBrowser: true,
    };
  }
  return {
    name: value ? browserName(value) : 'Unknown device',
    deviceType: 'unknown',
    osName: 'Unknown',
    osVersion: null,
    isBrowser: Boolean(value),
  };
}

function prettySamsung(raw: string): string {
  const map: Record<string, string> = {
    'SM-S928': 'Samsung Galaxy S24 Ultra',
    'SM-S921': 'Samsung Galaxy S24',
    'SM-S918': 'Samsung Galaxy S23 Ultra',
  };
  for (const [code, name] of Object.entries(map)) {
    if (raw.toUpperCase().includes(code)) return name;
  }
  return 'Samsung Android';
}

function browserName(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  return 'Browser';
}

/** Web runtimes cannot receive native Apple/Android Emergency SOS callbacks. */
export function detectNativeSosFromUserAgent(ua: string | null | undefined): {
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'NOT_AVAILABLE' | 'PERMISSION_REQUIRED';
  note: string;
} {
  const parsed = parseUserAgent(ua);
  const platform =
    parsed.osName === 'iOS'
      ? "Apple's Emergency SOS is controlled by iOS. Some Emergency SOS actions may operate independently from this application."
      : parsed.osName === 'Android'
        ? "Your device's native Emergency SOS operates independently from this application."
        : 'Emergency SOS functionality is dependent on the device manufacturer, operating system, device model, operating-system version, permissions and regional availability. Native Emergency SOS may operate independently of this application.';
  return {
    status: 'NOT_AVAILABLE',
    note: `${platform} This web application cannot intercept protected OS-level Emergency SOS events.`,
  };
}

export function emergencyReadinessScore(input: ReadinessInput): {
  score: number;
  items: Array<{ id: string; ok: boolean; warn?: boolean; label: string; detail?: string }>;
} {
  const items = [
    { id: 'primary', ok: input.hasPrimary, label: 'Primary device registered' },
    { id: 'location', ok: input.locationConfigured, label: 'Location configured' },
    { id: 'notifications', ok: input.notificationsConfigured, label: 'Notifications configured' },
    {
      id: 'native-sos',
      ok: input.nativeSosAvailable,
      warn: !input.nativeSosAvailable,
      label: 'Native SOS',
      detail: input.nativeSosAvailable
        ? 'Supported OS integration'
        : 'Not available in this web app. App Panic still works.',
    },
    { id: 'contacts', ok: input.contactsConfigured, label: 'Emergency contacts configured' },
    { id: 'panic-test', ok: input.panicTested, label: 'Panic tested' },
    { id: 'consent', ok: input.consentRecorded, label: 'Emergency consent recorded' },
  ];
  const weighted = items.filter((i) => i.id !== 'native-sos');
  const score = Math.round((weighted.filter((i) => i.ok).length / weighted.length) * 100);
  return { score, items };
}

export function isCompromisedStatus(status: string): boolean {
  return COMPROMISED_STATUSES.has(status);
}

export function canAuthenticateFromDevice(status: string, locked: boolean, lockdownActive: boolean): boolean {
  if (lockdownActive && status !== 'TRUSTED') return false;
  if (locked) return false;
  return !isCompromisedStatus(status);
}

export function isEmergencySessionExpired(expiresAt: Date | string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function shouldReusePanic(existing: { workflowStatus: string; isTest: boolean } | null): boolean {
  if (!existing || existing.isTest) return false;
  return ACTIVE_PANIC_STATUSES.has(existing.workflowStatus);
}

export function nextPanicWorkflow(current: string, next: string): boolean {
  if (current === next) return true;
  if (PANIC_TERMINAL.has(current) && next !== 'ESCALATED') return false;
  const allowedFrom: Record<string, string[]> = {
    NEW: ['ACKNOWLEDGED', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
    ACKNOWLEDGED: ['CONTACTING_CLIENT', 'DISPATCHED', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED', 'UNABLE_TO_CONTACT'],
    CONTACTING_CLIENT: ['DISPATCHED', 'UNABLE_TO_CONTACT', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
    DISPATCHED: ['RESPONDING', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
    RESPONDING: ['ON_SCENE', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
    ON_SCENE: ['RESOLVED', 'FALSE_ALARM', 'ESCALATED'],
    ESCALATED: ['ACKNOWLEDGED', 'DISPATCHED', 'RESPONDING', 'ON_SCENE', 'RESOLVED', 'UNABLE_TO_CONTACT'],
    UNABLE_TO_CONTACT: ['CONTACTING_CLIENT', 'DISPATCHED', 'ESCALATED', 'RESOLVED', 'FALSE_ALARM'],
    CANCELLED: [],
    FALSE_ALARM: [],
    RESOLVED: [],
  };
  return (allowedFrom[current] ?? []).includes(next);
}

export type RateBucket = { count: number; resetAt: number };

export function hitRateLimit(
  buckets: Map<string, RateBucket>,
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

export function relativeTime(iso: string | Date | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const ms = now - new Date(iso).getTime();
  if (ms < 15_000) return 'Just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)} seconds ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} minutes ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} hours ago`;
  return new Date(iso).toLocaleString();
}

export function deviceStatusTone(status: string, isPrimary: boolean): {
  label: string;
  tone: 'trusted' | 'primary' | 'temporary' | 'pending' | 'danger' | 'revoked';
} {
  if (status === 'LOST' || status === 'STOLEN' || status === 'BLOCKED') {
    return { label: status === 'BLOCKED' ? 'Blocked' : status === 'STOLEN' ? 'Stolen' : 'Lost', tone: 'danger' };
  }
  if (status === 'REVOKED') return { label: 'Revoked', tone: 'revoked' };
  if (status === 'PENDING_VERIFICATION') return { label: 'Pending verification', tone: 'pending' };
  if (status === 'TEMPORARY') return { label: 'Temporary', tone: 'temporary' };
  if (isPrimary) return { label: 'Primary', tone: 'primary' };
  return { label: 'Trusted', tone: 'trusted' };
}

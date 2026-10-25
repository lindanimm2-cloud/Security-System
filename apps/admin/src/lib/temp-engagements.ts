import { provisionTempEngagementClient } from '@/lib/demo/users';
import type { AccessMap } from '@/lib/subscription-plans';

export const TEMP_ENGAGEMENT_KINDS = [
  'private-escort',
  'close-protection',
  'personal-protection',
  'armed-response',
  'fleet',
  'install',
  'other',
] as const;

export type TempEngagementKind = (typeof TEMP_ENGAGEMENT_KINDS)[number];

export type TempEngagementStatus =
  | 'PENDING_APP'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type TempEngagementAnswers = {
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  contactProtocol?: string;
  extraNotes?: string;
};

export type TempEngagement = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  kind: TempEngagementKind;
  status: TempEngagementStatus;
  panicEnabled: boolean;
  mustChangePassword: boolean;
  tempPassword?: string;
  date?: string;
  time?: string;
  endDate?: string;
  people?: string;
  pickup?: string;
  destination?: string;
  location?: string;
  message?: string;
  answers?: TempEngagementAnswers;
  createdAt: string;
  updatedAt: string;
  questionsCompletedAt?: string | null;
};

const STORE_KEY = '4ds_temp_engagements';
const WELCOME_SEEN_KEY = '4ds-portal-welcome-seen';
const QUESTIONS_SKIP_PREFIX = '4ds-job-details-done:';

const ACCESS_NONE: AccessMap = {
  home: false,
  vehicle: false,
  family: false,
  medical: false,
  personal: false,
  emergency: false,
};

/** Feature profile per temporary job kind. */
export function accessForEngagementKind(kind: TempEngagementKind): AccessMap {
  switch (kind) {
    case 'private-escort':
    case 'close-protection':
    case 'personal-protection':
      return { ...ACCESS_NONE, emergency: true };
    case 'armed-response':
      return { ...ACCESS_NONE, emergency: true, personal: true };
    case 'fleet':
      return { ...ACCESS_NONE, vehicle: true, emergency: true };
    case 'install':
      return { ...ACCESS_NONE, home: true };
    case 'other':
      return { ...ACCESS_NONE, emergency: true, personal: true };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function labelForEngagementKind(kind: TempEngagementKind): string {
  switch (kind) {
    case 'private-escort':
      return 'Private escort';
    case 'close-protection':
      return 'Close protection';
    case 'personal-protection':
      return 'Personal protection';
    case 'armed-response':
      return 'Armed response';
    case 'fleet':
      return 'Fleet recovery';
    case 'install':
      return 'Install / monitoring';
    case 'other':
      return 'Temporary engagement';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isTempEngagementKind(value: string): value is TempEngagementKind {
  return (TEMP_ENGAGEMENT_KINDS as readonly string[]).includes(value);
}

export function normalizeEngagementKind(value?: string | null): TempEngagementKind {
  if (value && isTempEngagementKind(value)) return value;
  if (value === 'escort' || value === 'protection') return 'private-escort';
  return 'other';
}

function readStore(): TempEngagement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TempEngagement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(rows: TempEngagement[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(rows.slice(0, 80)));
  } catch {
    // Ignore quota / private mode.
  }
}

function newId() {
  return `eng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTempPassword(): string {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Temp#${chunk}26`;
}

export function createTempEngagement(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  kind?: string;
  date?: string;
  time?: string;
  endDate?: string;
  people?: string;
  pickup?: string;
  destination?: string;
  location?: string;
  message?: string;
}): TempEngagement {
  const now = new Date().toISOString();
  const engagement: TempEngagement = {
    id: newId(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    company: input.company?.trim() || undefined,
    kind: normalizeEngagementKind(input.kind),
    status: 'PENDING_APP',
    panicEnabled: false,
    mustChangePassword: true,
    date: input.date,
    time: input.time,
    endDate: input.endDate,
    people: input.people,
    pickup: input.pickup,
    destination: input.destination,
    location: input.location,
    message: input.message,
    createdAt: now,
    updatedAt: now,
    questionsCompletedAt: null,
  };
  const rows = readStore().filter((row) => row.id !== engagement.id);
  rows.unshift(engagement);
  writeStore(rows);
  return engagement;
}

export function getTempEngagement(id: string): TempEngagement | null {
  return readStore().find((row) => row.id === id) ?? null;
}

export function getActiveEngagementForEmail(email: string): TempEngagement | null {
  const normalized = email.trim().toLowerCase();
  const rows = readStore().filter((row) => row.email === normalized);
  return (
    rows.find((row) => row.status === 'ACTIVE') ??
    rows.find((row) => row.status === 'PENDING_APP') ??
    null
  );
}

export function updateTempEngagement(
  id: string,
  patch: Partial<TempEngagement>,
): TempEngagement | null {
  const rows = readStore();
  const idx = rows.findIndex((row) => row.id === id);
  if (idx < 0) return null;
  const next: TempEngagement = {
    ...rows[idx],
    ...patch,
    id: rows[idx].id,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = next;
  writeStore(rows);
  return next;
}

export function listTempEngagements(): TempEngagement[] {
  return readStore();
}

export function accessForEngagement(engagement: TempEngagement | null): AccessMap | null {
  if (!engagement) return null;
  if (engagement.status === 'COMPLETED' || engagement.status === 'CANCELLED') {
    return { ...ACCESS_NONE };
  }
  const base = accessForEngagementKind(engagement.kind);
  if (!engagement.panicEnabled) {
    return { ...base, emergency: false };
  }
  return base;
}

export function hasSeenPortalWelcome(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1';
}

export function markPortalWelcomeSeen() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
}

export function shouldShowMobileWelcome(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasSeenPortalWelcome()) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  return coarse || narrow;
}

export function hasCompletedJobDetails(email: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(`${QUESTIONS_SKIP_PREFIX}${email.trim().toLowerCase()}`) === '1';
}

export function markJobDetailsDone(email: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${QUESTIONS_SKIP_PREFIX}${email.trim().toLowerCase()}`, '1');
}

export const ENGAGEMENT_FLOW_STEPS = [
  'Share pickup, destination, and preferred time',
  'Confirm route, officer count, and contact protocol',
  'Escort runs with live check-ins to control room',
  'Safe hand-off at destination and engagement close-out',
] as const;

/** Activate portal access for an engagement and return the one-time temp password. */
export function activateEngagementPortalAccess(engagementId: string): {
  engagement: TempEngagement;
  tempPassword: string;
  email: string;
} | null {
  const engagement = getTempEngagement(engagementId);
  if (!engagement) return null;

  const tempPassword = engagement.tempPassword || generateTempPassword();
  const nameParts = engagement.name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Guest';
  const lastName = nameParts.slice(1).join(' ') || 'Client';

  provisionTempEngagementClient({
    email: engagement.email,
    firstName,
    lastName,
    phone: engagement.phone,
    engagementId: engagement.id,
    tempPassword,
  });

  const next = updateTempEngagement(engagementId, {
    status: 'ACTIVE',
    tempPassword,
    mustChangePassword: true,
    // Panic stays off until the client enables temp protection or control room arms it.
    panicEnabled: false,
  });

  if (!next) return null;
  return { engagement: next, tempPassword, email: next.email };
}

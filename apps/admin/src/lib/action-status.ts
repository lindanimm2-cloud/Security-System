export type ActionKind =
  | 'sign-in'
  | 'sign-out'
  | 'session-expired'
  | 'session-check'
  | 'open-portal'
  | 'page';

export type ActionCopy = {
  label: string;
  hints: string[];
};

const STORAGE_KEY = '4ds-action-status';
export const ACTION_STATUS_EVENT = '4ds-action-status';

export const ACTION_COPY: Record<ActionKind, ActionCopy> = {
  'sign-in': {
    label: 'Signing you in…',
    hints: [
      'Verifying your credentials.',
      'Opening your portal — hang tight.',
      'System updates underway…',
    ],
  },
  'sign-out': {
    label: 'Signing you out…',
    hints: [
      'Ending this session securely.',
      'Clearing access on this device.',
      'Taking you back to sign-in.',
    ],
  },
  'session-expired': {
    label: 'Session ended…',
    hints: [
      'Your access is no longer valid.',
      'Redirecting to sign-in.',
      'Please sign in again to continue.',
    ],
  },
  'session-check': {
    label: 'Checking your session…',
    hints: [
      'Confirming you still have access.',
      'System updates underway…',
      'Loading your workspace.',
    ],
  },
  'open-portal': {
    label: 'Opening your workspace…',
    hints: [
      'Verifying live ops access.',
      'System updates underway…',
      'Syncing incidents and status.',
    ],
  },
  page: {
    label: 'Loading…',
    hints: [
      'System updates underway…',
      'Pulling live ops data…',
      'Checking connections…',
      'Syncing your workspace…',
    ],
  },
};

export const PORTAL_BOOT_COPY: Record<string, ActionCopy> = {
  admin: {
    label: 'Opening control room…',
    hints: [
      'Verifying your session and live ops access.',
      'System updates underway…',
      'Syncing incidents, map, and dispatch.',
    ],
  },
  client: {
    label: 'Opening client portal…',
    hints: [
      'Checking your protection profile.',
      'System updates underway…',
      'Pulling alerts and cover status.',
    ],
  },
  officer: {
    label: 'Opening officer app…',
    hints: [
      'Loading your assignment queue.',
      'System updates underway…',
      'Syncing shift status.',
    ],
  },
  technician: {
    label: 'Opening technician desk…',
    hints: [
      'Loading your install queue.',
      'System updates underway…',
      'Checking job assignments.',
    ],
  },
};

const KINDS = new Set<ActionKind>([
  'sign-in',
  'sign-out',
  'session-expired',
  'session-check',
  'open-portal',
  'page',
]);

export function setActionKind(kind: ActionKind | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!kind) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, kind);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(ACTION_STATUS_EVENT));
}

export function getActionKind(): ActionKind | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw && KINDS.has(raw as ActionKind)) return raw as ActionKind;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearActionKind() {
  setActionKind(null);
}

export function actionCopy(kind: ActionKind | null | undefined): ActionCopy {
  return ACTION_COPY[kind ?? 'page'];
}

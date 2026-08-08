export type ErrorTone = 'load' | 'save' | 'action' | 'login' | 'call' | 'upload';

const DEFAULTS: Record<ErrorTone, string> = {
  load: "Couldn't load. Try again.",
  save: "Couldn't save. Try again.",
  action: 'Try again.',
  login: 'Try again or contact support.',
  call: 'Try again.',
  upload: 'Try again.',
};

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === 'failed to fetch' ||
    normalized === 'network error' ||
    normalized === 'network request failed' ||
    normalized === 'load failed' ||
    normalized === 'request failed' ||
    normalized === 'login failed' ||
    normalized === 'fetch error' ||
    normalized.startsWith('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('failed to fetch')
  );
}

export const SIGN_IN_REQUIRED_MESSAGE = 'Please sign in again.';

export function isSignInRequiredMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.trim().toLowerCase();
  return (
    normalized === SIGN_IN_REQUIRED_MESSAGE.toLowerCase() ||
    normalized === 'session expired' ||
    normalized === 'not authenticated'
  );
}

export function friendlyErrorMessage(err: unknown, tone: ErrorTone = 'action'): string {
  if (!(err instanceof Error)) return DEFAULTS[tone];

  const message = err.message.trim();
  if (!message) return DEFAULTS[tone];

  if (message === 'Session expired' || message === 'Not authenticated') {
    return SIGN_IN_REQUIRED_MESSAGE;
  }

  if (isTechnicalMessage(message)) {
    if (tone === 'login') {
      return "Can't reach the API. Start Docker Desktop, then run npm run db:up and npm run dev:api (port 4010).";
    }
    return DEFAULTS[tone];
  }

  return message;
}

/**
 * Browser WebAuthn / passkey helpers.
 * Platform authenticators (Face ID, Touch ID, Android biometrics, Windows Hello) count as biometrics.
 */

export type PasskeyPortal = 'client' | 'admin' | 'officer' | 'technician';

export type StoredPasskey = {
  id: string;
  credentialId: string;
  portal: PasskeyPortal;
  tenantSlug: string;
  email: string;
  userId: string;
  displayName: string;
  createdAt: string;
  lastUsedAt?: string;
  transports?: AuthenticatorTransport[];
};

const STORE_KEY = '4ds-passkeys-v1';

function b64urlFromBuffer(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bufferFromB64url(value: string): ArrayBuffer {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const b64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

function randomChallenge(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function readStore(): StoredPasskey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPasskey[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(rows: StoredPasskey[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function ua(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

/** True for phones / tablets where Face ID / fingerprint is the main path. */
export function isMobilePasskeyDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const agent = ua();
  if (/iPhone|iPod|iPad|Android.*Mobile|Mobile.*Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(agent)) {
    return true;
  }
  return Boolean(navigator.maxTouchPoints > 1 && /Macintosh/i.test(agent));
}

export type MobileBiometricKind = 'face-id' | 'touch-id' | 'fingerprint' | 'passkey';

export function detectMobileBiometricKind(): MobileBiometricKind {
  const agent = ua();
  if (/iPhone|iPad|iPod/i.test(agent)) {
    // Modern iPhones are Face ID; older / some iPads use Touch ID — label covers both.
    return /iPhone/i.test(agent) ? 'face-id' : 'touch-id';
  }
  if (/Android/i.test(agent)) return 'fingerprint';
  if (isMobilePasskeyDevice()) return 'fingerprint';
  return 'passkey';
}

export function mobileBiometricLabel(): string {
  const kind = detectMobileBiometricKind();
  if (kind === 'face-id') return 'Face ID';
  if (kind === 'touch-id') return 'Touch ID';
  if (kind === 'fingerprint') return 'fingerprint / face unlock';
  return 'passkey / biometrics';
}

export function mobileBiometricHint(): string {
  const kind = detectMobileBiometricKind();
  if (kind === 'face-id') {
    return 'Uses Face ID (or Touch ID) on this iPhone / iPad.';
  }
  if (kind === 'touch-id') {
    return 'Uses Touch ID or Face ID on this Apple device.';
  }
  if (kind === 'fingerprint') {
    return 'Uses fingerprint, face unlock, or screen lock on this Android phone.';
  }
  return 'Uses Windows Hello, Face ID, Touch ID, fingerprint, or a security key on this device.';
}

export function loginPasskeyButtonLabel(): string {
  if (!isMobilePasskeyDevice()) return 'Sign in with passkey / biometrics';
  const kind = detectMobileBiometricKind();
  if (kind === 'face-id') return 'Sign in with Face ID';
  if (kind === 'touch-id') return 'Sign in with Touch ID';
  return 'Sign in with fingerprint';
}

export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.isSecureContext &&
      window.PublicKeyCredential &&
      navigator.credentials?.create &&
      navigator.credentials?.get,
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    /* ignore */
  }
  // Mobile Safari / Chrome often support biometrics even when the probe is flaky.
  return isMobilePasskeyDevice();
}

export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function listStoredPasskeys(portal?: PasskeyPortal, tenantSlug?: string): StoredPasskey[] {
  return readStore().filter((row) => {
    if (portal && row.portal !== portal) return false;
    if (tenantSlug && row.tenantSlug !== tenantSlug) return false;
    return true;
  });
}

export function removeStoredPasskey(credentialId: string) {
  writeStore(readStore().filter((row) => row.credentialId !== credentialId));
}

/** Platform authenticator options tuned for phone Face ID / fingerprint. */
function platformAuthenticatorSelection(): AuthenticatorSelectionCriteria {
  return {
    authenticatorAttachment: 'platform',
    // Discoverable so iOS/Android can offer the passkey without an allow-list.
    residentKey: 'required',
    requireResidentKey: true,
    userVerification: 'required',
  };
}

export async function registerPasskeyLocal(input: {
  portal: PasskeyPortal;
  tenantSlug: string;
  email: string;
  userId: string;
  displayName: string;
}): Promise<StoredPasskey> {
  if (!isPasskeySupported()) {
    throw new Error(
      'Passkeys need a secure browser (Safari on iPhone, Chrome on Android) with Face ID / fingerprint enabled.',
    );
  }

  const userIdBytes = new TextEncoder().encode(input.userId);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: {
        name: '4DS Nexus',
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: `${input.email}|${input.portal}|${input.tenantSlug}`,
        displayName: input.displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      timeout: 120_000,
      attestation: 'none',
      authenticatorSelection: platformAuthenticatorSelection(),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('Passkey registration was cancelled.');

  const response = credential.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === 'function'
      ? (response.getTransports() as AuthenticatorTransport[])
      : (['internal'] as AuthenticatorTransport[]);

  const row: StoredPasskey = {
    id: crypto.randomUUID(),
    credentialId: b64urlFromBuffer(credential.rawId),
    portal: input.portal,
    tenantSlug: input.tenantSlug,
    email: input.email.toLowerCase(),
    userId: input.userId,
    displayName: input.displayName,
    createdAt: new Date().toISOString(),
    transports: transports.length ? transports : (['internal'] as AuthenticatorTransport[]),
  };

  const next = readStore().filter((existing) => existing.credentialId !== row.credentialId);
  next.push(row);
  writeStore(next);
  return row;
}

export type PasskeyAssertionResult = {
  credentialId: string;
  passkey: StoredPasskey;
};

export async function assertPasskeyLocal(input: {
  portal: PasskeyPortal;
  tenantSlug: string;
  emailHint?: string;
  /** Autofill / conditional UI for mobile browsers (non-blocking). */
  mediation?: CredentialMediationRequirement;
}): Promise<PasskeyAssertionResult> {
  if (!isPasskeySupported()) {
    throw new Error(
      'Passkeys need a secure browser (Safari on iPhone, Chrome on Android) with Face ID / fingerprint enabled.',
    );
  }

  const known = listStoredPasskeys(input.portal, input.tenantSlug).filter((row) =>
    input.emailHint ? row.email === input.emailHint.toLowerCase() : true,
  );

  if (known.length === 0 && input.mediation !== 'conditional') {
    throw new Error(
      'No passkey is registered on this phone. Sign in with password, open Profile, then add Face ID / fingerprint.',
    );
  }

  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined =
    known.length > 0
      ? known.map((row) => ({
          type: 'public-key' as const,
          id: bufferFromB64url(row.credentialId),
          transports: (row.transports?.length
            ? row.transports
            : (['internal'] as AuthenticatorTransport[])),
        }))
      : undefined;

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      timeout: 120_000,
      userVerification: 'required',
      ...(allowCredentials ? { allowCredentials } : {}),
    },
    mediation: input.mediation,
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error('Passkey sign-in was cancelled.');

  const credentialId = b64urlFromBuffer(assertion.rawId);
  const fromKnown = known.find((row) => row.credentialId === credentialId);
  const fromStore = fromKnown ?? listStoredPasskeys(input.portal, input.tenantSlug).find(
    (row) => row.credentialId === credentialId,
  );
  if (!fromStore) {
    throw new Error('This passkey is not linked to a 4DS account on this phone.');
  }

  const updated = readStore().map((row) =>
    row.credentialId === credentialId
      ? { ...row, lastUsedAt: new Date().toISOString() }
      : row,
  );
  writeStore(updated);

  return { credentialId, passkey: fromStore };
}

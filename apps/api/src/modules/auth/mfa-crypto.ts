import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGO = 'aes-256-gcm';

function keyFromEnv(raw: string | undefined, allowDevFallback: boolean): Buffer {
  const value = (raw ?? '').trim();
  if (!value) {
    if (!allowDevFallback) {
      throw new Error('MFA_ENCRYPTION_KEY is required');
    }
    return createHash('sha256').update('4ds-dev-mfa-key').digest();
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }
  return createHash('sha256').update(value).digest();
}

export function encryptSecret(plain: string, envKey: string | undefined, nodeEnv: string) {
  const key = keyFromEnv(envKey, nodeEnv !== 'production');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(payload: string, envKey: string | undefined, nodeEnv: string) {
  const key = keyFromEnv(envKey, nodeEnv !== 'production');
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid MFA secret payload');
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function assertProductionSecrets(opts: {
  nodeEnv: string | undefined;
  jwtSecret: string | undefined;
  mfaKey: string | undefined;
}) {
  if (opts.nodeEnv !== 'production') return;
  const jwt = (opts.jwtSecret ?? '').trim();
  if (!jwt || jwt === 'dev-secret' || jwt === 'change-me-in-production') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  const mfa = (opts.mfaKey ?? '').trim();
  if (!mfa || mfa === 'dev-secret' || mfa === 'change-me-mfa-key-in-production') {
    throw new Error('MFA_ENCRYPTION_KEY must be set in production');
  }
}

import { randomBytes } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function verifyTotp(
  secretBase32: string,
  token: string,
  opts?: { windowSeconds?: number },
): boolean {
  const expected = (token ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(expected)) return false;
  try {
    const result = verifySync({
      secret: secretBase32,
      token: expected,
      // ±30s ≈ one TOTP step (RFC 6238 transmission-delay window)
      epochTolerance: opts?.windowSeconds ?? 30,
    });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}

export function otpauthUri(opts: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = opts.issuer ?? '4DS Nexus';
  return generateURI({
    issuer,
    label: opts.accountName,
    secret: opts.secret,
  });
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

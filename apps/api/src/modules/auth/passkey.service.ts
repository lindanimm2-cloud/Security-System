import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_PORTAL_ROLES } from '../../common/developer-access';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';

/** Local alias — @simplewebauthn/server v14 does not re-export AuthenticatorTransportFuture. */
type AuthenticatorTransportFuture =
  | 'usb'
  | 'ble'
  | 'nfc'
  | 'internal'
  | 'cable'
  | 'hybrid'
  | 'smart-card';

type PasskeyPortal = 'client' | 'admin' | 'officer' | 'technician';

type ChallengeRecord = {
  challenge: string;
  userId?: string;
  tenantId?: string;
  portal: PasskeyPortal;
  type: 'registration' | 'authentication';
  expiresAt: number;
};

const CLIENT_ROLES: UserRole[] = [UserRole.USER, UserRole.FAMILY_MEMBER];
const OFFICER_ROLES: UserRole[] = [UserRole.OFFICER];
const TECHNICIAN_ROLES: UserRole[] = [UserRole.TECHNICIAN];

@Injectable()
export class PasskeyService {
  private readonly challenges = new Map<string, ChallengeRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  private rpID() {
    return this.config.get<string>('WEBAUTHN_RP_ID') ?? 'localhost';
  }

  private rpName() {
    return this.config.get<string>('WEBAUTHN_RP_NAME') ?? '4DS Nexus';
  }

  private origins(): string[] {
    const raw =
      this.config.get<string>('WEBAUTHN_ORIGIN') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:3010';
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private rolesForPortal(portal: PasskeyPortal): UserRole[] {
    if (portal === 'client') return CLIENT_ROLES;
    if (portal === 'officer') return OFFICER_ROLES;
    if (portal === 'technician') return TECHNICIAN_ROLES;
    return ADMIN_PORTAL_ROLES;
  }

  private pruneChallenges() {
    const now = Date.now();
    for (const [id, row] of this.challenges) {
      if (row.expiresAt <= now) this.challenges.delete(id);
    }
  }

  private putChallenge(record: Omit<ChallengeRecord, 'expiresAt'>) {
    this.pruneChallenges();
    const id = randomUUID();
    this.challenges.set(id, {
      ...record,
      expiresAt: Date.now() + 5 * 60_000,
    });
    return id;
  }

  private takeChallenge(id: string, type: ChallengeRecord['type']) {
    this.pruneChallenges();
    const row = this.challenges.get(id);
    if (!row || row.type !== type) {
      throw new BadRequestException('Passkey challenge expired. Try again.');
    }
    this.challenges.delete(id);
    return row;
  }

  async registrationOptions(userId: string, portal: PasskeyPortal) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Not authenticated');
    }
    if (!this.rolesForPortal(portal).includes(user.role)) {
      throw new ForbiddenException('Passkeys are not enabled for this portal role');
    }

    const existing = await this.prisma.webAuthnCredential.findMany({
      where: { userId: user.id },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName(),
      rpID: this.rpID(),
      userName: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((cred) => ({
        id: cred.credentialId,
        transports: (Array.isArray(cred.transports)
          ? cred.transports
          : []) as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        // Face ID / Touch ID / Android biometrics on phones.
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
    });

    const challengeId = this.putChallenge({
      challenge: options.challenge,
      userId: user.id,
      tenantId: user.tenantId,
      portal,
      type: 'registration',
    });

    return {
      success: true,
      data: { challengeId, options },
    };
  }

  async registrationVerify(
    userId: string,
    body: {
      challengeId: string;
      credential: unknown;
      portal: PasskeyPortal;
      label?: string;
    },
  ) {
    const challenge = this.takeChallenge(body.challengeId, 'registration');
    if (challenge.userId !== userId) {
      throw new UnauthorizedException('Passkey challenge mismatch');
    }

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body.credential as never,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origins(),
        expectedRPID: this.rpID(),
        requireUserVerification: true,
      });
    } catch {
      throw new BadRequestException('Passkey registration could not be verified');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration failed');
    }

    const info = verification.registrationInfo;
    const credentialID =
      typeof info.credential.id === 'string'
        ? info.credential.id
        : Buffer.from(info.credential.id).toString('base64url');
    const publicKey = Buffer.from(info.credential.publicKey);

    const created = await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        tenantId: challenge.tenantId!,
        credentialId: credentialID,
        publicKey,
        counter: BigInt(info.credential.counter ?? 0),
        deviceType: info.credentialDeviceType,
        backedUp: Boolean(info.credentialBackedUp),
        transports: info.credential.transports ?? [],
        label: body.label?.trim() || 'Passkey',
      },
    });

    await this.audit.write({
      tenantId: challenge.tenantId!,
      action: 'AUTH_PASSKEY_REGISTERED',
      result: 'SUCCESS',
      actorUserId: userId,
      accountUserId: userId,
      source: body.portal,
    });

    return {
      success: true,
      data: {
        id: created.id,
        createdAt: created.createdAt.toISOString(),
        label: created.label,
      },
    };
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        label: row.label ?? 'Passkey',
        createdAt: row.createdAt.toISOString(),
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
        backedUp: row.backedUp,
        deviceType: row.deviceType,
      })),
    };
  }

  async remove(userId: string, credentialRowId: string) {
    const row = await this.prisma.webAuthnCredential.findFirst({
      where: { id: credentialRowId, userId },
    });
    if (!row) throw new BadRequestException('Passkey not found');
    await this.prisma.webAuthnCredential.delete({ where: { id: row.id } });
    return { success: true, data: { id: row.id } };
  }

  async loginOptions(body: {
    portal: PasskeyPortal;
    tenantSlug: string;
    email?: string;
  }) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: body.tenantSlug, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException('Invalid credentials');

    const roles = this.rolesForPortal(body.portal);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        status: UserStatus.ACTIVE,
        role: { in: roles },
        ...(body.email
          ? { email: body.email.trim().toLowerCase() }
          : {}),
        webAuthnCredentials: { some: {} },
      },
      include: { webAuthnCredentials: true },
    });

    const allowCredentials = users.flatMap((user) =>
      user.webAuthnCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: (Array.isArray(cred.transports) && cred.transports.length
          ? cred.transports
          : ['internal', 'hybrid']) as AuthenticatorTransportFuture[],
      })),
    );

    // Discoverable (resident) credentials let iOS/Android show Face ID without an allow-list.
    // When email is known, still pass allowCredentials for faster matching on phones.
    const useDiscoverable = !body.email?.trim();

    if (!useDiscoverable && allowCredentials.length === 0) {
      throw new BadRequestException(
        'No passkey is registered for this organisation and portal. Sign in with password on this phone, open Profile, then add Face ID / fingerprint.',
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID(),
      ...(useDiscoverable || allowCredentials.length === 0
        ? {}
        : { allowCredentials }),
      userVerification: 'required',
      timeout: 120_000,
    });

    const challengeId = this.putChallenge({
      challenge: options.challenge,
      tenantId: tenant.id,
      portal: body.portal,
      type: 'authentication',
    });

    return {
      success: true,
      data: { challengeId, options },
    };
  }

  async loginVerify(
    body: {
      portal: PasskeyPortal;
      tenantSlug: string;
      challengeId: string;
      credential: { id?: string; rawId?: string; response?: unknown; type?: string };
    },
    ipAddress?: string | null,
  ) {
    const challenge = this.takeChallenge(body.challengeId, 'authentication');
    if (challenge.portal !== body.portal) {
      throw new BadRequestException('Passkey challenge mismatch');
    }

    const credentialId =
      body.credential.id ||
      (typeof body.credential.rawId === 'string' ? body.credential.rawId : null);
    if (!credentialId) throw new BadRequestException('Missing passkey credential');

    const stored = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      include: { user: { include: { tenant: true } } },
    });
    if (!stored || stored.tenantId !== challenge.tenantId) {
      throw new UnauthorizedException('Unknown passkey');
    }
    if (!this.rolesForPortal(body.portal).includes(stored.user.role)) {
      throw new ForbiddenException('Access denied for this portal');
    }
    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.credential as never,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origins(),
        expectedRPID: this.rpID(),
        requireUserVerification: true,
        credential: {
          id: stored.credentialId,
          publicKey: stored.publicKey,
          counter: Number(stored.counter),
          transports: (Array.isArray(stored.transports)
            ? stored.transports
            : []) as AuthenticatorTransportFuture[],
        },
      });
    } catch {
      throw new UnauthorizedException('Passkey verification failed');
    }

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey verification failed');
    }

    await this.prisma.webAuthnCredential.update({
      where: { id: stored.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Reuse password-login session issuance / MFA gates via a trusted internal path.
    return this.auth.completePasskeyLogin(stored.user, {
      ipAddress,
      portal: body.portal,
    });
  }
}

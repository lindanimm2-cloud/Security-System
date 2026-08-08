import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationType, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyService } from '../client/loyalty.service';
import {
  ClientOAuthDto,
  ClientRegisterCompleteDto,
  ClientRegisterDto,
  EmergencyContactDto,
  MedicalProfileDto,
} from './dto/client-register.dto';
import { LoginDto } from './dto/login.dto';
import { ADMIN_PORTAL_ROLES } from '../../common/developer-access';

const ADMIN_ROLES: UserRole[] = ADMIN_PORTAL_ROLES;

const CLIENT_ROLES: UserRole[] = [UserRole.USER, UserRole.FAMILY_MEMBER];
const OFFICER_ROLES: UserRole[] = [UserRole.OFFICER];
const TECHNICIAN_ROLES: UserRole[] = [UserRole.TECHNICIAN];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async login(dto: LoginDto, allowedRoles?: UserRole[]) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() },
      },
      include: { tenant: true },
    });

    if (!user?.passwordHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.inviteToken) {
      throw new UnauthorizedException(
        'Please complete registration using your invite link before signing in',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied for this portal');
    }

    const tokens = await this.issueTokens(user.id, user.tenantId, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
        },
        tokens,
      },
    };
  }

  loginClient(dto: LoginDto) {
    return this.login(dto, CLIENT_ROLES);
  }

  loginAdmin(dto: LoginDto) {
    return this.login(dto, ADMIN_ROLES);
  }

  loginOfficer(dto: LoginDto) {
    return this.login(dto, OFFICER_ROLES);
  }

  loginTechnician(dto: LoginDto) {
    return this.login(dto, TECHNICIAN_ROLES);
  }

  async getClientInvitePreview(token: string) {
    const normalized = this.normalizeInviteToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { inviteToken: normalized },
          { inviteToken: token.trim() },
          { inviteToken: token.trim().toLowerCase() },
        ],
      },
      include: {
        tenant: { select: { name: true, slug: true, isActive: true } },
      },
    });

    if (!user || !user.tenant?.isActive) {
      throw new NotFoundException('Invite not found');
    }

    if (user.registrationCompletedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This invite has expired');
    }

    const eligible =
      user.status === UserStatus.PENDING_VERIFICATION ||
      user.status === UserStatus.ACTIVE;

    if (!eligible) {
      throw new BadRequestException('This invite is no longer valid');
    }

    return {
      success: true,
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenant: { name: user.tenant.name, slug: user.tenant.slug },
        expiresAt: user.inviteExpiresAt,
        status: user.status,
        inviteToken: user.inviteToken,
      },
    };
  }

  async registerClient(dto: ClientRegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms to register');
    }

    // Panic / premium protection accounts must be invited from control room.
    if ((dto.accountKind ?? 'store') === 'protection') {
      throw new BadRequestException(
        'Protection (panic app) accounts require an invite code from 4DS. Ask your advisor for a code, or create a store account on the website.',
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug.trim().toLowerCase(), isActive: true },
    });
    if (!tenant) {
      throw new BadRequestException('Organization not found');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone.trim(),
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isProtectionClient: false,
          registrationCompletedAt: now,
        },
        include: { tenant: true },
      });
    });

    try {
      await this.loyalty.ensureLoyalty(user.id, tenant.id);
    } catch {
      /* loyalty is optional at registration */
    }

    await this.notifyNewClientRegistration(
      tenant.id,
      `${user.firstName} ${user.lastName} (store)`,
    );

    const tokens = await this.issueTokens(user.id, user.tenantId, user.role);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
        },
        tokens,
      },
    };
  }

  /**
   * Demo OAuth for Google / Apple — trusts the supplied email and issues a session.
   * Replace with real IdP token verification before production.
   */
  async oauthClient(dto: ClientOAuthDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms to continue');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug.trim().toLowerCase(), isActive: true },
    });
    if (!tenant) {
      throw new BadRequestException('Organization not found');
    }

    const email = dto.email.toLowerCase().trim();
    const wantsProtection = (dto.accountKind ?? 'store') === 'protection';
    const providerLabel = dto.provider === 'google' ? 'Google' : 'Apple';

    let user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      include: { tenant: true },
    });

    if (!user) {
      if (wantsProtection) {
        throw new BadRequestException(
          'Panic app / premium protection access requires an invite code from 4DS first. Ask your advisor, then complete registration.',
        );
      }

      const localPart = email.split('@')[0] || 'member';
      const [guessFirst, ...rest] = localPart.split(/[._-]+/);
      const firstName = (dto.firstName?.trim() || guessFirst || providerLabel).slice(0, 40);
      const lastName = (
        dto.lastName?.trim() ||
        rest.join(' ') ||
        'User'
      ).slice(0, 40);
      const passwordHash = await bcrypt.hash(
        `oauth-${dto.provider}-${randomUUID()}`,
        10,
      );
      const now = new Date();

      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          phone: dto.phone?.trim() || null,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isProtectionClient: false,
          registrationCompletedAt: now,
        },
        include: { tenant: true },
      });

      try {
        await this.loyalty.ensureLoyalty(user.id, tenant.id);
      } catch {
        /* optional */
      }

      await this.notifyNewClientRegistration(
        tenant.id,
        `${user.firstName} ${user.lastName} via ${providerLabel} (store)`,
      );
    } else if (user.inviteToken || !user.registrationCompletedAt) {
      throw new BadRequestException(
        'Complete your invite registration for the panic app before signing in with Google or Apple.',
      );
    } else if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('This account cannot sign in');
    }

    const tokens = await this.issueTokens(user.id, user.tenantId, user.role);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
        },
        tokens,
        provider: dto.provider,
      },
    };
  }

  async completeClientRegistration(dto: ClientRegisterCompleteDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms to register');
    }

    const normalized = this.normalizeInviteToken(dto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { inviteToken: normalized },
          { inviteToken: dto.token.trim() },
          { inviteToken: dto.token.trim().toLowerCase() },
        ],
      },
      include: { tenant: true, subscription: true },
    });

    if (!user || !user.tenant?.isActive) {
      throw new NotFoundException('Invite not found');
    }

    if (user.registrationCompletedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This invite has expired');
    }

    const eligible =
      user.status === UserStatus.PENDING_VERIFICATION ||
      (user.status === UserStatus.ACTIVE && !user.registrationCompletedAt);

    if (!eligible) {
      throw new BadRequestException('This invite is no longer valid');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          phone: dto.phone?.trim() || user.phone,
          firstName: dto.firstName?.trim() || user.firstName,
          lastName: dto.lastName?.trim() || user.lastName,
          status: UserStatus.ACTIVE,
          isProtectionClient: true,
          registrationCompletedAt: now,
          inviteToken: null,
          inviteExpiresAt: null,
        },
        include: { tenant: true },
      });

      if (!user.subscription) {
        await this.provisionEssentialSubscription(tx, user.tenantId, user.id);
      }

      await this.applyEmergencyAndMedical(
        tx,
        user.tenantId,
        user.id,
        dto.emergencyContact,
        dto.medical,
      );

      return next;
    });

    try {
      await this.loyalty.ensureLoyalty(updated.id, updated.tenantId);
    } catch {
      /* loyalty is optional at registration */
    }

    const tokens = await this.issueTokens(updated.id, updated.tenantId, updated.role);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(updated),
        tenant: {
          id: updated.tenant.id,
          name: updated.tenant.name,
          slug: updated.tenant.slug,
          primaryColor: updated.tenant.primaryColor,
        },
        tokens,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, primaryColor: true },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return { success: true, data: this.sanitizeUser(user) };
  }

  private normalizeInviteToken(token: string): string {
    const trimmed = token.trim();
    if (/^nx-/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return trimmed;
  }

  private async provisionEssentialSubscription(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ) {
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1);
    await tx.subscription.create({
      data: {
        tenantId,
        userId,
        planName: '4DS Essential',
        tierCode: 'ESSENTIAL',
        addons: [],
        priceMonthly: 19900,
        memberId: `4DS-${Date.now().toString(36).toUpperCase()}`,
        validUntil,
        status: 'ACTIVE',
      },
    });
  }

  private async applyEmergencyAndMedical(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    emergencyContact?: EmergencyContactDto,
    medical?: MedicalProfileDto,
  ) {
    if (emergencyContact) {
      await tx.emergencyContact.create({
        data: {
          tenantId,
          userId,
          name: emergencyContact.name.trim(),
          phone: emergencyContact.phone.trim(),
          relationship: emergencyContact.relationship.trim(),
          priority: 1,
          notifyOnPanic: true,
        },
      });
    }

    if (medical) {
      const data = {
        bloodType: medical.bloodType?.trim() || null,
        allergies: medical.allergies?.trim() || null,
        medications: medical.medications?.trim() || null,
        emergencyNotes: medical.emergencyNotes?.trim() || null,
      };
      const hasAny = Object.values(data).some(Boolean);
      if (hasAny) {
        await tx.medicalProfile.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      }
    }
  }

  private async notifyNewClientRegistration(tenantId: string, clientName: string) {
    const stakeholders = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        role: { in: [UserRole.OWNER, UserRole.SALES] },
      },
      select: { id: true },
    });

    if (stakeholders.length === 0) return;

    await this.prisma.notification.createMany({
      data: stakeholders.map((u) => ({
        tenantId,
        userId: u.id,
        type: NotificationType.SYSTEM,
        title: `New client registered: ${clientName}`,
        body: `${clientName} completed protection portal registration.`,
      })),
    });
  }

  private async issueTokens(userId: string, tenantId: string, role: UserRole) {
    const payload = { sub: userId, tenantId, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        tenantId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    tenantId: string;
    jobTitle?: string | null;
    phone?: string | null;
    tenant?: { id: string; name: string; slug: string; primaryColor: string | null };
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      jobTitle: user.jobTitle ?? null,
      phone: user.phone ?? null,
      tenant: user.tenant,
    };
  }
}

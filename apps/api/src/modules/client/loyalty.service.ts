import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  LOYALTY_TIERS,
  applyDiscount,
  effectiveDiscountPercent,
  nextTierProgress,
  pointsForSpend,
  tierFromPoints,
  type LoyaltyTierCode,
} from './loyalty.catalog';
import { formatZar } from './plans.catalog';

type QuoteAppliesTo = 'SUBSCRIPTION' | 'STORE' | 'BOTH';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureLoyalty(userId: string, tenantId: string) {
    let row = await this.prisma.clientLoyalty.findUnique({ where: { userId } });
    if (!row) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.tenantId !== tenantId) {
        throw new NotFoundException('User not found');
      }
      row = await this.prisma.clientLoyalty.create({
        data: {
          tenantId,
          userId,
          points: 0,
          lifetimePoints: 0,
          lifetimeSpendCents: 0,
          tier: 'BRONZE',
        },
      });
    }
    return row;
  }

  async getLoyalty(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const row = await this.ensureLoyalty(userId, user.tenantId);
    return {
      success: true,
      data: await this.toSummary(row),
    };
  }

  async applyPromo(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new BadRequestException('Promo code is required');

    const discount = await this.findValidPromo(user.tenantId, normalized, 'BOTH');
    const row = await this.ensureLoyalty(userId, user.tenantId);
    const updated = await this.prisma.clientLoyalty.update({
      where: { id: row.id },
      data: { activePromoCode: discount.code },
    });

    return {
      success: true,
      data: await this.toSummary(updated),
      message: `Promo ${discount.code} applied — ${discount.percentOff}% off where eligible.`,
    };
  }

  async clearPromo(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const row = await this.ensureLoyalty(userId, user.tenantId);
    const updated = await this.prisma.clientLoyalty.update({
      where: { id: row.id },
      data: { activePromoCode: null },
    });

    return {
      success: true,
      data: await this.toSummary(updated),
      message: 'Promo code cleared.',
    };
  }

  async updateLoyaltyAdmin(
    tenantId: string,
    userId: string,
    body: {
      manualDiscountPercent?: number;
      notes?: string | null;
      adjustPoints?: number;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] } },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const row = await this.ensureLoyalty(userId, tenantId);
    let points = row.points;
    let lifetimePoints = row.lifetimePoints;

    if (body.adjustPoints != null && body.adjustPoints !== 0) {
      const delta = Math.trunc(body.adjustPoints);
      points = Math.max(0, points + delta);
      if (delta > 0) lifetimePoints += delta;
    }

    let manual = row.manualDiscountPercent;
    if (body.manualDiscountPercent != null) {
      manual = Math.min(30, Math.max(0, Math.trunc(body.manualDiscountPercent)));
    }

    const tier = tierFromPoints(points);
    const updated = await this.prisma.clientLoyalty.update({
      where: { id: row.id },
      data: {
        points,
        lifetimePoints,
        tier,
        manualDiscountPercent: manual,
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });

    return {
      success: true,
      data: await this.toSummary(updated),
    };
  }

  async awardSpend(
    userId: string,
    tenantId: string,
    amountCents: number,
    reason?: string,
  ) {
    if (amountCents <= 0) {
      const row = await this.ensureLoyalty(userId, tenantId);
      return this.toSummary(row);
    }

    const row = await this.ensureLoyalty(userId, tenantId);
    const earned = pointsForSpend(amountCents);
    const previousTier = row.tier as LoyaltyTierCode;
    const points = row.points + earned;
    const tier = tierFromPoints(points);

    const updated = await this.prisma.clientLoyalty.update({
      where: { id: row.id },
      data: {
        points,
        lifetimePoints: row.lifetimePoints + earned,
        lifetimeSpendCents: row.lifetimeSpendCents + amountCents,
        tier,
      },
    });

    if (tier !== previousTier) {
      const tierDef = LOYALTY_TIERS[tier];
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: NotificationType.SYSTEM,
          title: `Loyalty upgraded — ${tierDef.name}`,
          body: `You've reached ${tierDef.name} (${tierDef.discountPercent}% off). ${reason ? `From: ${reason}. ` : ''}${tierDef.benefits}`,
        },
      });
    }

    return this.toSummary(updated);
  }

  async quoteSubscriptionPrice(userId: string, baseCents: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const row = await this.ensureLoyalty(userId, user.tenantId);
    const promoPercent = await this.resolvePromoPercent(
      user.tenantId,
      row.activePromoCode,
      'SUBSCRIPTION',
    );
    const tierPercent = LOYALTY_TIERS[tierFromPoints(row.points)].discountPercent;
    const percent = effectiveDiscountPercent(
      tierPercent,
      row.manualDiscountPercent,
      promoPercent,
    );
    const quote = applyDiscount(baseCents, percent);

    return {
      ...quote,
      originalFormatted: formatZar(quote.original),
      discountFormatted: formatZar(quote.discountCents),
      finalFormatted: formatZar(quote.finalCents),
      activePromoCode: row.activePromoCode,
      loyalty: await this.toSummary(row),
    };
  }

  async quoteStoreTotal(
    userId: string,
    subtotalCents: number,
    promoCode?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const row = await this.ensureLoyalty(userId, user.tenantId);
    const codeToUse = (promoCode?.trim() || row.activePromoCode || '').toUpperCase() || null;
    const promoPercent = await this.resolvePromoPercent(
      user.tenantId,
      codeToUse,
      'STORE',
    );
    const tierPercent = LOYALTY_TIERS[tierFromPoints(row.points)].discountPercent;
    const percent = effectiveDiscountPercent(
      tierPercent,
      row.manualDiscountPercent,
      promoPercent,
    );
    const quote = applyDiscount(subtotalCents, percent);

    return {
      ...quote,
      originalFormatted: formatZar(quote.original),
      discountFormatted: formatZar(quote.discountCents),
      finalFormatted: formatZar(quote.finalCents),
      discountCode: promoPercent > 0 ? codeToUse : null,
      loyaltyPointsEarned: pointsForSpend(quote.finalCents),
      loyalty: await this.toSummary(row),
    };
  }

  async listDiscountCodes(tenantId: string) {
    const codes = await this.prisma.discountCode.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
    return {
      success: true,
      data: codes.map((c) => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async upsertDiscountCode(
    tenantId: string,
    body: {
      id?: string;
      code: string;
      percentOff: number;
      appliesTo?: QuoteAppliesTo;
      maxUses?: number | null;
      isActive?: boolean;
      expiresAt?: string | null;
      description?: string | null;
    },
  ) {
    const code = body.code.trim().toUpperCase();
    if (!code) throw new BadRequestException('Code is required');
    const percentOff = Math.min(30, Math.max(1, Math.trunc(body.percentOff)));
    const appliesTo = body.appliesTo ?? 'BOTH';
    if (!['SUBSCRIPTION', 'STORE', 'BOTH'].includes(appliesTo)) {
      throw new BadRequestException('appliesTo must be SUBSCRIPTION, STORE, or BOTH');
    }

    const payload = {
      code,
      percentOff,
      appliesTo,
      maxUses: body.maxUses ?? null,
      isActive: body.isActive ?? true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      description: body.description?.trim() || null,
    };

    const row = body.id
      ? await this.prisma.discountCode.update({
          where: { id: body.id },
          data: payload,
        })
      : await this.prisma.discountCode.upsert({
          where: { tenantId_code: { tenantId, code } },
          update: payload,
          create: { tenantId, ...payload },
        });

    return {
      success: true,
      data: {
        ...row,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  }

  async incrementPromoUse(tenantId: string, code: string | null | undefined) {
    if (!code) return;
    const row = await this.prisma.discountCode.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    if (!row) return;
    await this.prisma.discountCode.update({
      where: { id: row.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  private async findValidPromo(
    tenantId: string,
    code: string,
    appliesTo: QuoteAppliesTo,
  ) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (!discount || !discount.isActive) {
      throw new BadRequestException('Invalid or inactive promo code');
    }
    if (discount.expiresAt && discount.expiresAt < new Date()) {
      throw new BadRequestException('This promo code has expired');
    }
    if (discount.maxUses != null && discount.usedCount >= discount.maxUses) {
      throw new BadRequestException('This promo code has reached its usage limit');
    }
    if (
      discount.appliesTo !== 'BOTH' &&
      appliesTo !== 'BOTH' &&
      discount.appliesTo !== appliesTo
    ) {
      throw new BadRequestException(
        `Promo ${discount.code} does not apply to ${appliesTo.toLowerCase()} charges`,
      );
    }
    return discount;
  }

  private async resolvePromoPercent(
    tenantId: string,
    code: string | null | undefined,
    appliesTo: QuoteAppliesTo,
  ): Promise<number> {
    if (!code) return 0;
    try {
      const discount = await this.findValidPromo(tenantId, code.toUpperCase(), appliesTo);
      return discount.percentOff;
    } catch {
      return 0;
    }
  }

  private async toSummary(row: {
    id: string;
    tenantId: string;
    userId: string;
    points: number;
    lifetimePoints: number;
    lifetimeSpendCents: number;
    tier: string;
    manualDiscountPercent: number;
    activePromoCode: string | null;
    notes: string | null;
  }) {
    const tierCode = tierFromPoints(row.points);
    const tierDef = LOYALTY_TIERS[tierCode];
    const progress = nextTierProgress(row.points);
    const promoPercent = await this.resolvePromoPercent(
      row.tenantId,
      row.activePromoCode,
      'BOTH',
    );
    const effective = effectiveDiscountPercent(
      tierDef.discountPercent,
      row.manualDiscountPercent,
      promoPercent,
    );

    return {
      id: row.id,
      userId: row.userId,
      points: row.points,
      lifetimePoints: row.lifetimePoints,
      lifetimeSpendCents: row.lifetimeSpendCents,
      lifetimeSpendFormatted: formatZar(row.lifetimeSpendCents),
      tier: tierCode,
      tierName: tierDef.name,
      tierDiscountPercent: tierDef.discountPercent,
      manualDiscountPercent: row.manualDiscountPercent,
      activePromoCode: row.activePromoCode,
      promoDiscountPercent: promoPercent,
      effectiveDiscountPercent: effective,
      benefits: tierDef.benefits,
      notes: row.notes,
      nextTier: progress.nextTier,
      nextTierName: progress.nextTierName,
      pointsToNext: progress.pointsToNext,
      progressPercent: progress.progressPercent,
    };
  }
}

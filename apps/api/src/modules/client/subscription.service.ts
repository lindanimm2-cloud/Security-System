import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyService } from './loyalty.service';
import {
  ADDONS,
  AddonCode,
  computeMonthlyTotal,
  formatZar,
  hasCategoryAccess,
  TIERS,
  TierCode,
} from './plans.catalog';

type SubBillingFields = {
  planName: string;
  tierCode: string;
  addons: string[];
  status: SubscriptionStatus;
  priceMonthly: number;
  memberId: string;
  validUntil: Date;
  lastPaidAt?: Date | null;
  nextBillingAt?: Date | null;
  billingFailedCount?: number;
  lastBillingNoticeAt?: Date | null;
};

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async getPlans(userId: string) {
    const sub = await this.ensureSubscription(userId);
    const tierCode = sub.tierCode as TierCode;
    const activeAddons = sub.addons;
    const billing = this.billingMeta(sub);
    const quote = await this.loyalty.quoteSubscriptionPrice(userId, sub.priceMonthly);

    const availableAddons = Object.values(ADDONS)
      .filter((a) => tierCode !== 'PREMIUM' && !activeAddons.includes(a.code))
      .map((a) => ({
        ...a,
        priceFormatted: `${formatZar(a.priceCents)}/mo`,
        upgradeUrl: `/portal/subscription/upgrade?addon=${a.code}`,
      }));

    const activeAddonDetails = activeAddons
      .map((code) => ADDONS[code as AddonCode])
      .filter(Boolean)
      .map((a) => ({ ...a, priceFormatted: `${formatZar(a.priceCents)}/mo` }));

    const canUpgradeTier = tierCode !== 'PREMIUM';

    return {
      success: true,
      data: {
        paymentProvider: {
          name: 'PayFast',
          description:
            'South Africa\'s most trusted payment gateway — PCI-DSS compliant, used by leading retailers. Supports card, EFT, and instant EFT.',
          website: 'https://www.payfast.co.za',
        },
        tiers: Object.values(TIERS).map((t) => ({
          ...t,
          priceFormatted: `${formatZar(t.priceCents)}/mo`,
          isCurrent: t.code === tierCode,
          isAvailable: t.code === 'PREMIUM' ? canUpgradeTier : t.code === tierCode,
        })),
        addons: Object.values(ADDONS).map((a) => ({
          ...a,
          priceFormatted: `${formatZar(a.priceCents)}/mo`,
          isActive: tierCode === 'PREMIUM' || activeAddons.includes(a.code),
          isAvailable: tierCode !== 'PREMIUM' && !activeAddons.includes(a.code),
        })),
        availableUpgrades: {
          tier: canUpgradeTier
            ? { ...TIERS.PREMIUM, priceFormatted: `${formatZar(TIERS.PREMIUM.priceCents)}/mo` }
            : null,
          addons: availableAddons,
        },
        current: {
          tierCode,
          tierName: sub.planName,
          planName: sub.planName,
          addons: activeAddons,
          activeAddonDetails,
          priceMonthly: sub.priceMonthly,
          priceFormatted: `${formatZar(sub.priceMonthly)}/mo`,
          memberId: sub.memberId,
          status: sub.status,
          validUntil: sub.validUntil,
          lastPaidAt: billing.lastPaidAt,
          nextBillingAt: billing.nextBillingAt,
          billingFailedCount: billing.billingFailedCount,
          isOverdue: billing.isOverdue,
          daysPastDue: billing.daysPastDue,
          amountDueCents: billing.isOverdue || sub.status === 'PAST_DUE' ? quote.finalCents : 0,
          amountDueFormatted: formatZar(
            billing.isOverdue || sub.status === 'PAST_DUE' ? quote.finalCents : quote.finalCents,
          ),
          discountedMonthlyCents: quote.finalCents,
          discountedMonthlyFormatted: `${formatZar(quote.finalCents)}/mo`,
          discountCents: quote.discountCents,
          discountPercent: quote.percent,
          loyalty: quote.loyalty,
          access: {
            home: hasCategoryAccess(tierCode, activeAddons, 'home'),
            vehicle: hasCategoryAccess(tierCode, activeAddons, 'vehicle'),
            family: hasCategoryAccess(tierCode, activeAddons, 'family'),
            medical: hasCategoryAccess(tierCode, activeAddons, 'medical'),
            personal: true,
            emergency: true,
          },
        },
      },
    };
  }

  async getSubscription(userId: string) {
    const plans = await this.getPlans(userId);
    return { success: true, data: plans.data.current };
  }

  async getAccess(userId: string) {
    const sub = await this.ensureSubscription(userId);
    return {
      success: true,
      data: {
        tierCode: sub.tierCode,
        addons: sub.addons,
        access: {
          home: hasCategoryAccess(sub.tierCode, sub.addons, 'home'),
          vehicle: hasCategoryAccess(sub.tierCode, sub.addons, 'vehicle'),
          family: hasCategoryAccess(sub.tierCode, sub.addons, 'family'),
          medical: hasCategoryAccess(sub.tierCode, sub.addons, 'medical'),
          personal: true,
          emergency: true,
        },
      },
    };
  }

  async getBillingSummary(userId: string) {
    const sub = await this.ensureSubscription(userId);
    const billing = this.billingMeta(sub);
    const quote = await this.loyalty.quoteSubscriptionPrice(userId, sub.priceMonthly);
    const amountDueCents =
      billing.isOverdue || sub.status === 'PAST_DUE' ? quote.finalCents : 0;
    return {
      success: true,
      data: {
        planName: sub.planName,
        tierCode: sub.tierCode,
        status: sub.status,
        priceMonthly: sub.priceMonthly,
        priceFormatted: `${formatZar(sub.priceMonthly)}/mo`,
        amountDueCents,
        amountDueFormatted: formatZar(amountDueCents || quote.finalCents),
        discountedMonthlyCents: quote.finalCents,
        discountedMonthlyFormatted: `${formatZar(quote.finalCents)}/mo`,
        discountCents: quote.discountCents,
        discountPercent: quote.percent,
        loyalty: quote.loyalty,
        validUntil: sub.validUntil.toISOString(),
        nextBillingAt: billing.nextBillingAt,
        lastPaidAt: billing.lastPaidAt,
        billingFailedCount: billing.billingFailedCount,
        isOverdue: billing.isOverdue,
        daysPastDue: billing.daysPastDue,
        memberId: sub.memberId,
      },
    };
  }

  async listPayments(userId: string) {
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      success: true,
      data: payments.map((p) => this.formatPayment(p)),
    };
  }

  async createMonthlyCharge(
    userId: string,
    tenantId: string,
    checkoutBase = '/portal/subscription/checkout',
  ) {
    const sub = await this.ensureSubscription(userId, tenantId);
    if (sub.status === 'CANCELLED') {
      throw new BadRequestException('Subscription is cancelled — reactivate before charging');
    }
    if (sub.priceMonthly <= 0) {
      throw new BadRequestException('No monthly amount due on this plan');
    }

    const quote = await this.loyalty.quoteSubscriptionPrice(userId, sub.priceMonthly);
    const base = (checkoutBase || '/portal/subscription/checkout').replace(/\/$/, '');

    const pending = await this.prisma.paymentTransaction.findFirst({
      where: { userId, tenantId, kind: 'MONTHLY', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (
      pending &&
      pending.amountCents === quote.finalCents &&
      (pending.discountCents ?? 0) === quote.discountCents
    ) {
      return {
        success: true,
        data: {
          reference: pending.reference,
          provider: 'PayFast',
          amountCents: pending.amountCents,
          amountFormatted: formatZar(pending.amountCents),
          originalAmountCents: pending.originalAmountCents ?? quote.original,
          discountCents: pending.discountCents ?? quote.discountCents,
          discountPercent: quote.percent,
          description: `Monthly renewal — ${sub.planName}`,
          kind: 'MONTHLY',
          checkoutUrl: `${base}?ref=${pending.reference}`,
          reused: true,
          loyalty: quote.loyalty,
        },
      };
    }

    const reference = `PF-M-${Date.now()}-${userId.slice(0, 8)}`;
    await this.prisma.paymentTransaction.create({
      data: {
        tenantId,
        userId,
        reference,
        amountCents: quote.finalCents,
        originalAmountCents: quote.original,
        discountCents: quote.discountCents,
        tierCode: sub.tierCode,
        status: 'PENDING',
        kind: 'MONTHLY',
      },
    });

    return {
      success: true,
      data: {
        reference,
        provider: 'PayFast',
        amountCents: quote.finalCents,
        amountFormatted: formatZar(quote.finalCents),
        originalAmountCents: quote.original,
        discountCents: quote.discountCents,
        discountPercent: quote.percent,
        description: `Monthly renewal — ${sub.planName}`,
        kind: 'MONTHLY',
        checkoutUrl: `${base}?ref=${reference}`,
        reused: false,
        loyalty: quote.loyalty,
      },
    };
  }

  async createCheckout(
    userId: string,
    tenantId: string,
    body: { tierCode?: TierCode; addonCode?: AddonCode },
  ) {
    const sub = await this.ensureSubscription(userId);

    if (body.tierCode === 'PREMIUM') {
      if (sub.tierCode === 'PREMIUM') {
        throw new BadRequestException('You are already on Premium');
      }
      const quote = await this.loyalty.quoteSubscriptionPrice(userId, TIERS.PREMIUM.priceCents);
      const reference = `PF-${Date.now()}-${userId.slice(0, 8)}`;
      await this.prisma.paymentTransaction.create({
        data: {
          tenantId,
          userId,
          reference,
          amountCents: quote.finalCents,
          originalAmountCents: quote.original,
          discountCents: quote.discountCents,
          tierCode: 'PREMIUM',
          status: 'PENDING',
          kind: 'CHECKOUT',
        },
      });
      return {
        success: true,
        data: {
          reference,
          provider: 'PayFast',
          amountCents: quote.finalCents,
          amountFormatted: formatZar(quote.finalCents),
          originalAmountCents: quote.original,
          discountCents: quote.discountCents,
          discountPercent: quote.percent,
          description: TIERS.PREMIUM.name,
          kind: 'CHECKOUT',
          checkoutUrl: `/portal/subscription/checkout?ref=${reference}`,
          loyalty: quote.loyalty,
        },
      };
    }

    if (body.addonCode) {
      if (sub.tierCode === 'PREMIUM') {
        throw new BadRequestException('Premium includes all add-ons');
      }
      if (sub.addons.includes(body.addonCode)) {
        throw new BadRequestException('Add-on already active');
      }
      const addon = ADDONS[body.addonCode];
      if (!addon) throw new BadRequestException('Invalid add-on');

      const quote = await this.loyalty.quoteSubscriptionPrice(userId, addon.priceCents);
      const reference = `PF-${Date.now()}-${userId.slice(0, 8)}`;
      await this.prisma.paymentTransaction.create({
        data: {
          tenantId,
          userId,
          reference,
          amountCents: quote.finalCents,
          originalAmountCents: quote.original,
          discountCents: quote.discountCents,
          addonCode: body.addonCode,
          status: 'PENDING',
          kind: 'CHECKOUT',
        },
      });
      return {
        success: true,
        data: {
          reference,
          provider: 'PayFast',
          amountCents: quote.finalCents,
          amountFormatted: formatZar(quote.finalCents),
          originalAmountCents: quote.original,
          discountCents: quote.discountCents,
          discountPercent: quote.percent,
          description: `${addon.name} — monthly add-on`,
          kind: 'CHECKOUT',
          checkoutUrl: `/portal/subscription/checkout?ref=${reference}`,
          loyalty: quote.loyalty,
        },
      };
    }

    throw new BadRequestException('Specify tierCode or addonCode');
  }

  async confirmPayment(userId: string, reference: string) {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { reference, userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'COMPLETE') {
      return { success: true, data: { alreadyComplete: true } };
    }

    const sub = await this.ensureSubscription(userId);
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setMonth(validUntil.getMonth() + 1);
    const nextBillingAt = new Date(validUntil);

    const isMonthly = payment.kind === 'MONTHLY';

    let tierCode = sub.tierCode as TierCode;
    let addons = [...sub.addons];
    let planName = sub.planName;

    if (!isMonthly) {
      if (payment.tierCode === 'PREMIUM') {
        tierCode = 'PREMIUM';
        planName = TIERS.PREMIUM.name;
        addons = Object.keys(ADDONS);
      } else if (payment.addonCode && !addons.includes(payment.addonCode)) {
        addons.push(payment.addonCode);
      }
    }

    const priceMonthly = isMonthly ? sub.priceMonthly : computeMonthlyTotal(tierCode, addons);
    const notifyTitle = isMonthly ? 'Monthly payment received' : 'Subscription updated';
    const notifyBody = isMonthly
      ? `Thank you — ${formatZar(payment.amountCents)} received. Cover renewed until ${validUntil.toLocaleDateString()}.`
      : `Your plan is now ${planName} at ${formatZar(priceMonthly)}/mo.`;

    await this.prisma.$transaction([
      this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: { status: 'COMPLETE' },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: {
          tierCode,
          addons,
          planName,
          priceMonthly,
          validUntil,
          lastPaidAt: now,
          nextBillingAt,
          status: 'ACTIVE',
          billingFailedCount: 0,
        },
      }),
      this.prisma.notification.create({
        data: {
          tenantId: sub.tenantId,
          userId,
          type: NotificationType.BILLING,
          title: notifyTitle,
          body: notifyBody,
        },
      }),
    ]);

    const loyalty = await this.loyalty.awardSpend(
      userId,
      payment.tenantId,
      payment.amountCents,
      isMonthly ? 'Monthly subscription payment' : 'Subscription checkout',
    );

    return {
      success: true,
      data: {
        tierCode,
        addons,
        planName,
        priceMonthly,
        priceFormatted: formatZar(priceMonthly),
        kind: payment.kind,
        validUntil: validUntil.toISOString(),
        nextBillingAt: nextBillingAt.toISOString(),
        loyalty,
      },
    };
  }

  async getPayment(reference: string, userId: string) {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { reference, userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    let description = '4DS Solutions subscription';
    if (payment.kind === 'MONTHLY') {
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      description = `Monthly renewal — ${sub?.planName ?? 'subscription'}`;
    } else if (payment.tierCode === 'PREMIUM') {
      description = TIERS.PREMIUM.name;
    } else if (payment.addonCode) {
      description = ADDONS[payment.addonCode as AddonCode]?.name ?? payment.addonCode;
    }

    return {
      success: true,
      data: {
        reference: payment.reference,
        provider: payment.provider,
        amountCents: payment.amountCents,
        amountFormatted: formatZar(payment.amountCents),
        status: payment.status,
        kind: payment.kind,
        description,
      },
    };
  }

  getCatalog() {
    return {
      success: true,
      data: {
        tiers: Object.values(TIERS).map((t) => ({
          ...t,
          priceFormatted: `${formatZar(t.priceCents)}/mo`,
        })),
        addons: Object.values(ADDONS).map((a) => ({
          ...a,
          priceFormatted: `${formatZar(a.priceCents)}/mo`,
        })),
      },
    };
  }

  async provisionForCustomer(userId: string, tenantId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { isProtectionClient: true },
    });
    return this.ensureSubscription(userId, tenantId);
  }

  formatSubscriptionSummary(sub: SubBillingFields) {
    const tierCode = sub.tierCode as TierCode;
    const billing = this.billingMeta(sub);
    const activeAddonDetails = sub.addons
      .map((code) => ADDONS[code as AddonCode])
      .filter(Boolean)
      .map((a) => ({ code: a.code, name: a.name, priceFormatted: `${formatZar(a.priceCents)}/mo` }));

    return {
      planName: sub.planName,
      tierCode: sub.tierCode,
      tierLabel: tierCode === 'PREMIUM' ? 'Premium' : 'Essential',
      addons: sub.addons,
      activeAddonDetails,
      status: sub.status,
      priceMonthly: sub.priceMonthly,
      priceFormatted: `${formatZar(sub.priceMonthly)}/mo`,
      memberId: sub.memberId,
      validUntil: sub.validUntil.toISOString(),
      lastPaidAt: billing.lastPaidAt,
      nextBillingAt: billing.nextBillingAt,
      billingFailedCount: billing.billingFailedCount,
      isOverdue: billing.isOverdue,
      daysPastDue: billing.daysPastDue,
      amountDueCents: billing.amountDueCents,
      amountDueFormatted: billing.amountDueFormatted,
      access: {
        home: hasCategoryAccess(tierCode, sub.addons, 'home'),
        vehicle: hasCategoryAccess(tierCode, sub.addons, 'vehicle'),
        family: hasCategoryAccess(tierCode, sub.addons, 'family'),
        medical: hasCategoryAccess(tierCode, sub.addons, 'medical'),
        personal: true,
        emergency: true,
      },
    };
  }

  async getCustomerSubscription(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] } },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const sub = await this.ensureSubscription(userId, tenantId);
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return {
      success: true,
      data: {
        customer: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          roleLabel: user.role === 'FAMILY_MEMBER' ? 'Family member' : 'Primary subscriber',
          status: user.status,
        },
        subscription: this.formatSubscriptionSummary(sub),
        payments: payments.map((p) => this.formatPayment(p)),
      },
    };
  }

  async updateSubscriptionAdmin(
    tenantId: string,
    userId: string,
    body: {
      tierCode?: TierCode;
      addons?: string[];
      status?: SubscriptionStatus;
      validUntil?: string;
      memberId?: string;
      note?: string;
    },
    actorName: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: { in: ['USER', 'FAMILY_MEMBER'] } },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const sub = await this.ensureSubscription(userId, tenantId);
    let tierCode = (body.tierCode ?? sub.tierCode) as TierCode;
    let addons = body.addons ?? [...sub.addons];

    if (tierCode === 'PREMIUM') {
      addons = Object.keys(ADDONS);
    } else if (body.addons) {
      for (const code of addons) {
        if (!ADDONS[code as AddonCode]) {
          throw new BadRequestException(`Invalid add-on: ${code}`);
        }
      }
    }

    const planName = TIERS[tierCode]?.name ?? sub.planName;
    const priceMonthly = computeMonthlyTotal(tierCode, addons);
    const validUntil = body.validUntil ? new Date(body.validUntil) : sub.validUntil;
    const memberId = body.memberId?.trim() || sub.memberId;
    const status = body.status ?? sub.status;
    const nextBillingAt =
      body.validUntil != null ? new Date(validUntil) : sub.nextBillingAt ?? validUntil;

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: {
          tierCode,
          addons,
          planName,
          priceMonthly,
          validUntil,
          memberId,
          status,
          nextBillingAt,
          ...(status === 'ACTIVE' ? { billingFailedCount: 0 } : {}),
        },
      }),
      this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: NotificationType.SYSTEM,
          title: 'Subscription updated',
          body: body.note?.trim()
            ? `${planName} updated by control room: ${body.note.trim()}`
            : `Your plan was updated to ${planName} (${formatZar(priceMonthly)}/mo) by ${actorName}.`,
        },
      }),
    ]);

    const updated = await this.prisma.subscription.findUniqueOrThrow({ where: { userId } });
    return {
      success: true,
      data: this.formatSubscriptionSummary(updated),
    };
  }

  async notifyBillingStakeholders(tenantId: string, title: string, body: string) {
    const stakeholders = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: {
          in: [
            UserRole.OWNER,
            UserRole.SALES,
            UserRole.TENANT_ADMIN,
            UserRole.MANAGER,
          ],
        },
      },
      select: { id: true },
    });

    if (stakeholders.length === 0) return { created: 0 };

    await this.prisma.notification.createMany({
      data: stakeholders.map((u) => ({
        tenantId,
        userId: u.id,
        type: NotificationType.BILLING,
        title,
        body,
      })),
    });

    return { created: stakeholders.length };
  }

  async processOverdueBilling(tenantId?: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.subscription.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
        validUntil: { lt: now },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    let markedPastDue = 0;
    let noticesSent = 0;

    for (const sub of overdue) {
      const alreadyNotifiedToday =
        sub.lastBillingNoticeAt != null && sub.lastBillingNoticeAt >= startOfToday;

      const nextFailedCount =
        sub.status === 'PAST_DUE' ? sub.billingFailedCount : sub.billingFailedCount + 1;

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'PAST_DUE',
          billingFailedCount: nextFailedCount,
          ...(!alreadyNotifiedToday ? { lastBillingNoticeAt: now } : {}),
        },
      });

      if (sub.status !== 'PAST_DUE') markedPastDue += 1;

      if (alreadyNotifiedToday) continue;

      const customerName = `${sub.user.firstName} ${sub.user.lastName}`.trim();
      const daysPast = Math.max(
        1,
        Math.floor((now.getTime() - sub.validUntil.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const clientTitle = 'Payment overdue';
      const clientBody = `Your ${sub.planName} cover expired ${daysPast} day(s) ago. Amount due: ${formatZar(sub.priceMonthly)}. Pay now to restore uninterrupted protection.`;
      const staffTitle = `Past-due: ${customerName}`;
      const staffBody = `${customerName} (${sub.user.email}) — ${sub.planName} overdue by ${daysPast} day(s). ${formatZar(sub.priceMonthly)}/mo at risk. Member ${sub.memberId}.`;

      await this.prisma.notification.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          type: NotificationType.BILLING,
          title: clientTitle,
          body: clientBody,
        },
      });

      const staff = await this.notifyBillingStakeholders(sub.tenantId, staffTitle, staffBody);
      noticesSent += 1 + staff.created;
    }

    return {
      success: true,
      data: {
        scanned: overdue.length,
        markedPastDue,
        noticesSent,
        checkedAt: now.toISOString(),
      },
    };
  }

  async getBillingOverview(tenantId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: {
        tenantId,
        user: { role: { in: ['USER', 'FAMILY_MEMBER'] }, status: { not: 'DELETED' } },
      },
      select: {
        status: true,
        priceMonthly: true,
        validUntil: true,
        billingFailedCount: true,
      },
    });

    const now = new Date();
    const pastDue = subs.filter((s) => s.status === 'PAST_DUE' || s.validUntil < now);
    const revenueAtRiskCents = pastDue.reduce((sum, s) => sum + s.priceMonthly, 0);
    const active = subs.filter((s) => s.status === 'ACTIVE').length;
    const mrrCents = subs
      .filter((s) => s.status === 'ACTIVE' || s.status === 'TRIALING')
      .reduce((sum, s) => sum + s.priceMonthly, 0);

    return {
      success: true,
      data: {
        totalSubscriptions: subs.length,
        active,
        pastDueCount: pastDue.length,
        revenueAtRiskCents,
        revenueAtRiskFormatted: formatZar(revenueAtRiskCents),
        mrrCents,
        mrrFormatted: formatZar(mrrCents),
      },
    };
  }

  private billingMeta(sub: SubBillingFields) {
    const now = new Date();
    const isOverdue =
      sub.status === 'PAST_DUE' || (sub.validUntil < now && sub.status !== 'CANCELLED');
    const daysPastDue = isOverdue
      ? Math.max(0, Math.floor((now.getTime() - sub.validUntil.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const amountDueCents = isOverdue || sub.status === 'PAST_DUE' ? sub.priceMonthly : 0;

    return {
      lastPaidAt: sub.lastPaidAt ? sub.lastPaidAt.toISOString() : null,
      nextBillingAt: (sub.nextBillingAt ?? sub.validUntil).toISOString(),
      billingFailedCount: sub.billingFailedCount ?? 0,
      isOverdue,
      daysPastDue,
      amountDueCents,
      amountDueFormatted: formatZar(amountDueCents || sub.priceMonthly),
    };
  }

  private formatPayment(p: {
    id: string;
    reference: string;
    amountCents: number;
    status: string;
    kind?: string | null;
    tierCode: string | null;
    addonCode: string | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      reference: p.reference,
      amountCents: p.amountCents,
      amountFormatted: formatZar(p.amountCents),
      status: p.status,
      kind: p.kind ?? 'CHECKOUT',
      tierCode: p.tierCode,
      addonCode: p.addonCode,
      createdAt: p.createdAt.toISOString(),
    };
  }

  private async ensureSubscription(userId: string, tenantId?: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (tenantId && user.tenantId !== tenantId) {
        throw new NotFoundException('User not found');
      }
      // Store-only shoppers must not get an auto-created protection/CRM subscription
      if (!user.isProtectionClient) {
        throw new NotFoundException(
          'No protection subscription on this account. Contact sales to activate cover.',
        );
      }
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 1);
      sub = await this.prisma.subscription.create({
        data: {
          tenantId: user.tenantId,
          userId,
          planName: TIERS.ESSENTIAL.name,
          tierCode: 'ESSENTIAL',
          addons: [],
          priceMonthly: TIERS.ESSENTIAL.priceCents,
          memberId: `4DS-${Date.now().toString(36).toUpperCase()}`,
          validUntil,
          nextBillingAt: validUntil,
          status: 'ACTIVE',
        },
      });
    }
    return sub;
  }
}

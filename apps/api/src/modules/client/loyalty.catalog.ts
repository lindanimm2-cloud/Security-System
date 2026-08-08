export type LoyaltyTierCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type LoyaltyTierDef = {
  code: LoyaltyTierCode;
  name: string;
  minPoints: number;
  discountPercent: number;
  benefits: string;
};

export const LOYALTY_TIERS: Record<LoyaltyTierCode, LoyaltyTierDef> = {
  BRONZE: {
    code: 'BRONZE',
    name: 'Bronze',
    minPoints: 0,
    discountPercent: 0,
    benefits: 'Earn 1 point per R1 spent on subscriptions and store gear.',
  },
  SILVER: {
    code: 'SILVER',
    name: 'Silver',
    minPoints: 500,
    discountPercent: 5,
    benefits: '5% off monthly cover and Nexus store checkout.',
  },
  GOLD: {
    code: 'GOLD',
    name: 'Gold',
    minPoints: 2000,
    discountPercent: 10,
    benefits: '10% off monthly cover and Nexus store checkout.',
  },
  PLATINUM: {
    code: 'PLATINUM',
    name: 'Platinum',
    minPoints: 5000,
    discountPercent: 15,
    benefits: '15% off monthly cover and Nexus store checkout — priority loyalty rate.',
  },
};

const TIER_ORDER: LoyaltyTierCode[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export function tierFromPoints(points: number): LoyaltyTierCode {
  let tier: LoyaltyTierCode = 'BRONZE';
  for (const code of TIER_ORDER) {
    if (points >= LOYALTY_TIERS[code].minPoints) tier = code;
  }
  return tier;
}

export function nextTierProgress(points: number) {
  const current = tierFromPoints(points);
  const idx = TIER_ORDER.indexOf(current);
  if (idx >= TIER_ORDER.length - 1) {
    return {
      nextTier: null as LoyaltyTierCode | null,
      nextTierName: null as string | null,
      pointsToNext: 0,
      progressPercent: 100,
    };
  }
  const next = TIER_ORDER[idx + 1];
  const nextDef = LOYALTY_TIERS[next];
  const currentMin = LOYALTY_TIERS[current].minPoints;
  const span = nextDef.minPoints - currentMin;
  const gained = Math.max(0, points - currentMin);
  return {
    nextTier: next,
    nextTierName: nextDef.name,
    pointsToNext: Math.max(0, nextDef.minPoints - points),
    progressPercent: span > 0 ? Math.min(100, Math.round((gained / span) * 100)) : 100,
  };
}

/** Better of tier vs CRM manual, then stack promo, hard-capped at 30%. */
export function effectiveDiscountPercent(
  tierPercent: number,
  manualPercent: number,
  promoPercent = 0,
): number {
  const base = Math.max(tierPercent, manualPercent);
  return Math.min(30, Math.max(0, base + Math.max(0, promoPercent)));
}

export function pointsForSpend(cents: number): number {
  return Math.floor(Math.max(0, cents) / 100);
}

export function applyDiscount(amountCents: number, percent: number) {
  const safePercent = Math.min(30, Math.max(0, percent));
  const discountCents = Math.floor((amountCents * safePercent) / 100);
  return {
    original: amountCents,
    discountCents,
    finalCents: Math.max(0, amountCents - discountCents),
    percent: safePercent,
  };
}

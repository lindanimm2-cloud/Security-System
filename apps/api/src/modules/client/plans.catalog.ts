export type TierCode = 'ESSENTIAL' | 'PREMIUM';

export type AddonCode =
  | 'HOME_SECURITY'
  | 'VEHICLE_RESPONSE'
  | 'FAMILY'
  | 'MEDICAL_PLUS';

export const TIERS: Record<
  TierCode,
  { code: TierCode; name: string; priceCents: number; description: string; includes: string[] }
> = {
  ESSENTIAL: {
    code: 'ESSENTIAL',
    name: '4DS Essential',
    priceCents: 19900,
    description: 'Personal protection, panic button, emergency contacts, and dispatch messaging.',
    includes: ['personal', 'emergency', 'contacts', 'communications', 'medical'],
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: '4DS Premium Protection',
    priceCents: 89900,
    description: 'All services included — home, vehicle, family, medical, and 24/7 control panel.',
    includes: ['all'],
  },
};

export const ADDONS: Record<
  AddonCode,
  { code: AddonCode; name: string; priceCents: number; description: string; category: string }
> = {
  HOME_SECURITY: {
    code: 'HOME_SECURITY',
    name: 'Home Security',
    priceCents: 30000,
    description: 'Property monitoring, alarm integration, CCTV, smart sensors, and home panic.',
    category: 'home',
  },
  VEHICLE_RESPONSE: {
    code: 'VEHICLE_RESPONSE',
    name: 'Vehicle Response',
    priceCents: 50000,
    description: 'Live tracking, theft recovery, geofencing, speed alerts, and roadside assistance.',
    category: 'vehicle',
  },
  FAMILY: {
    code: 'FAMILY',
    name: 'Family Safety Pack',
    priceCents: 15000,
    description: 'Family tracking, safe zones, child protection, and elderly monitoring.',
    category: 'family',
  },
  MEDICAL_PLUS: {
    code: 'MEDICAL_PLUS',
    name: 'Medical Plus',
    priceCents: 12000,
    description: 'Extended medical profile, ambulance request, and responder data sharing.',
    category: 'medical',
  },
};

export const ADDON_FEATURE_MAP: Record<string, AddonCode> = {
  home: 'HOME_SECURITY',
  vehicle: 'VEHICLE_RESPONSE',
  family: 'FAMILY',
  medical: 'MEDICAL_PLUS',
};

export function formatZar(cents: number): string {
  return `R ${(cents / 100).toFixed(0)}`;
}

export function hasAddon(tierCode: string, addons: string[], required: AddonCode): boolean {
  if (tierCode === 'PREMIUM') return true;
  return addons.includes(required);
}

export function hasCategoryAccess(
  tierCode: string,
  addons: string[],
  category: keyof typeof ADDON_FEATURE_MAP,
): boolean {
  if (tierCode === 'PREMIUM') return true;
  if (category === 'medical' && tierCode === 'ESSENTIAL') return true;
  if (category === 'personal' || category === 'emergency') return true;
  const code = ADDON_FEATURE_MAP[category];
  return code ? addons.includes(code) : true;
}

export function computeMonthlyTotal(tierCode: TierCode, addons: string[]): number {
  if (tierCode === 'PREMIUM') return TIERS.PREMIUM.priceCents;
  let total = TIERS.ESSENTIAL.priceCents;
  for (const code of addons) {
    const addon = ADDONS[code as AddonCode];
    if (addon) total += addon.priceCents;
  }
  return total;
}

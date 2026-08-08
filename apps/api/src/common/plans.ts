export type PlanId = 'personal' | 'home' | 'vehicle' | 'family' | 'premium';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceLabel: string;
  features: string[];
  includes: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  personal: {
    id: 'personal',
    name: 'Personal Essential',
    tagline: 'Panic button, tracking, and emergency contacts',
    priceMonthly: 0,
    priceLabel: 'Free',
    features: ['personal', 'emergency', 'contacts', 'medical', 'messages'],
    includes: ['Panic & silent panic', 'GPS tracking', 'Emergency contacts', 'Medical profile', 'Dispatch messaging'],
  },
  home: {
    id: 'home',
    name: 'Home Security',
    tagline: 'Alarm, CCTV, sensors, and property monitoring',
    priceMonthly: 30000,
    priceLabel: 'R300/mo',
    features: ['home', 'alarm', 'cctv', 'sensors', 'visitors', 'patrol', 'home_panic'],
    includes: ['Property registration', 'Alarm arm/disarm', 'CCTV integration', 'Smart sensors', 'Visitor log', 'Guard patrol alerts'],
  },
  vehicle: {
    id: 'vehicle',
    name: 'Vehicle Response',
    tagline: 'Theft recovery, live tracking, and roadside assistance',
    priceMonthly: 50000,
    priceLabel: 'R500/mo',
    features: ['vehicle', 'theft_recovery', 'tracking', 'geofencing', 'speed_alerts', 'roadside'],
    includes: ['Vehicle profiles', 'Live GPS tracking', 'Theft recovery mode', 'Geofencing', 'Speed alerts', 'Roadside assistance'],
  },
  family: {
    id: 'family',
    name: 'Family Protection',
    tagline: 'Safe zones, child and elderly monitoring',
    priceMonthly: 25000,
    priceLabel: 'R250/mo',
    features: ['family', 'safe_zones', 'child_protection', 'elderly'],
    includes: ['Family tracking', 'Safe zones', 'Child protection', 'Elderly welfare alerts'],
  },
  premium: {
    id: 'premium',
    name: 'Premium All-In',
    tagline: 'Every service — best value bundle',
    priceMonthly: 89900,
    priceLabel: 'R899/mo',
    features: ['all'],
    includes: ['All personal, home, vehicle & family features', '24/7 control panel priority', 'Dedicated response team'],
  },
};

export const PLAN_ORDER: PlanId[] = ['personal', 'home', 'vehicle', 'family', 'premium'];

export const FEATURE_PLAN_MAP: Record<string, PlanId> = {
  personal: 'personal',
  emergency: 'personal',
  contacts: 'personal',
  medical: 'personal',
  messages: 'personal',
  home: 'home',
  alarm: 'home',
  cctv: 'home',
  sensors: 'home',
  visitors: 'home',
  patrol: 'home',
  home_panic: 'home',
  vehicle: 'vehicle',
  theft_recovery: 'vehicle',
  tracking: 'vehicle',
  geofencing: 'vehicle',
  speed_alerts: 'vehicle',
  roadside: 'vehicle',
  family: 'family',
  safe_zones: 'family',
  child_protection: 'family',
  elderly: 'family',
};

export function parseAddons(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
  return [];
}

export function getActiveFeatures(tier: string, addons: string[]): Set<string> {
  const active = new Set<string>(['personal', 'emergency', 'contacts', 'medical', 'messages']);
  const t = tier as PlanId;

  if (t === 'premium' || addons.includes('all')) {
    Object.values(PLANS).forEach((p) => p.features.forEach((f) => active.add(f)));
    active.add('all');
    return active;
  }

  if (addons.length > 0) {
    addons.forEach((a) => {
      const plan = PLANS[a as PlanId];
      if (plan) plan.features.forEach((f) => active.add(f));
    });
  }

  const tierPlan = PLANS[t];
  if (tierPlan) tierPlan.features.forEach((f) => active.add(f));

  return active;
}

export function hasFeatureAccess(tier: string, addons: string[], featureKey: string): boolean {
  const active = getActiveFeatures(tier, addons);
  if (active.has('all')) return true;
  const required = FEATURE_PLAN_MAP[featureKey] ?? featureKey;
  const requiredPlan = PLANS[required as PlanId];
  if (!requiredPlan) return active.has(featureKey);
  return requiredPlan.features.some((f) => active.has(f)) || active.has(required);
}

export function getAvailableUpgrades(tier: string, addons: string[]): PlanDefinition[] {
  const owned = new Set<PlanId>();
  owned.add(tier as PlanId);
  addons.forEach((a) => owned.add(a as PlanId));
  if (owned.has('premium')) return [];

  return PLAN_ORDER.filter((id) => id !== 'personal' && !owned.has(id)).map((id) => PLANS[id]);
}

export function formatZar(cents: number): string {
  if (cents === 0) return 'Free';
  return `R${(cents / 100).toFixed(0)}/mo`;
}

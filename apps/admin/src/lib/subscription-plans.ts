export type AddonCode = 'HOME_SECURITY' | 'VEHICLE_RESPONSE' | 'FAMILY' | 'MEDICAL_PLUS';

export type AccessMap = {
  home: boolean;
  vehicle: boolean;
  family: boolean;
  medical: boolean;
  personal: boolean;
  emergency: boolean;
};

export function formatZar(cents: number): string {
  return `R ${(cents / 100).toFixed(0)}`;
}

export function upgradeHref(addon?: AddonCode): string {
  return addon ? `/portal/subscription/upgrade?addon=${addon}` : '/portal/subscription/upgrade';
}

export function featureLink(
  href: string,
  access: AccessMap | null,
  requires?: keyof AccessMap,
  addon?: AddonCode,
): string {
  if (!access) return href;
  if (requires && !access[requires]) return upgradeHref(addon);
  return href;
}

export function isLocked(access: AccessMap | null, requires?: keyof AccessMap): boolean {
  if (!access || !requires) return false;
  return !access[requires];
}

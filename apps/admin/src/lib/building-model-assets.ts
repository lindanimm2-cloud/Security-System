/**
 * Building 3D asset resolution for alarm / property views.
 * GLBs live under /public/buildings/<kind>/model.glb
 */

export type BuildingKind = 'warehouse';

export type BuildingModelSpec = {
  propertyType?: string | null;
  name?: string | null;
  /** Explicit override path. */
  assetUrl?: string | null;
};

export type ResolvedBuildingAsset = {
  assetUrl: string;
  kind: BuildingKind;
  label: string;
};

/** Only these kinds have GLBs for now. House / mall / apartment stay blank. */
export const AVAILABLE_BUILDING_ASSETS: Record<
  BuildingKind,
  { assetUrl: string; label: string; propertyTypes: string[] }
> = {
  warehouse: {
    assetUrl: '/buildings/warehouse/model.glb',
    label: 'Warehouse',
    propertyTypes: ['WAREHOUSE'],
  },
};

export function normalizePropertyType(type?: string | null): string {
  return (type ?? '').trim().toUpperCase().replace(/\s+/g, '_');
}

export function resolveBuildingKind(spec: BuildingModelSpec): BuildingKind | null {
  const explicit = (spec.assetUrl ?? '').trim();
  if (explicit.includes('/warehouse/')) return 'warehouse';
  // House GLB removed — treat any house path as unavailable
  if (explicit.includes('/house/')) return null;

  const t = normalizePropertyType(spec.propertyType);
  if (!t) {
    const n = (spec.name ?? '').toLowerCase();
    if (n.includes('warehouse') || n.includes('depot') || n.includes('factory')) return 'warehouse';
    return null;
  }

  for (const [kind, entry] of Object.entries(AVAILABLE_BUILDING_ASSETS) as Array<
    [BuildingKind, (typeof AVAILABLE_BUILDING_ASSETS)[BuildingKind]]
  >) {
    if (entry.propertyTypes.includes(t)) return kind;
  }

  const n = (spec.name ?? '').toLowerCase();
  if (n.includes('warehouse') || n.includes('depot') || n.includes('factory')) return 'warehouse';

  return null;
}

export function resolveBuildingModelAsset(spec: BuildingModelSpec): ResolvedBuildingAsset | null {
  const explicit = (spec.assetUrl ?? '').trim();
  if (explicit) {
    const kind = resolveBuildingKind(spec);
    if (!kind) return null;
    return {
      assetUrl: explicit,
      kind,
      label: AVAILABLE_BUILDING_ASSETS[kind]?.label ?? 'Building',
    };
  }

  const kind = resolveBuildingKind(spec);
  if (!kind) return null;

  const entry = AVAILABLE_BUILDING_ASSETS[kind];
  return {
    assetUrl: entry.assetUrl,
    kind,
    label: entry.label,
  };
}

export function buildingModelLabel(spec: BuildingModelSpec): string {
  const name = (spec.name ?? '').trim();
  if (name) return name;
  const kind = resolveBuildingKind(spec);
  return kind ? AVAILABLE_BUILDING_ASSETS[kind].label : 'Building';
}

/**
 * Vehicle 3D asset resolution.
 * Real GLB/GLTF files live under /public/vehicles/<slug>/model.glb
 *
 * Only assets listed in AVAILABLE_VEHICLE_ASSETS are served.
 * Unknown make/model falls back to a default GLB so every vehicle still shows 3D.
 *
 * Cars: FormDrive (mustang, tesla-model-3) + existing sport/paint set.
 * SUV / off-road: 3d-car-viewing Quaternius CC0 mainstream models.
 * Utility: JAC 1045 truck only (no BMW catalog).
 */

export type VehicleModelSpec = {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  colour?: string | null;
  /** Explicit override; wins over make/model resolution. */
  assetUrl?: string | null;
};

export type ResolvedVehicleAsset = {
  assetUrl: string;
  slug: string;
  label: string;
};

/**
 * Currently available GLBs only.
 * SketchUp (.skp) sources are not web-loadable — keep them under /vehicles/_source.
 */
export const AVAILABLE_VEHICLE_ASSETS: Record<
  string,
  { assetUrl: string; label: string; aliases?: string[] }
> = {
  // —— FormDrive (nesdesignco) ——
  'ford-mustang-2005': {
    assetUrl: '/vehicles/ford-mustang-2005/model.glb',
    label: 'Ford Mustang 2005',
    aliases: ['mustang', 'ford-mustang', 'mustang-2005'],
  },
  'tesla-model-3': {
    assetUrl: '/vehicles/tesla-model-3/model.glb',
    label: 'Tesla Model 3',
    aliases: [
      'model-3',
      'tesla-model-3-2018',
      'tesla-3',
      'mercedes-benz-c-class',
      'mercedes-c-class',
      'mercedes-c',
      'volkswagen-polo',
      'vw-polo',
      'audi-tt-rs',
      'audi-tt',
      'sedan',
      'concept-car',
      'concept',
    ],
  },

  // —— 3d-car-viewing (jiaxiantao) Quaternius CC0 ——
  'suv-mainstream': {
    assetUrl: '/vehicles/suv-mainstream/model.glb',
    label: 'SUV',
    aliases: ['suv', 'bmw-x5', 'toyota-fortuner', 'toyota-land-cruiser', 'toyota-landcruiser'],
  },
  'offroad-mainstream': {
    assetUrl: '/vehicles/offroad-mainstream/model.glb',
    label: 'Off-road',
    aliases: ['offroad', 'off-road', 'rover', '4x4'],
  },

  // —— Existing sport / paint body set ——
  'ferrari-599': {
    assetUrl: '/vehicles/ferrari-599/model.glb',
    label: 'Ferrari 599',
    aliases: ['ferrari', 'ferrari-599-gtb', '599'],
  },
  'toyota-supra-mk4': {
    assetUrl: '/vehicles/toyota-supra-mk4/model.glb',
    label: 'Toyota Supra MK4',
    aliases: ['toyota-supra', 'supra', 'supra-mk4', 'a80', 'mk4'],
  },
  'dodge-challenger-rt': {
    assetUrl: '/vehicles/dodge-challenger-rt/model.glb',
    label: 'Dodge Challenger RT',
    aliases: ['dodge-challenger', 'challenger', 'dodge'],
  },
  'tesla-roadster': {
    assetUrl: '/vehicles/tesla-roadster/model.glb',
    label: 'Tesla Roadster',
    aliases: ['tesla', 'roadster', 'tesla-roadster-2020'],
  },
  'bugatti-bolide': {
    assetUrl: '/vehicles/bugatti-bolide/model.glb',
    label: 'Bugatti Bolide',
    aliases: ['bugatti', 'bolide', 'bugatti-bolide-2024'],
  },
  'ford-gt40': {
    assetUrl: '/vehicles/ford-gt40/model.glb',
    label: 'Ford GT40',
    aliases: ['gt40', 'ford-gt', 'ford-gt-40'],
  },
  'lancia-037': {
    assetUrl: '/vehicles/lancia-037/model.glb',
    label: 'Lancia 037 Stradale',
    aliases: ['lancia', 'lancia-037-stradale', '037-stradale'],
  },
  'concept-car-037': {
    assetUrl: '/vehicles/concept-car-037/model.glb',
    label: 'Concept Car 037',
    aliases: ['free-concept-car', 'concept-037', 'cc0-concept'],
  },
  'honda-cr-v': {
    assetUrl: '/vehicles/honda-cr-v/model.glb',
    label: 'Honda CR-V',
    aliases: ['honda-crv', 'honda-cr-v', 'honda'],
  },

  // —— Utility (truck only — no BMW) ——
  'jac-1045-truck': {
    assetUrl: '/vehicles/jac-1045-truck/model.glb',
    label: 'JAC 1045 Truck',
    aliases: [
      'jac-1045',
      'jac-truck',
      'mercedes-sprinter',
      'sprinter',
      'scania-p320',
      'scania',
      'ford-ranger',
      'isuzu-d-max',
      'isuzu-dmax',
      'toyota-hilux',
      'hilux',
      'truck',
    ],
  },
  'generic-vehicle': {
    assetUrl: '/vehicles/tesla-model-3/model.glb',
    label: 'Vehicle',
    aliases: ['nissan', 'generic'],
  },
};

const DEFAULT_VEHICLE_SLUG = 'tesla-model-3';

/** Slug used for /vehicles/<slug>/model.glb */
export function vehicleAssetSlug(make?: string | null, model?: string | null): string {
  const raw = [make, model]
    .map((p) => (p ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
  return raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function vehicleModelLabel(spec: VehicleModelSpec): string {
  const parts = [spec.year ? String(spec.year) : '', spec.make, spec.model]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(' ') : 'Vehicle';
}

function lookupAvailable(slug: string) {
  if (AVAILABLE_VEHICLE_ASSETS[slug]) {
    return { slug, ...AVAILABLE_VEHICLE_ASSETS[slug] };
  }
  for (const [key, entry] of Object.entries(AVAILABLE_VEHICLE_ASSETS)) {
    if (entry.aliases?.includes(slug)) return { slug: key, ...entry };
  }
  return null;
}

function pickFallbackSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (
    s.includes('truck') ||
    s.includes('sprinter') ||
    s.includes('scania') ||
    s.includes('ranger') ||
    s.includes('jac') ||
    s.includes('isuzu') ||
    s.includes('hilux')
  ) {
    return 'jac-1045-truck';
  }
  if (
    s.includes('x6') ||
    s.includes('x5') ||
    s.includes('suv') ||
    s.includes('fortuner') ||
    s.includes('land-cruiser') ||
    s.includes('cr-v') ||
    s.includes('crv')
  ) {
    if (s.includes('cr-v') || s.includes('crv') || s.includes('honda')) return 'honda-cr-v';
    return 'suv-mainstream';
  }
  if (s.includes('offroad') || s.includes('off-road') || s.includes('4x4') || s.includes('rover')) {
    return 'offroad-mainstream';
  }
  if (s.includes('mustang')) return 'ford-mustang-2005';
  if (s.includes('model-3') || s.includes('model3')) return 'tesla-model-3';
  if (s.includes('challenger') || s.includes('dodge')) return 'dodge-challenger-rt';
  if (s.includes('tesla') || s.includes('roadster')) return 'tesla-roadster';
  if (s.includes('ferrari') || s.includes('599')) return 'ferrari-599';
  if (s.includes('supra') || s.includes('mk4')) return 'toyota-supra-mk4';
  if (s.includes('bugatti') || s.includes('bolide')) return 'bugatti-bolide';
  if (s.includes('gt40') || s.includes('gt-40')) return 'ford-gt40';
  if (s.includes('lancia')) return 'lancia-037';
  if (
    s.includes('polo') ||
    s.includes('c-class') ||
    s.includes('audi') ||
    s.includes('mercedes') ||
    s.includes('sedan') ||
    s.includes('bmw')
  ) {
    // BMW make/model still resolves to a non-BMW GLB (concept sedan)
    return 'tesla-model-3';
  }
  return DEFAULT_VEHICLE_SLUG;
}

/**
 * Resolve a GLB from the available catalog (or an explicit assetUrl).
 * Always returns an asset when the catalog has at least one entry.
 */
export function resolveVehicleModelAsset(spec: VehicleModelSpec): ResolvedVehicleAsset | null {
  const explicit = (spec.assetUrl ?? '').trim();
  if (explicit) {
    return {
      assetUrl: explicit,
      slug: vehicleAssetSlug(spec.make, spec.model) || 'custom',
      label: vehicleModelLabel(spec),
    };
  }

  const slug = vehicleAssetSlug(spec.make, spec.model);
  const hit = slug ? lookupAvailable(slug) : null;
  if (hit) {
    return {
      assetUrl: hit.assetUrl,
      slug: hit.slug,
      label: vehicleModelLabel(spec) || hit.label,
    };
  }

  const fallbackSlug = pickFallbackSlug(slug);
  const fallback = AVAILABLE_VEHICLE_ASSETS[fallbackSlug] ?? AVAILABLE_VEHICLE_ASSETS[DEFAULT_VEHICLE_SLUG];
  if (!fallback) return null;

  return {
    assetUrl: fallback.assetUrl,
    slug: fallbackSlug,
    label: vehicleModelLabel(spec) || fallback.label,
  };
}

/** Parse common colour names / hex into a Three-friendly hex int. */
export function parseVehicleColour(colour?: string | null): number | null {
  if (!colour) return null;
  const c = colour.trim().toLowerCase();
  if (/^#?[0-9a-f]{6}$/i.test(c)) {
    return parseInt(c.replace('#', ''), 16);
  }
  const named: Record<string, number> = {
    white: 0xf2f4f6,
    silver: 0xc8ced4,
    grey: 0x8a9098,
    gray: 0x8a9098,
    black: 0x1c1e22,
    red: 0xb83232,
    blue: 0x2f5f9e,
    green: 0x2f6b4f,
    yellow: 0xd6b83d,
    orange: 0xd9782c,
    brown: 0x6b4a32,
    beige: 0xd4c4a8,
    gold: 0xc9a84c,
    pearl: 0xe8e6e0,
  };
  return named[c] ?? null;
}

import type { StoreProduct } from '@/lib/store-types';
import { STORE_DEPARTMENTS } from '@/lib/store-catalog';
import raw from './demo-products.json';

type RawProduct = {
  sku: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  imageEmoji: string;
  featured: boolean;
  requiresLicense?: boolean;
};

function money(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

const catalogueOrder = STORE_DEPARTMENTS.map((d) => d.id);

export function getDemoProducts(opts?: {
  category?: string;
  featuredOnly?: boolean;
}): StoreProduct[] {
  let list = (raw as RawProduct[]).map((p, i) => ({
    id: `demo-product-${p.sku.toLowerCase()}`,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    priceCents: p.priceCents,
    priceFormatted: money(p.priceCents),
    stock: p.stock,
    imageEmoji: p.imageEmoji,
    featured: p.featured,
    requiresLicense: Boolean(p.requiresLicense),
    _order: i,
  }));

  if (opts?.category && opts.category !== 'ALL') {
    list = list.filter((p) => p.category === opts.category);
  }
  if (opts?.featuredOnly) {
    list = list.filter((p) => p.featured);
  }

  list.sort((a, b) => {
    const ai = catalogueOrder.indexOf(a.category as (typeof catalogueOrder)[number]);
    const bi = catalogueOrder.indexOf(b.category as (typeof catalogueOrder)[number]);
    if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return list.map(({ _order: _, ...p }) => p);
}

export function getDemoCategories(): string[] {
  const present = new Set(getDemoProducts().map((p) => p.category));
  return catalogueOrder.filter((id) => present.has(id));
}

export type StoreProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  priceFormatted: string;
  stock: number;
  imageEmoji: string;
  featured: boolean;
  requiresLicense: boolean;
};

export type CartLine = { product: StoreProduct; quantity: number };

export {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STORE_DEPARTMENTS,
  shopCategoriesFromApi,
  LEGACY_CATEGORIES,
} from './store-catalog';

export const CART_KEY = '4ds_nexus_cart';

'use client';

import Link from 'next/link';
import type { StoreProduct } from '@/lib/store-types';
import { CATEGORY_LABELS } from '@/lib/store-types';
import { useCart } from './CartProvider';

export function ProductCard({
  product,
  dense = false,
  variant = 'card',
}: {
  product: StoreProduct;
  dense?: boolean;
  /** rail = compact horizontal-scroll card with + Add */
  variant?: 'card' | 'rail';
}) {
  const { addToCart, qtyInCart, lastAddedId, setDrawerOpen } = useCart();
  const inCart = qtyInCart(product.id);
  const justAdded = lastAddedId === product.id;

  function onAdd(openDrawer: boolean) {
    addToCart(product, 1, { openDrawer });
    if (!openDrawer) {
      // keep shop flow; user can open cart from header badge
    }
  }

  if (variant === 'rail') {
    const badge = product.requiresLicense
      ? 'Licence'
      : product.featured
        ? 'Featured'
        : product.stock > 0 && product.stock <= 8
          ? 'Low stock'
          : null;

    return (
      <article className={`nx-rail-card ${justAdded ? 'nx-rail-card--pulse' : ''}`}>
        {badge && (
          <span
            className={`nx-rail-card__badge ${product.requiresLicense ? 'nx-rail-card__badge--warn' : ''}`}
          >
            {badge}
          </span>
        )}
        <Link href={`/store/${product.id}`} className="nx-rail-card__media">
          <span aria-hidden>{product.imageEmoji}</span>
        </Link>
        <div className="nx-rail-card__row">
          <button
            type="button"
            className="nx-rail-card__add"
            disabled={product.stock < 1}
            onClick={() => onAdd(false)}
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? '✓' : '+'} Add{inCart > 0 ? ` (${inCart})` : ''}
          </button>
        </div>
        <div className="nx-rail-card__price">{product.priceFormatted}</div>
        <Link href={`/store/${product.id}`} className="nx-rail-card__name">
          {product.name}
        </Link>
        <div className="nx-rail-card__meta">
          {CATEGORY_LABELS[product.category] ?? product.category}
          {inCart > 0 ? ` · ${inCart} in cart` : ''}
        </div>
      </article>
    );
  }

  return (
    <article className={`nx-product${dense ? ' nx-product--dense' : ''}`}>
      <Link href={`/store/${product.id}`} className="nx-product-media">
        <span className="nx-product-emoji" aria-hidden>
          {product.imageEmoji}
        </span>
        {product.featured && <span className="nx-pill">Featured</span>}
        {product.stock < 1 && (
          <span className="nx-pill nx-pill--stockout">Out of stock</span>
        )}
      </Link>
      <div className="nx-product-body">
        <div className="nx-product-meta">
          <span className="nx-cat">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
          {product.requiresLicense && (
            <span className="nx-pill nx-pill--warn">Licence</span>
          )}
          {inCart > 0 && (
            <span className="nx-pill nx-pill--cart">{inCart} in cart</span>
          )}
        </div>
        <h3>
          <Link href={`/store/${product.id}`}>{product.name}</Link>
        </h3>
        <p>{product.description}</p>
        <div className="nx-product-footer">
          <div>
            <strong className="nx-price">{product.priceFormatted}</strong>
            <div className="nx-muted nx-stock">
              {product.stock} in stock · {product.sku}
            </div>
          </div>
          <button
            type="button"
            className="nx-btn nx-btn--primary nx-btn--sm"
            disabled={product.stock < 1}
            onClick={() => {
              onAdd(true);
              setDrawerOpen(true);
            }}
          >
            {inCart > 0 ? `Add more (${inCart})` : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}

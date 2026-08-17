'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCart } from '@/components/site/CartProvider';
import { publicApi } from '@/lib/api-client';
import type { StoreProduct } from '@/lib/store-types';
import { CATEGORY_LABELS } from '@/lib/store-types';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await publicApi<{
          success: boolean;
          data: StoreProduct[];
        }>('/store/catalog?tenant=demo');
        if (cancelled) return;
        const found = res.data.find((p) => p.id === params.id) ?? null;
        setProduct(found);
        if (found) {
          setRelated(
            res.data
              .filter((p) => p.category === found.category && p.id !== found.id)
              .slice(0, 3),
          );
        } else {
          setError('Product not found');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load product');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <LoadingSpinner
        brand
        fullScreen
        label="Loading product…"
        hint="Fetching specs and stock…"
      />
    );
  }

  if (error || !product) {
    return (
      <section className="nx-section">
        <ErrorAlert error={error || 'Product not found'} />
        <Link href="/store" className="nx-btn nx-btn--outline">
          Back to shop
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="nx-section nx-pdp">
        <Link href="/store" className="nx-back">
          ← Back to shop
        </Link>
        <div className="nx-pdp-grid">
          <div className={`nx-pdp-media nx-pdp-media--${product.category.toLowerCase()}`} aria-hidden>
            <span className="nx-pdp-emoji">{product.imageEmoji}</span>
            <span className="nx-pdp-sku">{product.sku}</span>
          </div>
          <div className="nx-pdp-info">
            <p className="nx-cat">
              {CATEGORY_LABELS[product.category] ?? product.category}
            </p>
            <h1>{product.name}</h1>
            <p className="nx-pdp-price">{product.priceFormatted}</p>
            <p>{product.description}</p>
            <ul className="nx-pdp-specs">
              <li>
                <span>SKU</span>
                <strong>{product.sku}</strong>
              </li>
              <li>
                <span>Stock</span>
                <strong>{product.stock} available</strong>
              </li>
              <li>
                <span>Licence</span>
                <strong>
                  {product.requiresLicense ? 'Required' : 'Not required'}
                </strong>
              </li>
            </ul>
            <div className="nx-pdp-actions">
              <label className="nx-qty">
                Qty
                <input
                  type="number"
                  min={1}
                  max={product.stock}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="nx-btn nx-btn--primary"
                disabled={product.stock < 1}
                onClick={() => addToCart(product, qty, { openDrawer: true })}
              >
                Add to cart
              </button>
            </div>
            <p className="nx-muted">
              Licence notes and delivery options are confirmed at checkout. Ask
              sales for compliance packs or install add-ons on this SKU.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="nx-section nx-section--alt">
          <div className="nx-section-head">
            <h2>Related in this category</h2>
          </div>
          <div className="nx-related">
            {related.map((p) => (
              <Link key={p.id} href={`/store/${p.id}`} className="nx-related-item">
                <span aria-hidden>{p.imageEmoji}</span>
                <strong>{p.name}</strong>
                <span>{p.priceFormatted}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

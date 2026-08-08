'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api-client';
import type { StoreProduct } from '@/lib/store-types';
import { ProductCard } from './ProductCard';
import { StoreScrollRail } from './StoreScrollRail';

export function FeaturedProducts({ dense = false }: { dense?: boolean }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await publicApi<{
          success: boolean;
          data: StoreProduct[];
        }>('/store/catalog?tenant=demo');
        if (!cancelled) {
          const featured = res.data.filter((p) => p.featured);
          const pool = featured.length ? featured : res.data;
          setProducts(pool.slice(0, dense ? 10 : 4));
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Catalog unavailable right now',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dense]);

  if (dense) {
    return (
      <div>
        {error ? (
          <p className="nx-muted">{error} — start the API to load live catalog.</p>
        ) : (
          <StoreScrollRail
            title="Trending right now"
            subtitle="Featured duty gear from Nexus Supply"
            href="/store"
            linkLabel="Full catalog"
            className="nx-scroll-section--products"
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} variant="rail" />
            ))}
          </StoreScrollRail>
        )}
      </div>
    );
  }

  return (
    <section className="nx-section nx-section--shop">
      <div className="nx-section-head">
        <div>
          <p className="nx-eyebrow">Nexus Supply</p>
          <h2>Professional gear, ready to deploy</h2>
          <p>
            Soft armor, plate carriers, CCTV kits, radios, and duty accessories —
            curated for security teams, with licence follow-up and optional
            technician install on camera systems.
          </p>
        </div>
      </div>
      {error ? (
        <p className="nx-muted">{error} — start the API to load live catalog.</p>
      ) : (
        <div className="nx-product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <div className="nx-section-cta">
        <Link href="/store" className="nx-btn nx-btn--primary">
          Browse full catalog
        </Link>
      </div>
    </section>
  );
}

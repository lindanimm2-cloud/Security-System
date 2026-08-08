'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ProductCard } from '@/components/site/ProductCard';
import { StoreScrollRail } from '@/components/site/StoreScrollRail';
import { useCart } from '@/components/site/CartProvider';
import { CartIcon } from '@/components/icons/CartIcon';
import { publicApi } from '@/lib/api-client';
import type { StoreProduct } from '@/lib/store-types';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  STORE_DEPARTMENTS,
} from '@/lib/store-types';

const RAIL_CATEGORIES = [
  'CCTV',
  'PACKAGES',
  'ALARMS',
  'ACCESS_CONTROL',
  'BODY_ARMOUR',
  'ELECTRIC_FENCING',
  'GATES',
  'GUARD_EQUIPMENT',
] as const;

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? 'ALL';
  const initialQuery = searchParams.get('q') ?? '';
  const { cartCount, cartLineCount, cartTotalCents, setDrawerOpen } = useCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(
    STORE_DEPARTMENTS.map((d) => d.id),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setCategory(searchParams.get('category') ?? 'ALL');
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await publicApi<{
          success: boolean;
          data: StoreProduct[];
          categories: string[];
        }>('/store/catalog?tenant=demo');
        if (!cancelled) {
          setProducts(res.data);
          if (res.categories?.length) setCategories(res.categories);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load catalog');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const browsing = category === 'ALL' && !query.trim();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = category === 'ALL' || p.category === category;
      const qOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [products, category, query]);

  const trending = useMemo(() => {
    const featured = products.filter((p) => p.featured);
    const pool = featured.length ? featured : products;
    return pool.slice(0, 12);
  }, [products]);

  const licenceRail = useMemo(
    () => products.filter((p) => p.requiresLicense).slice(0, 10),
    [products],
  );

  function selectCategory(id: string) {
    setCategory(id);
    setQuery('');
    router.push(id === 'ALL' ? '/store' : `/store?category=${id}`, {
      scroll: false,
    });
  }

  const money = `R ${(cartTotalCents / 100).toFixed(2)}`;

  return (
    <div className="nx-storefront">
      <section className="nx-store-masthead nx-store-masthead--solo nx-store-masthead--compact">
        <div className="nx-store-masthead-copy">
          <p className="nx-eyebrow">4DS Nexus Supply</p>
          <h1>Security catalogue</h1>
          <p>
            CCTV, alarms, access, fencing, guard kit, armour, and packages —
            checkout syncs to Gear Store CRM for sales &amp; installs.
          </p>
        </div>
      </section>

      <div className="nx-store-sticky-bar">
        <input
          type="search"
          className="nx-search"
          placeholder="Search products, SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search catalog"
        />
        <button
          type="button"
          className={`nx-cart-chip ${cartCount > 0 ? 'nx-cart-chip--active' : ''}`}
          onClick={() => setDrawerOpen(true)}
          aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
        >
          <span className="nx-cart-chip__icon">
            <CartIcon size={16} />
          </span>
          <span className="nx-cart-chip__count">{cartCount}</span>
          <span className="nx-cart-chip__label">
            Cart{cartLineCount > 0 ? ` · ${cartLineCount} lines` : ''}
          </span>
          {cartCount > 0 && <span className="nx-cart-chip__total">{money}</span>}
        </button>
      </div>

      {loading && (
        <LoadingSpinner
          brand
          label="Loading catalog…"
          hint="Pulling departments and live stock…"
        />
      )}
      {error && <ErrorAlert error={error} />}

      {!loading && !error && browsing && (
        <>
          <StoreScrollRail
            title="Shop by department"
            subtitle="Swipe or scroll — every aisle links to live CRM stock"
            href="/store#catalog"
            linkLabel="View all"
          >
            <button
              type="button"
              className={`nx-dept-tile ${category === 'ALL' ? 'nx-dept-tile--active' : ''}`}
              onClick={() => selectCategory('ALL')}
            >
              <span className="nx-dept-tile__icon" aria-hidden>
                📦
              </span>
              <strong>All</strong>
            </button>
            {categories.map((c) => {
              const dept = STORE_DEPARTMENTS.find((d) => d.id === c);
              return (
                <button
                  key={c}
                  type="button"
                  className="nx-dept-tile"
                  title={dept?.blurb}
                  onClick={() => selectCategory(c)}
                >
                  <span className="nx-dept-tile__icon" aria-hidden>
                    {CATEGORY_ICONS[c] ?? dept?.icon ?? '•'}
                  </span>
                  <strong>{CATEGORY_LABELS[c] ?? c}</strong>
                </button>
              );
            })}
          </StoreScrollRail>

          <StoreScrollRail
            title="Trending right now"
            subtitle="Featured & high-demand lines — tap + Add to build your cart"
            href="/store?category=PACKAGES"
            linkLabel="Packages"
            className="nx-scroll-section--products"
          >
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} variant="rail" />
            ))}
          </StoreScrollRail>

          {RAIL_CATEGORIES.map((catId) => {
            const items = products.filter((p) => p.category === catId).slice(0, 10);
            if (!items.length) return null;
            return (
              <StoreScrollRail
                key={catId}
                title={CATEGORY_LABELS[catId] ?? catId}
                subtitle={
                  STORE_DEPARTMENTS.find((d) => d.id === catId)?.blurb
                }
                href={`/store?category=${catId}`}
                className="nx-scroll-section--products"
              >
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} variant="rail" />
                ))}
              </StoreScrollRail>
            );
          })}

          {licenceRail.length > 0 && (
            <StoreScrollRail
              title="Licensed equipment"
              subtitle="Firearms & CED — checkout flags sales follow-up in CRM"
              href="/store?category=FIREARMS"
              className="nx-scroll-section--products"
            >
              {licenceRail.map((p) => (
                <ProductCard key={p.id} product={p} variant="rail" />
              ))}
            </StoreScrollRail>
          )}
        </>
      )}

      {!loading && !error && !browsing && (
        <section id="catalog" className="nx-shop nx-shop-layout">
          <div className="nx-result-bar">
            <p className="nx-muted nx-result-count">
              {filtered.length} product{filtered.length === 1 ? '' : 's'}
              {category !== 'ALL'
                ? ` · ${CATEGORY_LABELS[category] ?? category}`
                : ''}
              {query.trim() ? ` · “${query.trim()}”` : ''}
            </p>
            <button
              type="button"
              className="nx-linkish"
              onClick={() => {
                setCategory('ALL');
                setQuery('');
                router.push('/store', { scroll: false });
              }}
            >
              Clear · show rails
            </button>
          </div>
          <div className="nx-product-grid nx-product-grid--dense">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} dense />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="nx-empty-catalog">
              No products match.{' '}
              <button
                type="button"
                className="nx-linkish"
                onClick={() => {
                  setCategory('ALL');
                  setQuery('');
                  router.push('/store', { scroll: false });
                }}
              >
                Reset
              </button>
            </p>
          )}
        </section>
      )}

      <section className="nx-band nx-band--store">
        <div className="nx-band-inner">
          <h2>Orders sync to Gear Store CRM</h2>
          <p>
            Checkout creates a store order for sales follow-up, licence lines,
            and optional technician install jobs.
          </p>
          <div className="nx-hero-actions">
            <button
              type="button"
              className="nx-btn nx-btn--primary"
              onClick={() => setDrawerOpen(true)}
            >
              Open cart ({cartCount})
            </button>
            <Link href="/services" className="nx-btn nx-btn--ghost-light">
              Installation services
            </Link>
            <Link href="/portals" className="nx-btn nx-btn--ghost-light">
              Employee login
            </Link>
          </div>
        </div>
      </section>

      {cartCount > 0 && (
        <div className="nx-floating-cart">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`View cart, ${cartCount} items`}
          >
            <strong className="nx-floating-cart__icon">
              <CartIcon size={16} />
              <span>{cartCount}</span>
            </strong>
            <span>
              {cartLineCount} product{cartLineCount === 1 ? '' : 's'} · {money}
            </span>
            <em>View cart</em>
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CartIcon } from '@/components/icons/CartIcon';
import { useCart } from './CartProvider';
import { useSiteClient } from './SiteClientProvider';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/store', label: 'Shop' },
  { href: '/careers', label: 'Careers' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, setDrawerOpen } = useCart();
  const { ready, session, fullName } = useSiteClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/store?q=${encodeURIComponent(q)}` : '/store');
  }

  return (
    <>
      <div className="nx-utility-bar">
        <div className="nx-utility-bar-inner">
          <div>
            <strong>4DS Nexus Supply</strong>
            {' · '}
            Licensed pathways · Control-room backed · Duty-ready stock
          </div>
          <div className="nx-utility-links">
            <Link href="/account">Client account</Link>
            <Link href="/contact">Sales desk</Link>
            <Link href="/portals" className="nx-utility-employee">
              Employee login
            </Link>
          </div>
        </div>
      </div>

      <header className={`nx-header${scrolled ? ' nx-header--scrolled' : ''}`}>
        <div className="nx-header-inner">
          <Link href="/" className="nx-logo" onClick={() => setOpen(false)}>
            <Image
              src="/brand/4ds-logo.png"
              alt="4DS Nexus"
              width={140}
              height={36}
              className="nx-logo-img"
              priority
            />
            <span className="nx-logo-word">
              4DS <em>Nexus</em>
            </span>
          </Link>

          <div className="nx-header-search">
            <form onSubmit={onSearch} role="search">
              <input
                type="search"
                placeholder="Search gear, SKU, CCTV…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search catalog"
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className="nx-header-actions">
            <Link
              href="/portals"
              className="nx-btn nx-btn--employee nx-btn--sm"
              onClick={() => setOpen(false)}
            >
              Employee login
            </Link>
            <button
              type="button"
              className="nx-btn nx-btn--primary nx-btn--sm nx-header-cart-btn"
              onClick={() => {
                setOpen(false);
                setDrawerOpen(true);
              }}
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <CartIcon size={16} />
              <span className="nx-header-cart-text">Cart</span>
              {cartCount > 0 && (
                <span className="nx-header-cart-badge">{cartCount}</span>
              )}
            </button>
            <button
              type="button"
              className="nx-nav-toggle"
              aria-expanded={open}
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <nav className={`nx-nav ${open ? 'nx-nav--open' : ''}`}>
            {NAV.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active ? 'nx-nav-link nx-nav-link--active' : 'nx-nav-link'
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/account"
              className={
                pathname.startsWith('/account')
                  ? 'nx-nav-link nx-nav-link--active'
                  : 'nx-nav-link'
              }
              onClick={() => setOpen(false)}
            >
              {ready && session
                ? fullName?.split(' ')[0] || 'Account'
                : 'Account'}
            </Link>
            <Link
              href="/portals"
              className={
                pathname.startsWith('/portals') || pathname.startsWith('/login')
                  ? 'nx-nav-link nx-nav-link--employee nx-nav-link--active'
                  : 'nx-nav-link nx-nav-link--employee'
              }
              onClick={() => setOpen(false)}
            >
              Employee login
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
    </>
  );
}

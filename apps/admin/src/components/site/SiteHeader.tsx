'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteClient } from './SiteClientProvider';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/careers', label: 'Careers' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { ready, session, fullName } = useSiteClient();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="nx-utility-bar">
        <div className="nx-utility-bar-inner">
          <div>
            <strong>4DS Nexus</strong>
            {' · '}
            24/7 control room · Protection · Response
          </div>
          <div className="nx-utility-links">
            <ThemeToggle className="theme-toggle--compact nx-utility-theme" />
            <Link href="/contact">Sales desk</Link>
            <Link href="/login" className="nx-utility-employee">
              Login
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
              href="/portal/login"
              className={
                pathname.startsWith('/portal')
                  ? 'nx-nav-link nx-nav-link--active'
                  : 'nx-nav-link'
              }
              onClick={() => setOpen(false)}
            >
              {ready && session
                ? fullName?.split(' ')[0] || 'Portal'
                : 'Client portal'}
            </Link>
          </nav>

          <div className="nx-header-actions">
            <ThemeToggle className="theme-toggle--compact nx-header-theme" />
            <Link
              href="/contact"
              className="nx-btn nx-btn--primary nx-btn--sm"
              onClick={() => setOpen(false)}
            >
              Request quote
            </Link>
            <Link
              href="/login"
              className="nx-btn nx-btn--employee nx-btn--sm"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
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
        </div>
      </header>
    </>
  );
}

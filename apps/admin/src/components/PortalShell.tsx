'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { filterPortalNav, portalMobileNav, portalPathRequiresAccess } from '@/lib/portal-nav';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { PortalNotificationCenter } from './portal/PortalNotificationCenter';
import { PortalNavClock } from './portal/PortalNavClock';
import { PortalProtectionBadge } from './portal/PortalProtectionBadge';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { clientApi, type ApiResponse } from '@/lib/api-client';

export function PortalShell({
  session,
  children,
}: {
  session: AuthSession;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { access, loading: accessLoading, tierCode } = useSubscriptionAccess();
  const navSections = useMemo(() => {
    const sections = filterPortalNav(access, accessLoading);
    if (tierCode !== 'PREMIUM') return sections;
    return sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.href !== '/portal/subscription/upgrade'),
    }));
  }, [access, accessLoading, tierCode]);

  const mobileNavItems = useMemo(
    () =>
      portalMobileNav(access, accessLoading).map((item) => ({
        href: item.href,
        label: item.mobileLabel,
        icon: item.icon,
        exact: item.exact,
        badge: item.href === '/portal' && unread > 0 ? unread : undefined,
      })),
    [access, accessLoading, unread],
  );

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await clientApi.get<
          ApiResponse<{ unreadCount?: number; stats?: { unreadNotifications?: number } }>
        >('/client/notifications');
        if (cancelled) return;
        setUnread(res.data?.unreadCount ?? 0);
      } catch {
        /* keep last */
      }
    }
    void poll();
    const onChanged = () => void poll();
    window.addEventListener('4ds-notifications-changed', onChanged);
    const id = window.setInterval(() => void poll(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('4ds-notifications-changed', onChanged);
    };
  }, []);

  useEffect(() => {
    if (accessLoading || !access) return;
    const required = portalPathRequiresAccess(pathname);
    if (required && !access[required]) {
      router.replace('/portal/subscription/upgrade');
    }
  }, [access, accessLoading, pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }, []);

  function logout() {
    clearSession('client');
    router.push('/portal/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="shell shell--portal shell--with-bottom-nav">
      <header className="mobile-shell-header mobile-shell-header--portal">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`menu-toggle-icon ${menuOpen ? 'menu-toggle-icon--open' : ''}`} />
        </button>
        <BrandMark variant="portal" compact />
        <div className="mobile-topbar-actions">
          <PortalNavClock compact />
          <PortalNotificationCenter />
          <ThemeToggle className="theme-toggle--compact" />
          <PortalProtectionBadge compact />
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`portal-sidebar ${menuOpen ? 'portal-sidebar--open' : ''}`}>
        <div className="portal-sidebar-brand">
          <BrandMark variant="portal" />
        </div>
        <nav className="portal-sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="portal-nav-section">
              <span className="portal-nav-section-title">
                <NavIcon name={section.icon} size={14} className="nav-icon--section" />
                {section.title}
              </span>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`portal-sidebar-link ${isActive(item.href, item.exact) ? 'portal-sidebar-link--active' : ''}`}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <div className="portal-sidebar-user">
            {session.user.firstName} {session.user.lastName}
          </div>
          <button type="button" className="btn-ghost btn-ghost--full" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell-main portal-shell-main">
        <header className="topbar topbar--portal">
          <div className="topbar-brand">
            <BrandMark variant="portal" compact showProduct={false} href={false} />
            <div>
              <h1>Protection Dashboard</h1>
              <p>
                {session.user.firstName} {session.user.lastName} ·{' '}
                {session.user.tenant?.name ?? '4DS Protection'}
              </p>
            </div>
          </div>
          <div className="topbar-actions">
            <PortalNavClock />
            <PortalNotificationCenter />
            <ThemeToggle className="theme-toggle--compact" />
            <PortalProtectionBadge />
          </div>
        </header>
        <main className="portal-main portal-main--with-sidebar">{children}</main>
      </div>

      <MobileBottomNav items={mobileNavItems} ariaLabel="Client Portal" />
    </div>
  );
}

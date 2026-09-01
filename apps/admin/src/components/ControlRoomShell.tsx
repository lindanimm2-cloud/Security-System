'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { mobileNavForRole, navForRole, canAccessControlRoomRoute } from '@/lib/control-room-nav';
import { roleDisplayLabel } from '@/lib/role-labels';
import { adminHomeForRole } from '@/lib/admin-home';
import { NotificationCenter } from './control-room/NotificationCenter';
import { NavClock } from './NavClock';
import { BrandMark } from './BrandMark';
import { NavIcon } from './nav/NavIcon';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { ThemeToggle } from './ThemeToggle';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { SidebarCollapseButton, SidebarWebsiteLink, SignOutIcon } from './nav/SidebarCollapseButton';
import { FloatingSupportDock } from './FloatingSupportDock';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { navHrefIsActive } from '@/lib/nav-active';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { useCrSettings } from '@/hooks/useCrSettings';

export function ControlRoomShell({
  session,
  children,
  title = 'Live Ops Board',
}: {
  session: AuthSession;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [criticalCount, setCriticalCount] = useState(0);
  const { collapsed, toggle } = useSidebarCollapsed();
  const handoff = useActionHandoff();
  const crSettings = useCrSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('cr-compact-tables', Boolean(crSettings.general?.compactTables));
  }, [crSettings.general?.compactTables]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await adminApi.get<
          ApiResponse<{ stats?: { criticalIncidents?: number } }>
        >('/control-room/dashboard');
        if (cancelled) return;
        setCriticalCount(res.data?.stats?.criticalIncidents ?? 0);
      } catch {
        /* keep last */
      }
    }
    void poll();
    if (!shouldBackgroundPoll()) {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(() => void poll(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Always clear stale body locks from prior menu state / navigation.
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
    handoff.begin('sign-out', () => {
      clearSession('admin');
      router.push('/login');
    });
  }

  const navItems = navForRole(session.user.role);
  const navHrefs = navItems.map((item) => item.href);
  const homeHref = adminHomeForRole(session.user.role);
  const brandProduct =
    session.user.role === 'DEVELOPER' ? 'Developer' : undefined;

  useEffect(() => {
    if (!pathname?.startsWith('/control-room')) return;
    if (canAccessControlRoomRoute(session.user.role, pathname)) return;
    router.replace(homeHref);
  }, [pathname, session.user.role, homeHref, router]);

  function isActive(href: string, exact?: boolean) {
    return navHrefIsActive(pathname, href, exact, navHrefs);
  }

  const hideSupportDock =
    pathname === '/control-room' ||
    pathname.includes('/documents') ||
    pathname.includes('/chat') ||
    pathname.includes('/incidents') ||
    pathname.includes('/map');

  const mobileNavItems = mobileNavForRole(session.user.role).map((item) => ({
    href: item.href,
    label: item.mobileLabel,
    icon: item.icon,
    exact: item.exact,
    badge:
      item.href === '/control-room' && criticalCount > 0
        ? criticalCount
        : undefined,
  }));

  return (
    <>
      {handoff.overlay}
    <div className="shell shell--admin shell--with-bottom-nav">
      <header className="mobile-shell-header mobile-shell-header--admin">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`menu-toggle-icon ${menuOpen ? 'menu-toggle-icon--open' : ''}`} />
        </button>
        <BrandMark
          variant="control"
          compact
          href={homeHref}
          productLabel={brandProduct}
        />
        <h1 className="mobile-shell-header__title">{title}</h1>
        <div className="mobile-topbar-actions">
          <NavClock compact />
          <Link href="/control-room/map" className="badge badge--live badge--link badge--compact">
            LIVE
          </Link>
          <NotificationCenter />
          <ThemeToggle className="theme-toggle--compact" />
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

      <aside
        className={`sidebar ${menuOpen ? 'sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}
      >
        <div className="sidebar-brand">
          <BrandMark
            variant="control"
            compact={collapsed}
            showProduct={!collapsed}
            href={homeHref}
            productLabel={brandProduct}
          />
          <SidebarCollapseButton collapsed={collapsed} onClick={toggle} />
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-tip={item.label}
              aria-label={item.label}
              className={`sidebar-link ${isActive(item.href, item.exact) ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link__icon">
                <NavIcon name={item.icon} size={collapsed ? 20 : 18} />
              </span>
              <span className="sidebar-link__label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link
            href="/control-room/profile"
            className="sidebar-user sidebar-user--link"
            title={`${session.user.firstName} ${session.user.lastName}`}
          >
            <div className="avatar avatar--admin">
              {session.user.firstName[0]}{session.user.lastName[0]}
            </div>
            <div className="sidebar-user-copy">
              <div className="sidebar-user-name">
                {session.user.firstName} {session.user.lastName}
              </div>
              <div className="sidebar-user-role">{roleDisplayLabel(session.user.role)}</div>
            </div>
          </Link>
          <ThemeToggle className="theme-toggle--sidebar" />
          <SidebarWebsiteLink />
          <button
            type="button"
            className="btn-ghost btn-ghost--full sidebar-signout"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-brand">
            <BrandMark variant="control" compact showProduct={false} href={false} />
            <div>
              <h1>{title}</h1>
              <p>4DS Security</p>
            </div>
          </div>
          <div className="topbar-actions">
            <NavClock compact />
            <Link href="/control-room/map" className="badge badge--live badge--link">
              LIVE
            </Link>
            <NotificationCenter />
            <ThemeToggle className="theme-toggle--compact" />
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>

      {!hideSupportDock && (
        <FloatingSupportDock chatHref="/control-room/chat" />
      )}
      <MobileBottomNav
        items={mobileNavItems}
        ariaLabel={session.user.role === 'DEVELOPER' ? 'Developer' : 'Control Panel'}
      />
    </div>
    </>
  );
}

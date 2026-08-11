'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { mobileNavForRole, navForRole } from '@/lib/control-room-nav';
import { roleDisplayLabel } from '@/lib/role-labels';
import { NotificationCenter } from './control-room/NotificationCenter';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { NavIcon } from './nav/NavIcon';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { MAP_SCREENSHOT_FROZEN_AT } from '@/lib/map-screenshot';
import { ThemeToggle } from './ThemeToggle';
import { adminApi, type ApiResponse } from '@/lib/api-client';

export function ControlRoomShell({
  session,
  children,
  title = 'Control Panel',
}: {
  session: AuthSession;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [criticalCount, setCriticalCount] = useState(0);

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
    clearSession('admin');
    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const isLiveMap = pathname === '/control-room/map' || pathname.startsWith('/control-room/map/');
  const screenshotClock = isLiveMap ? MAP_SCREENSHOT_FROZEN_AT : undefined;

  const navItems = navForRole(session.user.role);
  const mobileNavItems = mobileNavForRole(session.user.role).map((item) => ({
    href: item.href,
    label: item.mobileLabel,
    icon: item.icon,
    exact: item.exact,
    badge:
      item.href === '/control-room/incidents' && criticalCount > 0
        ? criticalCount
        : undefined,
  }));

  return (
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
        <BrandMark variant="control" compact />
        <div className="mobile-topbar-actions">
          <NavClock compact frozenAt={screenshotClock} />
          <NotificationCenter />
          <ThemeToggle className="theme-toggle--compact" />
          <Link href="/control-room/map" className="badge badge--live badge--link badge--compact">
            LIVE
          </Link>
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

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <BrandMark variant="control" />
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href, item.exact) ? 'sidebar-link--active' : ''}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar--admin">
              {session.user.firstName[0]}{session.user.lastName[0]}
            </div>
            <div>
              <div className="sidebar-user-name">
                {session.user.firstName} {session.user.lastName}
              </div>
              <div className="sidebar-user-role">{roleDisplayLabel(session.user.role)}</div>
            </div>
          </div>
          <button type="button" className="btn-ghost btn-ghost--full" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-brand">
            <BrandMark variant="control" compact showProduct={false} href={false} />
            <div>
              <h1>{title}</h1>
              <p>4DS Solutions · Control Panel · {session.user.tenant?.name ?? 'Operations'}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <NavClock frozenAt={screenshotClock} />
            <NotificationCenter />
            <ThemeToggle className="theme-toggle--compact" />
            <Link href="/control-room/map" className="badge badge--live badge--link">
              LIVE
            </Link>
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>

      <MobileBottomNav items={mobileNavItems} ariaLabel="Control Panel" />
    </div>
  );
}

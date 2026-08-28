'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { MEDICAL_MOBILE_NAV, MEDICAL_NAV } from '@/lib/medical-nav';
import { navHrefIsActive } from '@/lib/nav-active';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { ThemeToggle } from './ThemeToggle';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { SidebarCollapseButton, SidebarWebsiteLink, SignOutIcon } from './nav/SidebarCollapseButton';
import { roleDisplayLabel } from '@/lib/role-labels';
import { FloatingSupportDock } from './FloatingSupportDock';
import { ShellRouteActions } from './nav/ShellRouteActions';

export function MedicalShell({
  session,
  children,
  title,
}: {
  session: AuthSession;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  const handoff = useActionHandoff();

  useEffect(() => setMenuOpen(false), [pathname]);

  function logout() {
    handoff.begin('sign-out', () => {
      clearSession('admin');
      router.push('/login');
    });
  }

  function isActive(href: string, exact?: boolean) {
    return navHrefIsActive(
      pathname,
      href,
      exact,
      MEDICAL_NAV.map((item) => item.href),
    );
  }

  return (
    <>
      {handoff.overlay}
    <div className="shell shell--medical shell--with-bottom-nav">
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
        <BrandMark variant="medical" compact />
        <h1 className="mobile-shell-header__title">{title ?? 'Medical'}</h1>
        <div className="mobile-topbar-actions">
          <ShellRouteActions homeHref="/medical" compact />
          <NavClock compact />
          <ThemeToggle className="theme-toggle--compact" />
        </div>
      </header>

      {menuOpen && (
        <button type="button" className="sidebar-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar-brand">
          <BrandMark variant="medical" compact={collapsed} showProduct={!collapsed} />
          <SidebarCollapseButton collapsed={collapsed} onClick={toggle} />
        </div>
        <nav className="sidebar-nav">
          {MEDICAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-tip={item.label}
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
          <div className="sidebar-user">
            <div className="avatar avatar--admin">
              {session.user.firstName[0]}
              {session.user.lastName[0]}
            </div>
            <div className="sidebar-user-copy">
              <div className="sidebar-user-name">
                {session.user.firstName} {session.user.lastName}
              </div>
              <div className="sidebar-user-role">{roleDisplayLabel(session.user.role)}</div>
            </div>
          </div>
          <SidebarWebsiteLink />
          <button type="button" className="btn-ghost btn-ghost--full sidebar-signout" onClick={logout}>
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-brand">
            <BrandMark variant="medical" compact showProduct={false} href={false} />
            <div>
              <h1>{title ?? 'Medical dispatch'}</h1>
              <p>4DS Medical · dual response</p>
            </div>
          </div>
          <div className="topbar-actions">
            <ShellRouteActions homeHref="/medical" />
            <NavClock />
            <ThemeToggle className="theme-toggle--compact" />
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>
      <FloatingSupportDock chatHref="/control-room/chat" callPhone="+27110000000" />
      <MobileBottomNav
        items={MEDICAL_MOBILE_NAV.map((item) => ({
          href: item.href,
          label: item.mobileLabel,
          icon: item.icon,
          exact: item.exact,
        }))}
        ariaLabel="Medical"
      />
    </div>
    </>
  );
}

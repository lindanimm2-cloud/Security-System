'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { SUPERVISOR_MOBILE_NAV, SUPERVISOR_NAV } from '@/lib/supervisor-nav';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { ThemeToggle } from './ThemeToggle';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { SidebarCollapseButton, SignOutIcon } from './nav/SidebarCollapseButton';
import { roleDisplayLabel } from '@/lib/role-labels';

export function SupervisorShell({
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

  useEffect(() => setMenuOpen(false), [pathname]);

  function logout() {
    clearSession('admin');
    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="shell shell--supervisor shell--with-bottom-nav">
      <header className="mobile-shell-header mobile-shell-header--officer">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`menu-toggle-icon ${menuOpen ? 'menu-toggle-icon--open' : ''}`} />
        </button>
        <BrandMark variant="officer" compact />
        <div className="mobile-topbar-actions">
          <NavClock compact />
          <ThemeToggle className="theme-toggle--compact" />
        </div>
      </header>

      {menuOpen && (
        <button type="button" className="sidebar-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`officer-sidebar ${menuOpen ? 'officer-sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="officer-sidebar-brand">
          <BrandMark variant="officer" compact={collapsed} showProduct={!collapsed} />
          <SidebarCollapseButton collapsed={collapsed} onClick={toggle} />
        </div>
        <nav className="officer-sidebar-nav">
          {SUPERVISOR_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`officer-sidebar-link ${isActive(item.href, item.exact) ? 'officer-sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link__icon">
                <NavIcon name={item.icon} size={collapsed ? 20 : 18} />
              </span>
              <span className="sidebar-link__label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="officer-sidebar-footer">
          <div className="officer-sidebar-user sidebar-user-copy">
            {session.user.firstName} {session.user.lastName}
          </div>
          <span className="officer-sidebar-role sidebar-user-copy">
            {roleDisplayLabel(session.user.role)}
          </span>
          <button type="button" className="btn-ghost btn-ghost--full sidebar-signout" onClick={logout}>
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="officer-main">
        {title && (
          <header className="officer-topbar">
            <h1>{title}</h1>
            <div className="officer-topbar__actions">
              <NavClock compact />
              <ThemeToggle className="theme-toggle--compact" />
            </div>
          </header>
        )}
        <div className="officer-content">{children}</div>
      </main>
      <MobileBottomNav
        items={SUPERVISOR_MOBILE_NAV.map((item) => ({
          href: item.href,
          label: item.mobileLabel,
          icon: item.icon,
          exact: item.exact,
        }))}
        ariaLabel="Supervisor"
      />
    </div>
  );
}

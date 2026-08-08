'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { OFFICER_MOBILE_NAV, OFFICER_NAV } from '@/lib/officer-nav';
import { OfficerQuickRecordFab } from './officer/OfficerQuickRecordFab';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { ThemeToggle } from './ThemeToggle';
import { OfficerStatusBadge } from './officer/StatusBadges';
import { useOfficerStatus } from './officer/OfficerStatusProvider';
import { MobileBottomNav } from './nav/MobileBottomNav';

export function OfficerShell({
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
  const { status } = useOfficerStatus();

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
    clearSession('officer');
    router.push('/officer/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="shell shell--officer shell--with-bottom-nav">
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
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`officer-sidebar ${menuOpen ? 'officer-sidebar--open' : ''}`}>
        <div className="officer-sidebar-brand">
          <BrandMark variant="officer" />
        </div>
        <nav className="officer-sidebar-nav">
          {OFFICER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`officer-sidebar-link ${isActive(item.href, item.exact) ? 'officer-sidebar-link--active' : ''}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="officer-sidebar-footer">
          <div className="officer-sidebar-user">
            {session.user.firstName} {session.user.lastName}
          </div>
          <span className="officer-sidebar-role">Field Officer</span>
          <button type="button" className="btn-ghost btn-ghost--full" onClick={logout}>
            Sign out
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
              <OfficerStatusBadge status={status} linkToProfile />
            </div>
          </header>
        )}
        <div className="officer-content">{children}</div>
      </main>
      <OfficerQuickRecordFab />
      <MobileBottomNav
        items={OFFICER_MOBILE_NAV.map((item) => ({
          href: item.href,
          label: item.mobileLabel,
          icon: item.icon,
          exact: item.exact,
        }))}
        ariaLabel="Officer"
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { TECH_MOBILE_NAV, TECH_NAV } from '@/lib/tech-nav';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { ThemeToggle } from './ThemeToggle';
import { roleDisplayLabel } from '@/lib/role-labels';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { techApi, type ApiResponse } from '@/lib/api-client';

export function TechShell({
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
  const [activeJobs, setActiveJobs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await techApi.get<
          ApiResponse<{ stats?: { active?: number; scheduled?: number } }>
        >('/store/tech/me');
        if (cancelled) return;
        const s = res.data?.stats;
        setActiveJobs((s?.active ?? 0) + (s?.scheduled ?? 0));
      } catch {
        /* keep last */
      }
    }
    void poll();
    const id = window.setInterval(() => void poll(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

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
    clearSession('technician');
    router.push('/tech/login');
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
          {TECH_NAV.map((item) => (
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
          <span className="officer-sidebar-role">
            {session.user.jobTitle || roleDisplayLabel(session.user.role)}
          </span>
          <button type="button" className="btn-ghost btn-ghost--full" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-brand">
            <BrandMark variant="officer" compact showProduct={false} href={false} />
            <div>
              <h1>{title ?? 'Install Tech'}</h1>
              <p>4DS Solutions · Technician Team</p>
            </div>
          </div>
          <div className="topbar-actions">
            <NavClock />
            <ThemeToggle className="theme-toggle--compact" />
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>

      <MobileBottomNav
        items={TECH_MOBILE_NAV.map((item) => ({
          href: item.href,
          label: item.mobileLabel,
          icon: item.icon,
          exact: item.exact,
          badge: item.href === '/tech' && activeJobs > 0 ? activeJobs : undefined,
        }))}
        ariaLabel="Technician"
      />
    </div>
  );
}

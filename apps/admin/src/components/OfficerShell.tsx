'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { OFFICER_MOBILE_NAV, OFFICER_NAV } from '@/lib/officer-nav';
import { navHrefIsActive } from '@/lib/nav-active';
import { OfficerQuickRecordFab } from './officer/OfficerQuickRecordFab';
import { BrandMark } from './BrandMark';
import { NavClock } from './NavClock';
import { ThemeToggle } from './ThemeToggle';
import { OfficerStatusBadge } from './officer/StatusBadges';
import { useOfficerStatus } from './officer/OfficerStatusProvider';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { fetchInternalChatUnreadCount } from '@/lib/internal-chat-api';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { SidebarCollapseButton, SidebarWebsiteLink, SignOutIcon } from './nav/SidebarCollapseButton';
import { FloatingSupportDock } from './FloatingSupportDock';
import { ShellRouteActions } from './nav/ShellRouteActions';

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
  const [needsYou, setNeedsYou] = useState(0);
  const { collapsed, toggle } = useSidebarCollapsed();
  const handoff = useActionHandoff();
  const { status } = useOfficerStatus();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const unread = await fetchInternalChatUnreadCount('officer');
        if (cancelled) return;
        setNeedsYou(unread);
      } catch {
        /* keep last badge */
      }
    }
    void poll();
    if (!shouldBackgroundPoll()) {
      return () => {
        cancelled = true;
      };
    }
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
    handoff.begin('sign-out', () => {
      clearSession('officer');
      router.push('/officer/login');
    });
  }

  function isActive(href: string, exact?: boolean) {
    return navHrefIsActive(
      pathname,
      href,
      exact,
      OFFICER_NAV.map((item) => item.href),
    );
  }

  return (
    <>
      {handoff.overlay}
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
        <h1 className="mobile-shell-header__title">{title ?? 'Officer'}</h1>
        <div className="mobile-topbar-actions">
          <ShellRouteActions homeHref="/officer" compact />
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

      <aside
        className={`officer-sidebar ${menuOpen ? 'officer-sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}
      >
        <div className="officer-sidebar-brand">
          <BrandMark variant="officer" compact={collapsed} showProduct={!collapsed} />
          <SidebarCollapseButton collapsed={collapsed} onClick={toggle} />
        </div>
        <nav className="officer-sidebar-nav">
          {OFFICER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-tip={item.label}
              aria-label={item.label}
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
          <span className="officer-sidebar-role sidebar-user-copy">Field Officer</span>
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

      <main className="officer-main">
        {title && (
          <header className="officer-topbar">
            <h1>{title}</h1>
            <div className="officer-topbar__actions">
              <ShellRouteActions homeHref="/officer" />
              <NavClock compact />
              <ThemeToggle className="theme-toggle--compact" />
              <OfficerStatusBadge status={status} linkToProfile />
            </div>
          </header>
        )}
        <div className="officer-content">{children}</div>
      </main>
      <FloatingSupportDock chatHref="/officer/messages" callPhone="+27110000000" />
      <OfficerQuickRecordFab />
      <MobileBottomNav
        items={OFFICER_MOBILE_NAV.map((item) => ({
          href: item.href,
          label: item.mobileLabel,
          icon: item.icon,
          exact: item.exact,
          badge:
            item.href === '/officer/messages' && needsYou > 0
              ? needsYou
              : item.href === '/officer/queue' && status && !['AVAILABLE', 'OFF_DUTY'].includes(status)
                ? '!'
                : undefined,
        }))}
        ariaLabel="Officer"
      />
    </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
import { NavIcon } from '@/components/nav/NavIcon';
import { filterPortalNav, portalMobileNav, portalPathRequiresAccess } from '@/lib/portal-nav';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { PortalNotificationCenter } from './portal/PortalNotificationCenter';
import { MiniCallSafetyBar } from './portal/MiniCallSafetyBar';
import { PortalPermissionsBanner } from './portal/PortalPermissions';
import { PortalNavClock } from './portal/PortalNavClock';
import { PortalProtectionBadge } from './portal/PortalProtectionBadge';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { MobileBottomNav } from './nav/MobileBottomNav';
import { clientApi } from '@/lib/api-client';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { getOrCreateLocalDeviceId } from '@/lib/device-security';
import { navHrefIsActive } from '@/lib/nav-active';
import { SidebarCollapseButton, SidebarWebsiteLink, SignOutIcon } from '@/components/nav/SidebarCollapseButton';
import { FloatingSupportDock } from './FloatingSupportDock';
import { ShellRouteActions } from './nav/ShellRouteActions';
import { PortalAmbientProvider, usePortalAmbient } from './portal/PortalAmbientProvider';

export function PortalShell({
  session,
  children,
}: {
  session: AuthSession;
  children: React.ReactNode;
}) {
  return (
    <PortalAmbientProvider>
      <PortalShellInner session={session}>{children}</PortalShellInner>
    </PortalAmbientProvider>
  );
}

function PortalShellInner({
  session,
  children,
}: {
  session: AuthSession;
  children: React.ReactNode;
}) {
  const { ambient } = usePortalAmbient();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  const handoff = useActionHandoff();
  const { access, loading: accessLoading, tierCode } = useSubscriptionAccess();
  const hideQuickActions = /^\/portal\/(?:chat|messages|communications|family\/chat|contacts)(?:\/|$)/.test(
    pathname,
  );
  const hasPanicConsole =
    pathname === '/portal' ||
    pathname === '/portal/protect' ||
    pathname === '/portal/emergency';
  const showSilentFab =
    !hasPanicConsole && /^\/portal\/security(?:\/|$)/.test(pathname);
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
      })),
    [access, accessLoading],
  );

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
    const publicId = getOrCreateLocalDeviceId();
    void clientApi.post('/client/security/devices/heartbeat', { publicId }).catch(() => undefined);
  }, []);

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
      clearSession('client');
      router.push('/portal/login');
    });
  }

  const navHrefs = useMemo(
    () => navSections.flatMap((section) => section.items.map((item) => item.href)),
    [navSections],
  );

  function isActive(href: string, exact?: boolean) {
    return navHrefIsActive(pathname, href, exact, navHrefs);
  }

  return (
    <>
      {handoff.overlay}
    <div
      className="shell shell--portal shell--with-bottom-nav"
      data-portal-ambient={ambient}
    >
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
        <h1 className="mobile-shell-header__title">4DS Protect</h1>
        <div className="mobile-topbar-actions">
          <ShellRouteActions homeHref="/portal" compact />
          <PortalProtectionBadge compact />
          <PortalNavClock compact />
          <ThemeToggle className="theme-toggle--compact" />
          <PortalNotificationCenter />
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
        className={`portal-sidebar ${menuOpen ? 'portal-sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}
      >
        <div className="portal-sidebar-brand">
          <BrandMark variant="portal" compact={collapsed} showProduct={!collapsed} />
          <SidebarCollapseButton collapsed={collapsed} onClick={toggle} />
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
                  data-tip={item.label}
                  aria-label={item.label}
                  className={`portal-sidebar-link ${isActive(item.href, item.exact) ? 'portal-sidebar-link--active' : ''}`}
                >
                  <span className="sidebar-link__icon">
                    <NavIcon name={item.icon} size={collapsed ? 20 : 18} />
                  </span>
                  <span className="sidebar-link__label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <div className="portal-sidebar-user sidebar-user-copy">
            {session.user.firstName} {session.user.lastName}
          </div>
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
            <ShellRouteActions homeHref="/portal" />
            <PortalNavClock />
            <ThemeToggle className="theme-toggle--compact" />
            <PortalProtectionBadge />
            <PortalNotificationCenter />
          </div>
        </header>
        <main className="portal-main portal-main--with-sidebar portal-main--with-call-bar">
          {children}
          <PortalPermissionsBanner />
        </main>
      </div>

      {!hideQuickActions && (
        <div className="portal-floating-actions" aria-label="Portal quick actions">
          <FloatingSupportDock chatHref="/portal/chat" className="support-fab-dock--inline" />
          {!showSilentFab ? null : <MiniCallSafetyBar variant="docked" />}
        </div>
      )}
      <MobileBottomNav items={mobileNavItems} ariaLabel="Client Portal" />
    </div>
    </>
  );
}

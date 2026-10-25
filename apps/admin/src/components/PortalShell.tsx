'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthSession, clearSession } from '@/lib/auth';
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
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { getOrCreateLocalDeviceId } from '@/lib/device-security';
import { jobKickerForEngagementKind, shouldShowPortalWelcome } from '@/lib/temp-engagements';
import { FloatingSupportDock } from './FloatingSupportDock';
import { ShellRouteActions } from './nav/ShellRouteActions';
import { PortalAmbientProvider, usePortalAmbient } from './portal/PortalAmbientProvider';
import { PortalHomeStatusLight } from './portal/PortalHomeStatusLight';
import { PortalOpsRail } from './portal/PortalOpsRail';

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handoff = useActionHandoff();
  const { access, loading: accessLoading, tierCode, engagement, jobOnly } = useSubscriptionAccess();
  const jobMode = Boolean(engagement);
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
    const sections = filterPortalNav(access, accessLoading, undefined, { jobOnly });
    if (tierCode !== 'PREMIUM') return sections;
    return sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.href !== '/portal/subscription/upgrade'),
    }));
  }, [access, accessLoading, tierCode, jobOnly]);

  const mobileNavItems = useMemo(
    () =>
      portalMobileNav(access, accessLoading, { jobOnly }).map((item) => ({
        href: item.href,
        label: item.mobileLabel,
        icon: item.icon,
        exact: item.exact,
      })),
    [access, accessLoading, jobOnly],
  );

  useEffect(() => {
    if (accessLoading || !access) return;
    const required = portalPathRequiresAccess(pathname);
    if (required && !access[required]) {
      router.replace('/portal/subscription/upgrade');
    }
  }, [access, accessLoading, pathname, router]);

  useEffect(() => {
    setMoreOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!jobMode) return;
    if (!shouldShowPortalWelcome()) return;
    router.replace('/portal/welcome');
  }, [jobMode, router]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const publicId = getOrCreateLocalDeviceId();
    void clientApi.post('/client/security/devices/heartbeat', { publicId }).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.body.style.overflow = moreOpen || mobileMenuOpen ? 'hidden' : '';
    document.documentElement.style.overflow = moreOpen || mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [moreOpen, mobileMenuOpen]);

  function logout() {
    handoff.begin('sign-out', () => {
      clearSession('client');
      router.push('/portal/login');
    });
  }

  function openNotifications() {
    const bell =
      document.getElementById('portal-notification-bell') ??
      document.getElementById('portal-notification-bell-mobile');
    bell?.click();
  }

  const title =
    jobMode && engagement
      ? `${jobKickerForEngagementKind(engagement.kind)} desk`
      : 'Protection Dashboard';

  return (
    <>
      {handoff.overlay}
      <div
        className="shell shell--portal shell--ops shell--portal-ops shell--with-bottom-nav"
        data-portal-ambient={ambient}
        data-job-mode={jobMode ? '1' : undefined}
      >
        <header className="mobile-shell-header mobile-shell-header--portal">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => {
              setMobileMenuOpen((open) => {
                const next = !open;
                if (!next) setMoreOpen(false);
                return next;
              });
            }}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`menu-toggle-icon ${mobileMenuOpen ? 'menu-toggle-icon--open' : ''}`} />
          </button>
          <BrandMark variant="portal" compact showProduct={false} />
          <h1 className="mobile-shell-header__title">
            {jobMode && engagement ? jobKickerForEngagementKind(engagement.kind) : '4DS Protect'}
          </h1>
          <div className="mobile-topbar-actions">
            <ShellRouteActions homeHref="/portal" compact />
            {jobOnly ? null : <PortalHomeStatusLight compact />}
            <ThemeToggle className="theme-toggle--compact" />
            <PortalNotificationCenter bellId="portal-notification-bell-mobile" />
          </div>
        </header>

        {(moreOpen || mobileMenuOpen) && (
          <button
            type="button"
            className="portal-rail-scrim"
            aria-label="Close menu"
            onClick={() => {
              setMoreOpen(false);
              setMobileMenuOpen(false);
            }}
          />
        )}

        <PortalOpsRail
          sections={navSections}
          pathname={pathname}
          expanded={moreOpen}
          mobileOpen={mobileMenuOpen}
          onToggle={() => {
            setMoreOpen((open) => {
              const next = !open;
              if (next) setMobileMenuOpen(true);
              return next;
            });
          }}
          jobOnly={jobOnly}
          onNotifications={openNotifications}
          onSignOut={logout}
          onNavigate={() => {
            setMoreOpen(false);
            setMobileMenuOpen(false);
          }}
        />

        <div className="shell-main portal-shell-main portal-shell-main--rail">
          <header className="topbar topbar--portal">
            <div className="topbar-brand">
              <BrandMark variant="portal" compact showProduct={false} href={false} />
              <div>
                <h1>{title}</h1>
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
              {jobOnly ? null : <PortalHomeStatusLight />}
              <PortalProtectionBadge />
              <span className="portal-topbar-notify">
                <PortalNotificationCenter bellId="portal-notification-bell" />
              </span>
            </div>
          </header>
          <main className="portal-main portal-main--with-sidebar portal-main--with-call-bar">
            <PortalPermissionsBanner />
            {children}
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

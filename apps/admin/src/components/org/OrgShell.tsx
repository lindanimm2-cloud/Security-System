'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OrgCommandSearch } from '@/components/org/OrgCommandSearch';
import {
  clearOrgSession,
  getOrganization,
  listOrganizations,
  listSites,
  orgMobileNav,
  orgNav,
  setActiveOrganization,
  setActiveSite,
} from '@/lib/org';
import type { OrgSession } from '@/lib/org';

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrgShell({
  session,
  children,
}: {
  session: OrgSession;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const organizationId = String(params.organizationId ?? session.activeOrganizationId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-directory-changed', refresh);
    window.addEventListener('4ds-org-session-changed', refresh);
    return () => {
      window.removeEventListener('4ds-org-directory-changed', refresh);
      window.removeEventListener('4ds-org-session-changed', refresh);
    };
  }, []);

  const org = useMemo(() => getOrganization(organizationId), [organizationId, tick]);
  const sites = useMemo(() => listSites(organizationId), [organizationId, tick]);
  const orgs = useMemo(() => listOrganizations(), [tick]);
  const sections = useMemo(() => orgNav(organizationId), [organizationId]);
  const mobile = useMemo(() => orgMobileNav(organizationId), [organizationId]);
  const activeSiteId = session.activeSiteId;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!org) {
    return (
      <div className="org-shell org-shell--empty">
        <p>Organization not found.</p>
        <Link href="/org">Back to organizations</Link>
      </div>
    );
  }

  function signOut() {
    clearOrgSession();
    router.push('/portal/login');
  }

  return (
    <div className={`org-shell ${menuOpen ? 'is-menu-open' : ''}`}>
      <aside className="org-sidebar">
        <div className="org-sidebar__brand">
          <BrandMark variant="portal" href={false} showProduct={false} />
          <p className="org-sidebar__kicker">Organization Portal</p>
        </div>

        <div className="org-context-card">
          <div className="org-context-card__logo" aria-hidden>
            {org.logoInitials}
          </div>
          <div className="org-context-card__meta">
            <strong>{org.name}</strong>
            <span>{org.typeLabel}</span>
          </div>
        </div>

        <label className="org-select-field">
          <span>Organization</span>
          <select
            value={organizationId}
            onChange={(e) => {
              const nextId = e.target.value;
              setActiveOrganization(nextId);
              router.push(`/org/${nextId}/dashboard`);
            }}
          >
            {orgs
              .filter((o) => session.memberships.some((m) => m.organizationId === o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </label>

        <label className="org-select-field">
          <span>Site</span>
          <select
            value={activeSiteId}
            onChange={(e) => setActiveSite(e.target.value as string | 'all')}
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <nav className="org-nav" aria-label="Organization">
          {sections.map((section) => (
            <div key={section.title} className="org-nav__section">
              <p className="org-nav__title">{section.title}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={[
                        navActive(pathname, item.href.split('#')[0] ?? item.href, item.exact)
                          ? 'is-active'
                          : '',
                        item.prominent ? 'is-prominent' : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="org-sidebar__foot">
          <Link href="/org" className="org-sidebar__link">
            Switch context
          </Link>
          <Link href="/portal" className="org-sidebar__link">
            Personal portal
          </Link>
          <button type="button" className="org-sidebar__link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="org-main">
        <header className="org-topbar">
          <button
            type="button"
            className="org-topbar__menu"
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
          <div className="org-topbar__title">
            <p className="org-topbar__org">{org.name}</p>
            <p className="org-topbar__site">
              Viewing ·{' '}
              {activeSiteId === 'all'
                ? 'All sites'
                : sites.find((s) => s.id === activeSiteId)?.name ?? 'Site'}
            </p>
          </div>
          <OrgCommandSearch organizationId={organizationId} siteId={activeSiteId} />
          <div className="org-topbar__actions">
            <ThemeToggle />
            <div className="org-topbar__user">
              <span>
                {session.user.firstName} {session.user.lastName}
              </span>
              <em>
                {session.memberships.find((m) => m.organizationId === organizationId)?.role.replace(
                  /_/g,
                  ' ',
                )}
              </em>
            </div>
          </div>
        </header>

        <div className="org-content">{children}</div>

        <nav className="org-mobile-nav" aria-label="Organization mobile">
          {mobile.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={navActive(pathname, item.href, item.exact) ? 'is-active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className="org-shell__backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}

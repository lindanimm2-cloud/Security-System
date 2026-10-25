'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavIcon } from '@/components/nav/NavIcon';
import { navHrefIsActive } from '@/lib/nav-active';
import {
  portalRailDock,
  portalRailMoreActive,
  type PortalNavSection,
  type PortalRailDockItem,
} from '@/lib/portal-nav';

function placeTip(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--tip-x', `${Math.round(r.right + 10)}px`);
  el.style.setProperty('--tip-y', `${Math.round(r.top + r.height / 2)}px`);
  el.dataset.tipOpen = '1';
}

function clearTip(el: HTMLElement) {
  delete el.dataset.tipOpen;
}

export function PortalOpsRail({
  sections,
  pathname,
  expanded,
  mobileOpen = false,
  onToggle,
  jobOnly,
  alertCount = 0,
  onNotifications,
  onSignOut,
  onNavigate,
  footerExtra,
}: {
  sections: PortalNavSection[];
  pathname: string;
  expanded: boolean;
  /** Mobile: slide the icon rail into view (hamburger). */
  mobileOpen?: boolean;
  onToggle: () => void;
  jobOnly?: boolean;
  alertCount?: number;
  onNotifications: () => void;
  onSignOut: () => void;
  onNavigate?: () => void;
  footerExtra?: ReactNode;
}) {
  const dock = portalRailDock(sections, { jobOnly });
  const moreActive = portalRailMoreActive(sections, pathname, dock);
  const allHrefs = sections.flatMap((section) => section.items.map((item) => item.href));

  function dockButton(item: PortalRailDockItem) {
    const active = navHrefIsActive(pathname, item.href, item.exact, allHrefs);
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`portal-rail__btn ${active ? 'portal-rail__btn--active' : ''}`}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        data-tip={item.label}
        onClick={onNavigate}
        onMouseEnter={(e) => placeTip(e.currentTarget)}
        onMouseLeave={(e) => clearTip(e.currentTarget)}
        onFocus={(e) => placeTip(e.currentTarget)}
        onBlur={(e) => clearTip(e.currentTarget)}
      >
        <NavIcon name={item.icon} size={18} />
        {item.id === 'dashboard' && alertCount > 0 ? (
          <span className="portal-rail__alert" aria-label={`${alertCount} alerts`}>
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <aside
      className={[
        'portal-rail',
        expanded ? 'portal-rail--expanded' : '',
        mobileOpen ? 'portal-rail--nav' : '',
        jobOnly ? 'portal-rail--job' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={jobOnly ? 'Job portal' : 'Client portal'}
    >
      <nav className="portal-rail__nav" aria-label="Primary navigation">
        {dock.map(dockButton)}
        <span className="portal-rail__sep" aria-hidden />
        <button
          type="button"
          className={`portal-rail__btn ${moreActive || expanded ? 'portal-rail__btn--active' : ''}`}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="portal-more-menu"
          aria-label={expanded ? 'Close more menu' : 'More sections'}
          data-tip="More"
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <MoreIcon />
        </button>
      </nav>

      <div className="portal-rail__foot">
        <button
          type="button"
          className="portal-rail__btn"
          data-tip="Notifications"
          aria-label="Notifications"
          onClick={onNotifications}
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <BellIcon />
        </button>
        <Link
          href="/portal/profile"
          className="portal-rail__btn"
          data-tip="Profile"
          aria-label="Profile"
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <UserIcon />
        </Link>
        <button
          type="button"
          className="portal-rail__btn"
          data-tip="Sign out"
          aria-label="Sign out"
          onClick={onSignOut}
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <SignOutIcon />
        </button>
        {footerExtra}
      </div>

      {expanded ? (
        <div className="portal-rail__more" id="portal-more-menu">
          <div className="portal-rail__more-head">
            <strong>More</strong>
            <button
              type="button"
              className="portal-rail__more-close"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggle();
              }}
              aria-label="Close more menu"
            >
              ×
            </button>
          </div>
          <div className="portal-rail__more-scroll">
            {sections.map((section) => {
              const sectionActive = section.items.some((item) =>
                navHrefIsActive(pathname, item.href, item.exact, allHrefs),
              );
              return (
                <div key={section.title} className="portal-rail__group">
                  <div className={`portal-rail__heading ${sectionActive ? 'is-active' : ''}`}>
                    <NavIcon name={section.icon} size={15} />
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const childActive = navHrefIsActive(pathname, item.href, item.exact, allHrefs);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`portal-rail__link ${childActive ? 'portal-rail__link--active' : ''}`}
                        aria-current={childActive ? 'page' : undefined}
                        onClick={() => {
                          onToggle();
                          onNavigate?.();
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function MoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6.5 18.5c1.2-2.2 3.1-3.3 5.5-3.3s4.3 1.1 5.5 3.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 12h10M11 8.5 14.5 12 11 15.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

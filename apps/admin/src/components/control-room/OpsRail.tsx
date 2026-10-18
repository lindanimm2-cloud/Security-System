'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavIcon } from '@/components/nav/NavIcon';
import {
  OPS_DOCK_RESPOND,
  OPS_DOCK_WATCH,
  opsGroupActive,
  opsHrefActive,
  opsMoreGroups,
  type OpsRailGroup,
} from '@/lib/ops-rail';

function pickGroups(groups: OpsRailGroup[], ids: string[]) {
  return ids.flatMap((id) => groups.filter((group) => group.id === id));
}

function RailIcon({ group, size }: { group: OpsRailGroup; size: number }) {
  const glyph = OPS_GLYPHS[group.id];
  if (!glyph) return <NavIcon name={group.icon} size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {glyph}
    </svg>
  );
}

const OPS_GLYPHS: Record<string, ReactNode> = {
  /* Ops wall / command desk */
  command: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M10 4v14" />
      <path d="M8 20h8" />
    </>
  ),
  /* Clear video camera */
  cameras: (
    <>
      <rect x="2.5" y="7" width="13.5" height="10" rx="2" />
      <path d="m16 10.2 5-2.7v9l-5-2.7" />
      <circle cx="8.2" cy="12" r="2.2" />
    </>
  ),
  /* Alarm bell */
  alarms: (
    <>
      <path d="M6.5 9.2a5.5 5.5 0 0 1 11 0c0 4.4 1.8 5.8 1.8 7.3H4.7c0-1.5 1.8-2.9 1.8-7.3Z" />
      <path d="M10 18.8a2 2 0 0 0 4 0" />
      <path d="M12 3.2v1.6" />
    </>
  ),
  incidents: (
    <>
      <path d="M12 3.8 21 19.6H3Z" />
      <path d="M12 9.6v4.6" />
      <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  /* Location pin */
  map: (
    <>
      <path d="M12 21s-6.2-5.5-6.2-10.6a6.2 6.2 0 0 1 12.4 0C18.2 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.4" r="2.3" />
    </>
  ),
  /* Radio / dispatch handset */
  dispatch: (
    <>
      <path d="M7 14.5v-5a5 5 0 0 1 10 0v5" />
      <path d="M5.5 14.5h3.2v4.2a1.3 1.3 0 0 1-2.6 0Z" />
      <path d="M15.3 14.5h3.2v4.2a1.3 1.3 0 0 1-2.6 0Z" />
      <path d="M12 4.2V6" />
      <circle cx="12" cy="3.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  /* Officer / person badge */
  officers: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.1-3.4 3.4-5 6.5-5s5.4 1.6 6.5 5" />
      <path d="M16.8 5.2 19 6.1v2.4c0 1.5-.8 2.8-2.2 3.4" opacity="0.7" />
    </>
  ),
  /* Field vehicle */
  field: (
    <>
      <path d="M3.8 16.6v-3.3l1.9-4.2A2 2 0 0 1 7.5 8h9a2 2 0 0 1 1.8 1.1l1.9 4.2v3.3Z" />
      <path d="M3.8 13.3h16.4" />
      <path d="M10 5.2h4" />
      <circle cx="7.6" cy="17" r="1.6" />
      <circle cx="16.4" cy="17" r="1.6" />
    </>
  ),
  /* Device kits / phone + cam */
  devices: (
    <>
      <rect x="4" y="3.5" width="9" height="14" rx="1.6" />
      <path d="M7.5 15.2h2" />
      <path d="m14.2 9 5-2.5v8.2l-5-2.5Z" />
    </>
  ),
  /* Reports chart */
  reports: (
    <>
      <path d="M4 19.5V5.2h16v14.3Z" />
      <path d="M8 15.2v-3.4M12 15.2V9M16 15.2v-5.5" />
    </>
  ),
  /* Admin users grid */
  admin: (
    <>
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16.5" cy="8.5" r="2" />
      <path d="M3.8 18.5c.8-2.6 2.6-3.9 5.2-3.9s4.4 1.3 5.2 3.9" />
      <path d="M14.2 18.5c.4-1.6 1.5-2.5 3.2-2.8" />
    </>
  ),
};

export function OpsRail({
  groups,
  pathname,
  search,
  expanded,
  onToggle,
  criticalCount,
  onHelp,
  onNotifications,
}: {
  groups: OpsRailGroup[];
  pathname: string;
  search: string;
  expanded: boolean;
  onToggle: () => void;
  criticalCount: number;
  onHelp: () => void;
  onNotifications: () => void;
}) {
  const watchGroups = pickGroups(groups, [...OPS_DOCK_WATCH]);
  const respondGroups = pickGroups(groups, [...OPS_DOCK_RESPOND]);
  const moreGroups = opsMoreGroups(groups);
  const moreActive = moreGroups.some((group) => opsGroupActive(group, pathname, search));

  const placeTip = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tip-x', `${Math.round(r.right + 10)}px`);
    el.style.setProperty('--tip-y', `${Math.round(r.top + r.height / 2)}px`);
    el.dataset.tipOpen = '1';
  };

  const clearTip = (el: HTMLElement) => {
    delete el.dataset.tipOpen;
  };

  const dockButton = (group: OpsRailGroup) => {
    const active = opsGroupActive(group, pathname, search);
    return (
      <Link
        key={group.id}
        href={group.href}
        className={`ops-rail__btn ${active ? 'ops-rail__btn--active' : ''}`}
        aria-label={group.label}
        aria-current={active ? 'page' : undefined}
        data-tip={group.label}
        onMouseEnter={(e) => placeTip(e.currentTarget)}
        onMouseLeave={(e) => clearTip(e.currentTarget)}
        onFocus={(e) => placeTip(e.currentTarget)}
        onBlur={(e) => clearTip(e.currentTarget)}
      >
        <RailIcon group={group} size={18} />
        {group.id === 'command' && criticalCount > 0 ? (
          <span className="ops-rail__alert" aria-label={`${criticalCount} critical`}>
            {criticalCount > 9 ? '9+' : criticalCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className={`ops-rail ${expanded ? 'ops-rail--expanded' : ''}`} aria-label="Control room">
      <nav className="ops-rail__nav" aria-label="Primary navigation">
        {watchGroups.map(dockButton)}
        {respondGroups.length > 0 ? <span className="ops-rail__sep" aria-hidden /> : null}
        {respondGroups.map(dockButton)}
        <span className="ops-rail__sep" aria-hidden />
        <button
          type="button"
          className={`ops-rail__btn ${moreActive || expanded ? 'ops-rail__btn--active' : ''}`}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="ops-more-menu"
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

      <div className="ops-rail__foot">
        <button
          type="button"
          className="ops-rail__btn"
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
        <button
          type="button"
          className="ops-rail__btn"
          data-tip="Help"
          aria-label="Help"
          onClick={onHelp}
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <HelpIcon />
        </button>
        <Link
          href="/control-room/profile"
          className="ops-rail__btn"
          data-tip="Profile"
          aria-label="User profile"
          onMouseEnter={(e) => placeTip(e.currentTarget)}
          onMouseLeave={(e) => clearTip(e.currentTarget)}
          onFocus={(e) => placeTip(e.currentTarget)}
          onBlur={(e) => clearTip(e.currentTarget)}
        >
          <UserIcon />
        </Link>
      </div>

      {expanded ? (
        <div className="ops-rail__more" id="ops-more-menu">
          <div className="ops-rail__more-head">
            <strong>More</strong>
            <button
              type="button"
              className="ops-rail__more-close"
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
          <div className="ops-rail__more-scroll">
            {moreGroups.map((group) => {
              const active = opsGroupActive(group, pathname, search);
              const nested = Boolean(group.nested && (group.children?.length ?? 0) > 0);
              return (
                <div key={group.id} className="ops-rail__group">
                  {nested ? (
                    <>
                      <div className={`ops-rail__heading ${active ? 'is-active' : ''}`}>
                        <RailIcon group={group} size={15} />
                        {group.label}
                      </div>
                      {group.children?.map((child) => {
                        const childActive = opsHrefActive(pathname, search, child.href, child.exact);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`ops-rail__link ${childActive ? 'ops-rail__link--active' : ''}`}
                            aria-current={childActive ? 'page' : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </>
                  ) : (
                    <Link
                      href={group.href}
                      className={`ops-rail__solo ${active ? 'ops-rail__solo--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <RailIcon group={group} size={15} />
                      {group.label}
                    </Link>
                  )}
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

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.8-1.2 1.6V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
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

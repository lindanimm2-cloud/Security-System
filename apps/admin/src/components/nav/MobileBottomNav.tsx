'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon, type NavIconName } from '@/components/nav/NavIcon';
import { navHrefIsActive } from '@/lib/nav-active';

export type MobileBottomNavItem = {
  href?: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
  /** When set, renders a button instead of a link (e.g. open cart). */
  onClick?: () => void;
  badge?: number | string;
  /** Force active state (e.g. cart drawer open). */
  active?: boolean;
};

type MobileBottomNavProps = {
  items: MobileBottomNavItem[];
  className?: string;
  /** Accessible name for the nav landmark. */
  ariaLabel?: string;
};

function isItemActive(
  pathname: string,
  item: MobileBottomNavItem,
  candidates: string[],
): boolean {
  if (typeof item.active === 'boolean') return item.active;
  if (!item.href) return false;
  return navHrefIsActive(pathname, item.href, item.exact, candidates);
}

export function MobileBottomNav({
  items,
  className = '',
  ariaLabel = 'Primary',
}: MobileBottomNavProps) {
  const pathname = usePathname();

  if (!items.length) return null;

  const candidates = items
    .map((item) => item.href)
    .filter((href): href is string => Boolean(href));

  return (
    <nav
      className={`mobile-bottom-nav ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="mobile-bottom-nav__pill">
        {items.map((item) => {
          const active = isItemActive(pathname, item, candidates);
          const classNames = [
            'mobile-bottom-nav__item',
            active ? 'mobile-bottom-nav__item--active' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const content = (
            <>
              <span className="mobile-bottom-nav__icon-wrap">
                <NavIcon name={item.icon} size={22} className="mobile-bottom-nav__icon" />
                {item.badge != null && item.badge !== 0 && item.badge !== '0' ? (
                  <span className="mobile-bottom-nav__badge">{item.badge}</span>
                ) : null}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </>
          );

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                className={classNames}
                onClick={item.onClick}
                aria-current={active ? 'page' : undefined}
                title={item.label}
              >
                {content}
              </button>
            );
          }

          if (!item.href) return null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

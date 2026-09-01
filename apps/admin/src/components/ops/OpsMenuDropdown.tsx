'use client';

import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type OpsMenuItem = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  heading?: boolean;
  tone?: 'default' | 'danger' | 'ok';
  meta?: string;
  description?: string;
  leading?: ReactNode;
  className?: string;
};

type OpsMenuDropdownProps = {
  label: string;
  items: OpsMenuItem[];
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  align?: 'left' | 'right';
  summary?: string;
  compact?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  leading?: ReactNode;
  showCount?: boolean;
  hideCaret?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
};

function isHeadingItem(item: OpsMenuItem) {
  return Boolean(item.heading);
}

function filterMenuItems(items: OpsMenuItem[], query: string): OpsMenuItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  const out: OpsMenuItem[] = [];
  let pendingHeading: OpsMenuItem | null = null;
  for (const item of items) {
    if (isHeadingItem(item)) {
      pendingHeading = item;
      continue;
    }
    const hay = `${item.label} ${item.meta ?? ''} ${item.description ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    if (pendingHeading) {
      out.push(pendingHeading);
      pendingHeading = null;
    }
    out.push(item);
  }
  return out;
}

/** Compact enterprise dropdown — panel is portaled so mobile cards cannot clip it. */
export function OpsMenuDropdown({
  label,
  items,
  className = '',
  triggerClassName = '',
  panelClassName = '',
  align = 'left',
  summary,
  compact = false,
  ariaLabel,
  disabled = false,
  leading,
  showCount = false,
  hideCaret = false,
  searchable = false,
  searchPlaceholder = 'Search',
}: OpsMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260, maxHeight: 320, ready: false });
  const visibleItems = searchable ? filterMenuItems(items, query) : items;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        Math.max(rect.width, searchable ? 320 : 280),
        window.innerWidth - 24,
      );
      let left = align === 'right' ? rect.right - width : rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

      const gap = 6;
      const topSafe = 12;
      const bottomSafe =
        12 + (window.matchMedia('(max-width: 900px)').matches ? 88 : 0);
      const measured = panelRef.current?.offsetHeight ?? 0;
      const estimated = Math.min((searchable ? 56 : 12) + visibleItems.length * 44, 520);
      const height = measured > 8 ? measured : estimated;
      const below = rect.bottom + gap;
      const spaceBelow = window.innerHeight - bottomSafe - below;
      const spaceAbove = rect.top - topSafe - gap;
      const openAbove = spaceBelow < Math.min(height, 160) && spaceAbove > spaceBelow;

      let top = below;
      let maxHeight = Math.max(120, spaceBelow);
      if (openAbove) {
        maxHeight = Math.max(120, spaceAbove);
        const used = Math.min(height, maxHeight);
        top = Math.max(topSafe, rect.top - used - gap);
      } else {
        maxHeight = Math.max(120, spaceBelow);
      }

      setPos({ top, left, width, maxHeight, ready: true });
    }

    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, visibleItems.length, searchable]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeCount = items.filter((item) => item.active).length;

  function renderItem(item: OpsMenuItem) {
    const heading = isHeadingItem(item);
    const classNameItem = [
      'ops-menu__item',
      item.active ? 'ops-menu__item--active' : '',
      item.disabled && !heading ? 'ops-menu__item--disabled' : '',
      heading ? 'ops-menu__item--heading' : '',
      item.tone === 'danger' ? 'ops-menu__item--danger' : '',
      item.tone === 'ok' ? 'ops-menu__item--ok' : '',
      item.className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const body: ReactNode = (
      <>
        {item.leading ? <span className="ops-menu__leading">{item.leading}</span> : null}
        <span className="ops-menu__item-text">
          <span className="ops-menu__item-label">{item.label}</span>
          {item.description ? (
            <span className="ops-menu__item-desc">{item.description}</span>
          ) : null}
        </span>
        {item.meta ? <span className="ops-menu__item-meta">{item.meta}</span> : null}
        {item.active ? <span className="ops-menu__check" aria-hidden>✓</span> : null}
      </>
    );

    if (heading) {
      return (
        <div key={item.id} className={classNameItem} role="presentation">
          {body}
        </div>
      );
    }

    if (item.href) {
      const external =
        item.href.startsWith('http') ||
        item.href.startsWith('tel:') ||
        item.href.startsWith('mailto:');
      const onNavigate = () => setOpen(false);
      if (external) {
        return (
          <a
            key={item.id}
            href={item.href}
            className={classNameItem}
            role="menuitem"
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
          >
            {body}
          </a>
        );
      }
      return (
        <Link key={item.id} href={item.href} className={classNameItem} role="menuitem" onClick={onNavigate}>
          {body}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        className={classNameItem}
        role="menuitem"
        disabled={item.disabled}
        onClick={() => {
          if (item.disabled) return;
          item.onClick?.();
          setOpen(false);
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`ops-menu ${open ? 'ops-menu--open' : ''} ${compact ? 'ops-menu--compact' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`ops-menu__trigger ${triggerClassName}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({
            top: rect.bottom + 6,
            left: rect.left,
            width: Math.min(Math.max(rect.width, searchable ? 320 : 280), window.innerWidth - 24),
            maxHeight: Math.max(120, window.innerHeight - rect.bottom - 24),
            ready: false,
          });
          setOpen((v) => !v);
        }}
      >
        {leading ? <span className="ops-menu__leading">{leading}</span> : null}
        <span className="ops-menu__label">{label}</span>
        {summary ? <span className="ops-menu__summary">{summary}</span> : null}
        {showCount && activeCount > 0 ? (
          <span className="ops-menu__count">{activeCount}</span>
        ) : null}
        {hideCaret ? null : <span className="ops-menu__caret" aria-hidden />}
      </button>
      {mounted && open
        ? createPortal(
            <>
              <button
                type="button"
                className="ops-menu__scrim"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                id={menuId}
                className={[
                  'ops-menu__panel',
                  'ops-menu__panel--fixed',
                  `ops-menu__panel--${align}`,
                  searchable ? 'ops-menu__panel--searchable' : '',
                  panelClassName,
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="menu"
                style={{
                  position: 'fixed',
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                  opacity: pos.ready ? 1 : 0,
                  pointerEvents: pos.ready ? 'auto' : 'none',
                }}
              >
                {searchable ? (
                  <div className="ops-menu__search">
                    <input
                      type="search"
                      value={query}
                      placeholder={searchPlaceholder}
                      aria-label="Filter menu"
                      autoFocus
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') setOpen(false);
                      }}
                    />
                  </div>
                ) : null}
                {visibleItems.length === 0 ? (
                  <div className="ops-menu__empty">No matches</div>
                ) : (
                  visibleItems.map(renderItem)
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type OpsMenuItem = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
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
  align?: 'left' | 'right';
  summary?: string;
  compact?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  leading?: ReactNode;
  showCount?: boolean;
};

/** Compact enterprise dropdown — panel is portaled so mobile cards cannot clip it. */
export function OpsMenuDropdown({
  label,
  items,
  className = '',
  align = 'left',
  summary,
  compact = false,
  ariaLabel,
  disabled = false,
  leading,
  showCount = false,
}: OpsMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function place() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const width = Math.min(
        Math.max(rect.width, 240),
        window.innerWidth - 24,
      );
      let left = align === 'right' ? rect.right - width : rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const estimatedHeight = Math.min(window.innerHeight * 0.5, 380);
      const below = rect.bottom + 6;
      const top =
        below + estimatedHeight > window.innerHeight - 12
          ? Math.max(12, rect.top - estimatedHeight - 6)
          : below;
      setPos({ top, left, width });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

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
    const classNameItem = [
      'ops-menu__item',
      item.active ? 'ops-menu__item--active' : '',
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

    if (item.href) {
      return (
        <a
          key={item.id}
          href={item.href}
          className={classNameItem}
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          {body}
        </a>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        className={classNameItem}
        role="menuitem"
        onClick={() => {
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
        className="ops-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {leading ? <span className="ops-menu__leading">{leading}</span> : null}
        <span className="ops-menu__label">{label}</span>
        {summary ? <span className="ops-menu__summary">{summary}</span> : null}
        {showCount && activeCount > 0 ? (
          <span className="ops-menu__count">{activeCount}</span>
        ) : null}
        <span className="ops-menu__caret" aria-hidden />
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
                className={`ops-menu__panel ops-menu__panel--fixed ops-menu__panel--${align}`}
                role="menu"
                style={{ top: pos.top, left: pos.left, width: pos.width }}
              >
                {items.map(renderItem)}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

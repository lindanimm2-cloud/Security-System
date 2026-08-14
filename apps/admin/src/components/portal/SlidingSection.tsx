'use client';

import { ReactNode, useEffect, useId, useState } from 'react';

type SlidingSectionProps = {
  title: string;
  subtitle?: string;
  badge?: string | number;
  defaultOpen?: boolean;
  /** Persist open/closed in sessionStorage */
  storageKey?: string;
  className?: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function SlidingSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  storageKey,
  className = '',
  headerAction,
  children,
}: SlidingSectionProps) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(!storageKey);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = sessionStorage.getItem(`slide-section:${storageKey}`);
      if (saved === '1') setOpen(true);
      else if (saved === '0') setOpen(false);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          sessionStorage.setItem(`slide-section:${storageKey}`, next ? '1' : '0');
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }

  if (!ready) return null;

  return (
    <section
      className={`slide-section ${open ? 'slide-section--open' : ''} ${className}`.trim()}
    >
      <div className="slide-section__bar">
        <button
          type="button"
          className="slide-section__toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="slide-section__chevron" aria-hidden />
          <span className="slide-section__text">
            <strong>{title}</strong>
            {subtitle ? <span className="slide-section__sub">{subtitle}</span> : null}
          </span>
          {badge != null && badge !== '' && badge !== 0 ? (
            <span className="slide-section__badge">{badge}</span>
          ) : null}
        </button>
        {headerAction ? (
          <div className="slide-section__action" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}
      </div>
      <div id={panelId} className="slide-section__panel">
        <div className="slide-section__inner">{children}</div>
      </div>
    </section>
  );
}

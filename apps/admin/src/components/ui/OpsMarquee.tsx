'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type TickerItem = {
  id: string;
  label: ReactNode;
};

/** Continuous ops ticker — seamless horizontal scroll of status chips. */
export function OpsTicker({
  items,
  label = 'Live feed',
  durationSec = 28,
  className = '',
}: {
  items: TickerItem[];
  label?: string;
  durationSec?: number;
  className?: string;
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className={`ops-ticker ${className}`.trim()} role="status" aria-live="polite">
      <span className="ops-ticker__label">{label}</span>
      <div className="ops-ticker__viewport">
        <div
          className="ops-ticker__track"
          style={{ animationDuration: `${Math.max(12, durationSec)}s` }}
        >
          {loop.map((item, index) => (
            <span key={`${item.id}-${index}`} className="ops-ticker__chip">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Truncated single-line text.
 * Default: scrolls only on hover/focus when the label overflows.
 * mode="always": continuous marquee when overflowing (tickers / tiny camera HUD).
 */
export function OpsMarqueeText({
  children,
  className = '',
  mode = 'hover',
}: {
  children: ReactNode;
  className?: string;
  mode?: 'hover' | 'always';
}) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    function measure() {
      const root = rootRef.current;
      const text = textRef.current;
      if (!root || !text) return;
      const delta = Math.max(0, text.scrollWidth - root.clientWidth);
      setOverflow(delta > 2);
      setShift(delta);
    }
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  const style = {
    '--marquee-shift': `${shift}px`,
    '--marquee-duration': `${Math.max(4, Math.min(14, shift / 28))}s`,
  } as CSSProperties;

  return (
    <span
      ref={rootRef}
      className={[
        'ops-marquee',
        overflow ? 'is-overflow' : '',
        mode === 'always' ? 'ops-marquee--always' : 'ops-marquee--hover',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      title={typeof children === 'string' ? children : undefined}
    >
      <span ref={textRef} className="ops-marquee__text">
        {children}
      </span>
    </span>
  );
}

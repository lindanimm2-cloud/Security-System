'use client';

import { useRef, type ReactNode } from 'react';

type OpsSwipeRowProps = {
  children: ReactNode;
  onSwipePrimary: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

/** Swipe right (~64px) to trigger primary action on mobile. */
export function OpsSwipeRow({
  children,
  onSwipePrimary,
  disabled,
  label = 'Advance',
  className = '',
}: OpsSwipeRowProps) {
  const startX = useRef<number | null>(null);
  const delta = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    startX.current = e.touches[0]?.clientX ?? null;
    delta.current = 0;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current == null || disabled) return;
    delta.current = (e.touches[0]?.clientX ?? startX.current) - startX.current;
    const el = rowRef.current;
    if (el) {
      const x = Math.max(0, Math.min(88, delta.current));
      el.style.transform = `translateX(${x}px)`;
    }
  }

  function onTouchEnd() {
    const el = rowRef.current;
    if (el) el.style.transform = '';
    if (!disabled && delta.current > 64) onSwipePrimary();
    startX.current = null;
    delta.current = 0;
  }

  return (
    <div className={`ops-swipe ${className}`}>
      <div className="ops-swipe__rail" aria-hidden>
        <span>✓ {label}</span>
      </div>
      <div
        ref={rowRef}
        className="ops-swipe__row"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

export function StoreScrollRail({
  title,
  subtitle,
  href,
  linkLabel = 'View all',
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(360, Math.round(el.clientWidth * 0.75));
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth + 8) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <section className={`nx-scroll-section ${className}`}>
      <div className="nx-scroll-section__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="nx-scroll-section__tools">
          {href ? (
            href.startsWith('/') ? (
              <Link href={href} className="nx-scroll-section__all">
                {linkLabel}
              </Link>
            ) : (
              <a href={href} className="nx-scroll-section__all">
                {linkLabel}
              </a>
            )
          ) : null}
          <button
            type="button"
            className="nx-scroll-nav"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="nx-scroll-nav"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="nx-scroll-rail" ref={scrollerRef}>
        {children}
      </div>
    </section>
  );
}

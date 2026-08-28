'use client';

import Link from 'next/link';
import {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type SlideCarouselProps = {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: ReactNode;
  className?: string;
};

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal swipe carousel — ecommerce-style peek cards. */
export function SlideCarousel({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel = 'See all',
  children,
  className = '',
}: SlideCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const slides = track.querySelectorAll<HTMLElement>('[data-slide]');
    if (!slides.length) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((slide, i) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncActive();
    track.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive);
    return () => {
      track.removeEventListener('scroll', syncActive);
      window.removeEventListener('resize', syncActive);
    };
  }, [syncActive, count]);

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelectorAll<HTMLElement>('[data-slide]')[index];
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  return (
    <section className={`slide-carousel ${className}`.trim()} aria-label={title}>
      <div className="slide-carousel__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="text-muted slide-carousel__sub">{subtitle}</p> : null}
        </div>
        {seeAllHref ? (
          <Link href={seeAllHref} className="link-sm">
            {seeAllLabel}
          </Link>
        ) : null}
      </div>

      <div className="slide-carousel__track" ref={trackRef}>
        {children}
      </div>

      {count > 1 ? (
        <div className="slide-carousel__dots" role="tablist" aria-label={`${title} slides`}>
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}`}
              className={`slide-carousel__dot ${i === active ? 'slide-carousel__dot--active' : ''}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

type SlideCarouselCardProps = {
  title: string;
  href?: string;
  expandLabel?: string;
  tone?: 'default' | 'alert' | 'ok' | 'warn' | 'muted';
  wide?: boolean;
  className?: string;
  children: ReactNode;
};

export function SlideCarouselCard({
  title,
  href,
  expandLabel,
  tone = 'default',
  wide,
  className = '',
  children,
}: SlideCarouselCardProps) {
  const cardClass = `slide-carousel__card slide-carousel__card--${tone} ${wide ? 'slide-carousel__card--wide' : ''} ${href ? 'slide-carousel__card--link' : ''} ${className}`.trim();
  const inner = (
    <>
      <div className="slide-carousel__card-top">
        <h3>{title}</h3>
        {href ? (
          <span className="slide-carousel__expand" aria-hidden>
            <ExpandIcon />
          </span>
        ) : null}
      </div>
      <div className="slide-carousel__card-body">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link data-slide href={href} className={cardClass} aria-label={expandLabel ?? `Open ${title}`}>
        {inner}
      </Link>
    );
  }

  return (
    <article data-slide className={cardClass}>
      {inner}
    </article>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const REVEAL =
  '.nx-promo, .nx-trust-item, .nx-dept-head, .nx-dept, .nx-product, .nx-rail-head, .nx-quick-service, .nx-band-inner, .nx-page-hero-inner, .nx-section-head, .nx-toc-item, .nx-service-block, .nx-flow > li, .nx-about-grid > *, .nx-aside-card, .nx-contact-details, .nx-contact-form, .nx-prose, .nx-career-row, .nx-store-hero, .nx-shop-hero, .nx-rail-card';

export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector('.nx-site');
    const main = document.querySelector('.nx-main');
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('nx-motion-off');
      return;
    }

    root.classList.add('nx-motion-ready');
    main?.classList.remove('nx-page-enter');
    void main?.getBoundingClientRect();
    main?.classList.add('nx-page-enter');

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(REVEAL));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('nx-in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );

    for (const el of nodes) {
      el.classList.add('nx-reveal');
      const parent = el.parentElement;
      const siblings = parent
        ? Array.from(parent.children).filter((child) => child.classList.contains('nx-reveal'))
        : [];
      const index = siblings.length ? siblings.indexOf(el) : 0;
      el.style.setProperty('--nx-i', String(Math.min(index, 10)));

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add('nx-in');
      } else {
        io.observe(el);
      }
    }

    return () => io.disconnect();
  }, [pathname]);

  return null;
}

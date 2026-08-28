'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function ShellRouteActions({
  homeHref,
  compact = false,
}: {
  homeHref: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === homeHref) {
    return null;
  }

  return (
    <div className={`shell-route-actions${compact ? ' shell-route-actions--compact' : ''}`}>
      <button
        type="button"
        className="shell-route-action"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }
          router.push(homeHref);
        }}
        aria-label="Go back"
        title="Go back"
      >
        <ArrowLeftIcon />
        {!compact && <span>Back</span>}
      </button>
      <Link
        href={homeHref}
        className="shell-route-action"
        aria-label="Go home"
        title="Go home"
      >
        <HomeIcon />
        {!compact && <span>Home</span>}
      </Link>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

'use client';

import Link from 'next/link';

export function SidebarCollapseButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="sidebar-collapse"
      onClick={onClick}
      aria-pressed={collapsed}
      aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        {collapsed ? (
          <path
            d="M9 6l6 6-6 6M4 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M15 6l-6 6 6 6M20 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

export function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SidebarWebsiteLink() {
  return (
    <Link
      href="/"
      className="btn-ghost btn-ghost--full sidebar-signout sidebar-website"
      title="Back to website"
      aria-label="Back to website"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 10.5L12 3l9 7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 9.5V21h14V9.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Website</span>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { NavIcon } from '@/components/nav/NavIcon';

export function QuickHeaderActions({
  chatHref,
  callPhone,
  compact = false,
}: {
  chatHref: string;
  callPhone?: string;
  compact?: boolean;
}) {
  const textClass = compact ? 'sr-only' : '';

  return (
    <>
      <Link
        href={chatHref}
        className={`btn-ghost btn-sm quick-header-action ${compact ? 'quick-header-action--compact' : ''}`}
        aria-label="Open chat"
        title="Open chat"
      >
        <NavIcon name="chat" size={16} />
        <span className={textClass}>Chat</span>
      </Link>
      {callPhone ? (
        <button
          type="button"
          className={`btn-ghost btn-sm quick-header-action ${compact ? 'quick-header-action--compact' : ''}`}
          onClick={() => {
            window.location.href = `tel:${callPhone}`;
          }}
          aria-label="Call dispatch"
          title="Call dispatch"
        >
          <NavIcon name="calls" size={16} />
          <span className={textClass}>Call</span>
        </button>
      ) : null}
    </>
  );
}

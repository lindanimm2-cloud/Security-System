'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from '@/components/nav/NavIcon';
import { useCallsOptional } from '@/components/calls/CallProvider';

export function FloatingSupportDock({
  chatHref,
  callPhone,
  className = '',
}: {
  chatHref: string;
  callPhone?: string;
  className?: string;
}) {
  const calls = useCallsOptional();
  const pathname = usePathname();
  const hideForActiveSection = /\/(chat|messages|internal-chat|calls|communications|documents)(\/|$)/.test(
    pathname,
  );

  if (calls?.activeCall || calls?.incomingCall || hideForActiveSection) {
    return null;
  }

  return (
    <div className={`support-fab-dock ${className}`.trim()} aria-label="Support shortcuts">
      <Link href={chatHref} className="support-fab support-fab--chat" aria-label="Open chat">
        <NavIcon name="chat" size={20} />
        <span>Chat</span>
      </Link>
      {callPhone ? (
        <button
          type="button"
          className="support-fab support-fab--call"
          onClick={() => {
            window.location.href = `tel:${callPhone}`;
          }}
          aria-label="Call dispatch"
        >
          <NavIcon name="calls" size={20} />
          <span>Call</span>
        </button>
      ) : null}
    </div>
  );
}

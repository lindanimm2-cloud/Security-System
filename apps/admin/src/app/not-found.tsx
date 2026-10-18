'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { reportErrorToDeveloper } from '@/lib/error-report';
import { isSignInRequiredMessage } from '@/lib/friendly-error';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useMemo(
    () => `404-${Date.now().toString(36).toUpperCase()}`,
    [],
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendError, setSendError] = useState('');

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }

  async function sendToDeveloper() {
    setSending(true);
    setSendError('');
    setCopied(false);
    try {
      const result = await reportErrorToDeveloper({
        message: `Page not found (404) · ${pathname || 'unknown path'}`,
        path: pathname ?? undefined,
        name: 'NotFoundError',
        digest: ref,
        stack: typeof window !== 'undefined' ? `Referrer: ${document.referrer || 'none'}` : undefined,
      });
      if (result.channel === 'clipboard') {
        setCopied(true);
        return;
      }
      if (result.channel === 'skipped') return;
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send report');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pro-error-page">
      <div className="pro-error-page__content">
        <p className="pro-error-page__eyebrow">4DS Nexus</p>
        <h1>Page not found</h1>
        <p className="pro-error-page__lead">
          That address is not on this site. Check the link or return home.
        </p>
        <p className="pro-error-page__ref">
          Reference <strong>{ref}</strong>
        </p>

        <div className="pro-error-page__actions">
          <button type="button" className="btn-primary" onClick={goBack}>
            Back
          </button>
          <Link href="/" className="btn-secondary">
            Go home
          </Link>
          <Link href="/portals" className="btn-secondary">
            Open portals
          </Link>
        </div>

        <div className="pro-error-page__support">
          <p className="pro-error-page__support-copy">
            Think this is a broken link? Send technical details to our developer team.
          </p>
          <button
            type="button"
            className="btn-secondary pro-error-page__dev-btn"
            disabled={sending || sent}
            onClick={() => void sendToDeveloper()}
          >
            {sent
              ? 'Details sent — thank you'
              : copied
                ? 'Copied to clipboard'
                : sending
                  ? 'Sending…'
                  : 'Send details to developer'}
          </button>
          {sendError && !isSignInRequiredMessage(sendError) ? (
            <p className="pro-error-page__send-error">{sendError}</p>
          ) : null}
          {isSignInRequiredMessage(sendError) ? (
            <p className="pro-error-page__send-error">
              Sign in first if you want this attached to your account. You can still go back or home.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

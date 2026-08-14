'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { errorReference, reportErrorToDeveloper } from '@/lib/error-report';

type Props = {
  error: Error & { digest?: string };
  reset?: () => void;
  /** Hide technical details from the user-facing copy */
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
};

function defaultHomeHref(pathname: string | null): string {
  if (!pathname) return '/';
  if (pathname.startsWith('/portal')) return '/portal';
  if (pathname.startsWith('/officer')) return '/officer';
  if (pathname.startsWith('/tech')) return '/tech';
  if (pathname.startsWith('/control-room')) return '/control-room';
  if (pathname.startsWith('/medical')) return '/medical';
  return '/';
}

export function ProfessionalErrorPage({
  error,
  reset,
  title = 'Something went wrong',
  description = 'We hit an unexpected problem loading this page. Your data is safe — try again or return home.',
  homeHref: homeHrefProp,
  homeLabel = 'Go home',
}: Props) {
  const pathname = usePathname();
  const home = homeHrefProp ?? defaultHomeHref(pathname);
  const ref = errorReference(error);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  async function sendToDeveloper() {
    setSending(true);
    setSendError('');
    try {
      await reportErrorToDeveloper({
        message: error.message || 'Unknown error',
        path: pathname ?? undefined,
        stack: error.stack,
        digest: error.digest,
        name: error.name,
      });
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
        <h1>{title}</h1>
        <p className="pro-error-page__lead">{description}</p>
        <p className="pro-error-page__ref">
          Reference <strong>{ref}</strong>
        </p>

        <div className="pro-error-page__actions">
          {reset ? (
            <button type="button" className="btn-primary" onClick={() => reset()}>
              Try again
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          )}
          <Link href={home} className="btn-secondary">
            {homeLabel}
          </Link>
        </div>

        <div className="pro-error-page__support">
          <p className="pro-error-page__support-copy">
            Need help? Send technical details to our developer team — nothing sensitive is shown here.
          </p>
          <button
            type="button"
            className="btn-secondary pro-error-page__dev-btn"
            disabled={sending || sent}
            onClick={() => void sendToDeveloper()}
          >
            {sent ? 'Details sent — thank you' : sending ? 'Sending…' : 'Send details to developer'}
          </button>
          {sendError ? <p className="pro-error-page__send-error">{sendError}</p> : null}
        </div>
      </div>
    </div>
  );
}

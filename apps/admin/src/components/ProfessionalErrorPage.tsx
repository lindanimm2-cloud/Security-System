'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { errorReference, reportErrorToDeveloper } from '@/lib/error-report';
import { isSignInRequiredMessage } from '@/lib/friendly-error';
import { isLoginPath, loginPathFor } from '@/lib/login-path';

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
  if (isLoginPath(pathname)) return loginPathFor(pathname);
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
  const onLogin = isLoginPath(pathname);
  const authBlocked = isSignInRequiredMessage(error.message);
  const home = onLogin
    ? loginPathFor(pathname)
    : (homeHrefProp ?? defaultHomeHref(pathname));
  const homeText = onLogin ? 'Back to sign in' : homeLabel;
  const pageTitle = onLogin ? "Couldn't load sign-in" : title;
  const pageDescription = onLogin
    ? 'This did not lock you out. Try again to bring the sign-in form back.'
    : description;
  const ref = errorReference(error);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [copied, setCopied] = useState(false);
  const allowReport = !onLogin && !authBlocked;

  async function sendToDeveloper() {
    setSending(true);
    setSendError('');
    setCopied(false);
    try {
      const result = await reportErrorToDeveloper({
        message: error.message || 'Unknown error',
        path: pathname ?? undefined,
        stack: error.stack,
        digest: error.digest,
        name: error.name,
      });
      if (result.channel === 'clipboard') {
        setCopied(true);
        return;
      }
      if (result.channel === 'skipped') {
        return;
      }
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
        <h1>{pageTitle}</h1>
        <p className="pro-error-page__lead">{pageDescription}</p>
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
            {homeText}
          </Link>
          {(authBlocked || isSignInRequiredMessage(sendError)) && !onLogin ? (
            <Link href={loginPathFor(pathname)} className="btn-primary">
              Sign in
            </Link>
          ) : null}
        </div>

        {allowReport ? (
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
              {sent
                ? 'Details sent — thank you'
                : copied
                  ? 'Copied — you can still sign in'
                  : sending
                    ? 'Sending…'
                    : 'Send details to developer'}
            </button>
            {sendError && !isSignInRequiredMessage(sendError) ? (
              <p className="pro-error-page__send-error">{sendError}</p>
            ) : null}
            {isSignInRequiredMessage(sendError) ? (
              <p className="pro-error-page__send-error">
                Sign in from the button above if you want this attached to your account. You can still use the app.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

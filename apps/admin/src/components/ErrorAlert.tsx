'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getSession } from '@/lib/auth';
import { isSignInRequiredMessage } from '@/lib/friendly-error';
import { reportErrorToDeveloper } from '@/lib/error-report';
import { isLoginPath, loginPathFor } from '@/lib/login-path';
import {
  resolveStaffSession,
  submitDeveloperErrorReport,
} from '@/lib/developer-notify';

function isRetryableMessage(message: string): boolean {
  const n = message.trim().toLowerCase();
  return (
    n.includes('try again') ||
    n.includes("couldn't load") ||
    n.includes('could not load') ||
    n.includes("couldn't save") ||
    n.includes('failed to load') ||
    n.includes("can't reach") ||
    n.includes('request failed') ||
    n.includes('internal server error') ||
    n.includes('server error')
  );
}

export function ErrorAlert({
  error,
  message,
  className = '',
  inline = false,
  onRetry,
}: {
  error?: string | null;
  /** @deprecated use `error` */
  message?: string | null;
  className?: string;
  inline?: boolean;
  onRetry?: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const text = (error ?? message)?.trim();
  if (!text) return null;

  const onLogin = isLoginPath(pathname);
  const needsSignIn =
    isSignInRequiredMessage(text) || isSignInRequiredMessage(notifyMsg);
  const canRetry = !needsSignIn && (Boolean(onRetry) || isRetryableMessage(text));
  const staff = resolveStaffSession(pathname);
  const signedIn = Boolean(staff || getSession('client'));
  const canNotify = !needsSignIn && !onLogin && signedIn;

  const displayText = isSignInRequiredMessage(text)
    ? 'Please sign in to continue.'
    : text;

  const classes = [
    'alert',
    'alert--error',
    inline ? 'alert--inline' : '',
    needsSignIn || canRetry || canNotify ? 'alert--with-action' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }

  async function handleNotify() {
    if (notifying) return;
    setNotifying(true);
    setNotifyMsg('');
    try {
      if (staff) {
        await submitDeveloperErrorReport({
          message: text!,
          path: pathname ?? undefined,
          portal: staff.portal,
          accessToken: staff.session.accessToken,
        });
        setNotifyMsg('Developer notified');
      } else {
        const result = await reportErrorToDeveloper({
          message: text!,
          path: pathname ?? undefined,
        });
        if (result.channel === 'clipboard') {
          setNotifyMsg('Copied error details. Sign in if you want them attached to your account.');
        } else if (result.channel === 'skipped') {
          setNotifyMsg('');
        } else {
          setNotifyMsg('Developer notified');
        }
      }
    } catch (err) {
      setNotifyMsg(err instanceof Error ? err.message : 'Notify failed');
    } finally {
      setNotifying(false);
    }
  }

  return (
    <div className={classes} role="alert">
      <span className="alert__message">{displayText}</span>
      <span className="alert__actions">
        {needsSignIn && !onLogin && (
          <Link href={loginPathFor(pathname)} className="btn-primary btn-sm alert__action">
            Sign in
          </Link>
        )}
        {canNotify && (
          <button
            type="button"
            className="btn-secondary btn-sm alert__action"
            onClick={() => void handleNotify()}
            disabled={notifying || notifyMsg === 'Developer notified'}
          >
            {notifying
              ? 'Notifying…'
              : notifyMsg === 'Developer notified'
                ? 'Notified'
                : 'Send details to developer'}
          </button>
        )}
        {canRetry && (
          <button
            type="button"
            className="btn-secondary btn-sm alert__action"
            onClick={() => void handleRetry()}
            disabled={retrying}
          >
            {retrying ? 'Refreshing…' : onRetry ? 'Retry' : 'Refresh'}
          </button>
        )}
      </span>
      {notifyMsg &&
        notifyMsg !== 'Developer notified' &&
        !isSignInRequiredMessage(notifyMsg) && (
          <span className="alert__notify-status text-muted">{notifyMsg}</span>
        )}
    </div>
  );
}

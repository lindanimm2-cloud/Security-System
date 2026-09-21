'use client';

import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { reportErrorToDeveloper } from '@/lib/error-report';
import {
  resolveStaffSession,
  submitDeveloperErrorReport,
} from '@/lib/developer-notify';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type State = { error: Error | null };

type FallbackProps = {
  label?: string;
  error: Error;
  onRetry: () => void;
};

/** Compact error panel with Notify developer — used by section boundaries. */
export function SectionErrorFallback({ label, error, onRetry }: FallbackProps) {
  const pathname = usePathname();
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const title = `${label ?? 'This panel'} could not load`;
  const staff = resolveStaffSession(pathname);
  const canNotify = Boolean(staff || getSession('client'));

  async function handleNotify() {
    if (notifying || notified) return;
    setNotifying(true);
    setNotifyMsg('');
    try {
      if (staff) {
        await submitDeveloperErrorReport({
          message: `${title}: ${error.message || 'Unknown error'}`,
          path: pathname ?? undefined,
          context: error.stack?.slice(0, 2000),
          portal: staff.portal,
          accessToken: staff.session.accessToken,
        });
      } else {
        const result = await reportErrorToDeveloper({
          message: `${title}: ${error.message || 'Unknown error'}`,
          path: pathname ?? undefined,
          stack: error.stack,
          name: error.name,
        });
        if (result.channel === 'clipboard') {
          setNotifyMsg('Copied details');
          return;
        }
        if (result.channel === 'skipped') return;
      }
      setNotified(true);
    } catch (err) {
      setNotifyMsg(err instanceof Error ? err.message : 'Notify failed');
    } finally {
      setNotifying(false);
    }
  }

  return (
    <div className="section-error" role="alert">
      <div className="section-error__copy">
        <strong>{title}</strong>
        <p className="text-muted">The rest of the control room is still live.</p>
        {notifyMsg ? <p className="section-error__status text-muted">{notifyMsg}</p> : null}
      </div>
      <div className="section-error__actions">
        {canNotify ? (
          <button
            type="button"
            className="section-error__notify btn-secondary btn-sm"
            disabled={notifying || notified}
            onClick={() => void handleNotify()}
            title="Send technical details to the developer desk"
          >
            {notifying ? 'Sending…' : notified ? 'Notified' : 'Notify developer'}
          </button>
        ) : null}
        <button type="button" className="section-error__retry btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}

/** Keeps the rest of a shell alive when one panel throws. */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(this.props.label ?? 'Section failed', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <SectionErrorFallback
            label={this.props.label}
            error={this.state.error}
            onRetry={this.retry}
          />
        )
      );
    }
    return this.props.children;
  }
}

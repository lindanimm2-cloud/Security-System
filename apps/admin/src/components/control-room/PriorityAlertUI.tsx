'use client';

import Link from 'next/link';
import { ALERT_KIND_LABELS, type PriorityAlertKind } from '@/lib/alert-priority';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { usePriorityAlerts } from './PriorityAlertProvider';

function AlertIcon({ kind }: { kind: PriorityAlertKind }) {
  const glyphs: Record<PriorityAlertKind, string> = {
    panic: '!',
    silent: 'S',
    medical: '+',
    theft: 'T',
    alarm: 'A',
    fire: 'F',
    call: '☎',
    critical: '‼',
    high: '●',
  };

  return (
    <span className={`alert-lens__avatar alert-lens__avatar--${kind}`} aria-hidden>
      {kind === 'call' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
        </svg>
      ) : (
        glyphs[kind]
      )}
    </span>
  );
}

export function PriorityAlertUI() {
  const ctx = usePriorityAlerts();

  if (!ctx) return null;

  const { criticalAlert, criticalQueue, highToasts, dismissCritical, dismissToast } = ctx;

  return (
    <>
      {criticalAlert && (
        <div
          className={`alert-lens alert-lens--${criticalAlert.kind}`}
          role="alertdialog"
          aria-label={`${ALERT_KIND_LABELS[criticalAlert.kind]} alert`}
        >
          <div className="alert-lens__info">
            <AlertIcon kind={criticalAlert.kind} />
            <div className="alert-lens__meta">
              <span className="alert-lens__tag">{ALERT_KIND_LABELS[criticalAlert.kind]}</span>
              <span className="alert-lens__title">{criticalAlert.title}</span>
              <span className="alert-lens__subtitle">{criticalAlert.subtitle}</span>
            </div>
          </div>

          <div className="alert-lens__divider" />

          <div className="alert-lens__controls">
            {criticalQueue > 1 && (
              <span className="alert-lens__queue" title="More critical alerts waiting">
                +{criticalQueue - 1}
              </span>
            )}
            {criticalAlert.link && (
              <Link
                href={criticalAlert.link}
                className="alert-lens__btn alert-lens__btn--open"
                onClick={dismissCritical}
              >
                Open
              </Link>
            )}
            {criticalAlert.incidentId && (
              <DispatchMenuButton
                incidentId={criticalAlert.incidentId}
                className="alert-lens__btn alert-lens__btn--dispatch"
                onAssigned={dismissCritical}
              />
            )}
            <button
              type="button"
              className="alert-lens__dismiss"
              onClick={dismissCritical}
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {highToasts.length > 0 && (
        <div className="alert-toast-stack" aria-live="polite">
          {highToasts.map((toast) => (
            <div key={toast.id} className={`alert-toast alert-toast--${toast.kind}`} role="status">
              <div className="alert-toast__main">
                <span className="alert-toast__tag">{ALERT_KIND_LABELS[toast.kind]}</span>
                <strong className="alert-toast__title">{toast.title}</strong>
                <p className="alert-toast__body">{toast.subtitle}</p>
              </div>
              <div className="alert-toast__actions">
                {toast.link && (
                  <Link href={toast.link} className="alert-toast__link" onClick={() => dismissToast(toast.id)}>
                    View
                  </Link>
                )}
                <button
                  type="button"
                  className="alert-toast__dismiss"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';

export type OpsToastKind = 'critical' | 'silent' | 'medical' | 'fire' | 'success' | 'info';

export type UndoToastOptions = {
  kind?: OpsToastKind;
  detail?: string;
  ttlMs?: number;
};

export type UndoToastState = {
  id: number;
  message: string;
  detail?: string;
  kind: OpsToastKind;
  ttlMs: number;
  onUndo?: () => void | Promise<void>;
} | null;

const KIND_LABEL: Record<OpsToastKind, string> = {
  critical: 'Critical',
  silent: 'Discreet',
  medical: 'Medical',
  fire: 'Fire',
  success: 'Done',
  info: 'Updated',
};

function defaultTtl(kind: OpsToastKind) {
  if (kind === 'critical' || kind === 'medical' || kind === 'fire') return 8000;
  if (kind === 'silent') return 6500;
  return 5000;
}

export function useUndoToast(ttlMs?: number) {
  const [toast, setToast] = useState<UndoToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (
      message: string,
      onUndo?: (() => void | Promise<void>) | null,
      options?: UndoToastOptions,
    ) => {
      if (timer.current) clearTimeout(timer.current);
      const kind = options?.kind ?? 'info';
      const duration = options?.ttlMs ?? ttlMs ?? defaultTtl(kind);
      seq.current += 1;
      setToast({
        id: seq.current,
        message,
        detail: options?.detail,
        kind,
        ttlMs: duration,
        onUndo: onUndo ?? undefined,
      });
      timer.current = setTimeout(() => {
        setToast(null);
        timer.current = null;
      }, duration);
    },
    [ttlMs],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, show, clear };
}

function ToastIcon({ kind }: { kind: OpsToastKind }) {
  const common = {
    className: 'ops-undo-toast__glyph',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    'aria-hidden': true as const,
  };

  if (kind === 'critical') {
    return (
      <svg {...common}>
        <path d="M12 3 2.6 19.6h18.8L12 3z" strokeLinejoin="round" />
        <path d="M12 9.2v5.2M12 17.4h.01" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'silent') {
    return (
      <svg {...common}>
        <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
        <path d="m16 9 5 5M21 9l-5 5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'medical') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="3.2" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'fire') {
    return (
      <svg {...common}>
        <path
          d="M12 22c4-2.5 6.5-5.5 6.5-9.5C18.5 8 15 5 12 2 9 5 5.5 8 5.5 12.5 5.5 16.5 8 19.5 12 22z"
          strokeLinejoin="round"
        />
        <path d="M12 22c-1.5-2-2-4-2-6 0-2 2-4 2-4s2 2 2 4c0 2-.5 4-2 6z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'success') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.2" />
        <path d="m8.4 12.2 2.4 2.4 4.8-5.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 8v4.6M12 16.4h.01" strokeLinecap="round" />
    </svg>
  );
}

export function OpsUndoToast({
  toast,
  onDismiss,
}: {
  toast: UndoToastState;
  onDismiss: () => void;
}) {
  const titleId = useId();
  if (!toast) return null;

  const live: 'assertive' | 'polite' =
    toast.kind === 'critical' || toast.kind === 'medical' || toast.kind === 'fire'
      ? 'assertive'
      : 'polite';
  const role = live === 'assertive' ? 'alert' : 'status';

  return (
    <div
      key={toast.id}
      className={`ops-undo-toast ops-undo-toast--${toast.kind}`}
      role={role}
      aria-live={live}
      aria-labelledby={titleId}
      style={{ '--toast-ttl': `${toast.ttlMs}ms` } as CSSProperties}
    >
      <span className="ops-undo-toast__icon" aria-hidden>
        <ToastIcon kind={toast.kind} />
      </span>
      <div className="ops-undo-toast__copy">
        <span className="ops-undo-toast__tag">{KIND_LABEL[toast.kind]}</span>
        <strong id={titleId} className="ops-undo-toast__title">
          {toast.message}
        </strong>
        {toast.detail ? <span className="ops-undo-toast__detail">{toast.detail}</span> : null}
      </div>
      <div className="ops-undo-toast__actions">
        {toast.onUndo ? (
          <button
            type="button"
            className="ops-undo-toast__undo"
            onClick={() => {
              void toast.onUndo?.();
              onDismiss();
            }}
          >
            Undo
          </button>
        ) : null}
        <button
          type="button"
          className="ops-undo-toast__close"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
            <path
              d="M3.2 3.2l9.6 9.6M12.8 3.2l-9.6 9.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <span className="ops-undo-toast__ttl" aria-hidden>
        <span className="ops-undo-toast__ttl-bar" />
      </span>
    </div>
  );
}

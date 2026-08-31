'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type HoldToActivateProps = {
  label: string;
  holdLabel?: string;
  holdMs?: number;
  onActivate: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  tone?: 'danger' | 'warn' | 'medical';
  hideHint?: boolean;
  keepLabel?: boolean;
  children?: ReactNode;
};

/** Hold-to-fire control — never activates on a single tap. */
export function HoldToActivate({
  label,
  holdLabel = 'Keep holding…',
  holdMs = 2000,
  onActivate,
  disabled,
  loading,
  className = '',
  tone = 'danger',
  hideHint = false,
  keepLabel = false,
  children,
}: HoldToActivateProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    firedRef.current = false;
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => clear(), [clear]);

  const tick = useCallback(() => {
    if (startRef.current == null) return;
    const elapsed = Date.now() - startRef.current;
    const next = Math.min(1, elapsed / holdMs);
    setProgress(next);
    if (next >= 1 && !firedRef.current) {
      firedRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(40);
        } catch {
          /* ignore */
        }
      }
      void onActivate();
      clear();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [clear, holdMs, onActivate]);

  function startHold() {
    if (disabled || loading) return;
    firedRef.current = false;
    startRef.current = Date.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  const isCircle =
    className.includes('hold-activate--circle') ||
    className.includes('panic-orbit-btn') ||
    className.includes('panic-neu__knob') ||
    className.includes('panic-orb');

  return (
    <button
      type="button"
      className={`hold-activate hold-activate--${tone} ${holding ? 'hold-activate--holding' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-label={`${label}. Hold for ${Math.round(holdMs / 1000)} seconds to activate.`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        startHold();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onPointerLeave={clear}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        className="hold-activate__fill"
        style={{
          transform: isCircle ? `scale(${progress})` : `scaleX(${progress})`,
        }}
        aria-hidden
      />
      <span className="hold-activate__label">
        {loading && !keepLabel
          ? 'Sending…'
          : holding && !keepLabel
            ? `Release to cancel · ${Math.max(1, Math.ceil((1 - progress) * (holdMs / 1000)))}`
            : (children ?? label)}
      </span>
      {hideHint ? null : holding ? (
        <span className="hold-activate__pct" aria-live="polite">
          {Math.max(1, Math.ceil((1 - progress) * (holdMs / 1000)))}
        </span>
      ) : (
        <span className="hold-activate__hint">{Math.round(holdMs / 1000)}s hold</span>
      )}
    </button>
  );
}

export type EmergencyModeProps = {
  title: string;
  detail?: string;
  statusLine?: string;
  actions?: ReactNode;
  onDismiss?: () => void;
};

/** Full-bleed emergency chrome that replaces normal dashboard content. */
export function EmergencyModeBanner({
  title,
  detail,
  statusLine,
  actions,
  onDismiss,
}: EmergencyModeProps) {
  return (
    <section className="emergency-mode" role="alert" aria-live="assertive">
      <div className="emergency-mode__pulse" aria-hidden />
      <div className="emergency-mode__body">
        <p className="emergency-mode__eyebrow">Active emergency</p>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
        {statusLine ? <p className="emergency-mode__status">{statusLine}</p> : null}
        {actions ? <div className="emergency-mode__actions">{actions}</div> : null}
        {onDismiss ? (
          <button type="button" className="btn-sm btn-sm--ghost" onClick={onDismiss}>
            Minimize
          </button>
        ) : null}
      </div>
    </section>
  );
}

export type ProtectionStatusProps = {
  tone: 'ok' | 'attention' | 'emergency';
  title: string;
  lines: string[];
};

export function ProtectionStatusCard({ tone, title, lines }: ProtectionStatusProps) {
  return (
    <section className={`protection-status protection-status--${tone}`} aria-live="polite">
      <div className="protection-status__dot" aria-hidden />
      <div>
        <h2>{title}</h2>
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

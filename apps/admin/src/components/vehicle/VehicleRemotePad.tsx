'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

type FeedbackPhase = 'loading' | 'success' | 'error';

type VehicleRemotePadProps = {
  state: VehicleRemoteState;
  busyAction?: VehicleRemoteAction | null;
  disabled?: boolean;
  variant?: 'client' | 'ops';
  compact?: boolean;
  hidePanic?: boolean;
  children?: ReactNode;
  /** Return false on failure; thrown errors count as failure. */
  onCommand: (action: VehicleRemoteAction) => void | boolean | Promise<void | boolean>;
};

const FEEDBACK_MS = 2200;

export function VehicleRemotePad({
  state,
  busyAction = null,
  disabled,
  variant = 'client',
  compact = false,
  hidePanic = false,
  children,
  onCommand,
}: VehicleRemotePadProps) {
  const ops = variant === 'ops';
  const locked = state.doorsLocked;
  const cut = state.immobiliserOn;
  const [feedback, setFeedback] = useState<Partial<Record<VehicleRemoteAction, FeedbackPhase>>>({});
  const timersRef = useRef<Partial<Record<VehicleRemoteAction, number>>>({});

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of Object.values(timers)) {
        if (id != null) window.clearTimeout(id);
      }
    };
  }, []);

  const isBusy = useCallback(
    (action: VehicleRemoteAction) =>
      Boolean(busyAction) || feedback[action] === 'loading' || feedback[action] === 'success' || feedback[action] === 'error',
    [busyAction, feedback],
  );

  const anyBusy =
    Boolean(busyAction) || Object.values(feedback).some((phase) => phase === 'loading');

  const runCommand = useCallback(
    async (action: VehicleRemoteAction) => {
      if (anyBusy || disabled) return;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;

      setFeedback((prev) => ({ ...prev, [action]: 'loading' }));

      let ok = false;
      try {
        const result = await onCommand(action);
        ok = result !== false;
      } catch {
        ok = false;
      }

      setFeedback((prev) => ({ ...prev, [action]: ok ? 'success' : 'error' }));

      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }));
      }

      const prevTimer = timersRef.current[action];
      if (prevTimer != null) window.clearTimeout(prevTimer);
      timersRef.current[action] = window.setTimeout(() => {
        setFeedback((prev) => {
          if (prev[action] !== 'success' && prev[action] !== 'error') return prev;
          const next = { ...prev };
          delete next[action];
          return next;
        });
        delete timersRef.current[action];
      }, FEEDBACK_MS);
    },
    [anyBusy, disabled, onCommand],
  );

  const label = useCallback(
    (action: VehicleRemoteAction, idle: string, loading: string) => {
      const phase = feedback[action] ?? (busyAction === action ? 'loading' : null);
      if (phase === 'loading') return loading;
      if (phase === 'success') return 'Successful';
      if (phase === 'error') return 'Failed';
      return idle;
    },
    [busyAction, feedback],
  );

  const btnClass = useCallback(
    (action: VehicleRemoteAction, extra = '') => {
      const phase = feedback[action] ?? (busyAction === action ? 'loading' : null);
      const phaseClass =
        phase === 'loading'
          ? 'vehicle-remote__btn--loading'
          : phase === 'success'
            ? 'vehicle-remote__btn--success'
            : phase === 'error'
              ? 'vehicle-remote__btn--error'
              : '';
      return `vehicle-remote__btn ${extra} ${phaseClass}`.trim();
    },
    [busyAction, feedback],
  );

  const tap = (action: VehicleRemoteAction) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
    void runCommand(action);
  };

  return (
    <section className={`vehicle-remote ${compact ? 'vehicle-remote--compact' : ''} ${ops ? 'vehicle-remote--ops' : ''}`}>
      <div className="vehicle-remote__head">
        <p className="vehicle-remote__kicker">{ops ? 'Remote commands' : 'Remote vehicle'}</p>
        <div className="vehicle-remote__pills">
          <span className={`status-pill ${locked ? 'status-pill--ok' : 'status-pill--muted'}`}>
            {locked ? 'Doors locked' : 'Doors unlocked'}
          </span>
          <span className={`status-pill ${cut ? 'status-pill--alert' : 'status-pill--muted'}`}>
            {cut ? 'Immobiliser on' : 'Starter live'}
          </span>
          {state.theftRecovery ? (
            <span className="status-pill status-pill--alert">Recovery</span>
          ) : null}
          {state.hornActive ? <span className="status-pill status-pill--sync">Horn</span> : null}
        </div>
      </div>

      <div className="vehicle-remote__grid" role="group" aria-label="Vehicle remote commands">
        <button
          type="button"
          className={btnClass('lock', locked ? 'vehicle-remote__btn--on' : '')}
          disabled={disabled || anyBusy || locked || isBusy('lock')}
          onClick={tap('lock')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <LockIcon />
          </span>
          <strong>{label('lock', 'Lock doors', 'Locking…')}</strong>
        </button>
        <button
          type="button"
          className={btnClass('unlock', !locked ? 'vehicle-remote__btn--warn' : '')}
          disabled={disabled || anyBusy || !locked || isBusy('unlock')}
          onClick={tap('unlock')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <UnlockIcon />
          </span>
          <strong>{label('unlock', 'Unlock', 'Unlocking…')}</strong>
        </button>
        <HoldToActivate
          label={label('immobilise', ops ? 'Kill ignition' : 'Immobilise', 'Cutting…')}
          holdLabel="Hold to cut starter"
          holdMs={1600}
          tone="warn"
          keepLabel
          hideHint={compact}
          loading={feedback.immobilise === 'loading' || busyAction === 'immobilise'}
          disabled={disabled || anyBusy || cut || isBusy('immobilise')}
          className={`${btnClass('immobilise', `vehicle-remote__hold vehicle-remote__btn--cut ${cut ? 'vehicle-remote__btn--on' : ''}`)}`}
          onActivate={() => void runCommand('immobilise')}
        />
        <button
          type="button"
          className={btnClass('release')}
          disabled={disabled || anyBusy || !cut || isBusy('release')}
          onClick={tap('release')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <KeyIcon />
          </span>
          <strong>{label('release', 'Release', 'Releasing…')}</strong>
        </button>
        <button
          type="button"
          className={btnClass(
            'horn',
            `${state.hornActive ? 'vehicle-remote__btn--on' : ''} ${hidePanic ? 'vehicle-remote__btn--span' : ''}`,
          )}
          disabled={disabled || anyBusy || isBusy('horn')}
          onClick={tap('horn')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <HornIcon />
          </span>
          <strong>{label('horn', 'Horn / lights', 'Pulsing…')}</strong>
        </button>
        {hidePanic ? null : (
          <HoldToActivate
            label={label('panic', 'Vehicle panic', 'Sending…')}
            holdLabel="Hold to panic"
            holdMs={1800}
            tone="danger"
            keepLabel
            hideHint={compact}
            loading={feedback.panic === 'loading' || busyAction === 'panic'}
            disabled={disabled || anyBusy || isBusy('panic')}
            className={`${btnClass('panic', 'vehicle-remote__hold vehicle-remote__btn--panic')}`}
            onActivate={() => void runCommand('panic')}
          />
        )}
      </div>
      {children}
      {ops ? null : (
        <p className="vehicle-remote__hint">
          Immobiliser cuts the starter when the vehicle is stationary — standard tracker practice. It does not shut a moving engine.
        </p>
      )}
    </section>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 017.9-1" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="15" r="4" />
      <path d="M11.5 12.5L20 4M16 4h4v4" />
    </svg>
  );
}

function HornIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10v4h3l5 4V6L7 10H4z" />
      <path d="M16 9.5a4 4 0 010 5M18.5 7a7 7 0 010 10" />
    </svg>
  );
}

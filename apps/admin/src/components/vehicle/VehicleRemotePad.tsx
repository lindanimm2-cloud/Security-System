'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { OpsCommandTile } from '@/components/ops/OpsUi';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';
import { vehicleEmergencyMeta } from '@/lib/vehicle-emergency-status';
import { VehicleEmergencyStatusPicker } from '@/components/vehicle/VehicleEmergencyStatusPicker';
import type { VehicleEmergencyStatus } from '@/lib/vehicle-emergency-status';

type FeedbackPhase = 'loading' | 'success' | 'error';

type VehicleRemotePadProps = {
  state: VehicleRemoteState;
  busyAction?: VehicleRemoteAction | null;
  disabled?: boolean;
  variant?: 'client' | 'ops';
  /** Classic pad buttons, or ops command-tile grid with kill confirmation. */
  layout?: 'pad' | 'command';
  compact?: boolean;
  hidePanic?: boolean;
  children?: ReactNode;
  /** Optional labels for confirmation dialogs. */
  vehicleLabel?: string | null;
  registration?: string | null;
  /** Active emergency situation while recovery is on */
  emergencyStatus?: string | null;
  /** Return false on failure; thrown errors count as failure. */
  onCommand: (action: VehicleRemoteAction) => void | boolean | Promise<void | boolean>;
  onEmergencyStatusChange?: (status: VehicleEmergencyStatus) => void | Promise<void>;
};

const FEEDBACK_MS = 2200;

export function VehicleRemotePad({
  state,
  busyAction = null,
  disabled,
  variant = 'client',
  layout = 'pad',
  compact = false,
  hidePanic = false,
  children,
  vehicleLabel = null,
  registration = null,
  emergencyStatus = null,
  onCommand,
  onEmergencyStatusChange,
}: VehicleRemotePadProps) {
  const ops = variant === 'ops';
  const locked = state.doorsLocked;
  const cut = state.immobiliserOn;
  const panic = Boolean(state.panicActive) || Boolean(state.theftRecovery);
  const emergency = vehicleEmergencyMeta(emergencyStatus ?? (state.theftRecovery ? 'STOLEN' : null));
  const [feedback, setFeedback] = useState<Partial<Record<VehicleRemoteAction, FeedbackPhase>>>({});
  const [statusBusy, setStatusBusy] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [killAck, setKillAck] = useState(false);
  const timersRef = useRef<Partial<Record<VehicleRemoteAction, number>>>({});

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of Object.values(timers)) {
        if (id != null) window.clearTimeout(id);
      }
    };
  }, []);

  useEffect(() => {
    if (!cut) {
      setKillOpen(false);
      setKillAck(false);
    }
  }, [cut]);

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

      if (action === 'immobilise' && ok) {
        setKillOpen(false);
        setKillAck(false);
      }
    },
    [anyBusy, disabled, onCommand],
  );

  const label = useCallback(
    (action: VehicleRemoteAction, idle: string, loading: string) => {
      const phase = feedback[action] ?? (busyAction === action ? 'loading' : null);
      if (phase === 'loading') return loading;
      if (phase === 'success') return 'Done';
      if (phase === 'error') return 'Failed';
      return idle;
    },
    [busyAction, feedback],
  );

  const stateLabel = useCallback(
    (action: VehicleRemoteAction, idle: string) => {
      const phase = feedback[action] ?? (busyAction === action ? 'loading' : null);
      if (phase === 'loading') return 'Working…';
      if (phase === 'success') return 'Done';
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

  if (layout === 'command') {
    return (
      <section className={`vehicle-remote vehicle-remote--command vehicle-remote--console ${ops ? 'vehicle-remote--ops' : ''}`}>
        <div className="ops-cmd-group">
          <p className="ops-cmd-group__label">Vehicle access</p>
          <div className="ops-cmd-grid ops-cmd-grid--pair" role="group" aria-label="Vehicle access">
            <OpsCommandTile
              title="Lock all doors"
              description="Secure vehicle"
              stateLabel={stateLabel('lock', locked ? 'Locked' : 'Ready')}
              tone="ok"
              active={locked}
              icon={<LockIcon />}
              disabled={disabled || anyBusy || locked || isBusy('lock')}
              onClick={() => void runCommand('lock')}
            />
            <OpsCommandTile
              title="Unlock all doors"
              description="Grant access"
              stateLabel={stateLabel('unlock', !locked ? 'Unlocked' : 'Ready')}
              tone="warn"
              active={!locked}
              icon={<UnlockIcon />}
              disabled={disabled || anyBusy || !locked || isBusy('unlock')}
              onClick={() => void runCommand('unlock')}
            />
          </div>
        </div>

        <div className="ops-cmd-group">
          <p className="ops-cmd-group__label">Vehicle control</p>
          <div className="ops-cmd-grid ops-cmd-grid--triple" role="group" aria-label="Vehicle control">
            <OpsCommandTile
              title="Disable ignition"
              description="Prevent vehicle from starting"
              stateLabel={stateLabel('immobilise', cut ? 'Disabled' : 'Armed')}
              tone={cut ? 'danger' : 'muted'}
              active={cut}
              holdMs={1600}
              icon={<CutIcon />}
              disabled={disabled || anyBusy || cut || isBusy('immobilise')}
              onClick={() => {
                setKillOpen(true);
                setKillAck(false);
              }}
            />
            <OpsCommandTile
              title="Authorise start"
              description="Release immobiliser"
              stateLabel={stateLabel('release', cut ? 'Ready' : 'Live')}
              tone="info"
              active={!cut}
              holdMs={1400}
              icon={<KeyIcon />}
              disabled={disabled || anyBusy || !cut || isBusy('release')}
              onClick={() => void runCommand('release')}
            />
            <OpsCommandTile
              title="Horn / lights"
              description="Pulse horn and hazards"
              stateLabel={stateLabel('horn', state.hornActive ? 'Active' : 'Ready')}
              tone="purple"
              active={Boolean(state.hornActive)}
              holdMs={1200}
              icon={<HornIcon />}
              disabled={disabled || anyBusy || isBusy('horn')}
              onClick={() => void runCommand('horn')}
            />
          </div>
        </div>

        {hidePanic ? null : (
          <div className={`ops-cmd-group ops-cmd-group--emergency ${panic ? 'is-active' : ''}`}>
            <p className="ops-cmd-group__label">Emergency</p>
            {state.theftRecovery ? (
              <div className="ops-cmd-panic">
                <div className="ops-cmd-panic__copy">
                  <strong>{emergency.label}</strong>
                  <span>
                    Update the situation so responders and notifications stay accurate, then clear when
                    secured.
                  </span>
                </div>
                {onEmergencyStatusChange ? (
                  <VehicleEmergencyStatusPicker
                    status={emergency.value}
                    disabled={disabled}
                    busy={statusBusy || anyBusy}
                    compact
                    onChange={async (next) => {
                      setStatusBusy(true);
                      try {
                        await onEmergencyStatusChange(next);
                      } finally {
                        setStatusBusy(false);
                      }
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  className="ops-cmd-panic__btn ops-cmd-panic__btn--clear"
                  disabled={disabled || anyBusy || isBusy('clearRecovery')}
                  onClick={() => void runCommand('clearRecovery')}
                >
                  {label('clearRecovery', 'End recovery', 'Clearing…')}
                </button>
              </div>
            ) : (
              <div className="ops-cmd-panic">
                <div className="ops-cmd-panic__copy">
                  <strong>Vehicle panic</strong>
                  <span>Trigger vehicle emergency response.</span>
                </div>
                <button
                  type="button"
                  className="ops-cmd-panic__btn"
                  disabled={disabled || anyBusy || isBusy('panic')}
                  onClick={() => void runCommand('panic')}
                >
                  {label('panic', 'Panic', 'Sending…')}
                </button>
              </div>
            )}
          </div>
        )}

        {killOpen && !cut ? (
          <div className="ops-kill-confirm" role="alertdialog" aria-labelledby="ops-kill-title">
            <div className="ops-kill-confirm__head">
              <span aria-hidden>⚠</span>
              <div>
                <strong id="ops-kill-title">Disable ignition?</strong>
                {(vehicleLabel || registration) && (
                  <p className="ops-kill-confirm__unit">
                    {[vehicleLabel, registration].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                  This will prevent the vehicle from starting. Only continue when operationally safe and
                  authorized.
                </p>
              </div>
            </div>
            <label>
              <input
                type="checkbox"
                checked={killAck}
                onChange={(e) => setKillAck(e.target.checked)}
              />
              <span>I understand the risks and want to continue.</span>
            </label>
            <div className="ops-kill-confirm__actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setKillOpen(false);
                  setKillAck(false);
                }}
              >
                Cancel
              </button>
              <HoldToActivate
                label={label('immobilise', 'Confirm disable', 'Disabling…')}
                holdMs={1400}
                tone="danger"
                keepLabel
                disabled={!killAck || disabled || anyBusy || isBusy('immobilise')}
                loading={feedback.immobilise === 'loading' || busyAction === 'immobilise'}
                className="hold-activate--console btn-danger"
                onActivate={() => void runCommand('immobilise')}
              />
            </div>
          </div>
        ) : null}

        {children}
      </section>
    );
  }

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
            <span className="status-pill status-pill--alert">Stolen · Recovery</span>
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
          label={label('immobilise', ops ? 'Disable ignition' : 'Immobilise', 'Disabling…')}
          holdLabel="Hold to disable starter"
          holdMs={1600}
          tone="warn"
          keepLabel
          hideHint={compact}
          loading={feedback.immobilise === 'loading' || busyAction === 'immobilise'}
          disabled={disabled || anyBusy || cut || isBusy('immobilise')}
          className={`${btnClass('immobilise', `vehicle-remote__hold vehicle-remote__btn--cut ${cut ? 'vehicle-remote__btn--on' : ''}`)}`}
          onActivate={() => void runCommand('immobilise')}
        />
        <HoldToActivate
          label={label('release', 'Authorise start', 'Authorising…')}
          holdLabel="Hold to authorise"
          holdMs={1400}
          tone="warn"
          keepLabel
          hideHint={compact}
          loading={feedback.release === 'loading' || busyAction === 'release'}
          disabled={disabled || anyBusy || !cut || isBusy('release')}
          className={`${btnClass('release', 'vehicle-remote__hold')}`}
          onActivate={() => void runCommand('release')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <KeyIcon />
          </span>
          <strong>{label('release', 'Authorise start', 'Authorising…')}</strong>
        </HoldToActivate>
        <HoldToActivate
          label={label('horn', 'Horn / lights', 'Pulsing…')}
          holdLabel="Hold to pulse"
          holdMs={1200}
          tone="warn"
          keepLabel
          hideHint={compact}
          loading={feedback.horn === 'loading' || busyAction === 'horn'}
          disabled={disabled || anyBusy || isBusy('horn')}
          className={`${btnClass(
            'horn',
            `vehicle-remote__hold ${state.hornActive ? 'vehicle-remote__btn--on' : ''} ${hidePanic ? 'vehicle-remote__btn--span' : ''}`,
          )}`}
          onActivate={() => void runCommand('horn')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <HornIcon />
          </span>
          <strong>{label('horn', 'Horn / lights', 'Pulsing…')}</strong>
        </HoldToActivate>
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 7.5-1.8" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Authorise start / immobiliser release */
function KeyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4.25" />
      <path d="M11.5 12.5L20 4.5" />
      <path d="M16.5 4.5h3.5V8" />
      <path d="M15 8.5l2.2 2.2" />
    </svg>
  );
}

function HornIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v4h3l5 4V6L7 10H4z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

function CutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="2.75" />
      <circle cx="6.5" cy="17.5" r="2.75" />
      <path d="M20 4.5L9 15.5M9 8.5L20 19.5" />
    </svg>
  );
}

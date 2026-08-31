'use client';

import { HoldToActivate } from '@/components/ops/EmergencyMode';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

type VehicleRemotePadProps = {
  state: VehicleRemoteState;
  busyAction?: VehicleRemoteAction | null;
  disabled?: boolean;
  variant?: 'client' | 'ops';
  compact?: boolean;
  onCommand: (action: VehicleRemoteAction) => void | Promise<void>;
};

export function VehicleRemotePad({
  state,
  busyAction = null,
  disabled,
  variant = 'client',
  compact = false,
  onCommand,
}: VehicleRemotePadProps) {
  const ops = variant === 'ops';
  const busy = Boolean(busyAction);
  const locked = state.doorsLocked;
  const cut = state.immobiliserOn;

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
          className={`vehicle-remote__btn ${locked ? 'vehicle-remote__btn--on' : ''}`}
          disabled={disabled || busy || locked}
          onClick={() => void onCommand('lock')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <LockIcon />
          </span>
          <strong>{busyAction === 'lock' ? 'Locking…' : 'Lock doors'}</strong>
        </button>
        <button
          type="button"
          className={`vehicle-remote__btn ${!locked ? 'vehicle-remote__btn--warn' : ''}`}
          disabled={disabled || busy || !locked}
          onClick={() => void onCommand('unlock')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <UnlockIcon />
          </span>
          <strong>{busyAction === 'unlock' ? 'Unlocking…' : 'Unlock'}</strong>
        </button>
        <HoldToActivate
          label={busyAction === 'immobilise' ? 'Cutting…' : ops ? 'Kill ignition' : 'Immobilise'}
          holdLabel="Hold to cut starter"
          holdMs={1600}
          tone="warn"
          keepLabel
          hideHint={compact}
          disabled={disabled || busy || cut}
          className={`vehicle-remote__hold vehicle-remote__btn vehicle-remote__btn--cut ${cut ? 'vehicle-remote__btn--on' : ''}`}
          onActivate={() => void onCommand('immobilise')}
        />
        <button
          type="button"
          className="vehicle-remote__btn"
          disabled={disabled || busy || !cut}
          onClick={() => void onCommand('release')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <KeyIcon />
          </span>
          <strong>{busyAction === 'release' ? 'Releasing…' : 'Release'}</strong>
        </button>
        <button
          type="button"
          className={`vehicle-remote__btn ${state.hornActive ? 'vehicle-remote__btn--on' : ''}`}
          disabled={disabled || busy}
          onClick={() => void onCommand('horn')}
        >
          <span className="vehicle-remote__icon" aria-hidden>
            <HornIcon />
          </span>
          <strong>{busyAction === 'horn' ? 'Pulsing…' : 'Horn / lights'}</strong>
        </button>
        <HoldToActivate
          label={busyAction === 'panic' ? 'Sending…' : 'Vehicle panic'}
          holdLabel="Hold to panic"
          holdMs={1800}
          tone="danger"
          keepLabel
          hideHint={compact}
          disabled={disabled || busy}
          className="vehicle-remote__hold vehicle-remote__btn vehicle-remote__btn--panic"
          onActivate={() => void onCommand('panic')}
        />
      </div>
      <p className="vehicle-remote__hint">
        Immobiliser cuts the starter when the vehicle is stationary — standard tracker practice. It does not shut a moving engine.
      </p>
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

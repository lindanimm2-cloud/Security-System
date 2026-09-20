'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vehicle3DViewer } from '@/components/vehicle/Vehicle3DViewer';
import {
  deriveVehicle3DState,
  type VehicleDoorId,
} from '@/components/vehicle/vehicle3d-state';
import type { VehicleModelSpec } from '@/lib/vehicle-model-assets';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

type FeedbackPhase = 'loading' | 'success' | 'error';

export type VehicleRemoteMeta = {
  title?: string;
  registration?: string;
  online?: boolean;
  batteryPct?: number | null;
  gpsLive?: boolean;
  speedKph?: number | null;
  etaMin?: number | null;
  distanceKm?: number | null;
  tripKm?: number | null;
  odoKm?: number | null;
  destination?: string | null;
  lastUpdate?: string | null;
  fuelPct?: number | null;
};

type VehicleRemoteVisualProps = {
  state: VehicleRemoteState;
  model?: VehicleModelSpec | null;
  meta?: VehicleRemoteMeta | null;
  busyAction?: VehicleRemoteAction | null;
  disabled?: boolean;
  variant?: 'full' | 'compact';
  appearance?: 'default' | 'ops';
  hidePanic?: boolean;
  label?: string;
  onCommand: (action: VehicleRemoteAction) => void | boolean | Promise<void | boolean>;
};

const FEEDBACK_MS = 2200;

const DOOR_LABELS: Array<{ id: VehicleDoorId; short: string; slot: string }> = [
  { id: 'frontLeft', short: 'FL', slot: 'fl' },
  { id: 'frontRight', short: 'FR', slot: 'fr' },
  { id: 'rearLeft', short: 'RL', slot: 'rl' },
  { id: 'rearRight', short: 'RR', slot: 'rr' },
];

function formatKm(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function partTone(open: boolean, locked: boolean, panic: boolean): 'open' | 'locked' | 'unlocked' | 'panic' {
  if (panic) return 'panic';
  if (open) return 'open';
  if (locked) return 'locked';
  return 'unlocked';
}

function partCaption(open: boolean, locked: boolean) {
  if (open) return 'OPEN';
  if (locked) return 'LOCKED';
  return 'UNLOCKED';
}

export function VehicleRemoteVisual({
  state,
  model = null,
  meta = null,
  busyAction = null,
  disabled,
  variant = 'full',
  appearance = 'default',
  label,
  onCommand,
}: VehicleRemoteVisualProps) {
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

  const anyBusy =
    Boolean(busyAction) || Object.values(feedback).some((phase) => phase === 'loading');

  const runCommand = useCallback(
    async (action: VehicleRemoteAction) => {
      if (anyBusy || disabled) return;
      setFeedback((prev) => ({ ...prev, [action]: 'loading' }));
      let ok = false;
      try {
        const result = await onCommand(action);
        ok = result !== false;
      } catch {
        ok = false;
      }
      setFeedback((prev) => ({ ...prev, [action]: ok ? 'success' : 'error' }));
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

  const clearPhase = feedback.clearRecovery ?? (busyAction === 'clearRecovery' ? 'loading' : null);

  const title =
    meta?.title ||
    label ||
    [model?.make, model?.model].filter(Boolean).join(' ') ||
    'Vehicle';

  const online = meta?.online !== false;
  const gps = Boolean(meta?.gpsLive);
  const speed =
    typeof meta?.speedKph === 'number' && Number.isFinite(meta.speedKph) ? Math.round(meta.speedKph) : 0;

  const component = useMemo(
    () =>
      deriveVehicle3DState(state, {
        online,
        speedKph: meta?.speedKph,
      }),
    [state, online, meta?.speedKph],
  );

  const panic = component.panic || Boolean(state.panicActive);
  const secure =
    !panic &&
    component.locked &&
    !component.immobiliserOn &&
    !component.theftRecovery &&
    !Object.values(component.doors).some((d) => d.open) &&
    !component.boot.open &&
    !component.bonnet.open;

  const securityHeadline = panic
    ? 'PANIC ACTIVE'
    : component.theftRecovery
      ? 'THEFT RECOVERY'
      : component.immobiliserOn
        ? 'IGNITION DISABLED'
        : secure
          ? 'VEHICLE SECURE'
          : 'ATTENTION REQUIRED';

  const securityTone = panic
    ? 'panic'
    : component.theftRecovery || component.immobiliserOn || !secure
      ? 'warn'
      : 'ok';

  return (
    <section
      className={[
        'vehicle-car',
        'vehicle-car--3d',
        'vehicle-car--console',
        `vehicle-car--${appearance}`,
        variant === 'compact' ? 'vehicle-car--compact' : 'vehicle-car--full',
        panic ? 'vehicle-car--panic' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Interactive 3D vehicle remote"
    >
      <header className="vehicle-car__console-head">
        <div className="vehicle-car__console-head-copy">
          <p className="vehicle-car__kicker">Field unit</p>
          <h3 className="vehicle-car__name">{title}</h3>
          {meta?.registration ? <p className="vehicle-car__reg">{meta.registration}</p> : null}
        </div>
        <div className="vehicle-car__console-head-status">
          <span className={`vehicle-car__link-pill ${online ? 'is-ok' : 'is-off'}`}>
            <i aria-hidden />
            {online ? 'Online' : 'Offline'}
          </span>
          {meta?.lastUpdate ? (
            <span className="vehicle-car__update">
              Updated <time>{meta.lastUpdate}</time>
            </span>
          ) : null}
        </div>
      </header>

      <div className="vehicle-car__stage vehicle-car__stage--hero">
        <div className="vehicle-car__stage-glow" aria-hidden />
        <Vehicle3DViewer
          state={state}
          model={model}
          compact={variant === 'compact'}
          theme="ops"
          showReset={false}
          showHud={false}
          telemetry={{
            speedKph: meta?.speedKph,
            online: meta?.online,
            batteryPct: meta?.batteryPct,
            gpsLive: meta?.gpsLive,
            registration: meta?.registration,
            etaMin: meta?.etaMin,
            distanceKm: meta?.distanceKm,
            tripKm: meta?.tripKm,
            odoKm: meta?.odoKm,
            destination: meta?.destination,
          }}
        />

        <div className="vehicle-car__part-hud" aria-hidden="true">
          {(component.bonnet.open || panic) && (
            <span className={`vehicle-car__part vehicle-car__part--bonnet is-${partTone(component.bonnet.open, Boolean(component.bonnet.locked ?? component.locked), panic)}`}>
              <em>Bonnet</em>
              <strong>{partCaption(component.bonnet.open, Boolean(component.bonnet.locked ?? component.locked))}</strong>
            </span>
          )}
          {DOOR_LABELS.map(({ id, short, slot }) => {
            const d = component.doors[id];
            const locked = Boolean(d.locked ?? component.locked);
            if (!d.open && !panic) return null;
            return (
              <span
                key={id}
                className={`vehicle-car__part vehicle-car__part--${slot} is-${partTone(d.open, locked, panic)}`}
              >
                <em>{short}</em>
                <strong>{partCaption(d.open, locked)}</strong>
              </span>
            );
          })}
          {(component.boot.open || panic) && (
            <span className={`vehicle-car__part vehicle-car__part--boot is-${partTone(component.boot.open, Boolean(component.boot.locked ?? component.locked), panic)}`}>
              <em>Boot</em>
              <strong>{partCaption(component.boot.open, Boolean(component.boot.locked ?? component.locked))}</strong>
            </span>
          )}
        </div>

        <div className="vehicle-car__status-overlay" aria-live="polite">
          {panic ? <span className="vehicle-car__status-badge is-panic">Panic active</span> : null}
          {state.theftRecovery ? (
            <button
              type="button"
              className={`vehicle-car__status-badge is-recovery is-action ${clearPhase ? `is-${clearPhase}` : ''}`}
              disabled={disabled || anyBusy}
              onClick={() => void runCommand('clearRecovery')}
              title="Exit recovery mode"
            >
              {clearPhase === 'loading' ? 'Clearing…' : 'Recovery mode · tap to exit'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="vehicle-car__caption">
        <p className="vehicle-car__caption-kicker">Digital twin</p>
        <p className="vehicle-car__caption-title">
          {title}
          {meta?.registration ? (
            <>
              {' '}
              <em>· {meta.registration}</em>
            </>
          ) : null}
        </p>
      </div>

      <div className={`vehicle-car__state-bar is-${securityTone}`} role="status">
        <span className={online ? 'is-ok' : 'is-off'}>{online ? '● Online' : '○ Offline'}</span>
        <span className={component.locked ? 'is-ok' : 'is-warn'}>
          {component.locked ? 'Doors locked' : 'Doors unlocked'}
        </span>
        <span className={component.immobiliserOn ? 'is-warn' : 'is-ok'}>
          {component.immobiliserOn ? 'Ignition disabled' : 'Ignition enabled'}
        </span>
        <span className={gps ? 'is-live' : 'is-off'}>{gps ? 'GPS linked' : 'GPS offline'}</span>
        {panic ? <span className="is-panic">Panic active</span> : null}
      </div>

      <div className="vehicle-car__telemetry" aria-label="Vehicle telemetry">
        <div className="vehicle-car__tele">
          <span>Speed</span>
          <strong>
            {speed} <em>km/h</em>
          </strong>
        </div>
        <div className="vehicle-car__tele">
          <span>Trip</span>
          <strong>
            {formatKm(meta?.tripKm)} <em>km</em>
          </strong>
        </div>
        <div className="vehicle-car__tele">
          <span>Odometer</span>
          <strong>
            {formatKm(meta?.odoKm)} <em>km</em>
          </strong>
        </div>
        <div className="vehicle-car__tele">
          <span>GPS</span>
          <strong className={gps ? 'is-live' : ''}>{gps ? 'Linked' : '—'}</strong>
        </div>
      </div>

      <div className={`vehicle-car__security is-${securityTone}`}>
        <div className="vehicle-car__security-head">
          <p className="vehicle-car__kicker">Security status</p>
          <strong>{securityHeadline}</strong>
        </div>
        <ul className="vehicle-car__security-list">
          <li>
            <span>Doors</span>
            <em>{component.locked ? 'Locked' : Object.values(component.doors).some((d) => d.open) ? 'Open' : 'Unlocked'}</em>
          </li>
          <li>
            <span>Ignition</span>
            <em>{component.immobiliserOn ? 'Disabled' : 'Enabled'}</em>
          </li>
          <li>
            <span>Alarm</span>
            <em>{panic ? 'Triggered' : 'Armed'}</em>
          </li>
          <li>
            <span>GPS</span>
            <em>{gps ? 'Connected' : 'Offline'}</em>
          </li>
          <li>
            <span>Panic</span>
            <em>{panic ? 'Active' : 'Clear'}</em>
          </li>
        </ul>
      </div>
    </section>
  );
}

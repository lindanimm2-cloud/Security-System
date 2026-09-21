'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { Vehicle3DViewer } from '@/components/vehicle/Vehicle3DViewer';
import {
  deriveVehicle3DState,
  type VehicleDoorId,
} from '@/components/vehicle/vehicle3d-state';
import type { VehicleModelSpec } from '@/lib/vehicle-model-assets';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';
import { vehicleEmergencyMeta } from '@/lib/vehicle-emergency-status';
import { VehicleEmergencyStatusPicker } from '@/components/vehicle/VehicleEmergencyStatusPicker';
import type { VehicleEmergencyStatus } from '@/lib/vehicle-emergency-status';

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
  /** Ops classification e.g. STOLEN, CLIENT, ARMED_RESPONSE */
  vehicleType?: string | null;
  /** Explicit stolen flag when type is not set */
  stolen?: boolean | null;
  /** Active situation while recovery is on */
  emergencyStatus?: string | null;
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
  onEmergencyStatusChange?: (status: VehicleEmergencyStatus) => void | Promise<void>;
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

const PART_HOLD_MS = 1100;

type PartHoldProps = {
  slot: string;
  name: string;
  open: boolean;
  locked: boolean;
  panic: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
};

function PartHoldLabel({
  slot,
  name,
  open,
  locked,
  panic,
  disabled,
  loading,
  onToggle,
}: PartHoldProps) {
  const tone = partTone(open, locked, panic);
  const caption = partCaption(open, locked);
  const action = locked ? 'unlock' : 'lock';
  return (
    <HoldToActivate
      label={`${name} ${caption}. Hold to ${action}.`}
      holdMs={PART_HOLD_MS}
      keepLabel
      hideHint
      tone="warn"
      disabled={disabled || open || panic}
      loading={loading}
      className={`vehicle-car__part vehicle-car__part--${slot} is-${tone} hold-activate--part`}
      onActivate={onToggle}
    >
      <em>{name}</em>
      <strong>{caption}</strong>
    </HoldToActivate>
  );
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
  onEmergencyStatusChange,
}: VehicleRemoteVisualProps) {
  const [feedback, setFeedback] = useState<Partial<Record<VehicleRemoteAction, FeedbackPhase>>>({});
  const [statusBusy, setStatusBusy] = useState(false);
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
  const classifiedStolen =
    Boolean(meta?.stolen) ||
    String(meta?.vehicleType ?? '')
      .trim()
      .toUpperCase() === 'STOLEN';
  const inRecovery = Boolean(component.theftRecovery);
  /** Ops label: classified STOLEN and/or active theft-recovery. */
  const stolen = classifiedStolen || inRecovery;
  const emergency = vehicleEmergencyMeta(
    meta?.emergencyStatus ?? (stolen || inRecovery ? 'STOLEN' : null),
  );
  const secure =
    !panic &&
    !stolen &&
    component.locked &&
    !component.immobiliserOn &&
    !inRecovery &&
    !Object.values(component.doors).some((d) => d.open) &&
    !component.boot.open &&
    !component.bonnet.open;

  const securityHeadline = panic
    ? 'PANIC ACTIVE'
    : stolen || inRecovery
      ? emergency.short
      : component.immobiliserOn
        ? 'IGNITION DISABLED'
        : secure
          ? 'VEHICLE SECURE'
          : 'ATTENTION REQUIRED';

  const securityTone = panic
    ? 'panic'
    : stolen
      ? 'warn'
      : component.immobiliserOn
        ? 'cut'
        : !secure
          ? 'warn'
          : 'ok';

  const statusLabel = panic
    ? 'Panic'
    : stolen || inRecovery
      ? emergency.badge
      : 'Normal';

  async function changeEmergencyStatus(next: VehicleEmergencyStatus) {
    if (!onEmergencyStatusChange || statusBusy || disabled || anyBusy) return;
    setStatusBusy(true);
    try {
      await onEmergencyStatusChange(next);
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <section
      className={[
        'vehicle-car',
        'vehicle-car--3d',
        'vehicle-car--console',
        `vehicle-car--${appearance}`,
        variant === 'compact' ? 'vehicle-car--compact' : 'vehicle-car--full',
        panic ? 'vehicle-car--panic' : '',
        stolen ? 'vehicle-car--recovery' : '',
        !panic && !stolen && component.immobiliserOn ? 'vehicle-car--cut' : '',
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
          showAlerts={false}
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

        <div className="vehicle-car__part-hud" role="group" aria-label="Door and panel locks">
          <PartHoldLabel
            slot="bonnet"
            name="Bonnet"
            open={component.bonnet.open}
            locked={Boolean(component.bonnet.locked ?? component.locked)}
            panic={panic}
            disabled={disabled || anyBusy}
            loading={feedback.lock === 'loading' || feedback.unlock === 'loading' || busyAction === 'lock' || busyAction === 'unlock'}
            onToggle={() =>
              void runCommand(Boolean(component.bonnet.locked ?? component.locked) ? 'unlock' : 'lock')
            }
          />
          {DOOR_LABELS.map(({ id, short, slot }) => {
            const d = component.doors[id];
            const locked = Boolean(d.locked ?? component.locked);
            return (
              <PartHoldLabel
                key={id}
                slot={slot}
                name={short}
                open={d.open}
                locked={locked}
                panic={panic}
                disabled={disabled || anyBusy}
                loading={
                  feedback.lock === 'loading' ||
                  feedback.unlock === 'loading' ||
                  busyAction === 'lock' ||
                  busyAction === 'unlock'
                }
                onToggle={() => void runCommand(locked ? 'unlock' : 'lock')}
              />
            );
          })}
          <PartHoldLabel
            slot="boot"
            name="Boot"
            open={component.boot.open}
            locked={Boolean(component.boot.locked ?? component.locked)}
            panic={panic}
            disabled={disabled || anyBusy}
            loading={feedback.lock === 'loading' || feedback.unlock === 'loading' || busyAction === 'lock' || busyAction === 'unlock'}
            onToggle={() =>
              void runCommand(Boolean(component.boot.locked ?? component.locked) ? 'unlock' : 'lock')
            }
          />
        </div>

        <div className="vehicle-car__status-overlay" aria-live="polite">
          {panic ? <span className="vehicle-car__status-badge is-panic">Panic active</span> : null}
          {(stolen || inRecovery) && !panic ? (
            <span className="vehicle-car__status-badge is-stolen">{emergency.badge}</span>
          ) : null}
          {inRecovery ? (
            <button
              type="button"
              className={`vehicle-car__status-badge is-recovery is-action ${clearPhase ? `is-${clearPhase}` : ''}`}
              disabled={disabled || anyBusy}
              onClick={() => void runCommand('clearRecovery')}
              title="Exit recovery mode"
            >
              {clearPhase === 'loading' ? 'Clearing…' : emergency.recoveryLine}
            </button>
          ) : null}
          {component.immobiliserOn && !panic ? (
            <span className="vehicle-car__status-badge is-cut">Ignition cut</span>
          ) : null}
        </div>
      </div>

      {inRecovery && onEmergencyStatusChange ? (
        <VehicleEmergencyStatusPicker
          status={emergency.value}
          disabled={disabled}
          busy={statusBusy || anyBusy}
          compact={variant === 'compact'}
          onChange={changeEmergencyStatus}
        />
      ) : null}

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
        <span className={component.locked ? 'is-ok' : 'is-unlocked'}>
          {component.locked ? 'Doors locked' : 'Doors unlocked'}
        </span>
        <span className={component.immobiliserOn ? 'is-cut' : 'is-ok'}>
          {component.immobiliserOn ? 'Ignition disabled' : 'Ignition enabled'}
        </span>
        <span className={gps ? 'is-live' : 'is-off'}>{gps ? 'GPS linked' : 'GPS offline'}</span>
        {(classifiedStolen || stolen || inRecovery) && !panic ? (
          <span className="is-stolen">
            {inRecovery ? `${emergency.badge} · Recovery` : emergency.badge}
          </span>
        ) : null}
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
            <span>Status</span>
            <em>{statusLabel}</em>
          </li>
          <li>
            <span>Classification</span>
            <em>
              {classifiedStolen
                ? 'Stolen'
                : String(meta?.vehicleType ?? '')
                    .trim()
                    .replace(/_/g, ' ') || 'Client'}
            </em>
          </li>
          <li>
            <span>Doors</span>
            <em>{component.locked ? 'Locked' : Object.values(component.doors).some((d) => d.open) ? 'Open' : 'Unlocked'}</em>
          </li>
          <li>
            <span>Ignition</span>
            <em className={component.immobiliserOn ? 'is-cut' : undefined}>
              {component.immobiliserOn ? 'Disabled' : 'Enabled'}
            </em>
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

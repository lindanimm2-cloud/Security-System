'use client';

import type { VehicleRemoteState } from '@/lib/vehicle-remote';

export type VehicleTwinTelemetry = {
  speedKph?: number | null;
  online?: boolean;
  batteryPct?: number | null;
  gpsLive?: boolean;
  registration?: string;
  /** Minutes to scene / destination when responding. */
  etaMin?: number | null;
  /** Remaining distance to scene (km). */
  distanceKm?: number | null;
  /** Session / patrol trip distance. */
  tripKm?: number | null;
  /** Lifetime odometer. */
  odoKm?: number | null;
  /** Optional scene / zone label for the header. */
  destination?: string | null;
};

type Gear = 'P' | 'R' | 'N' | 'D';
type OpsProfile = 'STANDBY' | 'PATROL' | 'RESPONSE' | 'SECURE' | 'RECOVERY';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatKm(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  });
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  let end = endDeg;
  while (end < startDeg) end += 360;
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const delta = end - startDeg;
  const large = delta > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Compact ops speed dial — cyan track matching control-room accents. */
function SpeedCluster({ speed }: { speed: number }) {
  const max = 160;
  const t = clamp(speed / max, 0, 1);
  const startDeg = 145;
  const sweepDeg = 250;
  const cx = 50;
  const cy = 52;
  const r = 38;
  const track = describeArc(cx, cy, r, startDeg, startDeg + sweepDeg);
  const value = t > 0.01 ? describeArc(cx, cy, r, startDeg, startDeg + sweepDeg * t) : '';

  return (
    <div className="vehicle-twin-hud__speed-cluster" aria-hidden>
      <svg viewBox="0 0 100 90" className="vehicle-twin-hud__speed-arc">
        <path d={track} className="vehicle-twin-hud__speed-track" />
        {value ? <path d={value} className="vehicle-twin-hud__speed-value" /> : null}
      </svg>
      <div className="vehicle-twin-hud__speed-readout">
        <strong>{Math.round(speed)}</strong>
        <span>KM/H</span>
      </div>
    </div>
  );
}

function resolveGear(state: VehicleRemoteState, speed: number): Gear {
  if (state.theftRecovery) return 'R';
  if (state.immobiliserOn) return 'P';
  if (speed >= 5) return 'D';
  if (state.doorsLocked) return 'P';
  return 'N';
}

function resolveProfile(state: VehicleRemoteState, speed: number, responding: boolean): OpsProfile {
  if (state.theftRecovery) return 'RECOVERY';
  if (state.immobiliserOn) return 'SECURE';
  if (responding) return 'RESPONSE';
  if (speed >= 5) return 'PATROL';
  return 'STANDBY';
}

function headerCopy(
  profile: OpsProfile,
  destination?: string | null,
): { title: string; hint?: string } {
  if (profile === 'RECOVERY') return { title: 'Emergency · recovery', hint: destination ?? undefined };
  if (profile === 'SECURE') return { title: 'Ignition cut · secure' };
  if (profile === 'RESPONSE') {
    return {
      title: destination ? `En route · ${destination}` : 'En route to scene',
    };
  }
  if (profile === 'PATROL') return { title: 'Patrol · live track' };
  return { title: 'Unit on station' };
}

function LockGlyph({ locked }: { locked: boolean }) {
  return (
    <svg className="vehicle-twin-hud__glyph" viewBox="0 0 24 24" aria-hidden>
      {locked ? (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11V8a4 4 0 0 1 7.5-1.9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

function GpsGlyph({ live }: { live: boolean }) {
  return (
    <svg className={`vehicle-twin-hud__glyph ${live ? 'is-live' : ''}`} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
    </svg>
  );
}

export function VehicleTwinHud({
  state,
  telemetry = null,
  label,
  compact = false,
}: {
  state: VehicleRemoteState;
  telemetry?: VehicleTwinTelemetry | null;
  label: string;
  compact?: boolean;
}) {
  const rawSpeed = telemetry?.speedKph;
  const speed =
    state.immobiliserOn && !state.theftRecovery
      ? 0
      : typeof rawSpeed === 'number' && Number.isFinite(rawSpeed)
        ? clamp(rawSpeed, 0, 240)
        : 0;

  const responding =
    telemetry?.etaMin != null || telemetry?.distanceKm != null || Boolean(telemetry?.destination);
  const gear = resolveGear(state, speed);
  const profile = resolveProfile(state, speed, responding);
  const header = headerCopy(profile, telemetry?.destination);
  const online = telemetry?.online !== false;
  const gps = Boolean(telemetry?.gpsLive);
  const gears: Gear[] = ['P', 'R', 'N', 'D'];
  const doorsLocked = state.doorsLocked;

  const etaLabel =
    telemetry?.etaMin != null && Number.isFinite(telemetry.etaMin)
      ? `${Math.round(telemetry.etaMin)}m`
      : speed >= 5
        ? 'LIVE'
        : '—';
  const distLabel =
    telemetry?.distanceKm != null && Number.isFinite(telemetry.distanceKm)
      ? `${formatKm(telemetry.distanceKm)} km`
      : gps
        ? 'GPS'
        : '—';

  return (
    <div
      className={`vehicle-twin-hud vehicle-twin-hud--ops ${compact ? 'vehicle-twin-hud--compact' : ''}`}
      aria-label="Field unit ops overlay"
    >
      <header className="vehicle-twin-hud__top">
        <div className="vehicle-twin-hud__top-pill">
          <p className="vehicle-twin-hud__top-kicker">Field unit</p>
          <p className="vehicle-twin-hud__top-title">{header.title}</p>
          <div className="vehicle-twin-hud__top-stats">
            <span className="vehicle-twin-hud__stat">
              <span className="vehicle-twin-hud__stat-k">ETA</span>
              <em>{etaLabel}</em>
            </span>
            <span className="vehicle-twin-hud__stat-sep" aria-hidden>
              ·
            </span>
            <span className="vehicle-twin-hud__stat">
              <span className="vehicle-twin-hud__stat-k">LINK</span>
              <em>{distLabel}</em>
            </span>
          </div>
        </div>
      </header>

      <div className="vehicle-twin-hud__left-rail">
        <SpeedCluster speed={speed} />
        <div
          className={`vehicle-twin-hud__side-badge ${doorsLocked ? 'is-locked' : 'is-open'}`}
          aria-hidden
        >
          <span className="vehicle-twin-hud__limit-kicker">Doors</span>
          <strong className="vehicle-twin-hud__limit-value">{doorsLocked ? 'LOCKED' : 'OPEN'}</strong>
        </div>
        <div className="vehicle-twin-hud__gears vehicle-twin-hud__gears--rail" role="status" aria-label={`Gear ${gear}`}>
          {gears.map((g) => (
            <span key={g} className={`vehicle-twin-hud__gear ${gear === g ? 'is-on' : ''}`}>
              {g}
            </span>
          ))}
        </div>
      </div>

      <footer className="vehicle-twin-hud__bar">
        <div className="vehicle-twin-hud__bar-trip">
          <span className="vehicle-twin-hud__bar-kicker">Trip</span>
          <strong>
            {formatKm(telemetry?.tripKm, 0)}
            <span className="vehicle-twin-hud__unit"> km</span>
          </strong>
        </div>

        <div className="vehicle-twin-hud__bar-icons" aria-hidden>
          <span className={`vehicle-twin-hud__icon ${doorsLocked ? 'is-ok' : 'is-warn'}`} title={doorsLocked ? 'Locked' : 'Unlocked'}>
            <LockGlyph locked={doorsLocked} />
          </span>
          <span className={`vehicle-twin-hud__icon ${gps ? 'is-live' : 'is-off'}`} title={gps ? 'GPS live' : 'GPS offline'}>
            <GpsGlyph live={gps} />
          </span>
          <span className={`vehicle-twin-hud__icon ${online ? 'is-ok' : 'is-off'}`} title={online ? 'Link up' : 'Offline'}>
            <svg className="vehicle-twin-hud__glyph" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M5 12h2M17 12h2M8.5 8.5l1.4 1.4M14.1 14.1l1.4 1.4M8.5 15.5l1.4-1.4M14.1 9.9l1.4-1.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            </svg>
          </span>
        </div>

        <div className={`vehicle-twin-hud__profile is-${profile.toLowerCase()}`}>{profile}</div>

        <div className="vehicle-twin-hud__bar-odo">
          <span className="vehicle-twin-hud__bar-kicker">Odo</span>
          <strong>
            {formatKm(telemetry?.odoKm, 0)}
            <span className="vehicle-twin-hud__unit"> km</span>
          </strong>
        </div>
      </footer>

      <p className="vehicle-twin-hud__twin-label">
        Ops twin · {label}
        {telemetry?.registration ? ` · ${telemetry.registration}` : ''}
      </p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { ARM_MODE_OPTIONS, alarmStatusLabel, isArmedStatus, type ArmMode } from '@/lib/sa-alarm';
import { HoldToActivate, OpsSirenIcon } from '@/components/ops/EmergencyMode';
import { portalAmbientFromAlarm } from '@/lib/portal-ambient';
import { usePortalAmbientOptional } from '@/components/portal/PortalAmbientProvider';

type Property = {
  id: string;
  name: string;
  alarmStatus: string;
  alarmLinked?: boolean;
  propertyType?: string;
  zoneHealth?: {
    total: number;
    active: number;
    fault: number;
    alert: number;
    disabled: number;
  };
};

type Props = {
  properties: Property[];
  hasAccess: boolean;
  onUpdated?: () => void;
  /** Compact card for portal dashboard. */
  variant?: 'default' | 'dashboard';
  /** Live cameras pane — merged into the dashboard card. */
  feeds?: ReactNode;
};

function modeMeta(status: string) {
  return ARM_MODE_OPTIONS.find((opt) => opt.value === status) ?? null;
}

export function HomeAlarmControl({
  properties,
  hasAccess,
  onUpdated,
  variant = 'default',
  feeds,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const isDashboard = variant === 'dashboard';
  const merged = isDashboard && feeds != null;
  const ambientCtx = usePortalAmbientOptional();

  async function setMode(property: Property, mode: ArmMode) {
    if (!hasAccess) return;
    setLoadingId(`${property.id}-${mode}`);
    setMsg('');
    setOptimisticStatus((prev) => ({ ...prev, [property.id]: mode }));
    if (property.id === properties[0]?.id) {
      ambientCtx?.setAmbientOverride(portalAmbientFromAlarm(mode));
    }
    try {
      await clientApi.patch(`/client/properties/${property.id}/alarm`, { status: mode });
      setMsg(`${property.name}: ${alarmStatusLabel(mode)}.`);
      onUpdated?.();
    } catch {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[property.id];
        return next;
      });
      if (property.id === properties[0]?.id) {
        ambientCtx?.setAmbientOverride(null);
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function soundSiren(property: Property) {
    if (!hasAccess) return;
    setLoadingId(`${property.id}-siren`);
    setMsg('');
    setOptimisticStatus((prev) => ({ ...prev, [property.id]: 'TRIGGERED' }));
    if (property.id === properties[0]?.id) {
      ambientCtx?.setAmbientOverride(portalAmbientFromAlarm('TRIGGERED'));
    }
    try {
      const res = await clientApi.post<ApiResponse<{ message?: string }>>(
        `/client/properties/${property.id}/siren`,
      );
      setMsg(res.data?.message ?? `Siren sounding at ${property.name}. Disarm to silence.`);
      onUpdated?.();
    } catch {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[property.id];
        return next;
      });
      if (property.id === properties[0]?.id) {
        ambientCtx?.setAmbientOverride(null);
      }
      setMsg('Siren command failed.');
    } finally {
      setLoadingId(null);
    }
  }

  if (!hasAccess) {
    return (
      <section
        className={`portal-card home-alarm-card home-alarm-card--locked ${isDashboard ? 'home-alarm-card--dashboard' : ''} ${merged ? 'home-sec' : ''}`}
      >
        {merged ? (
          <div className="home-sec__body">
            <div className="home-sec__feeds">{feeds}</div>
            <div className="home-sec__pad">
              <p className="home-alarm-card__eyebrow">Home security</p>
              <h2>Home Security</h2>
              <p className="home-alarm-card__desc">Away, Stay and Night arm for SA panels.</p>
              <Link href="/portal/subscription/upgrade?addon=HOME_SECURITY" className="btn-secondary btn-inline">
                Upgrade to Home Security
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="home-alarm-card__eyebrow">Home security</p>
            <h2>Home Security</h2>
            <p className="home-alarm-card__desc">Away, Stay and Night arm for SA panels.</p>
            <Link href="/portal/subscription/upgrade?addon=HOME_SECURITY" className="btn-secondary btn-inline">
              Upgrade to Home Security
            </Link>
          </>
        )}
      </section>
    );
  }

  if (properties.length === 0) {
    return (
      <section className={`portal-card home-alarm-card ${isDashboard ? 'home-alarm-card--dashboard' : ''} ${merged ? 'home-sec' : ''}`}>
        {merged ? (
          <div className="home-sec__body">
            <div className="home-sec__feeds">{feeds}</div>
            <div className="home-sec__pad">
              <p className="home-alarm-card__eyebrow">Home security</p>
              <h2>Home Security</h2>
              <p className="home-alarm-card__desc">No properties linked yet.</p>
              <Link href="/portal/home" className="btn-secondary btn-inline">
                Set up home security
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="home-alarm-card__eyebrow">Home security</p>
            <h2>Home Security</h2>
            <p className="home-alarm-card__desc">No properties linked yet.</p>
            <Link href="/portal/home" className="btn-secondary btn-inline">
              Set up home security
            </Link>
          </>
        )}
      </section>
    );
  }

  const primary = properties[0];
  const primaryStatus = optimisticStatus[primary.id] ?? primary.alarmStatus;
  const armed = isArmedStatus(primaryStatus);
  const isTriggered = primaryStatus === 'TRIGGERED';
  const activeOpt = modeMeta(primaryStatus);
  const colorKey = activeOpt?.colorKey ?? (isTriggered ? 'triggered' : 'disarm');
  const statusClass = primaryStatus.toLowerCase().replace(/_/g, '-');

  const modePad = (
    <section className="alarm-mode-pad" aria-label="Alarm mode">
      <p className="alarm-mode-pad__kicker">Alarm mode</p>
      <div className={`arm-mode-row ${isDashboard ? 'arm-mode-row--dashboard' : ''}`}>
        {ARM_MODE_OPTIONS.map((opt) => {
          const active = primaryStatus === opt.value;
          const key = `${primary.id}-${opt.value}`;
          return (
            <HoldToActivate
              key={opt.value}
              className={`arm-mode-btn arm-mode-btn--${opt.colorKey} ${active ? 'arm-mode-btn--active' : ''} hold-activate--arm-mode`}
              label={opt.label}
              holdLabel={`Hold for ${opt.label}…`}
              holdMs={900}
              hideHint
              keepLabel
              tone="neutral"
              loading={loadingId === key}
              disabled={!!loadingId || active}
              onActivate={() => {
                if (active) return;
                void setMode(primary, opt.value);
              }}
            >
              {loadingId === key ? (
                <LoadingSpinner label="" size="sm" />
              ) : (
                <>
                  <svg
                    className="arm-mode-btn__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: opt.icon }}
                  />
                  <span className="arm-mode-btn__label">{opt.label}</span>
                  {active ? <span className="arm-mode-btn__dot" aria-hidden /> : null}
                </>
              )}
            </HoldToActivate>
          );
        })}
      </div>
      <p className="home-alarm-card__hint">
        {isTriggered
          ? 'Siren sounding · responders notified. Disarm to silence.'
          : activeOpt?.hint ?? alarmStatusLabel(primaryStatus)}
        {primary.alarmLinked === false ? ' · Panel not linked' : ''}
      </p>
      {isTriggered ? null : (
        <>
          <HoldToActivate
            className="hold-activate--inline home-alarm-card__siren hold-activate--ops-well"
            label="Sound siren on property"
            holdLabel="Hold to sound siren…"
            holdMs={1200}
            hideHint
            keepLabel
            loading={loadingId === `${primary.id}-siren`}
            disabled={!!loadingId}
            onActivate={() => void soundSiren(primary)}
          >
            <OpsSirenIcon />
            Sound siren on property
          </HoldToActivate>
          <p className="home-alarm-card__hint">
            Rings the outdoor siren even if the panel is disarmed — use when CCTV shows a break-in.
          </p>
        </>
      )}
    </section>
  );

  return (
    <section
      className={`portal-card home-alarm-card home-alarm-card--${colorKey} ${isDashboard ? 'home-alarm-card--dashboard' : ''} ${merged ? 'home-sec' : ''} ${armed ? 'home-alarm-card--armed' : ''} ${isTriggered ? 'home-alarm-card--triggered' : ''}`}
      aria-label="Home security"
    >
      <div className="home-alarm-card__top">
        <div className="home-alarm-card__identity">
          <div
            className={`home-alarm-card__shield ${armed ? 'home-alarm-card__shield--armed' : ''} ${isTriggered ? 'home-alarm-card__shield--triggered' : ''} home-alarm-card__shield--${colorKey}`}
          >
            <SketchIcon name="shield" size={isDashboard ? 22 : 26} />
          </div>
          <div className="home-alarm-card__identity-copy">
            <p className="home-alarm-card__eyebrow">Home security</p>
            <h2>{primary.name}</h2>
            {!isDashboard ? (
              <p className="home-alarm-card__desc">
                Away, Stay and Night modes for Paradox, DSC, IDS, Ajax and Nemtek panels. Press and hold
                to change mode.
              </p>
            ) : null}
          </div>
        </div>
        <div className="home-alarm-card__top-meta">
          <span className={`home-alarm-card__status home-alarm-card__status--${colorKey} status-pill status-pill--${statusClass}`}>
            {alarmStatusLabel(primaryStatus)}
          </span>
          <Link href={`/portal/home/${primary.id}`} className="link-sm home-alarm-card__open">
            {isDashboard ? 'Manage site' : 'Open site'}
          </Link>
        </div>
      </div>

      {msg ? <div className="alert alert--success home-alarm-card__feedback">{msg}</div> : null}

      {modePad}

      {merged ? <div className="home-sec__feeds">{feeds}</div> : null}

      {isDashboard ? (
        <div className="home-dash-zones" aria-label="Zones sensors and alarm status">
          <Link href={`/portal/home/${primary.id}`} className="home-dash-zones__item">
            <span className="home-dash-zones__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3 4.5 6.5v7.2c0 4.2 3.1 7.8 7.5 8.8 4.4-1 7.5-4.6 7.5-8.8V6.5L12 3z" />
              </svg>
            </span>
            <span className="home-dash-zones__label">Alarm</span>
            <span
              className={`home-dash-zones__value ${
                isTriggered
                  ? 'home-dash-zones__value--alert'
                  : armed
                    ? 'home-dash-zones__value--ok'
                    : 'home-dash-zones__value--muted'
              }`}
            >
              {isTriggered ? 'Triggered' : armed ? 'Armed' : 'Disarmed'}
            </span>
          </Link>
          <Link href={`/portal/home/${primary.id}`} className="home-dash-zones__item">
            <span className="home-dash-zones__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3z" />
                <path d="M12 12v9M4 7.5l8 4.5 8-4.5" />
              </svg>
            </span>
            <span className="home-dash-zones__label">Zones</span>
            <span
              className={`home-dash-zones__value ${
                (primary.zoneHealth?.fault ?? 0) > 0
                  ? 'home-dash-zones__value--warn'
                  : 'home-dash-zones__value--ok'
              }`}
            >
              {(primary.zoneHealth?.fault ?? 0) > 0
                ? `${primary.zoneHealth?.fault} fault`
                : `${primary.zoneHealth?.active ?? primary.zoneHealth?.total ?? 0}`}
            </span>
          </Link>
          <Link href={`/portal/home/${primary.id}`} className="home-dash-zones__item">
            <span className="home-dash-zones__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
              </svg>
            </span>
            <span className="home-dash-zones__label">Sensors</span>
            <span
              className={`home-dash-zones__value ${
                (primary.zoneHealth?.alert ?? 0) > 0
                  ? 'home-dash-zones__value--alert'
                  : (primary.zoneHealth?.disabled ?? 0) > 0
                    ? 'home-dash-zones__value--muted'
                    : 'home-dash-zones__value--ok'
              }`}
            >
              {(primary.zoneHealth?.alert ?? 0) > 0
                ? `${primary.zoneHealth?.alert} open`
                : `${primary.zoneHealth?.total ?? 0}`}
            </span>
          </Link>
        </div>
      ) : null}

      <div className="home-alarm-card__actions">
        <Link href={`/portal/home/${primary.id}`} className="home-alarm-card__manage">
          Zones &amp; sensors
        </Link>
        {merged ? (
          <Link href={`/portal/home/${primary.id}`} className="home-alarm-card__manage">
            Cameras
          </Link>
        ) : null}
        {properties.length > 1 ? (
          <Link href="/portal/home" className="home-alarm-card__more">
            +{properties.length - 1} more
          </Link>
        ) : null}
        {primary.alarmLinked === false ? (
          <span className="home-alarm-card__linked">Panel offline</span>
        ) : (
          <span className="home-alarm-card__linked home-alarm-card__linked--ok">Monitoring on</span>
        )}
      </div>

      {!isDashboard && properties.length > 1 ? (
        <ul className="home-alarm-card__list">
          {properties.slice(1).map((p) => {
            const pStatus = optimisticStatus[p.id] ?? p.alarmStatus;
            const nextMode: ArmMode = isArmedStatus(pStatus) ? 'DISARMED' : 'ARMED';
            const nextLabel = isArmedStatus(pStatus) ? 'Disarm' : 'Away';
            return (
              <li key={p.id} className="home-alarm-card__list-item">
                <span>{p.name}</span>
                <span className={`status-pill status-pill--${pStatus.toLowerCase().replace(/_/g, '-')}`}>
                  {alarmStatusLabel(pStatus)}
                </span>
                <HoldToActivate
                  className="hold-activate--inline hold-activate--ops-well hold-activate--ops-well-sm"
                  label={nextLabel}
                  holdLabel={`Hold to ${nextLabel.toLowerCase()}…`}
                  holdMs={900}
                  hideHint
                  keepLabel
                  loading={loadingId === `${p.id}-${nextMode}`}
                  disabled={!!loadingId}
                  onActivate={() => void setMode(p, nextMode)}
                >
                  {nextLabel}
                </HoldToActivate>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

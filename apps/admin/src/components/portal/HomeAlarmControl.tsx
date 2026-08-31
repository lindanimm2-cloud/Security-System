'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { clientApi } from '@/lib/api-client';
import { ARM_MODE_OPTIONS, alarmStatusLabel, isArmedStatus, type ArmMode } from '@/lib/sa-alarm';
import { portalAmbientFromAlarm } from '@/lib/portal-ambient';
import { usePortalAmbientOptional } from '@/components/portal/PortalAmbientProvider';

type Property = {
  id: string;
  name: string;
  alarmStatus: string;
  alarmLinked?: boolean;
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

  if (!hasAccess) {
    return (
      <section
        className={`portal-card home-alarm-card home-alarm-card--locked ${isDashboard ? 'home-alarm-card--dashboard' : ''} ${merged ? 'home-sec' : ''}`}
      >
        {merged ? (
          <div className="home-sec__body">
            <div className="home-sec__feeds">{feeds}</div>
            <div className="home-sec__pad">
              <p className="home-alarm-card__eyebrow">Home alarm</p>
              <h2>Home Security</h2>
              <p className="home-alarm-card__desc">Away, Stay and Night arm for SA panels.</p>
              <Link href="/portal/subscription/upgrade?addon=HOME_SECURITY" className="btn-secondary btn-inline">
                Upgrade to Home Security
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="home-alarm-card__eyebrow">Home alarm</p>
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
              <p className="home-alarm-card__eyebrow">Home alarm</p>
              <h2>Home Security</h2>
              <p className="home-alarm-card__desc">No properties linked yet.</p>
              <Link href="/portal/home" className="btn-secondary btn-inline">
                Set up home security
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="home-alarm-card__eyebrow">Home alarm</p>
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

  function renderModeButtons() {
    return (
      <div className={`arm-mode-row ${isDashboard ? 'arm-mode-row--dashboard' : ''}${merged ? ' arm-mode-row--merged' : ''}`}>
        {ARM_MODE_OPTIONS.map((opt) => {
          const active = primaryStatus === opt.value;
          const key = `${primary.id}-${opt.value}`;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              aria-pressed={active}
              className={`arm-mode-btn arm-mode-btn--${opt.colorKey} ${active ? 'arm-mode-btn--active' : ''}`}
              disabled={!!loadingId}
              onClick={() => void setMode(primary, opt.value)}
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
            </button>
          );
        })}
      </div>
    );
  }

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
            <p className="home-alarm-card__eyebrow">{merged ? 'Home security' : 'Home alarm'}</p>
            <h2>{primary.name}</h2>
            {!isDashboard ? (
              <p className="home-alarm-card__desc">
                Away, Stay and Night modes for Paradox, DSC, IDS, Ajax and Nemtek panels.
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

      {merged ? (
        <div className="home-sec__body">
          <div className="home-sec__feeds">{feeds}</div>
          <div className="home-sec__pad">
            <p className="home-sec__pad-kicker">Alarm mode</p>
            {renderModeButtons()}
            <p className="home-alarm-card__hint">
              {isTriggered
                ? 'Alarm triggered · responders notified'
                : activeOpt?.hint ?? alarmStatusLabel(primaryStatus)}
              {primary.alarmLinked === false ? ' · Panel not linked' : ''}
            </p>
          </div>
        </div>
      ) : (
        <>
          {renderModeButtons()}
          <p className="home-alarm-card__hint">
            {isTriggered
              ? 'Alarm triggered · responders notified'
              : activeOpt?.hint ?? alarmStatusLabel(primaryStatus)}
            {primary.alarmLinked === false ? ' · Panel not linked' : ''}
          </p>
        </>
      )}

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
            return (
              <li key={p.id} className="home-alarm-card__list-item">
                <span>{p.name}</span>
                <span className={`status-pill status-pill--${pStatus.toLowerCase().replace(/_/g, '-')}`}>
                  {alarmStatusLabel(pStatus)}
                </span>
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  disabled={!!loadingId}
                  onClick={() => void setMode(p, isArmedStatus(pStatus) ? 'DISARMED' : 'ARMED')}
                >
                  {isArmedStatus(pStatus) ? 'Disarm' : 'Away'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

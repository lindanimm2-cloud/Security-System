'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SketchIcon } from '@/components/icons/SketchIcon';
import { clientApi } from '@/lib/api-client';
import { ARM_MODE_OPTIONS, alarmStatusLabel, isArmedStatus, type ArmMode } from '@/lib/sa-alarm';

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
  /** Compact card for portal dashboard (below Needs you). */
  variant?: 'default' | 'dashboard';
};

export function HomeAlarmControl({
  properties,
  hasAccess,
  onUpdated,
  variant = 'default',
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const isDashboard = variant === 'dashboard';

  async function setMode(property: Property, mode: ArmMode) {
    if (!hasAccess) return;
    setLoadingId(`${property.id}-${mode}`);
    setMsg('');
    try {
      await clientApi.patch(`/client/properties/${property.id}/alarm`, { status: mode });
      setMsg(`${property.name}: ${alarmStatusLabel(mode)}.`);
      onUpdated?.();
    } finally {
      setLoadingId(null);
    }
  }

  if (!hasAccess) {
    return (
      <section
        className={`portal-card home-alarm-card home-alarm-card--locked ${isDashboard ? 'home-alarm-card--dashboard' : ''}`}
      >
        {isDashboard ? (
          <p className="home-alarm-card__eyebrow">Home alarm</p>
        ) : null}
        <div className="home-alarm-card__head">
          <SketchIcon name="shield" size={22} />
          <div>
            <h2>Home Security</h2>
            <p className="text-muted">Away / Stay / Night arm compatible with SA panels (Contact ID).</p>
          </div>
        </div>
        <Link href="/portal/subscription/upgrade?addon=HOME_SECURITY" className="btn-secondary btn-inline">
          Upgrade to Home Security
        </Link>
      </section>
    );
  }

  if (properties.length === 0) {
    return (
      <section
        className={`portal-card home-alarm-card ${isDashboard ? 'home-alarm-card--dashboard' : ''}`}
      >
        {isDashboard ? (
          <p className="home-alarm-card__eyebrow">Home alarm</p>
        ) : null}
        <div className="home-alarm-card__head">
          <SketchIcon name="shield" size={22} />
          <div>
            <h2>Home Security</h2>
            <p className="text-muted">No properties linked yet.</p>
          </div>
        </div>
        <Link href="/portal/home" className="btn-secondary btn-inline">
          Set up home security
        </Link>
      </section>
    );
  }

  const primary = properties[0];
  const armed = isArmedStatus(primary.alarmStatus);
  const isTriggered = primary.alarmStatus === 'TRIGGERED';
  const statusClass = primary.alarmStatus.toLowerCase().replace(/_/g, '-');

  return (
    <section
      className={`portal-card home-alarm-card ${isDashboard ? 'home-alarm-card--dashboard' : ''} ${armed ? 'home-alarm-card--armed' : ''} ${isTriggered ? 'home-alarm-card--triggered' : ''}`}
      aria-label="Home security alarm control"
    >
      {isDashboard ? (
        <div className="home-alarm-card__dashboard-head">
          <div>
            <p className="home-alarm-card__eyebrow">Home alarm</p>
            <p className="home-alarm-card__site-name">{primary.name}</p>
          </div>
          <Link href={`/portal/home/${primary.id}`} className="link-sm home-alarm-card__open">
            Open site
          </Link>
        </div>
      ) : null}

      <div className="home-alarm-card__head">
        <div
          className={`home-alarm-card__shield ${armed ? 'home-alarm-card__shield--armed' : ''} ${isTriggered ? 'home-alarm-card__shield--triggered' : ''}`}
        >
          <SketchIcon name="shield" size={isDashboard ? 24 : 26} />
        </div>
        <div className="home-alarm-card__meta">
          <div className="card-header-row home-alarm-card__title-row">
            <h2>{isDashboard ? primary.name : primary.name}</h2>
            <span className={`home-alarm-card__status status-pill status-pill--${statusClass}`}>
              {alarmStatusLabel(primary.alarmStatus)}
            </span>
          </div>
          <p className="text-muted home-alarm-card__desc">
            SA panel modes: Away (full), Stay (perimeter), Night. Compatible with Paradox / DSC / IDS /
            Ajax / Nemtek fence zones via Contact ID.
          </p>
          {properties.length > 1 && (
            <Link href="/portal/home" className="link-sm">
              +{properties.length - 1} more {properties.length === 2 ? 'property' : 'properties'}
            </Link>
          )}
        </div>
      </div>

      {msg ? <div className="alert alert--success home-alarm-card__feedback">{msg}</div> : null}

      <div className={`arm-mode-row ${isDashboard ? 'arm-mode-row--dashboard' : ''}`}>
        {ARM_MODE_OPTIONS.map((opt) => {
          const active = primary.alarmStatus === opt.value;
          const key = `${primary.id}-${opt.value}`;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              className={`arm-mode-btn ${active ? 'arm-mode-btn--active' : ''} ${opt.value === 'DISARMED' ? 'arm-mode-btn--disarm' : ''} ${active && opt.value !== 'DISARMED' ? 'arm-mode-btn--armed-active' : ''}`}
              disabled={!!loadingId}
              onClick={() => void setMode(primary, opt.value)}
            >
              {loadingId === key ? (
                <LoadingSpinner label="" size="sm" />
              ) : (
                <>
                  <span className="arm-mode-btn__label">{opt.label}</span>
                  {active ? <span className="arm-mode-btn__dot" aria-hidden /> : null}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="home-alarm-card__actions">
        <Link href={`/portal/home/${primary.id}`} className="home-alarm-card__manage">
          Zones &amp; sensors
        </Link>
        {primary.alarmLinked === false ? (
          <span className="text-muted home-alarm-card__linked">Panel not linked</span>
        ) : (
          <span className="home-alarm-card__linked home-alarm-card__linked--ok">Monitoring on</span>
        )}
      </div>

      {properties.length > 1 ? (
        <ul className="home-alarm-card__list">
          {properties.slice(1).map((p) => (
            <li key={p.id} className="home-alarm-card__list-item">
              <span>{p.name}</span>
              <span className={`status-pill status-pill--${p.alarmStatus.toLowerCase()}`}>
                {alarmStatusLabel(p.alarmStatus)}
              </span>
              <button
                type="button"
                className="btn-sm btn-secondary"
                disabled={!!loadingId}
                onClick={() =>
                  void setMode(p, isArmedStatus(p.alarmStatus) ? 'DISARMED' : 'ARMED')
                }
              >
                {isArmedStatus(p.alarmStatus) ? 'Disarm' : 'Away'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

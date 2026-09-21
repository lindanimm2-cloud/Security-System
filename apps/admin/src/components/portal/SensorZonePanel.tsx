'use client';

import { useMemo, useState } from 'react';
import { adminApi, clientApi } from '@/lib/api-client';
import {
  sensorStatusLabel,
  sensorStatusTone,
  sensorTypeLabel,
  summarizeZones,
} from '@/lib/sa-alarm';

export type SensorRow = {
  id: string;
  zoneNumber: number;
  zoneLabel?: string;
  name: string;
  sensorType: string;
  status: string;
  locationLabel: string;
  isPerimeter: boolean;
  is24Hour: boolean;
  bypassed: boolean;
  cidCode: string | null;
  vendor: string | null;
};

type Props = {
  propertyId: string;
  sensors: SensorRow[];
  canBypass?: boolean;
  canTrigger?: boolean;
  onUpdated?: () => void;
  /** When true, trigger uses control-room API */
  controlRoom?: boolean;
};

function tileClass(status: string, bypassed: boolean) {
  const key = status.toUpperCase();
  if (bypassed || key === 'BYPASSED' || key === 'DISABLED') return 'sensor-tile--bypassed';
  if (key === 'FAULT' || key === 'TAMPER') return 'sensor-tile--fault';
  if (key === 'OFFLINE') return 'sensor-tile--offline';
  if (key === 'ALARM' || key === 'ALERT') return 'sensor-tile--alert';
  if (key === 'OPEN') return 'sensor-tile--open';
  return 'sensor-tile--active';
}

export function SensorZonePanel({
  propertyId,
  sensors,
  canBypass = true,
  canTrigger = false,
  onUpdated,
  controlRoom = false,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const summary = useMemo(() => summarizeZones(sensors), [sensors]);

  async function bypass(sensor: SensorRow, bypassed: boolean) {
    setBusy(`bypass-${sensor.id}`);
    setError('');
    try {
      await clientApi.patch(`/client/properties/${propertyId}/sensors/${sensor.id}/bypass`, {
        bypassed,
      });
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bypass failed');
    } finally {
      setBusy(null);
    }
  }

  async function trigger(sensor: SensorRow) {
    setBusy(`trigger-${sensor.id}`);
    setError('');
    try {
      if (controlRoom) {
        await adminApi.post(`/control-room/surveillance/sensors/${sensor.id}/trigger`, {
          force: true,
        });
      } else {
        await clientApi.post(`/client/properties/${propertyId}/sensors/${sensor.id}/alert`);
      }
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alert failed');
    } finally {
      setBusy(null);
    }
  }

  async function reportCondition(sensor: SensorRow, status: 'FAULT' | 'OFFLINE' | 'NORMAL') {
    setBusy(`health-${sensor.id}`);
    setError('');
    try {
      const path = controlRoom
        ? `/control-room/surveillance/sensors/${sensor.id}/health`
        : `/client/properties/${propertyId}/sensors/${sensor.id}/health`;
      const api = controlRoom ? adminApi : clientApi;
      await api.post(path, { status });
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Health update failed');
    } finally {
      setBusy(null);
    }
  }

  if (sensors.length === 0) {
    return <p className="text-muted">No zones commissioned on this panel yet.</p>;
  }

  return (
    <div className="sensor-panel">
      <div className="sensor-summary" aria-label="Zone health summary">
        <span className={`sensor-summary__pill sensor-summary__pill--active`}>
          <em />
          {summary.active} active
        </span>
        {summary.alert > 0 ? (
          <span className="sensor-summary__pill sensor-summary__pill--alert">
            <em />
            {summary.alert} alarm / open
          </span>
        ) : null}
        {summary.fault > 0 ? (
          <span className="sensor-summary__pill sensor-summary__pill--fault">
            <em />
            {summary.fault} fault
          </span>
        ) : null}
        {summary.offline > 0 ? (
          <span className="sensor-summary__pill sensor-summary__pill--offline">
            <em />
            {summary.offline} offline
          </span>
        ) : null}
        {summary.disabled > 0 ? (
          <span className="sensor-summary__pill sensor-summary__pill--disabled">
            <em />
            {summary.disabled} disabled
          </span>
        ) : null}
        {summary.healthy ? (
          <span className="sensor-summary__ok">All monitored zones healthy</span>
        ) : (
          <span className="sensor-summary__warn">
            Check fault / offline / disabled zones — control room &amp; owner are notified on faults
          </span>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      <div className="sensor-grid">
        {sensors.map((s) => {
          const disabled = s.bypassed || s.status.toUpperCase() === 'BYPASSED';
          const isFault = ['FAULT', 'TAMPER', 'OFFLINE'].includes(s.status.toUpperCase());
          return (
            <article key={s.id} className={`sensor-tile ${tileClass(s.status, s.bypassed)}`}>
              <div className="sensor-tile__id">
                <span className="sensor-tile__zone">Z{s.zoneNumber}</span>
                <span className={`status-pill status-pill--${sensorStatusTone(s.status, s.bypassed)}`}>
                  {disabled ? 'Disabled' : sensorStatusLabel(s.status)}
                </span>
              </div>
              <div className="sensor-tile__body">
                <strong className="sensor-tile__name">{s.name}</strong>
                <p className="sensor-tile__meta">
                  {sensorTypeLabel(s.sensorType)}
                  {s.locationLabel ? ` · ${s.locationLabel}` : ''}
                  {s.isPerimeter ? ' · Perimeter' : ''}
                  {s.is24Hour ? ' · 24hr' : ''}
                  {s.cidCode ? ` · CID ${s.cidCode}` : ''}
                </p>
                {disabled ? (
                  <p className="sensor-tile__note">
                    Disabled / bypassed — will not trip while monitoring is suppressed.
                  </p>
                ) : null}
                {isFault ? (
                  <p className="sensor-tile__note sensor-tile__note--fault">
                    Needs inspection — owner and control room notified.
                  </p>
                ) : null}
              </div>
              <div className="sensor-tile__actions">
                {canBypass && !s.is24Hour && (
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={!!busy}
                    onClick={() => void bypass(s, !s.bypassed)}
                  >
                    {busy === `bypass-${s.id}` ? '…' : s.bypassed ? 'Enable zone' : 'Disable zone'}
                  </button>
                )}
                {canTrigger && !disabled && !isFault && (
                  <button
                    type="button"
                    className="btn-sm btn-danger"
                    disabled={!!busy}
                    onClick={() => void trigger(s)}
                  >
                    {busy === `trigger-${s.id}` ? '…' : 'Trigger'}
                  </button>
                )}
                {!disabled && !isFault ? (
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={!!busy}
                    title="Mark sensor as faulty — notifies control room and owner"
                    onClick={() => void reportCondition(s, 'FAULT')}
                  >
                    {busy === `health-${s.id}` ? '…' : 'Report fault'}
                  </button>
                ) : null}
                {isFault ? (
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    disabled={!!busy}
                    onClick={() => void reportCondition(s, 'NORMAL')}
                  >
                    {busy === `health-${s.id}` ? '…' : 'Mark restored'}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

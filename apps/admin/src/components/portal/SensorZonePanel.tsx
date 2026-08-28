'use client';

import { useState } from 'react';
import { adminApi, clientApi } from '@/lib/api-client';
import { sensorStatusLabel, sensorStatusTone, sensorTypeLabel } from '@/lib/sa-alarm';

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

  if (sensors.length === 0) {
    return <p className="text-muted">No zones commissioned on this panel yet.</p>;
  }

  return (
    <div className="sensor-panel">
      {error && <div className="alert alert--error">{error}</div>}
      <div className="sensor-grid">
        {sensors.map((s) => (
          <article
            key={s.id}
            className={`sensor-tile sensor-tile--${s.status.toLowerCase()} ${s.bypassed ? 'sensor-tile--bypassed' : ''}`}
          >
            <div className="sensor-tile__id">
              <span className="sensor-tile__zone">Z{s.zoneNumber}</span>
              <span className={`status-pill status-pill--${sensorStatusTone(s.status, s.bypassed)}`}>
                {s.bypassed ? 'Bypassed' : sensorStatusLabel(s.status)}
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
            </div>
            <div className="sensor-tile__actions">
              {canBypass && !s.is24Hour && (
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  disabled={!!busy}
                  onClick={() => void bypass(s, !s.bypassed)}
                >
                  {busy === `bypass-${s.id}` ? '…' : s.bypassed ? 'Reinstate' : 'Bypass'}
                </button>
              )}
              {canTrigger && (
                <button
                  type="button"
                  className="btn-sm btn-danger"
                  disabled={!!busy}
                  onClick={() => void trigger(s)}
                >
                  {busy === `trigger-${s.id}` ? '…' : 'Trigger'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

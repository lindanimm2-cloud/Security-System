'use client';

import { useEffect, useState } from 'react';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { SensorRow } from '@/components/portal/SensorZonePanel';

const REPORT_TYPES = [
  'INTRUSION',
  'FIRE',
  'MEDICAL',
  'PANIC',
  'ALARM',
  'INFORMATIVE',
  'FAILED_CHECK_IN',
  'OUT_OF_HOURS',
];

const DAYS = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
] as const;

type Schedule = {
  toleranceMinutes?: number;
  days?: Record<string, { open?: string; close?: string }>;
};

export function SiteMonitoringAdmin({
  siteId,
  sensors,
  checkInHours,
  monitoringSchedule,
  onUpdated,
}: {
  siteId: string;
  sensors: SensorRow[];
  checkInHours?: number | null;
  monitoringSchedule?: Schedule | null;
  onUpdated?: () => void;
}) {
  const [hours, setHours] = useState(String(checkInHours ?? ''));
  const [tolerance, setTolerance] = useState(String(monitoringSchedule?.toleranceMinutes ?? 30));
  const [days, setDays] = useState<Record<string, { open?: string; close?: string }>>(
    monitoringSchedule?.days ?? {},
  );
  const [rows, setRows] = useState(sensors);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setHours(String(checkInHours ?? ''));
    setTolerance(String(monitoringSchedule?.toleranceMinutes ?? 30));
    setDays(monitoringSchedule?.days ?? {});
    setRows(sensors);
  }, [checkInHours, monitoringSchedule, sensors]);

  async function saveTimes() {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await adminApi.patch(`/control-room/surveillance/sites/${siteId}/monitoring`, {
        checkInHours: hours.trim() === '' ? null : Number(hours) || 0,
        monitoringSchedule: {
          toleranceMinutes: Number(tolerance) || 30,
          days,
        },
      });
      setMsg('Monitoring times saved');
      onUpdated?.();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not save times');
    } finally {
      setBusy(false);
    }
  }

  async function saveZone(sensor: SensorRow) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await adminApi.patch(`/control-room/surveillance/sensors/${sensor.id}`, {
        name: sensor.name,
        reportAsType: sensor.reportAsType || null,
        requiredAction: sensor.requiredAction || null,
        requiresAck: sensor.requiresAck !== false && sensor.reportAsType !== 'INFORMATIVE',
        locationLabel: sensor.locationLabel,
      });
      setMsg(`Zone ${sensor.zoneNumber} saved`);
      onUpdated?.();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not save zone');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-arc-admin">
      <section className="portal-card">
        <div className="card-header-row">
          <h2>Monitoring times</h2>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void saveTimes()}>
            Save times
          </button>
        </div>
        <p className="text-muted">
          Check-in interval generates a failed-to-check-in alarm when the communicator is silent. Open/close windows
          drive out-of-hours arm/disarm monitoring.
        </p>
        <div className="form-grid form-grid--2">
          <label>
            <span>Check-in (hours)</span>
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0 = disabled" />
          </label>
          <label>
            <span>Open/close tolerance (minutes)</span>
            <input value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
          </label>
        </div>
        <div className="site-arc-admin__days">
          {DAYS.map(([key, label]) => (
            <div key={key} className="site-arc-admin__day">
              <strong>{label}</strong>
              <input
                type="time"
                value={days[key]?.open ?? ''}
                onChange={(e) =>
                  setDays((prev) => ({ ...prev, [key]: { ...prev[key], open: e.target.value } }))
                }
                aria-label={`${label} open`}
              />
              <input
                type="time"
                value={days[key]?.close ?? ''}
                onChange={(e) =>
                  setDays((prev) => ({ ...prev, [key]: { ...prev[key], close: e.target.value } }))
                }
                aria-label={`${label} close`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Zone naming &amp; type reporting</h2>
        </div>
        <p className="text-muted">
          Map each zone to the alarm type shown on the ops desk. Informative zones display without mandatory
          acknowledgment.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Name</th>
                <th>Report as</th>
                <th>Required action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((sensor, index) => (
                <tr key={sensor.id}>
                  <td>Z{sensor.zoneNumber}</td>
                  <td>
                    <input
                      value={sensor.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, name: value } : row)),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <select
                      value={sensor.reportAsType ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  reportAsType: value || null,
                                  requiresAck: value !== 'INFORMATIVE',
                                }
                              : row,
                          ),
                        );
                      }}
                    >
                      <option value="">Default</option>
                      {REPORT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={sensor.requiredAction ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, requiredAction: value || null } : row,
                          ),
                        );
                      }}
                      placeholder="Action for operator"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => void saveZone(rows[index])}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {msg ? <p className="text-muted">{msg}</p> : null}
      {err ? <p className="form-error">{err}</p> : null}
    </div>
  );
}

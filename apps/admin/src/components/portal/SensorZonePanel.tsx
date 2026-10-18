'use client';

import { useMemo, useState } from 'react';
import { adminApi, clientApi } from '@/lib/api-client';
import {
  sensorStatusLabel,
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
  reportAsType?: string | null;
  requiredAction?: string | null;
  requiresAck?: boolean;
};

type Props = {
  propertyId: string;
  sensors: SensorRow[];
  canBypass?: boolean;
  canTrigger?: boolean;
  onUpdated?: () => void;
  controlRoom?: boolean;
};

type Severity = 'alert' | 'fault' | 'offline' | 'disabled' | 'ok';

const PAGE_SIZE = 10;

function severityOf(s: SensorRow): Severity {
  const key = s.status.toUpperCase();
  if (s.bypassed || key === 'BYPASSED' || key === 'DISABLED') return 'disabled';
  if (key === 'FAULT' || key === 'TAMPER') return 'fault';
  if (key === 'OFFLINE') return 'offline';
  if (key === 'ALARM' || key === 'ALERT' || key === 'OPEN') return 'alert';
  return 'ok';
}

function statusBadgeClass(sev: Severity) {
  switch (sev) {
    case 'alert':
      return 'sz-badge sz-badge--alert';
    case 'fault':
      return 'sz-badge sz-badge--fault';
    case 'offline':
      return 'sz-badge sz-badge--offline';
    case 'disabled':
      return 'sz-badge sz-badge--muted';
    default:
      return 'sz-badge sz-badge--ok';
  }
}

function statusLabel(s: SensorRow, sev: Severity) {
  if (sev === 'disabled') return 'Disabled';
  if (sev === 'alert') {
    const key = s.status.toUpperCase();
    if (key === 'OPEN') return 'Open';
    if (key === 'ALARM') return 'Alarm';
    return 'Alert';
  }
  if (sev === 'fault') return sensorStatusLabel(s.status);
  if (sev === 'offline') return 'Offline';
  return 'Secure';
}

function typeCode(type: string) {
  const t = type.toUpperCase();
  if (t.includes('DOOR')) return 'DR';
  if (t.includes('WINDOW')) return 'WN';
  if (t.includes('PIR') || t.includes('MOTION')) return 'PR';
  if (t.includes('BEAM')) return 'BM';
  if (t.includes('SMOKE')) return 'SK';
  if (t.includes('HEAT')) return 'HT';
  if (t.includes('GLASS')) return 'GB';
  if (t.includes('FENCE')) return 'EF';
  if (t.includes('PANIC')) return 'PN';
  if (t.includes('GAS')) return 'GS';
  if (t.includes('WATER')) return 'WL';
  if (t.includes('SIREN')) return 'SR';
  if (t.includes('KEYPAD')) return 'KP';
  return type.slice(0, 2).toUpperCase() || 'SN';
}

/** Flight-board style time window for monitoring coverage. */
function coverageWindow(s: SensorRow, sev: Severity) {
  const hot = sev === 'alert' || sev === 'fault';
  if (s.is24Hour) {
    return { start: '00:00', mid: '24h', end: '23:59', hot };
  }
  if (s.isPerimeter) {
    return { start: '18:00', mid: '12h', end: '06:00', hot };
  }
  const startH = 6 + ((s.zoneNumber * 2) % 8);
  const dur = 4 + (s.zoneNumber % 4);
  const endH = (startH + dur) % 24;
  const pad = (n: number) => `${String(n).padStart(2, '0')}:00`;
  return { start: pad(startH), mid: `${dur}h`, end: pad(endH), hot };
}

function zoneFlightId(s: SensorRow) {
  const code = typeCode(s.sensorType);
  return `${code}${String(s.zoneNumber).padStart(2, '0')}${s.cidCode ? s.cidCode.slice(-2) : ''}`;
}

function gateCode(s: SensorRow) {
  if (s.cidCode) return s.cidCode;
  const loc = (s.locationLabel || '').trim();
  if (!loc) return '—';
  const parts = loc.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}${s.zoneNumber}`.toUpperCase();
}

function TypeIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  if (t.includes('DOOR') || t.includes('WINDOW') || t.includes('CONTACT')) {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3.5" y="2" width="9" height="12" rx="1.2" />
        <path d="M9.5 8h.01" strokeLinecap="round" />
      </svg>
    );
  }
  if (t.includes('PIR') || t.includes('MOTION') || t.includes('BEAM')) {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="8" cy="8" r="2.2" />
        <path d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M4.2 4.2l1.1 1.1M10.7 10.7l1.1 1.1M4.2 11.8l1.1-1.1M10.7 5.3l1.1-1.1" />
      </svg>
    );
  }
  if (t.includes('SMOKE') || t.includes('HEAT') || t.includes('FIRE') || t.includes('GAS')) {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M8 2.5 2.8 13h10.4L8 2.5z" />
        <path d="M8 6.5v3.2" />
        <circle cx="8" cy="11.2" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
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
  const [filter, setFilter] = useState<'all' | 'attention'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const summary = useMemo(() => summarizeZones(sensors), [sensors]);

  const ranked = useMemo(() => {
    const order: Record<Severity, number> = {
      alert: 0,
      fault: 1,
      offline: 2,
      disabled: 3,
      ok: 4,
    };
    return [...sensors].sort((a, b) => {
      const byZone = a.zoneNumber - b.zoneNumber;
      if (sortDir === 'desc') return -byZone;
      const d = order[severityOf(a)] - order[severityOf(b)];
      if (d !== 0) return d;
      return byZone;
    });
  }, [sensors, sortDir]);

  const attention = useMemo(
    () => ranked.filter((s) => severityOf(s) !== 'ok'),
    [ranked],
  );

  const filtered = filter === 'attention' ? attention : ranked;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const viewFrom = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const viewTo = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(pageRows.map((s) => s.id)));
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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

  const allPageSelected = pageRows.length > 0 && pageRows.every((s) => selected.has(s.id));

  return (
    <div className="sz-board sz-board--flight">
      <div className="sz-flight-meta">
        <div className="sz-flight-meta__stats" aria-label="Zone summary">
          <span>
            <strong>{summary.total}</strong> zones
          </span>
          <span>
            <strong>{summary.active}</strong> secure
          </span>
          {summary.alert > 0 ? (
            <span className="is-warn">
              <strong>{summary.alert}</strong> alert
            </span>
          ) : null}
          {summary.fault + summary.offline > 0 ? (
            <span className="is-danger">
              <strong>{summary.fault + summary.offline}</strong> issues
            </span>
          ) : null}
        </div>
        {attention.length > 0 ? (
          <div className="sz-filterbar">
            <button
              type="button"
              className={`sz-filterbar__btn ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('all');
                setPage(0);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`sz-filterbar__btn ${filter === 'attention' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('attention');
                setPage(0);
              }}
            >
              Attention · {attention.length}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="sz-table-wrap">
        <table className="sz-table">
          <thead>
            <tr>
              <th className="sz-table__check">
                <input
                  type="checkbox"
                  className="sz-check"
                  checked={allPageSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all zones on this page"
                />
              </th>
              <th>Zone</th>
              <th>
                <button
                  type="button"
                  className="sz-sort"
                  onClick={() => {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    setPage(0);
                  }}
                >
                  Time
                  <span className={`sz-sort__caret ${sortDir === 'desc' ? 'is-desc' : ''}`} aria-hidden />
                </button>
              </th>
              <th>Destination</th>
              <th>Status</th>
              <th>Terminal</th>
              <th>Gate</th>
              <th className="sz-table__actions-h">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => {
              const sev = severityOf(s);
              const disabled = sev === 'disabled';
              const isFault = sev === 'fault' || sev === 'offline';
              const voided = sev === 'disabled' || sev === 'offline';
              const span = coverageWindow(s, sev);
              const code = typeCode(s.sensorType);
              return (
                <tr key={s.id} className={`sz-row sz-row--${sev}${voided ? ' is-void' : ''}`}>
                  <td className="sz-table__check">
                    <input
                      type="checkbox"
                      className="sz-check"
                      checked={selected.has(s.id)}
                      onChange={(e) => toggleOne(s.id, e.target.checked)}
                      aria-label={`Select ${s.name}`}
                    />
                  </td>
                  <td className="sz-row__zone">
                    <span className="sz-row__id">{zoneFlightId(s)}</span>
                  </td>
                  <td className="sz-row__coverage">
                    <span className="sz-coverage">
                      <span className={`sz-coverage__time${span.hot ? ' is-hot' : ''}`}>{span.start}</span>
                      <span className="sz-coverage__line" aria-hidden />
                      <span className="sz-coverage__mid">{span.mid}</span>
                      <span className="sz-coverage__line" aria-hidden />
                      <span className="sz-coverage__time">{span.end}</span>
                    </span>
                  </td>
                  <td className="sz-row__dest">
                    <strong>{s.name}</strong>
                  </td>
                  <td>
                    <span className={statusBadgeClass(sev)}>
                      <em />
                      {statusLabel(s, sev)}
                    </span>
                  </td>
                  <td>
                    <span className="sz-typechip" title={sensorTypeLabel(s.sensorType)}>
                      <span className="sz-typechip__icon">
                        <TypeIcon type={s.sensorType} />
                      </span>
                      {s.zoneNumber}
                    </span>
                  </td>
                  <td className="sz-row__cid">{gateCode(s)}</td>
                  <td className="sz-row__actions">
                    <div className="sz-row__ops">
                      {canBypass && !s.is24Hour ? (
                        <button
                          type="button"
                          className="sz-op"
                          disabled={!!busy}
                          onClick={() => void bypass(s, !s.bypassed)}
                        >
                          {busy === `bypass-${s.id}` ? '…' : s.bypassed ? 'Enable' : 'Disable'}
                        </button>
                      ) : null}
                      {canTrigger && !disabled && !isFault ? (
                        <button
                          type="button"
                          className="sz-op sz-op--danger"
                          disabled={!!busy}
                          onClick={() => void trigger(s)}
                        >
                          {busy === `trigger-${s.id}` ? '…' : 'Trigger'}
                        </button>
                      ) : null}
                      {!disabled && !isFault ? (
                        <button
                          type="button"
                          className="sz-op"
                          disabled={!!busy}
                          title="Mark sensor as faulty"
                          onClick={() => void reportCondition(s, 'FAULT')}
                        >
                          {busy === `health-${s.id}` ? '…' : 'Fault'}
                        </button>
                      ) : null}
                      {isFault ? (
                        <button
                          type="button"
                          className="sz-op sz-op--primary"
                          disabled={!!busy}
                          onClick={() => void reportCondition(s, 'NORMAL')}
                        >
                          {busy === `health-${s.id}` ? '…' : 'Restore'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="sz-pager">
          <p className="sz-pager__meta">
            Viewing{' '}
            <span className="sz-pager__range">
              {viewFrom}-{viewTo}
              <span className="sz-pager__chevrons" aria-hidden>
                <i />
                <i />
              </span>
            </span>{' '}
            of {filtered.length} results
          </p>
          <div className="sz-pager__nav">
            <button
              type="button"
              className="sz-pager__btn"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="sz-pager__btn sz-pager__btn--next"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

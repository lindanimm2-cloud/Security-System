'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { adminApi, clientApi, type ApiResponse } from '@/lib/api-client';
import type { AccessDoorRow } from '@/lib/demo/demo-psim';
import { accessKindLabel, propertyTypeLabel } from '@/lib/demo/demo-physical-control';

export type AccessCommandType =
  | 'OPEN'
  | 'CLOSE'
  | 'HOLD_OPEN'
  | 'UNLOCK'
  | 'LOCK'
  | 'EMERGENCY_RELEASE';

type ConfirmState = {
  point: AccessDoorRow;
  command: AccessCommandType;
  camera?: {
    id: string;
    name?: string | null;
    snapshotUrl?: string | null;
    streamUrl?: string | null;
    status?: string | null;
    locationLabel?: string | null;
    channel?: number;
    isLiveCapable?: boolean;
  } | null;
  message?: string;
};

function stateTone(status: string): StatusTone {
  if (status === 'FORCED') return 'danger';
  if (status === 'OFFLINE') return 'neutral';
  if (status === 'OPEN') return 'warning';
  return 'success';
}

function openDuration(openSince?: string | null) {
  if (!openSince) return null;
  const ms = Date.now() - new Date(openSince).getTime();
  if (ms < 0) return null;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function primaryActions(
  row: AccessDoorRow,
  mode: 'control-room' | 'portal',
): { command: AccessCommandType; label: string }[] {
  const kind = (row.kind ?? '').toUpperCase();
  const state = row.state ?? (row.status === 'OPEN' ? 'OPEN' : row.status === 'SECURE' ? 'CLOSED' : row.status);
  if (row.status === 'OFFLINE') return [];

  if (kind === 'FIRE_EXIT') {
    if (mode === 'portal') return [];
    if (state === 'LOCKED' || state === 'CLOSED') return [{ command: 'UNLOCK', label: 'Emergency unlock' }];
    return [{ command: 'LOCK', label: 'Secure exit' }];
  }

  if (kind === 'PEDESTRIAN_GATE' || kind === 'DOOR') {
    if (state === 'LOCKED' || state === 'CLOSED') return [{ command: 'UNLOCK', label: 'Unlock' }];
    return [{ command: 'LOCK', label: 'Lock' }];
  }

  if (kind === 'ROLLER') {
    if (state === 'OPEN' || state === 'HELD_OPEN' || row.status === 'OPEN') {
      return [{ command: 'CLOSE', label: 'Close shutter' }];
    }
    return mode === 'portal'
      ? [{ command: 'OPEN', label: 'Open shutter' }]
      : [
          { command: 'OPEN', label: 'Open shutter' },
          { command: 'HOLD_OPEN', label: 'Hold open' },
        ];
  }

  if (state === 'OPEN' || state === 'HELD_OPEN' || state === 'UNLOCKED' || row.status === 'OPEN') {
    return [{ command: 'CLOSE', label: kind === 'BARRIER' ? 'Lower boom' : 'Close' }];
  }
  if (mode === 'portal') {
    return [{ command: 'OPEN', label: kind === 'BARRIER' ? 'Raise boom' : 'Open' }];
  }
  return [
    { command: 'OPEN', label: kind === 'BARRIER' ? 'Raise boom' : 'Open' },
    { command: 'HOLD_OPEN', label: 'Hold open' },
  ];
}

function propertyBlurb(type?: string | null) {
  const key = (type ?? '').toUpperCase();
  if (key === 'APARTMENT' || key === 'TOWNHOUSE') {
    return 'Lobby, unit doors and basement parking — intercom unlocks are audited.';
  }
  if (key === 'MALL' || key === 'RETAIL' || key === 'STORE') {
    return 'Public entrances, loading bays and fire exits — trading-hours schedules apply.';
  }
  if (key === 'WAREHOUSE') {
    return 'Yard booms, roller shutters and staff turnstiles — dock CCTV linked per bay.';
  }
  if (key === 'OFFICE' || key === 'BRANCH' || key === 'BUSINESS') {
    return 'Reception, plant rooms and staff parking — after-hours lock enforced.';
  }
  if (key === 'RURAL' || key === 'ESTATE') {
    return 'Driveway and farm gates — long-range controllers; offline gates flagged.';
  }
  if (key === 'HOSPITALITY') {
    return 'Guest entrance, service doors and parking — guest credentials expire automatically.';
  }
  return 'Vehicle gates, pedestrian access and garage — CCTV confirm before open.';
}

export function PropertyCommandPanel({
  mode,
  propertyId,
  propertyType,
  initialRows,
  showLiveFeed = true,
  allowEmergency = false,
  onChanged,
}: {
  mode: 'control-room' | 'portal';
  propertyId?: string;
  propertyType?: string;
  initialRows?: AccessDoorRow[];
  showLiveFeed?: boolean;
  allowEmergency?: boolean;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<AccessDoorRow[]>(initialRows ?? []);
  const [history, setHistory] = useState<
    { id: string; accessPointName: string; command: string; actorName: string; createdAt: string; message: string }[]
  >([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [expandedCam, setExpandedCam] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const reload = useCallback(async () => {
    try {
      if (mode === 'control-room') {
        const res = await adminApi.get<ApiResponse<AccessDoorRow[]>>(
          propertyId
            ? `/control-room/access-points?propertyId=${encodeURIComponent(propertyId)}`
            : '/control-room/access-points',
        );
        setRows((res.data as AccessDoorRow[]) ?? []);
        const hist = await adminApi.get<
          ApiResponse<
            {
              id: string;
              accessPointName: string;
              command: string;
              actorName: string;
              createdAt: string;
              message: string;
            }[]
          >
        >(
          propertyId
            ? `/control-room/access-history?propertyId=${encodeURIComponent(propertyId)}`
            : '/control-room/access-history',
        );
        setHistory(hist.data ?? []);
      } else if (propertyId) {
        const res = await clientApi.get<ApiResponse<AccessDoorRow[]>>(
          `/client/properties/${propertyId}/access-points`,
        );
        setRows((res.data as AccessDoorRow[]) ?? []);
        const hist = await clientApi.get<
          ApiResponse<
            {
              id: string;
              accessPointName: string;
              command: string;
              actorName: string;
              createdAt: string;
              message: string;
            }[]
          >
        >(`/client/properties/${propertyId}/access-history`);
        setHistory(hist.data ?? []);
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Failed to load access points');
    }
  }, [mode, propertyId]);

  useEffect(() => {
    if (initialRows?.length) setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resolvedType = useMemo(() => {
    return propertyType ?? rows[0]?.propertyType ?? null;
  }, [propertyType, rows]);

  async function sendCommand(point: AccessDoorRow, command: AccessCommandType, confirmedClear = false) {
    setBusyId(point.id);
    setNote('');
    try {
      const path =
        mode === 'control-room'
          ? `/control-room/access-points/${point.id}/command`
          : `/client/properties/${point.propertyId ?? propertyId}/access-points/${point.id}/command`;
      const api = mode === 'control-room' ? adminApi : clientApi;
      const res = await api.post<
        ApiResponse<{
          needsConfirmation?: boolean;
          message?: string;
          camera?: ConfirmState['camera'];
          accessPoint?: AccessDoorRow;
          phases?: string[];
          ok?: boolean;
          error?: string;
        }>
      >(path, { command, confirmedClear });

      const data = res.data;
      if (data?.needsConfirmation) {
        setConfirm({
          point,
          command,
          camera: data.camera,
          message: data.message,
        });
        setExpandedCam(point.id);
        return;
      }
      if (data?.error) {
        setNote(data.error);
        return;
      }
      setConfirm(null);
      setNote(data?.phases ? `${command} · ${data.phases.join(' → ')}` : `${command} sent`);
      await reload();
      onChanged?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setBusyId(null);
    }
  }

  void tick;

  return (
    <section className="prop-cmd" aria-label="Property command">
      <header className="prop-cmd__head">
        <div>
          <p className="prop-cmd__eyebrow">
            Property Command
            {resolvedType ? ` · ${propertyTypeLabel(resolvedType)}` : ''}
          </p>
          <h2>Access points</h2>
          <p className="text-muted">{propertyBlurb(resolvedType)}</p>
        </div>
        <StatusBadge
          tone={rows.some((r) => r.status === 'FORCED') ? 'danger' : 'success'}
          status={rows.some((r) => r.status === 'FORCED') ? 'Forced open' : 'Online'}
        />
      </header>

      {confirm ? (
        <div className="prop-cmd__confirm" role="dialog" aria-modal="true">
          <div className="prop-cmd__confirm-card">
            <h3>
              {confirm.command.replace(/_/g, ' ')} · {confirm.point.name}
            </h3>
            <p>{confirm.message ?? 'Confirm the approach is clear before opening.'}</p>
            {confirm.camera?.id ? (
              <div className="prop-cmd__cctv prop-cmd__cctv--live">
                <p className="prop-cmd__cctv-label">
                  Zone CCTV · {confirm.camera.name ?? 'Linked camera'}
                </p>
                <CctvLiveFeed
                  compact
                  showControls={false}
                  camera={{
                    id: confirm.camera.id,
                    name: confirm.camera.name ?? 'Gate camera',
                    locationLabel: confirm.camera.locationLabel ?? confirm.camera.name ?? 'Access zone',
                    channel: confirm.camera.channel ?? 1,
                    status: confirm.camera.status ?? 'ONLINE',
                    snapshotUrl: confirm.camera.snapshotUrl ?? null,
                    streamUrl: confirm.camera.streamUrl ?? 'demo',
                    isLiveCapable: confirm.camera.isLiveCapable ?? true,
                  }}
                />
              </div>
            ) : null}
            <div className="prop-cmd__actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === confirm.point.id}
                onClick={() => void sendCommand(confirm.point, confirm.command, true)}
              >
                Confirm clear · {confirm.command.replace(/_/g, ' ')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="prop-cmd__grid">
        {rows.map((row) => {
          const actions = primaryActions(row, mode);
          const duration = openDuration(row.openSince);
          const showCam = showLiveFeed && Boolean(row.cameraId);
          const camOpen = expandedCam === row.id || row.status === 'OPEN' || row.status === 'FORCED';
          return (
            <article
              key={row.id}
              className={`prop-cmd__card prop-cmd__card--${row.status.toLowerCase()} ${showCam ? 'prop-cmd__card--cctv' : ''}`}
            >
              <div className="prop-cmd__card-top">
                <StatusBadge
                  tone={stateTone(row.status)}
                  status={(row.state ?? row.status).replace(/_/g, ' ')}
                />
                <span className="prop-cmd__health">{row.health ?? 'HEALTHY'}</span>
              </div>
              <strong>{row.name}</strong>
              <span className="text-muted">
                {accessKindLabel(row.kind)} · {row.site}
              </span>
              {duration ? <p className="prop-cmd__open-for">Open for: {duration}</p> : null}
              <p className="prop-cmd__event">{row.lastEvent}</p>

              {showCam ? (
                <div className="prop-cmd__zone-cctv">
                  <div className="prop-cmd__zone-cctv-head">
                    <span>CCTV · {row.cameraName ?? 'Zone camera'}</span>
                    <button
                      type="button"
                      className="link-sm"
                      onClick={() => setExpandedCam(camOpen && expandedCam === row.id ? null : row.id)}
                    >
                      {camOpen ? 'Hide' : 'Show live'}
                    </button>
                  </div>
                  {camOpen ? (
                    <CctvLiveFeed
                      compact
                      showControls={false}
                      className="prop-cmd__zone-feed"
                      camera={{
                        id: row.cameraId!,
                        name: row.cameraName ?? 'Zone camera',
                        locationLabel: row.cameraName ?? row.name,
                        channel: 1,
                        status: row.cameraStatus ?? 'ONLINE',
                        snapshotUrl: row.cameraSnapshotUrl ?? null,
                        streamUrl: row.cameraStreamUrl ?? 'demo',
                        isLiveCapable: true,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="prop-cmd__zone-cctv-preview"
                      onClick={() => setExpandedCam(row.id)}
                    >
                      Live feed available · tap to view
                    </button>
                  )}
                </div>
              ) : (
                <p className="prop-cmd__cam-link">No zone CCTV linked</p>
              )}

              <dl className="prop-cmd__health-grid">
                <div>
                  <dt>Controller</dt>
                  <dd>{row.controllerOnline === false ? 'OFFLINE' : 'ONLINE'}</dd>
                </div>
                <div>
                  <dt>Network</dt>
                  <dd>{row.networkOnline === false ? 'OFFLINE' : 'ONLINE'}</dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>{row.powerOnline === false ? 'OFFLINE' : 'ONLINE'}</dd>
                </div>
                <div>
                  <dt>Sensor</dt>
                  <dd>{row.sensorNormal === false ? 'FAULT' : 'NORMAL'}</dd>
                </div>
              </dl>
              <div className="prop-cmd__actions">
                {actions.map((a) => (
                  <button
                    key={a.command}
                    type="button"
                    className="btn-sm btn-primary"
                    disabled={busyId === row.id}
                    onClick={() => {
                      if (row.cameraId && (a.command === 'OPEN' || a.command === 'HOLD_OPEN')) {
                        setExpandedCam(row.id);
                      }
                      void sendCommand(row, a.command);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
                {allowEmergency && row.status !== 'OFFLINE' ? (
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={busyId === row.id}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Emergency release ${row.name}? This requires elevated authorization and is audited.`,
                        )
                      ) {
                        void sendCommand(row, 'EMERGENCY_RELEASE', true);
                      }
                    }}
                  >
                    Emergency release
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {history.length ? (
        <div className="prop-cmd__live">
          <h3>Live access</h3>
          <ul>
            {history.slice(0, 12).map((h) => (
              <li key={h.id}>
                <time>
                  {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                <span>
                  {h.actorName} · {h.accessPointName} · {h.command.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note ? (
        <p className="prop-cmd__note" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}

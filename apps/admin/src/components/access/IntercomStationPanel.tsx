'use client';

import { useCallback, useEffect, useState } from 'react';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { adminApi, clientApi, type ApiResponse } from '@/lib/api-client';
import { handlePhysicalControlDemo, listDemoIntercoms } from '@/lib/demo/demo-physical-control';

export type IntercomStationRow = {
  id: string;
  propertyId: string;
  propertyType: string;
  name: string;
  site: string;
  linkedAccessPointId: string | null;
  cameraId: string | null;
  cameraName: string | null;
  cameraStreamUrl: string | null;
  cameraSnapshotUrl: string | null;
  status: 'IDLE' | 'RINGING' | 'IN_CALL' | 'OFFLINE';
  lastRingAt: string | null;
  answeredBy: string | null;
  talkActive: boolean;
  linkedAccessPoint?: {
    id: string;
    name: string;
    kind: string;
    state: string;
    status: string;
  } | null;
};

function statusTone(status: IntercomStationRow['status']): StatusTone {
  if (status === 'RINGING') return 'warning';
  if (status === 'IN_CALL') return 'success';
  if (status === 'OFFLINE') return 'neutral';
  return 'neutral';
}

function loadOrgStations(propertyId?: string): IntercomStationRow[] {
  const result = handlePhysicalControlDemo({
    clean: '/org/intercoms',
    method: 'GET',
    payload: { propertyId: propertyId ?? 'demo-prop-4' },
    actorName: 'Mall security',
  });
  if (result.handled && result.response.success) {
    return (result.response.data as IntercomStationRow[]) ?? [];
  }
  return listDemoIntercoms(propertyId).map((s) => ({ ...s })) as IntercomStationRow[];
}

export function IntercomStationPanel({
  mode,
  propertyId,
  allowSimulatePress = true,
  actorName = 'Operator',
  onChanged,
}: {
  mode: 'control-room' | 'portal' | 'org';
  propertyId?: string;
  allowSimulatePress?: boolean;
  actorName?: string;
  onChanged?: () => void;
}) {
  const [stations, setStations] = useState<IntercomStationRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const applyRows = useCallback((rows: IntercomStationRow[]) => {
    setStations(rows);
    const ringing = rows.find((s) => s.status === 'RINGING');
    const inCall = rows.find((s) => s.status === 'IN_CALL');
    if (inCall) setActiveId(inCall.id);
    else if (ringing) setActiveId(ringing.id);
  }, []);

  const reload = useCallback(async () => {
    try {
      if (mode === 'org') {
        applyRows(loadOrgStations(propertyId));
        return;
      }

      let path = '/control-room/intercoms';
      if (mode === 'portal' && propertyId) {
        path = `/client/properties/${propertyId}/intercoms`;
      } else if (propertyId) {
        path = `/control-room/intercoms?propertyId=${encodeURIComponent(propertyId)}`;
      }

      const api = mode === 'portal' ? clientApi : adminApi;
      const res = await api.get<ApiResponse<IntercomStationRow[]>>(path);
      applyRows((res.data as IntercomStationRow[]) ?? []);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Failed to load intercoms');
    }
  }, [mode, propertyId, applyRows]);

  useEffect(() => {
    void reload();
    const t = window.setInterval(() => void reload(), 4000);
    return () => window.clearInterval(t);
  }, [reload]);

  async function action(
    station: IntercomStationRow,
    verb: 'press' | 'answer' | 'decline' | 'end' | 'talk',
  ) {
    setBusyId(station.id);
    setNote('');
    try {
      if (mode === 'org') {
        handlePhysicalControlDemo({
          clean: `/org/intercoms/${station.id}/${verb}`,
          method: 'POST',
          payload: {},
          actorName,
        });
        if (verb === 'answer') setActiveId(station.id);
        if (verb === 'end' || verb === 'decline') setActiveId(null);
        applyRows(loadOrgStations(propertyId));
        onChanged?.();
        return;
      }

      let path = `/control-room/intercoms/${station.id}/${verb}`;
      if (mode === 'portal') {
        path = `/client/properties/${station.propertyId}/intercoms/${station.id}/${verb}`;
      }
      const api = mode === 'portal' ? clientApi : adminApi;
      await api.post(path, {});
      if (verb === 'answer') setActiveId(station.id);
      if (verb === 'end' || verb === 'decline') setActiveId(null);
      await reload();
      onChanged?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Intercom action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function unlock(station: IntercomStationRow) {
    setBusyId(station.id);
    setNote('');
    try {
      if (mode === 'org') {
        handlePhysicalControlDemo({
          clean: `/org/intercoms/${station.id}/unlock`,
          method: 'POST',
          payload: { command: 'OPEN', confirmedClear: true },
          actorName,
        });
        setNote(`Unlocked · ${station.linkedAccessPoint?.name ?? 'linked gate'}`);
        applyRows(loadOrgStations(propertyId));
        onChanged?.();
        return;
      }

      let path = `/control-room/intercoms/${station.id}/unlock`;
      if (mode === 'portal') {
        path = `/client/properties/${station.propertyId}/intercoms/${station.id}/unlock`;
      }
      const api = mode === 'portal' ? clientApi : adminApi;
      await api.post(path, { command: 'OPEN', confirmedClear: true });
      setNote(`Unlocked · ${station.linkedAccessPoint?.name ?? 'linked gate'}`);
      await reload();
      onChanged?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setBusyId(null);
    }
  }

  const active = stations.find((s) => s.id === activeId) ?? null;
  const ringing = stations.filter((s) => s.status === 'RINGING');

  return (
    <section className="ic-panel" aria-label="Intercoms">
      <header className="ic-panel__head">
        <div>
          <p className="ic-panel__eyebrow">Door &amp; gate intercoms</p>
          <h2>Talk · see · unlock</h2>
          <p className="text-muted">
            Answer when someone presses the station — live camera, talk controls, and unlock the linked
            gate.
          </p>
        </div>
      </header>

      {note ? (
        <p className="ic-panel__note" role="status">
          {note}
        </p>
      ) : null}

      {ringing.length > 0 ? (
        <div className="ic-panel__ring" role="alert">
          <strong>
            {ringing.length === 1 ? 'Someone is at the door' : `${ringing.length} stations ringing`}
          </strong>
          <span>{ringing.map((s) => s.name).join(' · ')}</span>
        </div>
      ) : null}

      {active && (active.status === 'IN_CALL' || active.status === 'RINGING') ? (
        <article className="ic-panel__call">
          <div className="ic-panel__call-meta">
            <div>
              <h3>{active.name}</h3>
              <p className="text-muted">
                {active.site}
                {active.linkedAccessPoint ? ` · ${active.linkedAccessPoint.name}` : ''}
              </p>
            </div>
            <StatusBadge tone={statusTone(active.status)} status={active.status.replace(/_/g, ' ')} />
          </div>
          {active.cameraId ? (
            <div className="ic-panel__feed">
              <CctvLiveFeed
                compact
                showControls={false}
                camera={{
                  id: active.cameraId,
                  name: active.cameraName ?? active.name,
                  locationLabel: active.cameraName ?? active.site,
                  channel: 1,
                  status: 'ONLINE',
                  snapshotUrl: active.cameraSnapshotUrl,
                  streamUrl: active.cameraStreamUrl ?? 'demo',
                  isLiveCapable: true,
                }}
              />
            </div>
          ) : (
            <p className="text-muted">No camera linked to this station.</p>
          )}
          <div className="ic-panel__call-actions">
            {active.status === 'RINGING' ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === active.id}
                  onClick={() => void action(active, 'answer')}
                >
                  Answer
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busyId === active.id}
                  onClick={() => void action(active, 'decline')}
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn-secondary ${active.talkActive ? 'btn-ghost--active' : ''}`}
                  disabled={busyId === active.id}
                  onClick={() => void action(active, 'talk')}
                >
                  {active.talkActive ? 'Mute mic' : 'Talk'}
                </button>
                {active.linkedAccessPointId ? (
                  <button
                    type="button"
                    className="btn-ok"
                    disabled={busyId === active.id}
                    onClick={() => void unlock(active)}
                  >
                    Unlock gate
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busyId === active.id}
                  onClick={() => void action(active, 'end')}
                >
                  End call
                </button>
              </>
            )}
          </div>
          {active.status === 'IN_CALL' ? (
            <p className="ic-panel__hint">
              Demo talk path — mic UI is ready for WebRTC; audio is simulated for now.
            </p>
          ) : null}
        </article>
      ) : null}

      <div className="ic-panel__grid">
        {stations.length === 0 ? (
          <p className="text-muted">No intercom stations linked yet.</p>
        ) : (
          stations.map((station) => (
            <article
              key={station.id}
              className={`ic-card ${station.status === 'RINGING' ? 'ic-card--ring' : ''} ${
                station.status === 'IN_CALL' ? 'ic-card--live' : ''
              }`}
            >
              <div className="ic-card__top">
                <div>
                  <strong>{station.name}</strong>
                  <span className="text-muted">{station.site}</span>
                </div>
                <StatusBadge
                  tone={statusTone(station.status)}
                  status={station.status.replace(/_/g, ' ')}
                />
              </div>
              <p className="ic-card__link">
                {station.linkedAccessPoint
                  ? `Linked · ${station.linkedAccessPoint.name}`
                  : 'No linked gate'}
              </p>
              <div className="ic-card__actions">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  onClick={() => setActiveId(station.id)}
                >
                  Open
                </button>
                {station.status === 'RINGING' ? (
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    disabled={busyId === station.id}
                    onClick={() => void action(station, 'answer')}
                  >
                    Answer
                  </button>
                ) : null}
                {allowSimulatePress && station.status === 'IDLE' ? (
                  <button
                    type="button"
                    className="btn-sm btn-ghost"
                    disabled={busyId === station.id}
                    onClick={() => void action(station, 'press')}
                  >
                    Simulate press
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

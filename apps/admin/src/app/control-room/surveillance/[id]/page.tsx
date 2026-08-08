'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { dispatchIncidentHref } from '@/lib/control-room-routes';
import { SensorZonePanel, type SensorRow } from '@/components/portal/SensorZonePanel';
import { alarmStatusLabel } from '@/lib/sa-alarm';

type SiteDetail = {
  id: string;
  name: string;
  address: string;
  accessNotes: string | null;
  gateCode: string | null;
  keyHolder: string | null;
  alarmStatus: string;
  monitoringEnabled: boolean;
  shareInteriorCameras?: boolean;
  privacy?: {
    shareInteriorCameras: boolean;
    interiorUnlocked: boolean;
    unlockReason: string;
    unlockLabel: string;
    interiorCameraCount: number;
    privateInteriorCount: number;
  };
  panel?: {
    panelVendor: string | null;
    panelModel: string | null;
    communicatorType: string | null;
    monitoringAccount: string | null;
    partitionLabel: string;
    protocol: string;
  };
  client: { id: string; name: string; email: string; phone: string | null };
  cameras: {
    id: string;
    name: string;
    locationLabel: string;
    channel: number;
    status: string;
    snapshotUrl: string | null;
    isLiveCapable: boolean;
    isInterior?: boolean;
    privacyLocked?: boolean;
  }[];
  sensors: SensorRow[];
  events: {
    id: string;
    type: string;
    severity: string;
    status: string;
    title: string;
    description: string | null;
    cidCode?: string | null;
    triggeredAt: string;
    incidentId: string | null;
    camera: { id: string; name: string; locationLabel: string } | null;
    sensor?: { id: string; name: string; zoneNumber: number; sensorType: string } | null;
  }[];
};

export default function ControlRoomSitePage() {
  return (
    <ControlRoomLayout title="Site surveillance">
      <SiteContent />
    </ControlRoomLayout>
  );
}

function SiteContent() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<SiteDetail>>(`/control-room/surveillance/sites/${id}`),
    [id],
  );

  async function run(key: string, fn: () => Promise<{ data?: { incidentId?: string } }>) {
    setBusy(key);
    setActionError('');
    try {
      const res = await fn();
      if (res?.data?.incidentId) {
        router.push(dispatchIncidentHref(res.data.incidentId));
        return;
      }
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading site..." />;
  if (error || !data) return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reload} />;

  const site = data.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ marginBottom: '0.35rem' }}>
            <Link href="/control-room/surveillance">← Surveillance</Link>
          </p>
          <h1>{site.name}</h1>
          <p className="text-muted">{site.address} · {site.client.name}</p>
        </div>
        <span className={`status-pill status-pill--${site.alarmStatus.toLowerCase()}`}>
          {alarmStatusLabel(site.alarmStatus)}
        </span>
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      {site.panel && (
        <section className="portal-card">
          <h2>Panel / communicator</h2>
          <p>
            <strong>{site.panel.panelVendor ?? 'Unknown panel'}</strong>
            {site.panel.panelModel ? ` ${site.panel.panelModel}` : ''}
            {' · '}
            {site.panel.communicatorType ?? 'Communicator'}
            {' · '}
            {site.panel.protocol}
          </p>
          <p className="text-muted">
            {site.panel.partitionLabel}
            {site.panel.monitoringAccount ? ` · Acct ${site.panel.monitoringAccount}` : ''}
          </p>
        </section>
      )}

      {(site.gateCode || site.keyHolder || site.accessNotes) && (
        <section className="portal-card">
          <h2>Site access</h2>
          {site.gateCode && <p><strong>Gate:</strong> {site.gateCode}</p>}
          {site.keyHolder && <p><strong>Key holder:</strong> {site.keyHolder}</p>}
          {site.accessNotes && <p className="text-muted">{site.accessNotes}</p>}
          {site.client.phone && <p><strong>Client phone:</strong> {site.client.phone}</p>}
        </section>
      )}

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Zones &amp; sensors</h2>
          <span className="text-muted">{site.sensors?.length ?? 0} zones</span>
        </div>
        <SensorZonePanel
          propertyId={site.id}
          sensors={site.sensors ?? []}
          canBypass={false}
          canTrigger
          controlRoom
          onUpdated={reload}
        />
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Cameras</h2>
          {site.privacy && (
            <span
              className={`status-pill ${
                site.privacy.interiorUnlocked
                  ? 'status-pill--resolved'
                  : site.privacy.privateInteriorCount > 0
                    ? 'status-pill--acknowledged'
                    : 'status-pill--resolved'
              }`}
            >
              {site.privacy.interiorUnlocked
                ? site.privacy.unlockLabel
                : site.privacy.privateInteriorCount > 0
                  ? `${site.privacy.privateInteriorCount} interior private`
                  : 'No interior cams'}
            </span>
          )}
        </div>
        {site.privacy && !site.privacy.interiorUnlocked && site.privacy.privateInteriorCount > 0 && (
          <p className="text-muted" style={{ marginTop: 0 }}>
            Client has not shared indoor cameras. Feeds unlock if they opt in, the alarm triggers,
            or an active panic / emergency is on the account.
          </p>
        )}
        <div className="camera-grid camera-grid--detail">
          {site.cameras.map((c) => (
            <div key={c.id} className={`camera-tile ${c.privacyLocked ? 'camera-tile--locked' : ''}`}>
              <div
                className={`camera-tile__feed camera-tile__feed--${c.status.toLowerCase()} ${
                  c.privacyLocked ? 'camera-tile__feed--privacy' : ''
                }`}
              >
                <span className="camera-tile__live">
                  {c.privacyLocked ? 'PRIVATE' : c.isLiveCapable ? 'LIVE' : 'CH'}{' '}
                  {!c.privacyLocked && c.channel}
                </span>
                {c.isInterior && !c.privacyLocked && (
                  <span className="camera-tile__badge">Interior</span>
                )}
                <span className="camera-tile__name">{c.name}</span>
              </div>
              <span className="camera-tile__meta">
                {c.locationLabel}
                {c.privacyLocked ? '' : ` · ${c.status}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="portal-card">
        <h2>Alarm events</h2>
        {site.events.length === 0 ? (
          <p className="text-muted">No events.</p>
        ) : (
          <ul className="status-list">
            {site.events.map((e) => (
              <li key={e.id} className="status-list-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '12rem' }}>
                  <strong>{e.title}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {e.type.replace(/_/g, ' ')}
                    {e.cidCode ? ` · CID ${e.cidCode}` : ''}
                    {e.sensor ? ` · Z${e.sensor.zoneNumber}` : ''}
                    {' · '}
                    {e.status.replace(/_/g, ' ')} ·{' '}
                    {new Date(e.triggeredAt).toLocaleString()}
                    {e.camera ? ` · ${e.camera.name}` : ''}
                  </p>
                </div>
                <div className="entity-card-actions">
                  {['NEW', 'ACKNOWLEDGED'].includes(e.status) && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={!!busy}
                        onClick={() =>
                          run(`ack-${e.id}`, () =>
                            adminApi.post(`/control-room/surveillance/events/${e.id}/ack`),
                          )
                        }
                      >
                        {busy === `ack-${e.id}` ? '…' : 'Ack'}
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={!!busy}
                        onClick={() =>
                          run(`dispatch-${e.id}`, () =>
                            adminApi.post(`/control-room/surveillance/events/${e.id}/dispatch`),
                          )
                        }
                      >
                        {busy === `dispatch-${e.id}` ? '…' : 'Dispatch'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={!!busy}
                        onClick={() =>
                          run(`false-${e.id}`, () =>
                            adminApi.post(`/control-room/surveillance/events/${e.id}/resolve`, {
                              falseAlarm: true,
                            }),
                          )
                        }
                      >
                        False alarm
                      </button>
                    </>
                  )}
                  {e.status !== 'RESOLVED' && e.status !== 'FALSE_ALARM' && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={!!busy}
                      onClick={() =>
                        run(`resolve-${e.id}`, () =>
                          adminApi.post(`/control-room/surveillance/events/${e.id}/resolve`, {
                            falseAlarm: false,
                          }),
                        )
                      }
                    >
                      Resolve
                    </button>
                  )}
                  {e.incidentId && (
                    <Link href={dispatchIncidentHref(e.incidentId)} className="btn-secondary btn-sm">
                      Incident
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

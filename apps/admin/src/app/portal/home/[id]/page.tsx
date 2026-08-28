'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { SensorZonePanel, type SensorRow } from '@/components/portal/SensorZonePanel';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { ARM_MODE_OPTIONS, alarmStatusLabel, type ArmMode } from '@/lib/sa-alarm';

type Camera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  placement?: string;
  isInterior?: boolean;
  status: string;
  snapshotUrl: string | null;
  isLiveCapable: boolean;
};

type PrivacyMeta = {
  shareInteriorCameras: boolean;
  interiorUnlocked: boolean;
  unlockReason: string;
  unlockLabel: string;
  interiorCameraCount: number;
  privateInteriorCount: number;
};

type EventRow = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  cidCode?: string | null;
  triggeredAt: string;
  camera: { id: string; name: string; locationLabel: string } | null;
  sensor?: { id: string; name: string; zoneNumber: number; sensorType: string } | null;
};

type SiteDetail = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  accessNotes: string | null;
  gateCode: string | null;
  keyHolder: string | null;
  alarmStatus: string;
  camerasLinked: boolean;
  monitoringEnabled: boolean;
  shareInteriorCameras: boolean;
  privacy?: PrivacyMeta;
  panel?: {
    panelVendor: string | null;
    panelModel: string | null;
    communicatorType: string | null;
    monitoringAccount: string | null;
    partitionLabel: string;
    protocol: string;
    region: string;
  };
  cameras: Camera[];
  sensors: SensorRow[];
  events: EventRow[];
};

export default function PortalSiteSurveillancePage() {
  return (
    <PortalLayout>
      <SiteContent />
    </PortalLayout>
  );
}

function SiteContent() {
  const params = useParams();
  const id = String(params.id ?? '');
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<SiteDetail>>(`/client/surveillance/sites/${id}`),
    [id],
  );

  async function setMode(mode: ArmMode) {
    setLoadingId(mode);
    setOptimisticStatus(mode);
    try {
      await clientApi.patch(`/client/properties/${id}/alarm`, { status: mode });
      reload();
    } catch {
      setOptimisticStatus(null);
    } finally {
      setLoadingId(null);
    }
  }

  async function homePanic() {
    setLoadingId('panic');
    try {
      await clientApi.post(`/client/properties/${id}/panic`);
      reload();
    } finally {
      setLoadingId(null);
    }
  }

  async function setInteriorShare(share: boolean) {
    setLoadingId('privacy');
    try {
      await clientApi.patch(`/client/properties/${id}/privacy`, {
        shareInteriorCameras: share,
      });
      reload();
    } finally {
      setLoadingId(null);
    }
  }

  if (loading || accessLoading) return <LoadingSpinner label="Loading site..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!access?.home) {
    return (
      <div className="empty-state">
        Home Security is required to view alarms and cameras.{' '}
        <Link href="/portal/subscription/upgrade">Upgrade</Link>
      </div>
    );
  }

  const site = data!.data;
  const panel = site.panel;
  const displayStatus = optimisticStatus ?? site.alarmStatus;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ marginBottom: '0.35rem' }}>
            <Link href="/portal/home">← Home security</Link>
          </p>
          <h1>{site.name}</h1>
          <p className="text-muted">{site.address}</p>
        </div>
        <span className={`status-pill status-pill--${displayStatus.toLowerCase().replace(/_/g, '-')}`}>
          {alarmStatusLabel(displayStatus)}
        </span>
      </div>

      {panel && (
        <section className="portal-card">
          <h2>Alarm panel (ZA)</h2>
          <p>
            <strong>{panel.panelVendor ?? 'Panel'}</strong>
            {panel.panelModel ? ` ${panel.panelModel}` : ''}
            {' · '}
            {panel.communicatorType ?? 'Communicator'}
            {' · '}
            {panel.protocol} / {panel.region}
          </p>
          <p className="text-muted">
            {panel.partitionLabel}
            {panel.monitoringAccount ? ` · Account ${panel.monitoringAccount}` : ''}
          </p>
        </section>
      )}

      <div className="arm-mode-row" style={{ marginBottom: '1rem' }}>
        {ARM_MODE_OPTIONS.map((opt) => {
          const active = displayStatus === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              aria-pressed={active}
              className={`arm-mode-btn arm-mode-btn--${opt.colorKey} ${active ? 'arm-mode-btn--active' : ''}`}
              disabled={!!loadingId}
              onClick={() => void setMode(opt.value)}
            >
              {loadingId === opt.value ? (
                <span style={{ fontSize: '1.1rem' }}>…</span>
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
        <button type="button" className="btn-danger btn-sm" disabled={!!loadingId} onClick={() => void homePanic()}>
          {loadingId === 'panic' ? 'Sending…' : 'Home Panic'}
        </button>
      </div>

      {(site.gateCode || site.keyHolder || site.accessNotes) && (
        <section className="portal-card">
          <h2>Access</h2>
          {site.gateCode && <p><strong>Gate code:</strong> {site.gateCode}</p>}
          {site.keyHolder && <p><strong>Key holder:</strong> {site.keyHolder}</p>}
          {site.accessNotes && <p className="text-muted">{site.accessNotes}</p>}
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
          canBypass
          canTrigger
          onUpdated={reload}
        />
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Interior camera privacy</h2>
          <span className={`status-pill ${site.shareInteriorCameras ? 'status-pill--pending' : 'status-pill--ok'}`}>
            {site.shareInteriorCameras ? 'Shared with responders' : 'Private by default'}
          </span>
        </div>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Indoor cameras stay hidden from control room and officers unless you share them.
          They unlock automatically if the alarm is triggered or a panic / emergency is active.
        </p>
        {(site.privacy?.interiorCameraCount ?? 0) > 0 && (
          <p className="text-muted" style={{ margin: '0 0 0.75rem' }}>
            {site.privacy!.interiorCameraCount} interior camera
            {site.privacy!.interiorCameraCount === 1 ? '' : 's'} on this site
            {displayStatus === 'TRIGGERED' ? ' · currently unlocked (alarm)' : ''}
          </p>
        )}
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={!!site.shareInteriorCameras}
            disabled={loadingId === 'privacy'}
            onChange={(e) => void setInteriorShare(e.target.checked)}
          />
          <span className="privacy-toggle__switch" aria-hidden />
          <span>
            {loadingId === 'privacy'
              ? 'Updating…'
              : 'Share interior cameras with control room & officers'}
          </span>
        </label>
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Live cameras</h2>
          <span className="text-muted">{site.cameras.length} channel{site.cameras.length === 1 ? '' : 's'}</span>
        </div>
        {site.cameras.length === 0 ? (
          <p className="text-muted">No cameras linked to this property yet.</p>
        ) : (
          <div className="camera-grid camera-grid--detail">
            {site.cameras.map((c) => (
              <CctvLiveFeed
                key={c.id}
                camera={{
                  ...c,
                  isInterior: c.isInterior,
                }}
                featured={c.channel === 1}
              />
            ))}
          </div>
        )}
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Camera details</h2>
        </div>
        {site.cameras.length === 0 ? (
          <p className="text-muted">No cameras linked to this property yet.</p>
        ) : (
          <ul className="status-list">
            {site.cameras.map((c) => (
              <li key={c.id} className="status-list-item">
                <div>
                  <strong>{c.name}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    CH {c.channel} · {c.locationLabel} · {c.status.replace(/_/g, ' ')}
                    {c.isInterior && !site.shareInteriorCameras ? ' · private to staff' : ''}
                  </p>
                </div>
                <span className={`status-pill status-pill--${c.status.toLowerCase()}`}>
                  {c.isLiveCapable ? 'Live' : 'Snapshot'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-card">
        <h2>Recent events</h2>
        {site.events.length === 0 ? (
          <p className="text-muted">No alarm or camera events recorded.</p>
        ) : (
          <ul className="status-list">
            {site.events.map((e) => (
              <li key={e.id} className="status-list-item">
                <div>
                  <strong>{e.title}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {e.type.replace(/_/g, ' ')}
                    {e.cidCode ? ` · CID ${e.cidCode}` : ''}
                    {e.sensor ? ` · Z${e.sensor.zoneNumber}` : ''}
                    {e.camera ? ` · ${e.camera.name}` : ''}
                    {' · '}
                    {new Date(e.triggeredAt).toLocaleString()}
                  </p>
                </div>
                <span className={`status-pill status-pill--${e.status.toLowerCase()}`}>
                  {e.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

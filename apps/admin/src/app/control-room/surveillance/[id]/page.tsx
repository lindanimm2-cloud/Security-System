'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { dispatchIncidentHref, CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { SensorZonePanel, type SensorRow } from '@/components/portal/SensorZonePanel';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { alarmStatusLabel } from '@/lib/sa-alarm';

type SiteDetail = {
  id: string;
  name: string;
  address: string;
  propertyType?: string;
  accessNotes: string | null;
  gateCode: string | null;
  keyHolder: string | null;
  alarmStatus: string;
  monitoringEnabled: boolean;
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
  owner?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    membershipNumber: string;
    plan: string;
    tier: string;
    subscriptionStatus: string;
    joinedAt: string;
  } | null;
  subscription?: {
    plan: string;
    status: string;
    renewalDate: string;
    monthlyAmount: number;
    addons: string[];
  } | null;
  linkedVehicles?: {
    id: string;
    registration: string;
    make: string;
    model: string;
    color: string;
    year: number;
    trackerStatus: string;
    speed: number;
    lastSeen: string;
  }[];
  assignedFleet?: {
    id: string;
    callSign: string;
    registration: string;
    vehicleType: string;
    teamName: string;
    status: string;
    crew: { name: string; role: string }[];
  }[];
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
    <ControlRoomLayout title="Site detail">
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

  if (loading) return <LoadingSpinner label="Loading site…" />;
  if (error || !data) return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reload} />;

  const site = data.data;
  const owner = site.owner ?? null;
  const sub = site.subscription ?? null;
  const linkedVehicles = site.linkedVehicles ?? [];
  const assignedFleet = site.assignedFleet ?? [];
  const openEvents = site.events.filter((e) => ['OPEN', 'NEW', 'ACKNOWLEDGED'].includes(e.status));

  return (
    <div className="page-content site-detail">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '0.3rem' }}>
            <Link href={CONTROL_ROOM_ROUTES.surveillance} className="interactive-text">← Surveillance</Link>
          </p>
          <h1 style={{ margin: 0 }}>{site.name}</h1>
          <p className="text-muted" style={{ marginTop: '0.2rem', fontSize: '0.88rem' }}>
            {site.address}
            {site.propertyType ? ` · ${site.propertyType.replace(/_/g, ' ')}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span className={`status-pill status-pill--${site.alarmStatus.toLowerCase()}`}>
            {alarmStatusLabel(site.alarmStatus)}
          </span>
          {openEvents.length > 0 && (
            <span className="status-pill status-pill--open" style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>
              {openEvents.length} open event{openEvents.length !== 1 ? 's' : ''}
            </span>
          )}
          {site.alarmStatus === 'TRIGGERED' ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={busy != null}
              onClick={() =>
                void run('disarm', () =>
                  adminApi.patch(`/control-room/surveillance/sites/${id}/alarm`, { status: 'DISARMED' }),
                )
              }
            >
              {busy === 'disarm' ? 'Silencing…' : 'Silence siren'}
            </button>
          ) : (
            <HoldToActivate
              className="hold-activate--inline"
              label="Sound siren"
              holdLabel="Hold to sound siren…"
              holdMs={1200}
              loading={busy === 'siren'}
              disabled={busy != null}
              onActivate={() =>
                void run('siren', () => adminApi.post(`/control-room/surveillance/sites/${id}/siren`))
              }
            />
          )}
        </div>
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      {/* 2-column grid for top info cards */}
      <div className="site-detail__grid">

        {/* Owner / client card */}
        <section className="portal-card site-detail__card">
          <div className="site-detail__card-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <h2>Owner</h2>
          </div>
          {owner ? (
            <dl className="site-detail__dl">
              <dt>Name</dt><dd><strong>{owner.name}</strong></dd>
              <dt>Email</dt><dd><a href={`mailto:${owner.email}`} className="interactive-text">{owner.email}</a></dd>
              <dt>Phone</dt><dd><a href={`tel:${owner.phone}`} className="interactive-text">{owner.phone}</a></dd>
              <dt>Membership</dt><dd><code className="site-detail__code">{owner.membershipNumber}</code></dd>
              <dt>Plan</dt><dd>{owner.plan}</dd>
              <dt>Tier</dt><dd>{owner.tier}</dd>
              <dt>Member since</dt><dd>{new Date(owner.joinedAt).toLocaleDateString('en-ZA')}</dd>
            </dl>
          ) : (
            <dl className="site-detail__dl">
              <dt>Name</dt><dd><strong>{site.client.name}</strong></dd>
              <dt>Email</dt><dd><a href={`mailto:${site.client.email}`} className="interactive-text">{site.client.email}</a></dd>
              {site.client.phone && <><dt>Phone</dt><dd>{site.client.phone}</dd></>}
            </dl>
          )}
          <div className="site-detail__card-actions">
            <Link href={`/control-room/customers?customer=${site.client.id}`} className="btn-ghost btn-sm">
              View profile
            </Link>
            {site.client.phone && (
              <a href={`tel:${site.client.phone}`} className="btn-secondary btn-sm">
                Call client
              </a>
            )}
          </div>
        </section>

        {/* Subscription card */}
        <section className="portal-card site-detail__card">
          <div className="site-detail__card-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <h2>Subscription</h2>
          </div>
          {sub ? (
            <>
              <dl className="site-detail__dl">
                <dt>Plan</dt><dd><strong>{sub.plan}</strong></dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge badge--${sub.status === 'ACTIVE' ? 'ok' : 'warn'}`}>
                    {sub.status}
                  </span>
                </dd>
                <dt>Renewal</dt><dd>{new Date(sub.renewalDate).toLocaleDateString('en-ZA')}</dd>
                <dt>Monthly</dt><dd>R {sub.monthlyAmount.toLocaleString()}</dd>
              </dl>
              {sub.addons.length > 0 && (
                <div className="site-detail__tags">
                  {sub.addons.map((a) => (
                    <span key={a} className="site-detail__tag">{a}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No subscription data.</p>
          )}
        </section>

        {/* Site access card */}
        {(site.gateCode || site.keyHolder || site.accessNotes || site.panel) && (
          <section className="portal-card site-detail__card">
            <div className="site-detail__card-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              <h2>Site access</h2>
            </div>
            <dl className="site-detail__dl">
              {site.gateCode && <><dt>Gate code</dt><dd><code className="site-detail__code">{site.gateCode}</code></dd></>}
              {site.keyHolder && <><dt>Key holder</dt><dd>{site.keyHolder}</dd></>}
              {site.accessNotes && <><dt>Notes</dt><dd className="text-muted">{site.accessNotes}</dd></>}
            </dl>
          </section>
        )}

        {/* Alarm panel card */}
        {site.panel && (
          <section className="portal-card site-detail__card">
            <div className="site-detail__card-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <h2>Alarm panel</h2>
            </div>
            <dl className="site-detail__dl">
              <dt>Panel</dt><dd><strong>{site.panel.panelVendor ?? 'Unknown'} {site.panel.panelModel ?? ''}</strong></dd>
              <dt>Communicator</dt><dd>{site.panel.communicatorType ?? '—'}</dd>
              <dt>Protocol</dt><dd>{site.panel.protocol}</dd>
              <dt>Partition</dt><dd>{site.panel.partitionLabel}</dd>
              {site.panel.monitoringAccount && <><dt>Account #</dt><dd><code className="site-detail__code">{site.panel.monitoringAccount}</code></dd></>}
            </dl>
          </section>
        )}
      </div>

      {/* Linked client vehicles */}
      {linkedVehicles.length > 0 && (
        <section className="portal-card">
          <div className="card-header-row">
            <div className="site-detail__card-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 11h13l4 4v4H3z"/><path d="M5 11V8a2 2 0 0 1 2-2h6l3 5"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/></svg>
              <h2>Client vehicles</h2>
            </div>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>{linkedVehicles.length} tracked</span>
          </div>
          <div className="site-detail__vehicles">
            {linkedVehicles.map((v) => (
              <div key={v.id} className="site-detail__vehicle-card">
                <div className="site-detail__vehicle-main">
                  <strong>{v.year} {v.make} {v.model}</strong>
                  <code className="site-detail__code">{v.registration}</code>
                  <span className="text-muted">{v.color}</span>
                </div>
                <div className="site-detail__vehicle-meta">
                  <span className={`badge badge--${v.trackerStatus === 'ONLINE' ? 'ok' : 'warn'}`}>
                    {v.trackerStatus}
                  </span>
                  {v.speed > 0 && <span className="text-muted">{v.speed} km/h</span>}
                  <span className="text-muted">Last seen {new Date(v.lastSeen).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigned company fleet */}
      {assignedFleet.length > 0 && (
        <section className="portal-card">
          <div className="card-header-row">
            <div className="site-detail__card-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <h2>Assigned response unit</h2>
            </div>
            <Link href={CONTROL_ROOM_ROUTES.fleet} className="link-sm">View fleet</Link>
          </div>
          <div className="site-detail__vehicles">
            {assignedFleet.map((v) => (
              <div key={v.id} className="site-detail__vehicle-card">
                <div className="site-detail__vehicle-main">
                  <strong>{v.callSign}</strong>
                  <code className="site-detail__code">{v.registration}</code>
                  <span className="text-muted">{v.teamName}</span>
                </div>
                <div className="site-detail__vehicle-meta">
                  <span className={`badge badge--${v.status === 'ON_DUTY' ? 'ok' : 'warn'}`}>
                    {v.status.replace(/_/g, ' ')}
                  </span>
                  {v.crew.length > 0 && (
                    <span className="text-muted">
                      {v.crew.map((c) => c.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live cameras */}
      <section className="portal-card">
        <div className="card-header-row">
          <div className="site-detail__card-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            <h2>Live cameras</h2>
          </div>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>
            {site.cameras.filter((c) => c.status === 'ONLINE' || c.status === 'RECORDING').length}/{site.cameras.length} online
          </span>
        </div>
        {site.privacy && !site.privacy.interiorUnlocked && site.privacy.privateInteriorCount > 0 && (
          <p className="text-muted" style={{ fontSize: '0.83rem', marginTop: 0 }}>
            {site.privacy.privateInteriorCount} interior camera{site.privacy.privateInteriorCount !== 1 ? 's' : ''} are private — unlocked on alarm or client opt-in.
          </p>
        )}
        {site.cameras.length === 0 ? (
          <p className="text-muted">No cameras linked to this site.</p>
        ) : (
          <div className={`cam-viewer__mosaic cam-viewer__mosaic--${Math.min(site.cameras.length, 3)}`}>
            {site.cameras.map((c) => (
              <CctvLiveFeed
                key={c.id}
                camera={{
                  id: c.id,
                  name: c.privacyLocked ? 'Interior camera' : c.name,
                  locationLabel: c.privacyLocked ? 'Inside · private' : c.locationLabel,
                  channel: c.channel,
                  status: c.privacyLocked ? 'OFFLINE' : c.status,
                  snapshotUrl: c.privacyLocked ? null : c.snapshotUrl,
                  isLiveCapable: c.privacyLocked ? false : c.isLiveCapable,
                  isInterior: c.isInterior,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sensors */}
      <section className="portal-card">
        <div className="card-header-row">
          <div className="site-detail__card-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="3"/><path d="M5 12H3M21 12h-2M12 5V3M12 21v-2M7.05 7.05 5.636 5.636M18.364 18.364l-1.414-1.414M7.05 16.95l-1.414 1.414M18.364 5.636l-1.414 1.414"/></svg>
            <h2>Zones &amp; sensors</h2>
          </div>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>{site.sensors?.length ?? 0} zones</span>
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

      {/* Alarm events */}
      <section className="portal-card">
        <div className="card-header-row">
          <div className="site-detail__card-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3 3.5 20h17L12 3z"/><path d="M12 9v5"/><circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none"/></svg>
            <h2>Alarm events</h2>
          </div>
          {openEvents.length > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>
              {openEvents.length} open
            </span>
          )}
        </div>
        {site.events.length === 0 ? (
          <p className="text-muted">No events on record.</p>
        ) : (
          <ul className="site-events-list">
            {site.events.map((e) => (
              <li key={e.id} className={`site-event site-event--${e.severity.toLowerCase()}`}>
                <div className="site-event__stripe" aria-hidden />
                <div className="site-event__body">
                  <div className="site-event__top">
                    <span className={`incident-type incident-type--${e.severity.toLowerCase()}`}>
                      {e.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`incident-status-badge incident-status-badge--${
                      ['OPEN','NEW','ACKNOWLEDGED'].includes(e.status) ? 'active' :
                      e.status === 'RESOLVED' ? 'resolved' : 'closed'
                    }`}>
                      {e.status.replace(/_/g, ' ')}
                    </span>
                    {e.cidCode && <code className="site-detail__code">CID {e.cidCode}</code>}
                  </div>
                  <strong className="site-event__title">{e.title}</strong>
                  {e.description && <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0.15rem 0 0' }}>{e.description}</p>}
                  <div className="site-event__meta">
                    <span>🕐 {new Date(e.triggeredAt).toLocaleString('en-ZA')}</span>
                    {e.camera && <span>📷 {e.camera.name}</span>}
                    {e.sensor && <span>🔲 Z{e.sensor.zoneNumber} · {e.sensor.name}</span>}
                  </div>
                  <div className="site-event__actions">
                    {['OPEN', 'NEW', 'ACKNOWLEDGED'].includes(e.status) && (
                      <>
                        <button
                          type="button"
                          className="btn-sm btn-sm--link"
                          disabled={!!busy}
                          onClick={() => run(`ack-${e.id}`, () => adminApi.post(`/control-room/surveillance/events/${e.id}/ack`))}
                        >
                          {busy === `ack-${e.id}` ? '…' : 'Acknowledge'}
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          disabled={!!busy}
                          onClick={() => run(`dispatch-${e.id}`, () => adminApi.post(`/control-room/surveillance/events/${e.id}/dispatch`))}
                        >
                          {busy === `dispatch-${e.id}` ? '…' : 'Dispatch'}
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-sm--link"
                          disabled={!!busy}
                          onClick={() => run(`false-${e.id}`, () => adminApi.post(`/control-room/surveillance/events/${e.id}/resolve`, { falseAlarm: true }))}
                        >
                          False alarm
                        </button>
                      </>
                    )}
                    {e.status !== 'RESOLVED' && e.status !== 'FALSE_ALARM' && !['OPEN','NEW','ACKNOWLEDGED'].includes(e.status) && (
                      <button
                        type="button"
                        className="btn-sm btn-sm--resolve"
                        disabled={!!busy}
                        onClick={() => run(`resolve-${e.id}`, () => adminApi.post(`/control-room/surveillance/events/${e.id}/resolve`, { falseAlarm: false }))}
                      >
                        Resolve
                      </button>
                    )}
                    {e.incidentId && (
                      <Link href={dispatchIncidentHref(e.incidentId)} className="btn-sm btn-sm--link">
                        View incident
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

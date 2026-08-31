'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { PortalVehicleMap, VehicleMapIdle } from '@/components/portal/PortalVehicleMap';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { IncidentTimeline } from '@/components/incident/IncidentTimeline';
import { formatClientNotificationTime } from '@/lib/client-notifications';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import type { VehicleRemoteAction } from '@/lib/vehicle-remote';

type VehicleProfile = {
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
    variant: string | null;
    year: number | null;
    color: string | null;
    vin: string | null;
    trackerLinked: boolean;
    phoneTrackingEnabled: boolean;
    theftRecovery: boolean;
    immobiliserOn: boolean;
    doorsLocked?: boolean;
    insuranceInfo: string | null;
    updatedAt: string;
  };
  tracking: {
    active: boolean;
    mode: 'OFF' | 'TRACKER' | 'PHONE' | 'THEFT_RECOVERY';
    hasPosition: boolean;
    lat: number | null;
    lng: number | null;
    lastUpdate: string;
    trail: { lat: number; lng: number; at: string }[];
  };
  responseTeam: { synced: boolean };
  alerts: { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string }[];
  incidents: {
    id: string;
    type: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    address: string | null;
  }[];
};

const MODE_LABELS: Record<VehicleProfile['tracking']['mode'], string> = {
  OFF: 'Tracking off',
  TRACKER: 'GPS tracker',
  PHONE: 'Phone relay',
  THEFT_RECOVERY: 'Theft recovery',
};

export default function VehicleProfilePage() {
  return (
    <PortalLayout>
      <VehicleProfileContent />
    </PortalLayout>
  );
}

function VehicleProfileContent() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<VehicleProfile>>(`/client/vehicles/${vehicleId}/profile`),
    [vehicleId],
  );

  const [trackingBusy, setTrackingBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState<VehicleRemoteAction | null>(null);
  const [msg, setMsg] = useState('');

  const refreshPosition = useCallback(async () => {
    if (!navigator.geolocation) return null;
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
      );
    });
  }, []);

  async function startPhoneTracking() {
    setTrackingBusy(true);
    setMsg('');
    try {
      const coords = (await refreshPosition()) ?? { lat: -29.8587, lng: 31.0218 };
      await clientApi.post(`/client/vehicles/${vehicleId}/tracking/phone`, coords);
      setMsg('Phone tracking enabled — location shared with our response team.');
      reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setTrackingBusy(false);
    }
  }

  async function stopPhoneTracking() {
    setTrackingBusy(true);
    setMsg('');
    try {
      await clientApi.delete(`/client/vehicles/${vehicleId}/tracking/phone`);
      setMsg('Phone tracking stopped.');
      reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setTrackingBusy(false);
    }
  }

  async function pushPhoneLocation() {
    setTrackingBusy(true);
    try {
      const coords = (await refreshPosition()) ?? { lat: -29.8587, lng: 31.0218 };
      await clientApi.post(`/client/vehicles/${vehicleId}/location`, coords);
      reload();
    } finally {
      setTrackingBusy(false);
    }
  }

  async function activateRecovery() {
    setRecoveryBusy(true);
    setMsg('');
    try {
      await clientApi.post(`/client/vehicles/${vehicleId}/theft-recovery`);
      setMsg('Theft recovery activated — response team notified.');
      reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function sendRemote(action: VehicleRemoteAction) {
    setRemoteBusy(action);
    setMsg('');
    try {
      const res = await clientApi.post<ApiResponse<{ message?: string }>>(
        `/client/vehicles/${vehicleId}/remote`,
        { action },
      );
      setMsg(res.data?.message ?? 'Remote command sent.');
      reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setRemoteBusy(null);
    }
  }

  if (loading || accessLoading) return <LoadingSpinner label="Loading vehicle..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!access?.vehicle) {
    return (
      <div className="page-content">
        <UpgradeBanner addon="VEHICLE_RESPONSE" title="Vehicle Response" price="R 500" />
      </div>
    );
  }

  const profile = data?.data;
  if (!profile?.vehicle) {
    return (
      <ErrorAlert
        error="Vehicle profile could not be loaded."
        onRetry={reload}
      />
    );
  }

  const v = profile.vehicle;
  const t = profile.tracking ?? {
    active: false,
    mode: 'OFF' as const,
    hasPosition: false,
    lat: null,
    lng: null,
    lastUpdate: '',
    trail: [],
  };
  const showMap = t.active && t.lat != null && t.lng != null;

  return (
    <div className="page-content vehicle-profile">
      <div className="page-header">
        <div>
          <p className="ec-kicker">Vehicle</p>
          <p className="text-muted">
            <Link href="/portal/vehicles" className="interactive-text">Vehicle Security</Link>
            {' · Profile'}
          </p>
          <h1>{v.registration}</h1>
          <p className="text-muted">
            {v.year ? `${v.year} ` : ''}{v.make} {v.model}
            {v.color ? ` · ${v.color}` : ''}
          </p>
        </div>
        <div className="vehicle-profile__badges">
          <span className={`status-pill ${v.theftRecovery ? 'status-pill--alert' : 'status-pill--ok'}`}>
            {v.theftRecovery ? 'Recovery active' : 'Secure'}
          </span>
          <span className="status-pill status-pill--muted">{MODE_LABELS[t.mode]}</span>
          {profile.responseTeam.synced && (
            <span className="status-pill status-pill--sync">Live tracking</span>
          )}
        </div>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}

      <section className="portal-card">
        <VehicleRemotePad
          state={{
            doorsLocked: v.doorsLocked ?? true,
            immobiliserOn: v.immobiliserOn,
            theftRecovery: v.theftRecovery,
          }}
          busyAction={remoteBusy}
          onCommand={(action) => void sendRemote(action)}
        />
      </section>

      <section className="portal-card vehicle-profile__map-section">
        <div className="card-header-row">
          <h2>Live map</h2>
          {showMap && (
            <span className="text-muted vehicle-profile__updated">
              Updated {formatClientNotificationTime(t.lastUpdate)}
            </span>
          )}
        </div>

        {showMap ? (
          <PortalVehicleMap
            vehicleId={v.id}
            registration={v.registration}
            lat={t.lat!}
            lng={t.lng!}
            trail={t.trail}
            theftRecovery={v.theftRecovery}
          />
        ) : (
          <VehicleMapIdle
            title="Map unavailable"
            description={
              v.trackerLinked && !t.hasPosition
                ? 'Waiting for your GPS tracker to report a position.'
                : 'Enable phone tracking or link a tracker to view this vehicle on the map. The map only appears while tracking is active.'
            }
            action={
              <div className="vehicle-profile__idle-actions">
                {!v.phoneTrackingEnabled && (
                  <button type="button" className="btn-primary" onClick={() => void startPhoneTracking()} disabled={trackingBusy}>
                    {trackingBusy ? <LoadingSpinner label="" size="sm" /> : 'Track with my phone'}
                  </button>
                )}
                {v.trackerLinked && (
                  <span className="text-muted">Hardware tracker registered — signal pending</span>
                )}
              </div>
            }
          />
        )}
      </section>

      <div className="vehicle-profile__grid">
        <section className="portal-card">
          <h2>Tracking</h2>
          <ul className="vehicle-profile__meta">
            <li><span>GPS tracker</span><strong>{v.trackerLinked ? 'Linked' : 'Not linked'}</strong></li>
            <li><span>Phone relay</span><strong>{v.phoneTrackingEnabled ? 'Active' : 'Off'}</strong></li>
            <li><span>Immobiliser</span><strong>{v.immobiliserOn ? 'Engaged' : 'Released'}</strong></li>
            <li><span>Central locking</span><strong>{v.doorsLocked !== false ? 'Locked' : 'Unlocked'}</strong></li>
            <li><span>Response team</span><strong>{profile.responseTeam.synced ? 'Receiving live feed' : 'Idle'}</strong></li>
          </ul>
          <div className="vehicle-profile__actions">
            {!v.phoneTrackingEnabled ? (
              <button type="button" className="btn-primary" onClick={() => void startPhoneTracking()} disabled={trackingBusy}>
                {trackingBusy ? <LoadingSpinner label="" size="sm" /> : 'Start phone tracking'}
              </button>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={() => void pushPhoneLocation()} disabled={trackingBusy}>
                  Refresh location
                </button>
                {!v.theftRecovery && (
                  <button type="button" className="btn-ghost" onClick={() => void stopPhoneTracking()} disabled={trackingBusy}>
                    Stop phone tracking
                  </button>
                )}
              </>
            )}
            {!v.theftRecovery && (
              <button type="button" className="btn-danger" onClick={() => void activateRecovery()} disabled={recoveryBusy}>
                {recoveryBusy ? <LoadingSpinner label="" size="sm" /> : 'Activate theft recovery'}
              </button>
            )}
          </div>
          <p className="text-muted vehicle-profile__hint">
            Your position is shared with our response team while tracking is active (tracker, phone relay, or theft recovery).
          </p>
        </section>

        <section className="portal-card">
          <h2>Vehicle details</h2>
          <ul className="vehicle-profile__meta">
            <li><span>VIN</span><strong>{v.vin ?? '—'}</strong></li>
            <li><span>Variant</span><strong>{v.variant ?? '—'}</strong></li>
            <li><span>Insurance</span><strong>{v.insuranceInfo ?? 'No insurance on file'}</strong></li>
          </ul>
          <div className="vehicle-profile__actions">
            <Link href={`/portal/theft?plate=${encodeURIComponent(v.registration)}`} className="btn-secondary">
              Report what happened
            </Link>
            <Link href="/portal/safe-zones" className="btn-ghost">Geofence zones</Link>
          </div>
        </section>
      </div>

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Alerts</h2>
          <Link href="/portal/updates" className="link-sm">All updates</Link>
        </div>
        {profile.alerts.length === 0 ? (
          <p className="text-muted">No vehicle alerts yet.</p>
        ) : (
          <ul className="vehicle-alert-list">
            {profile.alerts.map((a) => (
              <li key={a.id} className={!a.isRead ? 'vehicle-alert-list__item--unread' : ''}>
                <strong>{a.title}</strong>
                <span>{a.body}</span>
                <time>{formatClientNotificationTime(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-card">
        <div className="card-header-row">
          <div>
            <p className="ec-kicker">Vehicle activity</p>
            <h2>What happened</h2>
          </div>
          <Link href="/portal/incidents" className="link-sm">View all</Link>
        </div>
        {profile.incidents.length === 0 ? (
          <p className="text-muted">No alerts linked to this vehicle.</p>
        ) : (
          <IncidentTimeline
            items={profile.incidents.map((i) => ({
              id: i.id,
              kind: 'event' as const,
              type: `incident.${i.status.toLowerCase()}`,
              source: i.address ?? 'vehicle',
              createdAt: i.createdAt,
              payload: { kind: i.type, content: i.title },
            }))}
          />
        )}
      </section>
    </div>
  );
}

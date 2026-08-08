'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { alarmStatusLabel, isArmedStatus } from '@/lib/sa-alarm';

type Camera = {
  id: string;
  name: string;
  locationLabel: string;
  status: string;
  channel: number;
};

type Site = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  alarmStatus: string;
  alarmLinked: boolean;
  camerasLinked: boolean;
  monitoringEnabled: boolean;
  cameraCount: number;
  onlineCameras: number;
  sensorCount?: number;
  alertSensors?: number;
  openEvents: number;
  cameras: Camera[];
  panel?: { panelVendor: string | null; panelModel: string | null };
  gateCode?: string | null;
  accessNotes?: string | null;
};

const HOME_FEATURES = [
  { title: 'Property Registration', description: 'Register residential properties linked to your account.', status: 'Included', href: '/portal/home#properties-list', action: 'View properties', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Property Profiles', description: 'Address, access instructions, gate codes, and key holders.', status: 'Configured', href: '/portal/home#properties-list', action: 'View profiles', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'SA Alarm Integration', description: 'Paradox, DSC, IDS, Ajax, Nemtek fence — Contact ID monitoring.', status: 'Linked', href: '/portal/home#properties-list', action: 'Manage alarm', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Away / Stay / Night Arm', description: 'Full, perimeter, and night arm modes used by SA panels.', status: 'Active', href: '/portal/home#properties-list', action: 'Control alarm', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Sensor Zone Alerts', description: 'PIR, beams, fence, smoke, panic, medical, and door contacts.', status: 'Monitoring', href: '/portal/home#surveillance', action: 'View zones', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Alarm Event History', description: 'View Contact ID events and zone activations.', href: '/portal/home#surveillance', action: 'View events', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Home Panic', description: 'Trigger emergency response for the property.', status: 'Ready', href: '/portal/emergency', action: 'Emergency hub', requiresAccess: 'emergency' as const },
  { title: 'CCTV Integration', description: 'View supported surveillance cameras.', status: 'Linked', href: '/portal/home#surveillance', action: 'Open cameras', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Live Camera Viewing', description: 'Access live video streams.', status: 'Available', href: '/portal/home#surveillance', action: 'View live', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Camera Playback', description: 'Review historical footage where supported.', status: 'Available', href: '/portal/evidence', action: 'View footage', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Smart Devices', description: 'Door, window, motion, smoke, gas, water, beams, and fence.', status: 'Monitoring', href: '/portal/home#properties-list', action: 'View sensors', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Visitor Management', description: 'Record and monitor visitors.', status: 'Active', href: '/portal/incidents', action: 'Visitor log', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
  { title: 'Guard Patrol', description: 'Track security patrol activities.', status: 'Available', href: '/portal/updates', action: 'Patrol updates', price: 'R 300/mo', requiresAccess: 'home' as const, requiresAddon: 'HOME_SECURITY' as const },
];

export default function HomePage() {
  return (
    <PortalLayout>
      <HomeContent />
    </PortalLayout>
  );
}

function HomeContent() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Site[]>>('/client/surveillance/sites'),
    [],
  );

  async function toggleAlarm(id: string, status: 'ARMED' | 'DISARMED') {
    if (!access?.home) return;
    setLoadingId(`${id}-${status}`);
    try {
      await clientApi.patch(`/client/properties/${id}/alarm`, { status });
      reload();
    } finally {
      setLoadingId(null);
    }
  }

  async function homePanic(id: string) {
    setLoadingId(`${id}-panic`);
    try {
      await clientApi.post(`/client/properties/${id}/panic`);
      reload();
    } finally {
      setLoadingId(null);
    }
  }

  if (loading || accessLoading) return <LoadingSpinner label="Loading home security..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const sites = data!.data;
  const hasHome = access?.home ?? false;

  return (
    <FeatureHub
      title="Home Security"
      subtitle="Property monitoring, alarms, CCTV, and smart device integration."
      features={HOME_FEATURES.map((f) => ({
        ...f,
        status: hasHome ? f.status : undefined,
      }))}
      access={access}
      accessKey="home"
    >
      {!hasHome && (
        <UpgradeBanner addon="HOME_SECURITY" title="Home Security" price="R 300" />
      )}
      {hasHome && (
        <>
          <div id="properties-list" className="entity-grid">
            {sites.length === 0 ? (
              <div className="empty-state">No properties registered yet. Add a property from your profile or contact dispatch.</div>
            ) : (
              sites.map((p) => (
                <div key={p.id} className="entity-card">
                  <div className="entity-card-header">
                    <Link href={`/portal/home/${p.id}`} className="status-list-link">{p.name}</Link>
                    <span className={`status-pill status-pill--${p.alarmStatus.toLowerCase()}`}>{alarmStatusLabel(p.alarmStatus)}</span>
                  </div>
                  <p>{p.address}</p>
                  <p className="text-muted">
                    {p.panel?.panelVendor ? `${p.panel.panelVendor} · ` : ''}
                    {p.propertyType} · Cams {p.onlineCameras}/{p.cameraCount}
                    {typeof p.sensorCount === 'number' ? ` · ${p.sensorCount} zones` : ''}
                    {p.alertSensors ? ` · ${p.alertSensors} sensor alert${p.alertSensors === 1 ? '' : 's'}` : ''}
                    {p.openEvents > 0 ? ` · ${p.openEvents} open event${p.openEvents === 1 ? '' : 's'}` : ''}
                  </p>
                  {p.accessNotes && <p className="text-muted">{p.accessNotes}</p>}
                  <div className="entity-card-actions">
                    <Link href={`/portal/home/${p.id}`} className="btn-secondary btn-sm">
                      Zones &amp; cams
                    </Link>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => toggleAlarm(p.id, isArmedStatus(p.alarmStatus) ? 'DISARMED' : 'ARMED')} disabled={!!loadingId}>
                      {loadingId === `${p.id}-${isArmedStatus(p.alarmStatus) ? 'DISARMED' : 'ARMED'}` ? <LoadingSpinner label="" size="sm" /> : isArmedStatus(p.alarmStatus) ? 'Disarm' : 'Away arm'}
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => homePanic(p.id)} disabled={!!loadingId}>
                      {loadingId === `${p.id}-panic` ? <LoadingSpinner label="" size="sm" /> : 'Home Panic'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <section id="surveillance" className="portal-card" style={{ marginTop: '1.25rem' }}>
            <div className="card-header-row">
              <h2>Surveillance</h2>
              <span className="text-muted">Live site cameras</span>
            </div>
            {sites.every((s) => s.cameraCount === 0) ? (
              <p className="text-muted">No cameras commissioned yet. Contact 4DS after install to enable viewing.</p>
            ) : (
              <div className="surveillance-site-list">
                {sites.filter((s) => s.cameraCount > 0).map((s) => (
                  <div key={s.id} className="surveillance-site-block">
                    <div className="card-header-row">
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.name}</h3>
                      <Link href={`/portal/home/${s.id}`} className="link-sm">Open site</Link>
                    </div>
                    <div className="camera-grid">
                      {s.cameras.slice(0, 4).map((c) => (
                        <Link key={c.id} href={`/portal/home/${s.id}`} className="camera-tile">
                          <div className={`camera-tile__feed camera-tile__feed--${c.status.toLowerCase()}`}>
                            <span className="camera-tile__live">CH {c.channel}</span>
                            <span className="camera-tile__name">{c.name}</span>
                          </div>
                          <span className="camera-tile__meta">{c.locationLabel} · {c.status}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </FeatureHub>
  );
}

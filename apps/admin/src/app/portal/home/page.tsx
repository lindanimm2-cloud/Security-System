'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import { MiniCctvViewer } from '@/components/portal/MiniCctvViewer';
import { SlideCarousel, SlideCarouselCard } from '@/components/portal/SlideCarousel';
import { SlidingSection } from '@/components/portal/SlidingSection';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { PropertyRegisterForm } from '@/components/portal/PropertyRegisterForm';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
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
  const [showRegister, setShowRegister] = useState(false);
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
  const primaryCamSite = sites.find((s) => s.cameraCount > 0);

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
        <>
          <UpgradeBanner addon="HOME_SECURITY" title="Home Security" price="R 300" />
          <section className="portal-card" style={{ marginBottom: '1rem' }}>
            <div className="card-header-row">
              <h2 style={{ margin: 0 }}>Subscribe &amp; register</h2>
              <Link href="/portal/subscription" className="btn-primary btn-sm">
                Add subscription
              </Link>
            </div>
            <p className="text-muted">
              Add Home Security to your plan, then register your property for monitoring.
            </p>
            <Link href="/portal/subscription/upgrade" className="link-sm">
              View plans &amp; add-ons →
            </Link>
          </section>
        </>
      )}
      {hasHome && (
        <>
          <SlidingSection
            title="Home arm state"
            subtitle={sites[0] ? alarmStatusLabel(sites[0].alarmStatus) : 'Register your property'}
            defaultOpen
            storageKey="portal-home-arm"
            headerAction={
              <Link href="/portal/protect" className="link-sm">
                Protect
              </Link>
            }
          >
          <section className="portal-card portal-card--flat" aria-label="Arm state">
            <div className="card-header-row">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowRegister((v) => !v)}
              >
                {showRegister ? 'Close' : 'Register property'}
              </button>
            </div>
            {showRegister && (
              <div style={{ marginTop: '0.75rem' }}>
                <PropertyRegisterForm
                  compact
                  onRegistered={() => {
                    setShowRegister(false);
                    reload();
                  }}
                />
              </div>
            )}
            {sites[0] ? (
              <div className="queue-card__actions" style={{ marginTop: '0.65rem' }}>
                <span className={`status-pill status-pill--${sites[0].alarmStatus.toLowerCase()}`}>
                  {alarmStatusLabel(sites[0].alarmStatus)}
                </span>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={!!loadingId}
                  onClick={() =>
                    void toggleAlarm(
                      sites[0].id,
                      isArmedStatus(sites[0].alarmStatus) ? 'DISARMED' : 'ARMED',
                    )
                  }
                >
                  {isArmedStatus(sites[0].alarmStatus) ? 'Disarm' : 'Away arm'}
                </button>
                <div style={{ flex: '1 1 12rem', minWidth: '10rem' }}>
                  <HoldToActivate
                    label="Home panic"
                    holdLabel="Hold to panic…"
                    loading={loadingId === `${sites[0].id}-panic`}
                    disabled={!!loadingId}
                    onActivate={() => homePanic(sites[0].id)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-muted">
                No property linked yet.{' '}
                <button type="button" className="btn-sm btn-sm--link" onClick={() => setShowRegister(true)}>
                  Register now
                </button>
              </p>
            )}
          </section>
          </SlidingSection>

          {sites.filter((s) => s.cameraCount > 0).length > 0 && (
            <SlideCarousel
              title="Live CCTV"
              subtitle="Swipe between sites"
              seeAllHref={primaryCamSite ? `/portal/home/${primaryCamSite.id}` : '/portal/home'}
              seeAllLabel="All cameras"
              className="slide-carousel--feeds"
            >
              {sites
                .filter((s) => s.cameraCount > 0)
                .map((s) => (
                  <SlideCarouselCard
                    key={s.id}
                    title={s.name}
                    href={`/portal/home/${s.id}`}
                    wide
                  >
                    <p className="text-muted slide-carousel__feed-meta">
                      {s.onlineCameras}/{s.cameraCount} online · {alarmStatusLabel(s.alarmStatus)}
                    </p>
                    <MiniCctvViewer
                      siteId={s.id}
                      siteName={s.name}
                      cameras={s.cameras}
                      onlineCount={s.onlineCameras}
                      className="mini-cctv--in-slide"
                    />
                  </SlideCarouselCard>
                ))}
            </SlideCarousel>
          )}

          <SlidingSection
            title="All camera channels"
            subtitle="Every site · full grid"
            defaultOpen={false}
            storageKey="portal-home-all-cams"
          >
          <section id="surveillance" className="portal-card portal-card--flat">
            {sites.every((s) => s.cameraCount === 0) ? (
              <p className="text-muted">
                No cameras commissioned yet. Register your property — control room enables viewing after
                install verification.
              </p>
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
                        <CctvLiveFeed
                          key={c.id}
                          camera={c}
                          href={`/portal/home/${s.id}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          </SlidingSection>

          {sites.length > 0 && (
            <SlideCarousel title="Your properties" subtitle="Swipe to browse sites">
              {sites.map((p) => (
                <SlideCarouselCard
                  key={p.id}
                  title={p.name}
                  href={`/portal/home/${p.id}`}
                  tone={
                    p.alarmStatus === 'TRIGGERED'
                      ? 'alert'
                      : ['ARMED', 'STAY', 'NIGHT'].includes(p.alarmStatus)
                        ? 'ok'
                        : 'muted'
                  }
                >
                  <strong className="slide-carousel__stat slide-carousel__stat--sm">
                    {alarmStatusLabel(p.alarmStatus)}
                  </strong>
                  <p className="text-muted">{p.address}</p>
                  <p className="text-muted">
                    Cams {p.onlineCameras}/{p.cameraCount}
                    {typeof p.sensorCount === 'number' ? ` · ${p.sensorCount} zones` : ''}
                  </p>
                </SlideCarouselCard>
              ))}
            </SlideCarousel>
          )}

          <SlidingSection
            title="Property controls"
            subtitle={sites.length ? `${sites.length} sites · arm & zones` : 'Register a site'}
            defaultOpen={false}
            storageKey="portal-home-properties"
          >
          <div id="properties-list" className="entity-grid">
            {sites.length === 0 ? (
              <div className="empty-state">
                <p>No properties registered yet.</p>
                <PropertyRegisterForm onRegistered={() => reload()} />
              </div>
            ) : (
              sites.map((p) => (
                <div key={p.id} className="entity-card">
                  <div className="entity-card-header">
                    <Link href={`/portal/home/${p.id}`} className="status-list-link">
                      {p.name}
                    </Link>
                    <span className={`status-pill status-pill--${p.alarmStatus.toLowerCase()}`}>
                      {alarmStatusLabel(p.alarmStatus)}
                    </span>
                  </div>
                  <p>{p.address}</p>
                  <p className="text-muted">
                    {p.panel?.panelVendor ? `${p.panel.panelVendor} · ` : ''}
                    {p.propertyType} · Cams {p.onlineCameras}/{p.cameraCount}
                    {typeof p.sensorCount === 'number' ? ` · ${p.sensorCount} zones` : ''}
                    {p.alertSensors
                      ? ` · ${p.alertSensors} sensor alert${p.alertSensors === 1 ? '' : 's'}`
                      : ''}
                    {p.openEvents > 0
                      ? ` · ${p.openEvents} open event${p.openEvents === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {p.accessNotes && <p className="text-muted">{p.accessNotes}</p>}
                  <div className="entity-card-actions">
                    <Link href={`/portal/home/${p.id}`} className="btn-secondary btn-sm">
                      Zones &amp; cams
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        toggleAlarm(p.id, isArmedStatus(p.alarmStatus) ? 'DISARMED' : 'ARMED')
                      }
                      disabled={!!loadingId}
                    >
                      {loadingId ===
                      `${p.id}-${isArmedStatus(p.alarmStatus) ? 'DISARMED' : 'ARMED'}` ? (
                        <LoadingSpinner label="" size="sm" />
                      ) : isArmedStatus(p.alarmStatus) ? (
                        'Disarm'
                      ) : (
                        'Away arm'
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </SlidingSection>
        </>
      )}
    </FeatureHub>
  );
}

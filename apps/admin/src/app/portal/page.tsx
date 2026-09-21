'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { EmergencyCallButton, EmergencyDispatchCallCard, formatZaPhone } from '@/components/portal/EmergencyCallButton';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { HomeAlarmControl } from '@/components/portal/HomeAlarmControl';
import { ClientVehicleRemote } from '@/components/vehicle/ClientVehicleRemote';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { vehicleEmergencyMeta } from '@/lib/vehicle-emergency-status';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { activityHref } from '@/lib/portal-routes';
import { PortalCommandBrief } from '@/components/portal/PortalCommandBrief';
import { OpsNeedsYou } from '@/components/ops/OpsQuickWork';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import {
  EmergencyModeBanner,
  ProtectionStatusCard,
} from '@/components/ops/EmergencyMode';
import { PanicNeuConsole, type PanicNeuBusy } from '@/components/portal/PanicNeuConsole';
import { DashboardLiveCctv } from '@/components/portal/DashboardLiveCctv';
import { IncidentTimeline } from '@/components/incident/IncidentTimeline';
import { SlidingSection } from '@/components/portal/SlidingSection';
import { FamilyProfilePopup, type FamilyProfilePerson } from '@/components/portal/FamilyProfilePopup';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
import { showClientEmergencyNotification } from '@/lib/client-push';
import { responseHref } from '@/lib/live-response';

type Overview = {
  user: { firstName: string; trackingEnabled: boolean; address: string | null };
  stats: { contactCount: number; familyCount: number; activeIncidents: number; unreadNotifications: number };
  services: Record<string, string>;
  subscription: { planName: string; status: string; memberId: string } | null;
  vehicles?: {
    id: string;
    registration: string;
    make: string;
    model: string;
    year?: number | null;
    color?: string | null;
    theftRecovery: boolean;
    emergencyStatus?: string | null;
    immobiliserOn?: boolean;
    doorsLocked?: boolean;
    hornActive?: boolean;
  }[];
  properties: { id: string; name: string; alarmStatus: string; alarmLinked: boolean; propertyType?: string; zoneHealth?: { total: number; active: number; fault: number; alert: number; disabled: number } }[];
  family: { id: string; name: string; trackingEnabled: boolean; phone?: string }[];
  contacts: { id: string; name: string; phone: string; relationship: string | null; priority: number }[];
  recentIncidents: { id: string; type: string; status: string; title: string; isSilent: boolean; time: string }[];
  recentActivity: { title: string; detail: string; time: string }[];
  liveResponse?: {
    id: string;
    publicRef: string;
    type: string;
    status: string;
    stage?: string;
    headline?: string;
    detail?: string;
    unitLabel?: string | null;
    etaSeconds?: number | null;
    events: { id: string; type: string; source: string; createdAt: string; kind: 'event' | 'note'; payload?: Record<string, unknown> }[];
  } | null;
  medicalComplete: boolean;
  safeZoneCount: number;
};

const SERVICE_LABELS: Record<string, string> = {
  personal: 'Personal Security',
  family: 'Family Safety',
  vehicle: 'Vehicle Security',
  home: 'Home Security',
  medical: 'Medical Profile',
};

const SERVICE_HREFS: Record<string, string> = {
  personal: '/portal/personal',
  family: '/portal/family',
  vehicle: '/portal/vehicles',
  home: '/portal/home',
  medical: '/portal/medical',
};

export default function ClientPortalPage() {
  return (
    <PortalLayout>
      <OverviewDashboard />
    </PortalLayout>
  );
}

function OverviewDashboard() {
  const router = useRouter();
  const calls = useCallsOptional();
  const [panicLoading, setPanicLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<FamilyProfilePerson | null>(null);
  const undo = useUndoToast();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Overview>>('/client/overview'),
    [],
  );
  const { access } = useSubscriptionAccess();
  const { data: contactsPayload } = useApi(
    () =>
      clientApi.get<
        ApiResponse<
          {
            id: string;
            name: string;
            phone: string;
            relationship: string | null;
            priority: number;
            linkedUserId?: string | null;
            isDispatch?: boolean;
          }[]
        > & { meta?: { dispatchLine: { name: string; phone: string } } }
      >('/client/contacts'),
    [],
  );

  const didInitialScroll = useRef(false);

  useEffect(() => {
    if (!loading && !didInitialScroll.current) {
      window.scrollTo(0, 0);
      didInitialScroll.current = true;
    }
  }, [loading]);

  async function openLiveResponse(incidentId: string | null | undefined, title: string, body: string) {
    if (!incidentId) return;
    const href = responseHref(incidentId);
    void showClientEmergencyNotification({
      title,
      body,
      tag: `panic-${incidentId}`,
      deepLink: href,
      urgency: 'critical',
      kind: 'panic',
    });
    router.push(href);
  }

  async function handlePanic(silent: boolean) {
    if (silent) setSilentLoading(true);
    else setPanicLoading(true);
    setAlertMsg('');
    try {
      const res = await clientApi.post<
        ApiResponse<{ id: string; incidentId?: string | null; transmissionStatus?: string }>
      >('/client/panic', { silent });
      const incidentId = res.data?.incidentId ?? null;
      setAlertMsg(silent ? 'Silent alert sent discreetly.' : 'Panic alert sent. Control room notified.');
      undo.show(
        silent ? 'Silent alert sent' : 'Panic alert sent',
        async () => {
          await clientApi.post('/client/panic/cancel');
          void reload();
        },
        silent
          ? { kind: 'silent', detail: 'Control room notified discreetly' }
          : { kind: 'critical', detail: 'Control room notified · help is on the way' },
      );
      void reload();
      await openLiveResponse(
        incidentId,
        silent ? '4DS SILENT ALERT' : '4DS SECURITY ALERT',
        silent
          ? 'Covert distress received. Response team notified discreetly.'
          : 'Emergency response activated. Your security team has been notified.',
      );
    } catch (e) {
      setAlertMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setPanicLoading(false);
      setSilentLoading(false);
    }
  }

  async function handleMedicalEmergency() {
    setMedicalLoading(true);
    setAlertMsg('');
    try {
      const res = await clientApi.post<ApiResponse<{ id: string }>>('/client/medical/emergency');
      setAlertMsg('Ambulance requested. Medical profile shared with responders.');
      undo.show('Ambulance requested', undefined, {
        kind: 'medical',
        detail: 'Medical profile shared with responders',
      });
      void reload();
      await openLiveResponse(
        res.data?.id,
        'MEDICAL RESPONSE',
        'Medical assistance has been requested. View live response.',
      );
    } finally {
      setMedicalLoading(false);
    }
  }

  async function handleFireEmergency() {
    setFireLoading(true);
    setAlertMsg('');
    try {
      const res = await clientApi.post<ApiResponse<{ id: string }>>('/client/fire/emergency');
      setAlertMsg('Fire response requested. Dispatch and fire unit notified.');
      undo.show('Fire response requested', undefined, {
        kind: 'fire',
        detail: 'Dispatch and fire unit notified',
      });
      void reload();
      await openLiveResponse(
        res.data?.id,
        'FIRE EMERGENCY',
        'Fire response has been initiated. View incident.',
      );
    } finally {
      setFireLoading(false);
    }
  }

  async function handleVehiclePanic(vehicleId: string) {
    setVehicleLoading(true);
    setAlertMsg('');
    try {
      const res = await clientApi.post<ApiResponse<{ message?: string; incidentId?: string | null }>>(
        `/client/vehicles/${vehicleId}/remote`,
        { action: 'panic' },
      );
      setAlertMsg(res.data?.message ?? 'Vehicle panic sent. Control room viewing dash cameras.');
      undo.show('Vehicle panic sent', undefined, {
        kind: 'critical',
        detail: 'Control room viewing dash cameras',
      });
      void reload();
      await openLiveResponse(
        res.data?.incidentId,
        'VEHICLE PANIC',
        'Your vehicle emergency alert was received. Track response.',
      );
    } catch (e) {
      setAlertMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setVehicleLoading(false);
    }
  }

  async function callDispatch() {
    const phone = contactsPayload?.meta?.dispatchLine?.phone ?? CONTROL_ROOM_LINE.phone;
    const name = contactsPayload?.meta?.dispatchLine?.name ?? CONTROL_ROOM_LINE.name;
    if (calls?.portal) {
      try {
        await calls.startCall('DISPATCH_LINE', {
          name,
          phone,
          role: 'DISPATCH',
        });
        return;
      } catch (e) {
        setAlertMsg(friendlyErrorMessage(e, 'call'));
        return;
      }
    }
    window.location.href = `tel:${phone}`;
  }

  if (loading) return <LoadingSpinner label="Loading overview..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const d = data?.data;
  if (!d) return <ErrorAlert error="Overview could not be loaded." onRetry={reload} />;
  type ContactRow = Overview['contacts'][number] & {
    linkedUserId?: string | null;
    isDispatch?: boolean;
  };
  const contacts: ContactRow[] = contactsPayload?.data ?? d.contacts ?? [];
  const personalContacts = contacts.filter((c) => {
    const text = `${c.name} ${c.relationship ?? ''}`.toLowerCase();
    return !c.isDispatch && !text.includes('dispatch') && !text.includes('4ds');
  });
  const recentIncidents = d.recentIncidents ?? [];
  const family = d.family ?? [];
  const vehicles = d.vehicles ?? [];
  const activeIncidents = recentIncidents.filter((i) =>
    ['OPEN', 'ACTIVE', 'DISPATCHED', 'IN_PROGRESS', 'RESPONDING'].includes(
      i.status.toUpperCase(),
    ),
  );
  const hasAlert = d.stats.activeIncidents > 0 || activeIncidents.length > 0;
  const primaryAlarm = d.properties?.[0];
  const primaryVehicle = d.vehicles?.[0];
  const tone =
    primaryAlarm?.alarmStatus === 'TRIGGERED' ||
    activeIncidents.some((i) => /panic|fire|medical|intrusion/i.test(`${i.type} ${i.title}`))
      ? 'emergency'
      : hasAlert
        ? 'attention'
        : 'ok';

  return (
    <div className="portal-dash">
      <div className="portal-dash__stage">
      {(hasAlert || alertMsg.includes('Panic') || alertMsg.includes('Medical') || alertMsg.includes('Fire') || alertMsg.includes('Vehicle')) && (
        <EmergencyModeBanner
          title={activeIncidents[0]?.title ?? 'Emergency active'}
          detail="Control room notified. Stay available if safe."
          statusLine={d.user.address ? `Location · ${d.user.address}` : 'Location sharing on'}
          liveLabel="Live · control room"
          primaryAction={
            <button type="button" onClick={() => void callDispatch()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
              </svg>
              Call Control Room
            </button>
          }
          actions={
            <>
              <Link href="/portal/protect">Protect</Link>
              <Link href="/portal/incidents">Response</Link>
            </>
          }
        />
      )}

      {access?.emergency !== false && (
        <PanicNeuConsole
          className="panic-section"
          showHub
          showMedical={access?.medical !== false}
          busy={
            (panicLoading
              ? 'panic'
              : silentLoading
                ? 'silent'
                : medicalLoading
                  ? 'medical'
                  : fireLoading
                    ? 'fire'
                    : vehicleLoading
                      ? 'vehicle'
                      : null) satisfies PanicNeuBusy
          }
          onPanic={() => handlePanic(false)}
          onSilent={() => handlePanic(true)}
          onMedical={() => void handleMedicalEmergency()}
          onFire={() => void handleFireEmergency()}
          onVehicle={
            access?.vehicle !== false && primaryVehicle
              ? () => void handleVehiclePanic(primaryVehicle.id)
              : undefined
          }
        />
      )}

      <HomeAlarmControl
        variant="dashboard"
        properties={d.properties ?? []}
        hasAccess={!!access?.home}
        onUpdated={reload}
        feeds={<DashboardLiveCctv embedded kind="home" />}
      />

      {access?.vehicle !== false && primaryVehicle ? (
        <ClientVehicleRemote
          vehicle={primaryVehicle}
          onUpdated={() => void reload({ silent: true })}
        />
      ) : null}

      <EmergencyDispatchCallCard
        phone={contactsPayload?.meta?.dispatchLine?.phone}
        name={contactsPayload?.meta?.dispatchLine?.name}
      />

      {d.liveResponse ? (
        <section className="portal-card incident-live-response">
          <p className="dash-ops__eyebrow">Live response</p>
          <h2>
            {d.liveResponse.headline ??
              `${d.liveResponse.publicRef} · ${d.liveResponse.status.replace(/_/g, ' ')}`}
          </h2>
          {d.liveResponse.detail ? <p className="text-muted">{d.liveResponse.detail}</p> : null}
          <IncidentTimeline items={d.liveResponse.events} compact />
          <Link href={responseHref(d.liveResponse.id)} className="ops-act ops-act--dispatch">
            Open live response
          </Link>
        </section>
      ) : null}

      {alertMsg ? (
        <div className="alert alert--success ops-quick-feedback" role="status">
          {alertMsg}
        </div>
      ) : null}
      </div>

      <div className="portal-status-dock">
        <ProtectionStatusCard
          tone={tone}
          title={
            tone === 'emergency'
              ? 'Emergency active'
              : tone === 'attention'
                ? 'Attention required'
                : 'You are protected'
          }
          lines={[
            primaryAlarm
              ? `Home security · ${primaryAlarm.alarmStatus}`
              : 'Home security ready',
            `${d.stats.familyCount} family connected`,
            `Last check · just now`,
          ]}
        />
        <EmergencyProtectionBanner />
      </div>

      <div className="portal-brief">
        <PortalCommandBrief
          firstName={d.user.firstName}
          address={d.user.address}
          eventsCount={
            d.stats.activeIncidents + d.stats.unreadNotifications + (primaryAlarm ? 1 : 0)
          }
          alertsCount={d.stats.activeIncidents}
          updatesCount={d.stats.unreadNotifications}
          trackingOn={d.user.trackingEnabled}
          familyCount={d.stats.familyCount}
          familyTrackingCount={family.filter((m) => m.trackingEnabled).length}
          safeZoneCount={d.safeZoneCount}
          homeAccess={access?.home !== false}
          cctvReady={access?.home !== false}
          property={primaryAlarm ?? null}
          incidents={activeIncidents.length ? activeIncidents : recentIncidents}
          activity={d.recentActivity ?? []}
        />
      </div>

      <OpsNeedsYou
        items={[
          ...(hasAlert
            ? [
                {
                  id: 'inc',
                  title: `${d.stats.activeIncidents} active alert${d.stats.activeIncidents === 1 ? '' : 's'}`,
                  detail: 'Tap for status and responder updates',
                  href: d.liveResponse ? responseHref(d.liveResponse.id) : '/portal/incidents',
                },
              ]
            : []),
          ...(d.stats.unreadNotifications > 0
            ? [
                {
                  id: 'upd',
                  title: `${d.stats.unreadNotifications} updates`,
                  detail: 'Messages and system notices',
                  href: '/portal/updates',
                },
              ]
            : []),
        ]}
        viewAllHref="/portal/updates"
      />

      {(hasAlert || activeIncidents.length > 0) && (
        <section className="portal-card portal-card--accent">
          <div className="card-header-row">
            <div>
              <p className="ec-kicker">Live response</p>
              <h2>What&apos;s happening</h2>
            </div>
            <Link
              href={d.liveResponse ? responseHref(d.liveResponse.id) : '/portal/incidents'}
              className="link-sm"
            >
              {d.liveResponse ? 'Open live response' : 'Full history'}
            </Link>
          </div>
          <ul className="activity-list">
            {(activeIncidents.length ? activeIncidents : recentIncidents)
              .slice(0, 4)
              .map((i) => (
                <li
                  key={i.id}
                  className={`activity-item ${
                    /panic|trigger|critical/i.test(`${i.title ?? ''} ${i.type ?? ''} ${i.status ?? ''}`)
                      ? 'activity-item--critical'
                      : /en.?route|dispatch/i.test(i.status)
                        ? 'activity-item--progress'
                        : 'activity-item--warn'
                  }`}
                >
                  <Link
                    href={
                      d.liveResponse && i.id === d.liveResponse.id
                        ? responseHref(i.id)
                        : `/portal/response/${i.id}`
                    }
                    className="activity-item-link"
                  >
                    <div>
                      <div className="activity-title">
                        {i.title ?? i.type}
                        {i.isSilent ? ' (silent)' : ''}
                      </div>
                      <div className="activity-detail">{i.status.replace(/_/g, ' ').toLowerCase()}</div>
                    </div>
                    <span className="activity-time">{i.time}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      <SlidingSection
        title="Contacts & services"
        subtitle="Family, vehicles, subscription & activity"
        defaultOpen={false}
        storageKey="portal-dashboard-details"
      >
      <div className="overview-grid">
        <section className="portal-card">
          <div className="card-header-row">
            <Link href="/portal/contacts" className="card-title-link">
              <h2>Emergency Contacts</h2>
            </Link>
            <Link href="/portal/contacts" className="link-sm">
              Manage
            </Link>
          </div>
          <ul className="contact-list">
            {personalContacts.map((c) => (
              <li key={c.id}>
                <Link href="/portal/contacts" className="contact-row contact-row--link">
                  <span className="ec-pri">{`P${c.priority || 1}`}</span>
                  <div>
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-meta">
                      {c.relationship} · {formatZaPhone(c.phone)}
                    </div>
                  </div>
                </Link>
                <EmergencyCallButton
                  name={c.name}
                  phone={c.phone}
                  relationship={c.relationship}
                  linkedUserId={c.linkedUserId}
                  isDispatch={c.isDispatch}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="portal-card">
          <div className="card-header-row">
            <Link href="/portal/family" className="card-title-link">
              <h2>Family Status</h2>
            </Link>
            <Link href="/portal/family" className="link-sm">
              View all
            </Link>
          </div>
          <ul className="status-list">
            {family.length === 0 ? (
              <li>
                <Link href="/portal/family" className="interactive-text">
                  No family members linked — set up family
                </Link>
              </li>
            ) : (
              family.map((m) => (
                <li key={m.id} className="status-list-item">
                  <button
                    type="button"
                    className="status-list-link"
                    onClick={() =>
                      setSelectedFamily({
                        id: m.id,
                        name: m.name,
                        trackingEnabled: m.trackingEnabled,
                        phone: m.phone,
                        userId: m.id,
                      })
                    }
                  >
                    {m.name}
                  </button>
                  <button
                    type="button"
                    className={`status-dot status-dot--link ${m.trackingEnabled ? 'status-dot--on' : ''}`}
                    onClick={() =>
                      setSelectedFamily({
                        id: m.id,
                        name: m.name,
                        trackingEnabled: m.trackingEnabled,
                        phone: m.phone,
                        userId: m.id,
                      })
                    }
                  >
                    {m.trackingEnabled ? 'Tracking on' : 'Offline'}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="portal-card">
          <div className="card-header-row">
            <Link href="/portal/vehicles" className="card-title-link">
              <h2>Vehicle Status</h2>
            </Link>
            <Link href="/portal/vehicles" className="link-sm">
              Manage
            </Link>
          </div>
          {vehicles.length === 0 ? (
            <Link href="/portal/vehicles" className="interactive-text text-muted">
              No vehicles registered — add vehicle
            </Link>
          ) : (
            <ul className="status-list">
              {vehicles.map((v) => (
                <li key={v.id} className="status-list-item">
                  <Link href={`/portal/vehicles/${v.id}`} className="status-list-link">
                    {v.registration} — {v.make} {v.model}
                  </Link>
                  <Link
                    href={`/portal/vehicles/${v.id}`}
                    className={`status-pill status-pill--link ${v.theftRecovery ? 'status-pill--alert' : 'status-pill--ok'}`}
                  >
                    {v.theftRecovery
                      ? vehicleEmergencyMeta(v.emergencyStatus).label
                      : 'Secure'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="portal-card">
          <Link href="/portal/personal" className="card-title-link">
            <h2>Quick Actions</h2>
          </Link>
          <div className="action-grid">
            <Link href="/portal/location" className="action-tile">
              <span className="action-icon">📍</span>
              <span className="action-label">Share Location</span>
              <span className="action-desc">
                {d.user.trackingEnabled ? 'Live GPS active' : 'Enable tracking'}
              </span>
            </Link>
            <Link href="/portal/theft" className="action-tile">
              <span className="action-icon">🚗</span>
              <span className="action-label">Report Theft</span>
              <span className="action-desc">Vehicle recovery</span>
            </Link>
            <Link href="/portal/incidents" className="action-tile">
              <span className="action-icon">📋</span>
              <span className="action-label">Alerts</span>
              <span className="action-desc">{d.stats.activeIncidents} active</span>
            </Link>
            <Link href="/portal/emergency" className="action-tile">
              <span className="action-icon">🚨</span>
              <span className="action-label">Emergency Hub</span>
            </Link>
          </div>
        </section>

        <section className="portal-card">
          <Link href="/portal/emergency" className="card-title-link">
            <h2>Active Services</h2>
          </Link>
          <div className="service-status-grid">
            {Object.entries(d.services ?? {})
              .filter(([key]) => key !== 'communications')
              .map(([key, status]) => (
                <Link
                  key={key}
                  href={
                    status === 'upgrade'
                      ? `/portal/subscription/upgrade?addon=${key === 'home' ? 'HOME_SECURITY' : key === 'vehicle' ? 'VEHICLE_RESPONSE' : key === 'family' ? 'FAMILY' : ''}`
                      : (SERVICE_HREFS[key] ?? '/portal')
                  }
                  className="service-status-card"
                >
                  <span className="service-status-name">
                    {SERVICE_LABELS[key] ?? key}
                  </span>
                  <span className={`service-status-badge service-status-badge--${status}`}>
                    {status === 'upgrade' ? 'Upgrade' : status}
                  </span>
                </Link>
              ))}
          </div>
        </section>

        <section className="portal-card">
          <div className="card-header-row">
            <Link href="/portal/subscription" className="card-title-link">
              <h2>Subscription</h2>
            </Link>
            <Link href="/portal/subscription" className="link-sm">
              Manage
            </Link>
          </div>
          {d.subscription ? (
            <Link
              href="/portal/subscription"
              className="subscription-summary subscription-summary--link"
            >
              <strong>{d.subscription.planName}</strong>
              <span className="text-muted">Member ID: {d.subscription.memberId}</span>
              <span className={`status-pill status-pill--${d.subscription.status.toLowerCase()}`}>
                {d.subscription.status}
              </span>
            </Link>
          ) : (
            <Link href="/portal/subscription" className="text-muted interactive-text">
              No active subscription — set up plan
            </Link>
          )}
        </section>

        {!hasAlert && (
          <section className="portal-card">
            <div className="card-header-row">
              <Link href="/portal/incidents" className="card-title-link">
                <h2>Recent alerts</h2>
              </Link>
              <Link href="/portal/incidents" className="link-sm">
                Full history
              </Link>
            </div>
            <ul className="activity-list">
              {recentIncidents.length === 0 ? (
                <li className="activity-item">
                  <Link href="/portal/incidents" className="activity-item-link">
                    <div>
                      <div className="activity-title">No alerts</div>
                      <div className="activity-detail">You&apos;re safe</div>
                    </div>
                  </Link>
                </li>
              ) : (
                recentIncidents.map((i) => (
                  <li key={i.id} className="activity-item">
                    <Link href="/portal/incidents" className="activity-item-link">
                      <div>
                        <div className="activity-title">
                          {i.title ?? i.type}
                          {i.isSilent ? ' (silent)' : ''}
                        </div>
                        <div className="activity-detail">{i.status.replace(/_/g, ' ').toLowerCase()}</div>
                      </div>
                      <span className="activity-time">{i.time}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        <section className="portal-card">
          <div className="card-header-row">
            <Link href="/portal/updates" className="card-title-link">
              <h2>Recent Activity</h2>
            </Link>
            <Link href="/portal/updates" className="link-sm">
              Updates
            </Link>
          </div>
          <ul className="activity-list">
            {d.recentActivity.map((item, i) => (
              <li key={i} className="activity-item">
                <Link
                  href={activityHref(item.title, item.detail)}
                  className="activity-item-link"
                >
                  <div>
                    <div className="activity-title">{item.title}</div>
                    <div className="activity-detail">{item.detail}</div>
                  </div>
                  <span className="activity-time">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </SlidingSection>
      {selectedFamily ? (
        <FamilyProfilePopup person={selectedFamily} onClose={() => setSelectedFamily(null)} />
      ) : null}
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}

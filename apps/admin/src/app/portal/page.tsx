'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { EmergencyCallButton } from '@/components/portal/EmergencyCallButton';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { HomeAlarmControl } from '@/components/portal/HomeAlarmControl';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { activityHref } from '@/lib/portal-routes';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import { OpsNeedsYou } from '@/components/ops/OpsQuickWork';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
import {
  EmergencyModeBanner,
  HoldToActivate,
  ProtectionStatusCard,
} from '@/components/ops/EmergencyMode';
import { DashboardLiveCctv } from '@/components/portal/DashboardLiveCctv';
import { SlideCarousel, SlideCarouselCard } from '@/components/portal/SlideCarousel';
import { SlidingSection } from '@/components/portal/SlidingSection';
import { protectionStatusTone } from '@/lib/portal-priority';

type Overview = {
  user: { firstName: string; trackingEnabled: boolean; address: string | null };
  stats: { contactCount: number; familyCount: number; activeIncidents: number; unreadNotifications: number };
  services: Record<string, string>;
  subscription: { planName: string; status: string; memberId: string } | null;
  vehicles: { id: string; registration: string; make: string; model: string; theftRecovery: boolean }[];
  properties: { id: string; name: string; alarmStatus: string; alarmLinked: boolean }[];
  family: { id: string; name: string; trackingEnabled: boolean }[];
  contacts: { id: string; name: string; phone: string; relationship: string | null; priority: number }[];
  recentIncidents: { id: string; type: string; status: string; title: string; isSilent: boolean; time: string }[];
  recentActivity: { title: string; detail: string; time: string }[];
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
  const calls = useCallsOptional();
  const [panicLoading, setPanicLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [filter, setFilter] = useState('all');
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

  async function handlePanic(silent: boolean) {
    if (silent) setSilentLoading(true);
    else setPanicLoading(true);
    setAlertMsg('');
    try {
      await clientApi.post('/client/panic', { silent });
      setAlertMsg(silent ? 'Silent alert sent discreetly.' : 'Panic alert sent. Dispatch notified.');
      undo.show(silent ? 'Silent alert sent' : 'Panic alert sent', async () => {
        /* demo: acknowledge only */
      });
      void reload();
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
      await clientApi.post('/client/medical/emergency');
      setAlertMsg('Ambulance requested. Medical profile shared with responders.');
      reload();
    } finally {
      setMedicalLoading(false);
    }
  }

  async function handleFireEmergency() {
    setFireLoading(true);
    setAlertMsg('');
    try {
      await clientApi.post('/client/fire/emergency');
      setAlertMsg('Fire response requested. Dispatch and fire unit notified.');
      reload();
    } finally {
      setFireLoading(false);
    }
  }

  async function callDispatch() {
    const phone =
      contactsPayload?.meta?.dispatchLine?.phone ??
      data?.data?.contacts?.find((c) =>
        `${c.name} ${c.relationship ?? ''}`.toLowerCase().includes('dispatch'),
      )?.phone ??
      '+27110000000';
    const name = contactsPayload?.meta?.dispatchLine?.name ?? '4DS Control Room';
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

  const d = data!.data;
  type ContactRow = Overview['contacts'][number] & {
    linkedUserId?: string | null;
    isDispatch?: boolean;
  };
  const contacts: ContactRow[] = contactsPayload?.data ?? d.contacts;
  const activeIncidents = d.recentIncidents.filter((i) =>
    ['OPEN', 'ACTIVE', 'DISPATCHED', 'IN_PROGRESS', 'RESPONDING'].includes(
      i.status.toUpperCase(),
    ),
  );
  const hasAlert = d.stats.activeIncidents > 0 || activeIncidents.length > 0;
  const primaryAlarm = d.properties[0];
  const tone = protectionStatusTone({
    activeIncidents: d.stats.activeIncidents,
    criticalIncidents: hasAlert ? d.stats.activeIncidents : 0,
    alarmFault: primaryAlarm ? !['ARMED', 'STAY', 'NIGHT', 'DISARMED'].includes(primaryAlarm.alarmStatus) : false,
  });

  return (
    <>
      {(hasAlert || alertMsg.includes('Panic') || alertMsg.includes('Medical') || alertMsg.includes('Fire')) && (
        <EmergencyModeBanner
          title={activeIncidents[0]?.title ?? 'Emergency active'}
          detail="Control room notified. Stay available if safe."
          statusLine={d.user.address ? `Location · ${d.user.address}` : 'Location sharing on'}
          actions={
            <>
              <Link href="/portal/protect" className="emergency-mode__btn">
                Protect
              </Link>
              <Link href="/portal/incidents" className="emergency-mode__btn">
                Response
              </Link>
              <button
                type="button"
                className="emergency-mode__btn emergency-mode__btn--call"
                onClick={() => void callDispatch()}
              >
                Call dispatch
              </button>
            </>
          }
        />
      )}

      {access?.emergency !== false && (
        <section className="panic-section" aria-label="Emergency controls">
          <HoldToActivate
            label="Panic"
            holdLabel="Sending panic…"
            loading={panicLoading}
            disabled={silentLoading || medicalLoading || fireLoading}
            className="hold-activate--circle"
            onActivate={() => handlePanic(false)}
          />
          <p className="panic-note">Hold to confirm · Dispatch notified instantly</p>

          <div className="panic-orbit">
            <button
              type="button"
              className="panic-orbit-btn panic-orbit-btn--silent"
              onClick={() => handlePanic(true)}
              disabled={panicLoading || silentLoading || medicalLoading || fireLoading}
            >
              {silentLoading ? '…' : (
                <>
                  <span className="panic-orbit-btn__glyph">S</span>
                  <span className="panic-orbit-btn__label">Silent Panic</span>
                </>
              )}
            </button>
            {access?.medical !== false && (
              <button
                type="button"
                className="panic-orbit-btn panic-orbit-btn--medical"
                onClick={handleMedicalEmergency}
                disabled={panicLoading || silentLoading || medicalLoading || fireLoading}
              >
                {medicalLoading ? '…' : (
                  <>
                    <span className="panic-orbit-btn__glyph">+</span>
                    <span className="panic-orbit-btn__label">Medical Emergency</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="panic-orbit-btn panic-orbit-btn--fire"
              onClick={handleFireEmergency}
              disabled={panicLoading || silentLoading || medicalLoading || fireLoading}
            >
              {fireLoading ? '…' : (
                <>
                  <span className="panic-orbit-btn__glyph">F</span>
                  <span className="panic-orbit-btn__label">Fire Emergency</span>
                </>
              )}
            </button>
            <Link href="/portal/emergency" className="panic-orbit-btn panic-orbit-btn--hub">
              <span className="panic-orbit-btn__glyph">◎</span>
              <span className="panic-orbit-btn__label">Emergency Hub</span>
            </Link>
          </div>
        </section>
      )}

      <DashboardLiveCctv />

      {alertMsg ? (
        <div className="alert alert--success ops-quick-feedback" role="status">
          {alertMsg}
        </div>
      ) : null}

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

      <OpsMyShiftHeader
        title={`Hello, ${d.user.firstName}`}
        subtitle={
          hasAlert
            ? `${d.stats.activeIncidents} active · action needed`
            : 'You are covered — protect stays one hold away'
        }
        chips={[
          {
            id: 'all',
            label: 'Board',
            count:
              d.stats.activeIncidents +
              d.stats.unreadNotifications +
              (primaryAlarm ? 1 : 0),
          },
          {
            id: 'urgent',
            label: 'Incidents',
            count: d.stats.activeIncidents,
            tone: hasAlert ? 'urgent' : 'ok',
          },
          {
            id: 'alarm',
            label: 'Alarm',
            count: primaryAlarm ? 1 : 0,
            tone: primaryAlarm?.alarmStatus === 'ARMED' ? 'ok' : 'warn',
          },
          {
            id: 'messages',
            label: 'Updates',
            count: d.stats.unreadNotifications,
            tone: d.stats.unreadNotifications > 0 ? 'warn' : 'neutral',
          },
        ]}
        activeChip={filter}
        onChip={(id) => {
          if (id === 'messages') {
            window.location.href = '/portal/updates';
            return;
          }
          if (id === 'alarm') {
            window.location.href = '/portal/home';
            return;
          }
          setFilter(id);
        }}
      />

      {(filter === 'all' || filter === 'urgent') && (
      <SlideCarousel
        title="Status board"
        subtitle="Swipe · tap a card to act"
        seeAllHref="/portal/incidents"
        seeAllLabel="Incidents"
      >
        <SlideCarouselCard
          title="Incidents"
          href="/portal/incidents"
          tone={hasAlert ? 'alert' : 'ok'}
        >
          <strong className="slide-carousel__stat">{d.stats.activeIncidents}</strong>
          <p className="text-muted">
            {hasAlert ? 'Open events — tap for updates' : 'No open incidents · you are clear'}
          </p>
        </SlideCarouselCard>
        <SlideCarouselCard
          title="Live tracking"
          href="/portal/location"
          tone={d.user.trackingEnabled ? 'ok' : 'warn'}
        >
          <strong className="slide-carousel__stat">{d.user.trackingEnabled ? 'ON' : 'OFF'}</strong>
          <p className="text-muted">
            {d.user.trackingEnabled
              ? 'GPS sharing active for response'
              : 'Enable tracking so responders can find you'}
          </p>
        </SlideCarouselCard>
        <SlideCarouselCard
          title="Home alarm"
          href="/portal/home"
          tone={
            primaryAlarm && ['ARMED', 'STAY', 'NIGHT', 'TRIGGERED'].includes(primaryAlarm.alarmStatus)
              ? primaryAlarm.alarmStatus === 'TRIGGERED'
                ? 'alert'
                : 'ok'
              : 'muted'
          }
        >
          <strong className="slide-carousel__stat">
            {primaryAlarm ? primaryAlarm.alarmStatus.replace(/_/g, ' ') : '—'}
          </strong>
          <p className="text-muted">
            {primaryAlarm
              ? primaryAlarm.name
              : access?.home
                ? 'Add a property to arm'
                : 'Upgrade for home security'}
          </p>
        </SlideCarouselCard>
        <SlideCarouselCard title="Family" href="/portal/family" tone="muted">
          <strong className="slide-carousel__stat">{d.stats.familyCount}</strong>
          <p className="text-muted">
            {d.family.filter((m) => m.trackingEnabled).length} tracking · {d.safeZoneCount} safe zones
          </p>
        </SlideCarouselCard>
        {d.vehicles[0] ? (
          <SlideCarouselCard
            title="Vehicle"
            href={`/portal/vehicles/${d.vehicles[0].id}`}
            tone={d.vehicles[0].theftRecovery ? 'alert' : 'ok'}
          >
            <strong className="slide-carousel__stat slide-carousel__stat--sm">
              {d.vehicles[0].registration}
            </strong>
            <p className="text-muted">
              {d.vehicles[0].make} {d.vehicles[0].model} ·{' '}
              {d.vehicles[0].theftRecovery ? 'Recovery mode' : 'Secure'}
            </p>
          </SlideCarouselCard>
        ) : null}
      </SlideCarousel>
      )}

      <SlideCarousel
        title="Your services"
        subtitle="Swipe through active modules"
        seeAllHref="/portal/subscription"
        seeAllLabel="Manage plan"
      >
        {Object.entries(d.services)
          .filter(([key]) => key !== 'communications')
          .map(([key, status]) => (
            <SlideCarouselCard
              key={key}
              title={SERVICE_LABELS[key] ?? key}
              href={
                status === 'upgrade'
                  ? `/portal/subscription/upgrade?addon=${key === 'home' ? 'HOME_SECURITY' : key === 'vehicle' ? 'VEHICLE_RESPONSE' : key === 'family' ? 'FAMILY' : ''}`
                  : (SERVICE_HREFS[key] ?? '/portal')
              }
              tone={status === 'active' || status === 'monitoring' ? 'ok' : status === 'upgrade' ? 'warn' : 'muted'}
            >
              <span className={`service-status-badge service-status-badge--${status}`}>
                {status === 'upgrade' ? 'Upgrade' : status}
              </span>
              <p className="text-muted">Tap to open module</p>
            </SlideCarouselCard>
          ))}
      </SlideCarousel>

      <OpsNeedsYou
        items={[
          ...(hasAlert
            ? [
                {
                  id: 'inc',
                  title: `${d.stats.activeIncidents} active incident${d.stats.activeIncidents === 1 ? '' : 's'}`,
                  detail: 'Tap for status and responder updates',
                  href: '/portal/incidents',
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

      <HomeAlarmControl
        variant="dashboard"
        properties={d.properties}
        hasAccess={!!access?.home}
        onUpdated={reload}
      />

      {(hasAlert || activeIncidents.length > 0) && (
        <section className="portal-card portal-card--accent">
          <div className="card-header-row">
            <h2>Live incident updates</h2>
            <Link href="/portal/incidents" className="link-sm">
              Full history
            </Link>
          </div>
          <ul className="activity-list">
            {(activeIncidents.length ? activeIncidents : d.recentIncidents)
              .slice(0, 4)
              .map((i) => (
                <li key={i.id} className="activity-item">
                  <Link href="/portal/incidents" className="activity-item-link">
                    <div>
                      <div className="activity-title">
                        {i.title ?? i.type}
                        {i.isSilent ? ' (silent)' : ''}
                      </div>
                      <div className="activity-detail">{i.status}</div>
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
        <section className="portal-card portal-card--accent">
          <div className="card-header-row">
            <Link href="/portal/contacts" className="card-title-link">
              <h2>Emergency Contacts</h2>
            </Link>
            <Link href="/portal/contacts" className="link-sm">
              Manage
            </Link>
          </div>
          <ul className="contact-list">
            {contacts.map((c) => (
              <li key={c.id}>
                <Link href="/portal/contacts" className="contact-row contact-row--link">
                  <span className="contact-priority">{c.priority}</span>
                  <div>
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-meta">
                      {c.relationship} · {c.phone}
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
            {d.family.length === 0 ? (
              <li>
                <Link href="/portal/family" className="interactive-text">
                  No family members linked — set up family
                </Link>
              </li>
            ) : (
              d.family.map((m) => (
                <li key={m.id} className="status-list-item">
                  <Link href="/portal/location" className="status-list-link">
                    {m.name}
                  </Link>
                  <Link
                    href="/portal/location"
                    className={`status-dot status-dot--link ${m.trackingEnabled ? 'status-dot--on' : ''}`}
                  >
                    {m.trackingEnabled ? 'Tracking on' : 'Offline'}
                  </Link>
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
          {d.vehicles.length === 0 ? (
            <Link href="/portal/vehicles" className="interactive-text text-muted">
              No vehicles registered — add vehicle
            </Link>
          ) : (
            <ul className="status-list">
              {d.vehicles.map((v) => (
                <li key={v.id} className="status-list-item">
                  <Link href={`/portal/vehicles/${v.id}`} className="status-list-link">
                    {v.registration} — {v.make} {v.model}
                  </Link>
                  <Link
                    href={`/portal/vehicles/${v.id}`}
                    className={`status-pill status-pill--link ${v.theftRecovery ? 'status-pill--alert' : 'status-pill--ok'}`}
                  >
                    {v.theftRecovery ? 'Recovery mode' : 'Secure'}
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
              <span className="action-label">Incidents</span>
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
            {Object.entries(d.services)
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
                <h2>Recent Incidents</h2>
              </Link>
              <Link href="/portal/incidents" className="link-sm">
                Full history
              </Link>
            </div>
            <ul className="activity-list">
              {d.recentIncidents.length === 0 ? (
                <li className="activity-item">
                  <Link href="/portal/incidents" className="activity-item-link">
                    <div>
                      <div className="activity-title">No incidents</div>
                      <div className="activity-detail">You&apos;re safe</div>
                    </div>
                  </Link>
                </li>
              ) : (
                d.recentIncidents.map((i) => (
                  <li key={i.id} className="activity-item">
                    <Link href="/portal/incidents" className="activity-item-link">
                      <div>
                        <div className="activity-title">
                          {i.title ?? i.type}
                          {i.isSilent ? ' (silent)' : ''}
                        </div>
                        <div className="activity-detail">{i.status}</div>
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
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </>
  );
}

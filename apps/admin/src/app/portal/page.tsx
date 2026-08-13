'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { EmergencyCallButton, EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { HomeAlarmControl } from '@/components/portal/HomeAlarmControl';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { activityHref } from '@/lib/portal-routes';
import { OpsMyShiftHeader } from '@/components/ops/OpsMyShiftHeader';
import { OpsNeedsYou, OpsQuickWork } from '@/components/ops/OpsQuickWork';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';

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
  const [panicLoading, setPanicLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [filter, setFilter] = useState('all');
  const [armLoading, setArmLoading] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const undo = useUndoToast();
  const calls = useCallsOptional();
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
    if (!silent) {
      const ok = window.confirm(
        'Send a panic alert to 4DS Dispatch now? Only use this in a real emergency.',
      );
      if (!ok) return;
    }
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

  async function togglePrimaryAlarm() {
    const prop = data?.data?.properties[0];
    if (!prop) {
      window.location.href = '/portal/home';
      return;
    }
    const prev = prop.alarmStatus;
    const next = ['ARMED', 'STAY', 'NIGHT'].includes(prev) ? 'DISARMED' : 'ARMED';
    const ok = window.confirm(
      next === 'DISARMED'
        ? `Disarm ${prop.name}?`
        : `Arm ${prop.name} (Away mode)?`,
    );
    if (!ok) return;
    setArmLoading(true);
    setAlertMsg('');
    try {
      await clientApi.patch(`/client/properties/${prop.id}/alarm`, { status: next });
      setAlertMsg(next === 'DISARMED' ? 'Alarm disarmed.' : 'Alarm armed (Away).');
      undo.show(next === 'DISARMED' ? 'Disarmed' : 'Armed', async () => {
        await clientApi.patch(`/client/properties/${prop.id}/alarm`, { status: prev });
        void reload();
      });
      void reload();
    } catch (e) {
      setAlertMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setArmLoading(false);
    }
  }

  async function callDispatch() {
    const phone =
      contactsPayload?.meta?.dispatchLine?.phone ??
      data?.data?.contacts?.find((c) =>
        `${c.name} ${c.relationship ?? ''}`.toLowerCase().includes('dispatch'),
      )?.phone ??
      '+27110000000';
    const name = contactsPayload?.meta?.dispatchLine?.name ?? '4DS Dispatch';
    setCallBusy(true);
    setAlertMsg('');
    try {
      if (calls) {
        await calls.startCall('DISPATCH_LINE', {
          name,
          phone,
          role: 'DISPATCH',
        });
        setAlertMsg('Connecting to control room…');
      } else {
        window.location.href = `tel:${phone}`;
      }
    } catch (e) {
      setAlertMsg(friendlyErrorMessage(e, 'call'));
      window.location.href = `tel:${phone}`;
    } finally {
      setCallBusy(false);
    }
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

  return (
    <>
      <OpsMyShiftHeader
        title="Right now"
        subtitle={
          hasAlert
            ? `${d.stats.activeIncidents} active · action needed`
            : 'You are covered — panic stays on this screen'
        }
        chips={[
          {
            id: 'all',
            label: 'Everything',
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

      <OpsQuickWork
        hint="Protection controls"
        actions={[
          {
            id: 'panic',
            label: panicLoading ? 'Sending…' : 'Panic',
            primary: true,
            loading: panicLoading,
            disabled: panicLoading || silentLoading || medicalLoading || fireLoading,
            onClick: () => void handlePanic(false),
          },
          {
            id: 'arm',
            label: armLoading
              ? 'Updating…'
              : primaryAlarm && ['ARMED', 'STAY', 'NIGHT'].includes(primaryAlarm.alarmStatus)
                ? 'Disarm'
                : 'Arm',
            loading: armLoading,
            disabled: armLoading || !primaryAlarm,
            onClick: () => void togglePrimaryAlarm(),
          },
          {
            id: 'call',
            label: callBusy ? 'Calling…' : 'Call dispatch',
            loading: callBusy,
            disabled: callBusy,
            onClick: () => void callDispatch(),
          },
          {
            id: 'updates',
            label: 'Updates',
            href: '/portal/updates',
          },
        ]}
      />

      {alertMsg ? (
        <div className="alert alert--success ops-quick-feedback" role="status">
          {alertMsg}
        </div>
      ) : null}

      <div className="portal-hero portal-hero--compact">
        <div>
          <h1>Hello, {d.user.firstName}</h1>
          <p>
            {hasAlert
              ? 'Action needed — review active protection events below.'
              : 'You are covered. Panic and live status stay on this screen.'}
          </p>
        </div>
        {d.stats.unreadNotifications > 0 && (
          <Link href="/portal/updates" className="badge badge--alert badge--link">
            {d.stats.unreadNotifications} updates
          </Link>
        )}
      </div>

      {contactsPayload?.meta?.dispatchLine && (
        <EmergencyDispatchCallCard
          name={contactsPayload.meta.dispatchLine.name}
          phone={contactsPayload.meta.dispatchLine.phone}
        />
      )}

      <section className="panic-section portal-card" aria-label="Emergency controls">
        <button
          type="button"
          className={`panic-button ${panicLoading ? 'panic-button--loading' : ''}`}
          onClick={() => handlePanic(false)}
          disabled={panicLoading || silentLoading || medicalLoading || fireLoading}
        >
          {panicLoading ? (
            <LoadingSpinner label="" size="sm" />
          ) : (
            <span className="panic-button-inner">
              <span className="panic-icon">!</span>
              <span className="panic-label">PANIC</span>
            </span>
          )}
        </button>
        <p className="panic-note">Hold to confirm · Dispatch notified instantly</p>

        {alertMsg && (
          <div className="alert alert--success panic-section__alert" role="status">
            {alertMsg}
          </div>
        )}

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

      {/* Priority: right-now status board */}
      {(filter === 'all' || filter === 'urgent') && (
      <section className="portal-now" aria-label="Right now">
        <div className="portal-now__head">
          <h2>Status board</h2>
          <span className="text-muted">Tap to act</span>
        </div>
        <div className="portal-now__grid">
          <Link
            href="/portal/incidents"
            className={`portal-now__card ${hasAlert ? 'portal-now__card--alert' : 'portal-now__card--ok'}`}
          >
            <span className="portal-now__label">Active incidents</span>
            <strong>{d.stats.activeIncidents}</strong>
            <span>
              {hasAlert
                ? 'Open events — tap for status & updates'
                : 'No open incidents · you are clear'}
            </span>
          </Link>
          <Link
            href="/portal/location"
            className={`portal-now__card ${d.user.trackingEnabled ? 'portal-now__card--ok' : 'portal-now__card--warn'}`}
          >
            <span className="portal-now__label">Live tracking</span>
            <strong>{d.user.trackingEnabled ? 'ON' : 'OFF'}</strong>
            <span>
              {d.user.trackingEnabled
                ? 'GPS sharing active for response'
                : 'Enable tracking so responders can find you'}
            </span>
          </Link>
          <Link
            href="/portal/home"
            className={`portal-now__card ${
              primaryAlarm && ['ARMED', 'STAY', 'NIGHT', 'TRIGGERED'].includes(primaryAlarm.alarmStatus)
                ? primaryAlarm.alarmStatus === 'TRIGGERED'
                  ? 'portal-now__card--alert'
                  : 'portal-now__card--ok'
                : 'portal-now__card--muted'
            }`}
          >
            <span className="portal-now__label">Home alarm</span>
            <strong>
              {primaryAlarm ? primaryAlarm.alarmStatus.replace(/_/g, ' ') : '—'}
            </strong>
            <span>
              {primaryAlarm
                ? primaryAlarm.name
                : access?.home
                  ? 'Add a property to arm'
                  : 'Upgrade for home security'}
            </span>
          </Link>
          <Link href="/portal/family" className="portal-now__card portal-now__card--muted">
            <span className="portal-now__label">Family</span>
            <strong>{d.stats.familyCount}</strong>
            <span>
              {d.family.filter((m) => m.trackingEnabled).length} tracking ·{' '}
              {d.safeZoneCount} safe zones
            </span>
          </Link>
        </div>
      </section>
      )}

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

      <HomeAlarmControl
        properties={d.properties}
        hasAccess={!!access?.home}
        onUpdated={reload}
      />

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
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </>
  );
}

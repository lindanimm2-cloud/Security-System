'use client';

import Link from 'next/link';
import { alarmStatusLabel } from '@/lib/sa-alarm';

type Incident = {
  id: string;
  type: string;
  status: string;
  title: string;
  isSilent: boolean;
  time: string;
};

type Activity = { title: string; detail: string; time: string };

type Property = { id: string; name: string; alarmStatus: string; alarmLinked: boolean };

export type PortalCommandBriefProps = {
  firstName: string;
  address: string | null;
  eventsCount: number;
  alertsCount: number;
  updatesCount: number;
  trackingOn: boolean;
  familyCount: number;
  familyTrackingCount: number;
  safeZoneCount: number;
  homeAccess: boolean;
  cctvReady: boolean;
  property: Property | null;
  incidents: Incident[];
  activity: Activity[];
};

type Posture = 'secure' | 'warning' | 'critical';

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

function militaryNow() {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function incidentLevel(incident: Incident): 'critical' | 'warning' | 'info' {
  const blob = `${incident.type} ${incident.title} ${incident.status} ${incident.isSilent ? 'silent' : ''}`.toUpperCase();
  if (/PANIC|FIRE|MEDICAL|INTRUSION|TRIGGER|CRITICAL/.test(blob)) return 'critical';
  if (/THEFT|ALARM|HIGH|DISPATCH|IN_PROGRESS|OPEN|ACTIVE/.test(blob)) return 'warning';
  return 'info';
}

function siteName(property: Property | null, address: string | null) {
  if (property?.name) return property.name.replace(/^Home — /, '');
  if (address) return address.split(',')[0]?.trim() ?? address;
  return 'Home';
}

function armLine(status: string | undefined) {
  if (!status) return 'Not linked';
  if (status === 'ARMED') return 'Armed · Away';
  if (status === 'STAY') return 'Armed · Stay';
  if (status === 'NIGHT') return 'Armed · Night mode';
  if (status === 'TRIGGERED') return 'Alarm triggered';
  return alarmStatusLabel(status);
}

export function PortalCommandBrief({
  firstName,
  address,
  eventsCount,
  alertsCount,
  updatesCount,
  trackingOn,
  familyCount,
  familyTrackingCount,
  safeZoneCount,
  homeAccess,
  cctvReady,
  property,
  incidents,
  activity,
}: PortalCommandBriefProps) {
  const checkedAt = militaryNow();
  const criticalCount = incidents.filter((i) => incidentLevel(i) === 'critical').length;
  const warningCount = incidents.filter((i) => incidentLevel(i) === 'warning').length;
  const alarmOn = !!property && ['ARMED', 'STAY', 'NIGHT'].includes(property.alarmStatus);
  const alarmTriggered = property?.alarmStatus === 'TRIGGERED';

  let posture: Posture = 'secure';
  if (alarmTriggered || criticalCount > 0) posture = 'critical';
  else if (!alarmOn || warningCount > 0 || !trackingOn) posture = 'warning';

  const needsAttention = criticalCount + warningCount;
  const pulse = [
    { id: 'home', label: 'Home', ok: homeAccess },
    { id: 'gps', label: 'GPS', ok: trackingOn },
    { id: 'cctv', label: 'CCTV', ok: cctvReady },
    { id: 'alarm', label: 'Alarm', ok: alarmOn && !alarmTriggered },
  ];

  return (
    <section className="portal-cmd" aria-label="Protection command">
      <header className={`portal-cmd__head portal-cmd__head--${posture}`}>
        <p className="portal-cmd__hello">{greeting(firstName)}</p>
        <div className="portal-cmd__pulse-hero">
          <p className="portal-cmd__state">
            <span className="portal-cmd__led" aria-hidden />
            {posture === 'critical' ? 'Alert' : posture === 'warning' ? 'Attention' : 'Protected'}
          </p>
          <p className="portal-cmd__copy">
            {posture === 'critical'
              ? alarmTriggered
                ? 'Immediate action required'
                : 'Open incidents need review · your home is still armed'
              : posture === 'warning'
                ? 'Protection is on · something needs a look'
                : 'Everything is secure'}
          </p>
          <p className="portal-cmd__checked">Last checked {checkedAt}</p>
        </div>
        <ul className="portal-cmd__systems" aria-label="System pulse">
          {pulse.map((item) => (
            <li key={item.id} className={item.ok ? 'is-ok' : 'is-off'}>
              <span className="portal-cmd__tick" aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </header>

      <Link
        href={posture === 'secure' && updatesCount > 0 ? '/portal/updates' : '/portal/incidents'}
        className={`portal-cmd__alerts portal-cmd__alerts--${posture === 'secure' && updatesCount > 0 ? 'info' : posture}`}
      >
        {posture === 'critical' ? (
          <>
            <span className="portal-cmd__alerts-kicker">Security alerts</span>
            <strong>
              {criticalCount} critical · {alertsCount} open
            </strong>
            <span>
              {needsAttention} require your attention
            </span>
          </>
        ) : posture === 'warning' ? (
          <>
            <span className="portal-cmd__alerts-kicker">Needs a look</span>
            <strong>{alertsCount} open alerts</strong>
            <span>No life-safety emergency on this property</span>
          </>
        ) : updatesCount > 0 ? (
          <>
            <span className="portal-cmd__alerts-kicker">All clear</span>
            <strong>No critical alerts</strong>
            <span>
              {updatesCount} notification{updatesCount === 1 ? '' : 's'} · Review
            </span>
          </>
        ) : (
          <>
            <span className="portal-cmd__alerts-kicker">All clear</span>
            <strong>No alerts</strong>
            <span>Review history</span>
          </>
        )}
        <span className="portal-cmd__go">Review</span>
      </Link>

      <Link href="/portal/home" className={`portal-cmd__hero${alarmTriggered ? ' is-alert' : alarmOn ? ' is-ok' : ''}`}>
        <p className="portal-cmd__hero-kicker">Home security</p>
        <h2>
          <span className="portal-cmd__led" aria-hidden />
          {alarmTriggered ? 'Alarm triggered' : alarmOn ? 'Home protected' : 'Home security'}
        </h2>
        <p className="portal-cmd__hero-mode">{armLine(property?.alarmStatus)}</p>
        <p className="portal-cmd__hero-place">{siteName(property, address)}</p>
        <p className="portal-cmd__hero-meta">Last checked {checkedAt}</p>
        <span className="portal-cmd__go">Manage security</span>
      </Link>

      <div className="portal-cmd__today">
        <p className="portal-cmd__label">Today</p>
        <div className="portal-cmd__strip">
          <p>
            <strong>{eventsCount}</strong>
            <span>Events</span>
          </p>
          <Link href="/portal/incidents">
            <strong>{alertsCount}</strong>
            <span>Alerts</span>
          </Link>
          <Link href="/portal/updates">
            <strong>{updatesCount}</strong>
            <span>Updates</span>
          </Link>
        </div>
      </div>

      <div className="portal-cmd__quick">
        <p className="portal-cmd__label">Security status</p>
        <div className="portal-cmd__grid">
          <Link href="/portal/location" className={trackingOn ? 'is-ok' : 'is-warn'}>
            <span className="portal-cmd__led" aria-hidden />
            <span className="portal-cmd__q-kicker">Live tracking</span>
            <strong>{trackingOn ? 'On' : 'Off'}</strong>
          </Link>
          <Link href="/portal/family" className={familyCount > 0 ? 'is-ok' : 'is-muted'}>
            <span className="portal-cmd__led" aria-hidden />
            <span className="portal-cmd__q-kicker">Family</span>
            <strong>
              {familyCount} protected
            </strong>
            <em>
              {familyTrackingCount} tracking
            </em>
          </Link>
          <Link
            href="/portal/incidents"
            className={criticalCount > 0 ? 'is-alert' : alertsCount > 0 ? 'is-warn' : 'is-ok'}
          >
            <span className="portal-cmd__led" aria-hidden />
            <span className="portal-cmd__q-kicker">Alerts</span>
            <strong>{alertsCount} open</strong>
          </Link>
          <Link href="/portal/safe-zones" className={safeZoneCount > 0 ? 'is-ok' : 'is-muted'}>
            <span className="portal-cmd__led" aria-hidden />
            <span className="portal-cmd__q-kicker">Safe zones</span>
            <strong>{safeZoneCount} active</strong>
          </Link>
        </div>
      </div>

      {activity.length > 0 ? (
        <div className="portal-cmd__activity">
          <p className="portal-cmd__label">Recent activity</p>
          <ul>
            {activity.slice(0, 4).map((item) => (
              <li key={`${item.title}-${item.time}`}>
                <span className="portal-cmd__led" aria-hidden />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <time>{item.time}</time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

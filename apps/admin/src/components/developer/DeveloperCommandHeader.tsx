'use client';

import Link from 'next/link';
import type { DevCommandDesk, DevSeverity } from '@/lib/developer-desk';

type Props = {
  desk: DevCommandDesk;
  openCount: number;
  criticalCount: number;
  inProgressCount: number;
  resolvedCount: number;
};

function severityTone(severity: DevSeverity): string {
  if (severity === 'P0') return 'dev-cmd-stat--p0';
  if (severity === 'P1') return 'dev-cmd-stat--p1';
  return '';
}

export function DeveloperCommandHeader({
  desk,
  openCount,
  criticalCount,
  inProgressCount,
  resolvedCount,
}: Props) {
  const now = new Date();
  const statusClass =
    desk.systemStatus === 'operational'
      ? 'dev-cmd-status--ok'
      : desk.systemStatus === 'degraded'
        ? 'dev-cmd-status--warn'
        : 'dev-cmd-status--alert';

  return (
    <header className="dev-cmd-header">
      <div className="dev-cmd-header__brand">
        <p className="dev-cmd-header__kicker">Developer desk</p>
        <h1 className="dev-cmd-header__title">{desk.tenantName}</h1>
        <div className="dev-cmd-header__live">
          <span className={`dev-cmd-status ${statusClass}`}>
            <span className="dev-cmd-status__dot" aria-hidden />
            {desk.systemStatus === 'operational' ? 'System operational' : desk.systemMessage}
          </span>
          <time className="dev-cmd-header__clock" dateTime={now.toISOString()}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
        <p className="dev-cmd-header__sub">{desk.systemMessage}</p>
      </div>

      <div className="dev-cmd-stats">
        <div className={`dev-cmd-stat dev-cmd-stat--open ${openCount > 0 ? 'dev-cmd-stat--hot' : ''}`}>
          <span className="dev-cmd-stat__icon" aria-hidden>🔴</span>
          <strong>{openCount}</strong>
          <span>Open</span>
        </div>
        <div className="dev-cmd-stat dev-cmd-stat--progress">
          <span className="dev-cmd-stat__icon" aria-hidden>🟡</span>
          <strong>{inProgressCount}</strong>
          <span>Progress</span>
        </div>
        <div className="dev-cmd-stat dev-cmd-stat--resolved">
          <span className="dev-cmd-stat__icon" aria-hidden>🟢</span>
          <strong>{resolvedCount}</strong>
          <span>Resolved</span>
        </div>
        <div className={`dev-cmd-stat dev-cmd-stat--critical ${criticalCount > 0 ? severityTone('P0') : ''}`}>
          <span className="dev-cmd-stat__icon" aria-hidden>⚡</span>
          <strong>{criticalCount}</strong>
          <span>Critical</span>
        </div>
      </div>

      <div className="dev-cmd-header__prod">
        <span className="dev-cmd-header__version">v{desk.production.version}</span>
        <span className="dev-cmd-header__build">Build {desk.production.build}</span>
        <span className={`dev-cmd-prod-badge dev-cmd-prod-badge--${desk.production.status}`}>
          {desk.production.status === 'healthy' ? 'Production healthy' : 'Production issue'}
        </span>
      </div>

      {openCount > 0 ? (
        <div className="dev-cmd-attention" role="status">
          <strong>🚨 {openCount} issue{openCount === 1 ? '' : 's'} require attention</strong>
          <span className="text-muted">New reports appear instantly from “Send details to developer”.</span>
        </div>
      ) : null}
    </header>
  );
}

export function DeveloperQuickDock() {
  const items = [
    { label: 'Errors', href: '#dev-tickets', icon: '🐛' },
    { label: 'Health', href: '#dev-health', icon: '❤️' },
    { label: 'Deployments', href: '#dev-deploy', icon: '🚀' },
    { label: 'Analytics', href: '#dev-analytics', icon: '📊' },
    { label: 'Chat', href: '#dev-chat', icon: '💬' },
    { label: 'Map', href: '/control-room/map', icon: '🗺' },
    { label: 'Logs', href: '/control-room/device-security', icon: '📋' },
    { label: 'Settings', href: '/control-room/my-settings', icon: '🔑' },
  ];

  return (
    <nav className="dev-cmd-dock" aria-label="Developer quick actions">
      <p className="dev-cmd-dock__label">Quick actions</p>
      <div className="dev-cmd-dock__grid">
        {items.map((item) =>
          item.href.startsWith('#') ? (
            <a key={item.label} href={item.href} className="dev-cmd-dock__btn">
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </a>
          ) : (
            <Link key={item.label} href={item.href} className="dev-cmd-dock__btn">
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

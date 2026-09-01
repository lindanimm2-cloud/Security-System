'use client';

import type { DevErrorAnalytics } from '@/lib/developer-desk';

export function DeveloperErrorAnalytics({ analytics }: { analytics: DevErrorAnalytics }) {
  return (
    <section id="dev-analytics" className="dev-cmd-panel">
      <div className="dev-cmd-panel__head">
        <h2>Errors — last 24 hours</h2>
        <span className="text-muted">Systemic issue detection</span>
      </div>
      <div className="dev-analytics-grid">
        <Metric label="Total errors" value={analytics.total24h} />
        <Metric label="Unique errors" value={analytics.unique24h} />
        <Metric label="Affected users" value={analytics.affectedUsers24h} />
        <Metric label="Critical" value={analytics.critical24h} hot={analytics.critical24h > 0} />
        <Metric label="Resolved" value={analytics.resolved24h} ok />
      </div>
      {analytics.topErrors.length > 0 ? (
        <>
          <h3 className="dev-cmd-panel__subhead">Most common errors</h3>
          <ol className="dev-top-errors">
            {analytics.topErrors.map((e, i) => (
              <li key={e.fingerprint}>
                <span className="dev-top-errors__rank">{i + 1}</span>
                <div>
                  <strong>{e.label}</strong>
                  <span className="text-muted">{e.count} reports</span>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="text-muted">No errors in the last 24 hours.</p>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hot,
  ok,
}: {
  label: string;
  value: number;
  hot?: boolean;
  ok?: boolean;
}) {
  return (
    <div
      className={`dev-analytics-metric ${hot ? 'dev-analytics-metric--hot' : ''} ${ok ? 'dev-analytics-metric--ok' : ''}`}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function DeveloperProfileCard({
  name,
  email,
  access,
}: {
  name: string;
  email: string;
  access: {
    production: boolean;
    staging: boolean;
    database: boolean;
    serverLogs: boolean;
    deployments: boolean;
    monitoring: boolean;
  };
}) {
  const rows = [
    { label: 'Production', on: access.production },
    { label: 'Staging', on: access.staging },
    { label: 'Database', on: access.database, restricted: !access.database },
    { label: 'Server logs', on: access.serverLogs },
    { label: 'Deployments', on: access.deployments },
    { label: 'Monitoring', on: access.monitoring },
  ];

  return (
    <section className="dev-cmd-panel dev-profile-card">
      <div className="dev-cmd-panel__head">
        <h2>4DS developer</h2>
        <span className="text-muted">Permission-controlled access</span>
      </div>
      <div className="dev-profile-card__who">
        <strong>{name}</strong>
        <span className="text-muted">{email}</span>
        <span className="dev-profile-card__badge">● Production access</span>
      </div>
      <ul className="dev-profile-access">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span className={row.restricted ? 'dev-profile-access--lock' : row.on ? 'dev-profile-access--on' : ''}>
              {row.restricted ? '🔒 Restricted' : row.on ? '● Active' : '○ Off'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

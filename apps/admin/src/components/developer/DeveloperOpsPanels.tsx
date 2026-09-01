'use client';

import Link from 'next/link';
import type { DevDeployment, DevServiceHealth } from '@/lib/developer-desk';

export function DeveloperPlatformHealth({ services }: { services: DevServiceHealth[] }) {
  return (
    <section id="dev-health" className="dev-cmd-panel">
      <div className="dev-cmd-panel__head">
        <h2>Platform health</h2>
        <span className="text-muted">Live service indicators</span>
      </div>
      <ul className="dev-health-list">
        {services.map((svc) => (
          <li key={svc.id} className={`dev-health-item dev-health-item--${svc.status}`}>
            <span className="dev-health-item__dot" aria-hidden />
            <div className="dev-health-item__body">
              <strong>{svc.label}</strong>
              <span>{svc.detail ?? statusLabel(svc.status)}</span>
            </div>
            {svc.href ? (
              <Link href={svc.href} className="dev-health-item__link link-sm">
                Diagnostics
              </Link>
            ) : (
              <span className="dev-health-item__status">{statusLabel(svc.status)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusLabel(status: DevServiceHealth['status']) {
  if (status === 'operational') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  return 'Down';
}

export function DeveloperDeploymentPanel({
  production,
  recent,
}: {
  production: DevDeployment;
  recent: DevDeployment[];
}) {
  return (
    <section id="dev-deploy" className="dev-cmd-panel">
      <div className="dev-cmd-panel__head">
        <h2>Current production</h2>
        <span className="text-muted">Deployment tracking</span>
      </div>
      <div className="dev-deploy-current">
        <dl className="dev-deploy-dl">
          <div>
            <dt>Version</dt>
            <dd>v{production.version}</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{production.build}</dd>
          </div>
          <div>
            <dt>Deployed</dt>
            <dd>{new Date(production.deployedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={`dev-deploy-status dev-deploy-status--${production.status}`}>
              {production.status === 'healthy' ? '🟢 Healthy' : production.status}
            </dd>
          </div>
        </dl>
      </div>
      {recent.length > 0 ? (
        <>
          <h3 className="dev-cmd-panel__subhead">Recent deployments</h3>
          <ul className="dev-deploy-history">
            {recent.map((d) => (
              <li key={`${d.version}-${d.build}`} className="dev-deploy-history__item">
                <strong>v{d.version}</strong>
                <span className="text-muted">Build {d.build}</span>
                <span className={`dev-deploy-badge dev-deploy-badge--${d.environment}`}>
                  {d.environment}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

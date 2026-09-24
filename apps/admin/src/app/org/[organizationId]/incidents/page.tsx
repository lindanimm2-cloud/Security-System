'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { getOrgSession, listIncidents } from '@/lib/org';

export default function OrgIncidentsPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-session-changed', refresh);
    return () => window.removeEventListener('4ds-org-session-changed', refresh);
  }, []);

  const siteId = getOrgSession()?.activeSiteId ?? 'all';
  const incidents = useMemo(
    () => listIncidents(organizationId, siteId),
    [organizationId, siteId, tick],
  );

  return (
    <div className="org-page">
      <OrgPageHeader
        title="Incident center"
        subtitle="Organization-wide incidents with severity, location, and response status."
      />
      <div className="org-incident-list org-incident-list--page">
        {incidents.map((incident) => (
          <article
            key={incident.id}
            className={`org-incident-card org-incident-card--${incident.severity}`}
          >
            <div className="org-incident-card__top">
              <span className="org-incident-card__type">{incident.type}</span>
              <span className="org-incident-card__age">{incident.ageLabel}</span>
            </div>
            <strong>{incident.subject}</strong>
            <p>
              {incident.siteName} · {incident.location}
            </p>
            <div className="org-incident-card__foot">
              <span className="org-pill">{incident.status.replace(/_/g, ' ')}</span>
              <span className="org-pill org-pill--severity">{incident.severity}</span>
              <span className="org-pill">{incident.id}</span>
            </div>
            <ol className="org-timeline">
              <li>
                <strong>{incident.ageLabel}</strong> · Incident created
              </li>
              <li>
                <strong>Control room</strong> · Notified
              </li>
              <li>
                <strong>Status</strong> · {incident.status.replace(/_/g, ' ')}
              </li>
            </ol>
          </article>
        ))}
        {!incidents.length ? <p className="org-empty">No incidents for this site filter.</p> : null}
      </div>
    </div>
  );
}

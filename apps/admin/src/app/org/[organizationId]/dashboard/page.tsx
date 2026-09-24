'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OrgSocDashboard } from '@/components/org/OrgSocDashboard';
import {
  getDashboardKpis,
  getOrganization,
  getOrgSession,
  listIncidents,
} from '@/lib/org';

export default function OrgDashboardPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-session-changed', refresh);
    window.addEventListener('4ds-org-directory-changed', refresh);
    return () => {
      window.removeEventListener('4ds-org-session-changed', refresh);
      window.removeEventListener('4ds-org-directory-changed', refresh);
    };
  }, []);

  const session = getOrgSession();
  const siteId = session?.activeSiteId || 'all';
  const org = useMemo(() => getOrganization(organizationId), [organizationId, tick]);
  const kpis = useMemo(
    () => getDashboardKpis(organizationId, siteId),
    [organizationId, siteId, tick],
  );
  const incidents = useMemo(
    () =>
      listIncidents(organizationId, siteId).filter(
        (incident) => incident.status !== 'RESOLVED' && incident.status !== 'CLOSED',
      ),
    [organizationId, siteId, tick],
  );

  if (!org) return null;

  return (
    <div className="org-page org-page--console">
      <header className="org-page-header">
        <div>
          <h1>Security operations</h1>
          <p>
            {org.name} · {org.typeLabel} · is anything wrong, where, and can you see it
          </p>
        </div>
        <div className="org-page-header__actions">
          <Link href={`/org/${organizationId}/emergencies`} className="org-btn org-btn--danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
            </svg>
            Emergency controls
          </Link>
        </div>
      </header>
      <OrgSocDashboard
        organizationId={organizationId}
        siteId={siteId}
        kpis={kpis}
        incidents={incidents}
      />
    </div>
  );
}

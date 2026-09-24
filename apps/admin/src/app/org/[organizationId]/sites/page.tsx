'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { listSites } from '@/lib/org';

export default function OrgSitesPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const sites = useMemo(() => listSites(organizationId), [organizationId]);

  return (
    <div className="org-page">
      <OrgPageHeader
        title="Sites & buildings"
        subtitle="Multi-site portfolio — switch the site filter in the sidebar to scope all ops views."
      />
      <div className="org-table-wrap">
        <table className="org-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Type</th>
              <th>Address</th>
              <th>Status</th>
              <th>People</th>
              <th>Cameras</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id}>
                <td>{site.name}</td>
                <td>{site.siteType}</td>
                <td>{site.address}</td>
                <td>
                  <span className={`org-status-chip org-status-chip--${site.status.toLowerCase()}`}>
                    {site.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>{site.peopleOnSite}</td>
                <td>
                  {site.camerasOnline}/{site.camerasTotal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

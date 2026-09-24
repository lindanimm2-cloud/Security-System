'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { listPeople } from '@/lib/org';

export default function OrgPeoplePage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const people = useMemo(() => listPeople(organizationId), [organizationId]);

  return (
    <div className="org-page">
      <OrgPageHeader
        title="People & roles"
        subtitle="Organization members, on-site staff, and visitors in the current portfolio."
      />
      <div className="org-table-wrap">
        <table className="org-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Site</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.role}</td>
                <td>{person.siteName}</td>
                <td>{person.status.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

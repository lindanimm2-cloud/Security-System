'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Visitors"
      subtitle="Visitor invitations, check-in, and host authorization."
      bullets={['Invite visitor', 'Active visitors', 'Host approvals']}
    />
  );
}

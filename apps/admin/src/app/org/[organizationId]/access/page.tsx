'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Access control"
      subtitle="Doors, credentials, and access events for organization sites."
      bullets={['Door status', 'Credential audits', 'Forced-door alerts']}
    />
  );
}

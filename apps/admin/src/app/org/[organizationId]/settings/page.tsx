'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Organization settings"
      subtitle="Profile, integrations, security policy, and audit preferences."
      bullets={['Organization profile', 'Integrations', 'Audit retention']}
    />
  );
}

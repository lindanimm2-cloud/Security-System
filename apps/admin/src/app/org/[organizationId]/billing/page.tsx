'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Billing"
      subtitle="Organization subscription, site add-ons, and invoices."
      bullets={['Plan summary', 'Site licenses', 'Invoices']}
    />
  );
}

'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Deliveries"
      subtitle="Loading bays, couriers, and contractor delivery windows."
      bullets={['Bay status', 'Scheduled deliveries', 'Contractor access']}
    />
  );
}

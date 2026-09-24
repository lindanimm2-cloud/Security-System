'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Tenants"
      subtitle="Mall and estate tenant directory with security contacts."
      bullets={['Store / unit directory', 'Security contacts', 'Open incidents per tenant']}
    />
  );
}

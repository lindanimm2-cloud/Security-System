'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Reports"
      subtitle="Operational analytics and exportable security reports."
      bullets={['Incident trends', 'Response times', 'Site comparisons']}
    />
  );
}

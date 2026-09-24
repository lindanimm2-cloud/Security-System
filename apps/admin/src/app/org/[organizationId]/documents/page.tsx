'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Documents"
      subtitle="SOPs, evacuation plans, and compliance files."
      bullets={['Emergency plans', 'SOPs', 'Certificates']}
    />
  );
}

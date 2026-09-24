'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Live map"
      subtitle="Interactive site map with buildings, gates, CCTV zones, and active incidents."
      bullets={['Building locations', 'Gates and entrances', 'CCTV zones', 'Security posts', 'Emergency points']}
    />
  );
}

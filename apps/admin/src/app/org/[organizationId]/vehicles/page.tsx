'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Vehicles"
      subtitle="Authorized vehicles, parking, and delivery fleet monitoring."
      bullets={['Authorized list', 'On-site count', 'Watchlist alerts']}
    />
  );
}

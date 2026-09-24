'use client';

import { OrgPlaceholderPage } from '@/components/org/OrgPageChrome';

export default function Page() {
  return (
    <OrgPlaceholderPage
      title="Officers & posts"
      subtitle="Security officers, posts, and patrol coverage across sites."
      bullets={['On-duty roster', 'Post assignments', 'Patrol routes']}
    />
  );
}

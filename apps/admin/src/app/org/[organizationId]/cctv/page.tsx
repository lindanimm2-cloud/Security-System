'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { OrgCctvWorkspace } from '@/components/org/OrgCctvWorkspace';

export default function Page() {
  const params = useParams();
  const organizationId = String(params.organizationId);

  return (
    <div className="org-page">
      <Suspense fallback={<p className="org-empty">Loading cameras…</p>}>
        <OrgCctvWorkspace organizationId={organizationId} />
      </Suspense>
    </div>
  );
}

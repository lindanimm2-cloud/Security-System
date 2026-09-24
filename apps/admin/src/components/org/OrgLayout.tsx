'use client';

import { OrgAuthGuard } from '@/components/org/OrgAuthGuard';
import { OrgShell } from '@/components/org/OrgShell';

export function OrgLayout({
  organizationId,
  children,
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  return (
    <OrgAuthGuard organizationId={organizationId}>
      {(session) => <OrgShell session={session}>{children}</OrgShell>}
    </OrgAuthGuard>
  );
}

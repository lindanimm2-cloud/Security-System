'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { ControlRoomShell } from '@/components/ControlRoomShell';
import { CrmEyeLens } from '@/components/control-room/CrmEyeLens';
import { PriorityAlertProvider } from '@/components/control-room/PriorityAlertProvider';
import { PriorityAlertUI } from '@/components/control-room/PriorityAlertUI';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';

export function ControlRoomLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AuthGuard portal="admin" loginPath="/login">
      {(session) => (
        <PriorityAlertProvider>
          <ControlRoomShell session={session} title={title}>
            {children}
          </ControlRoomShell>
          <SectionErrorBoundary label="Priority alerts">
            <PriorityAlertUI />
          </SectionErrorBoundary>
          <SectionErrorBoundary label="Command dock">
            <CrmEyeLens />
          </SectionErrorBoundary>
        </PriorityAlertProvider>
      )}
    </AuthGuard>
  );
}

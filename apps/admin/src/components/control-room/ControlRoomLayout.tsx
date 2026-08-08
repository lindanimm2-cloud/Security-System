'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { ControlRoomShell } from '@/components/ControlRoomShell';
import { CrmEyeLens } from '@/components/control-room/CrmEyeLens';
import { PriorityAlertProvider } from '@/components/control-room/PriorityAlertProvider';
import { PriorityAlertUI } from '@/components/control-room/PriorityAlertUI';

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
          <PriorityAlertUI />
          <CrmEyeLens />
        </PriorityAlertProvider>
      )}
    </AuthGuard>
  );
}

'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ControlRoomShell } from '@/components/ControlRoomShell';
import { IncidentChatToastStack } from '@/components/control-room/IncidentChatToast';
import { PriorityAlertProvider } from '@/components/control-room/PriorityAlertProvider';
import { PriorityAlertUI } from '@/components/control-room/PriorityAlertUI';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlarmVideoPopup } from '@/components/vms/AlarmVideoPopup';
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
          <Suspense fallback={<LoadingSpinner label="Opening control room..." fullScreen />}>
            <ControlRoomShell session={session} title={title}>
              {children}
            </ControlRoomShell>
          </Suspense>
          <SectionErrorBoundary label="Priority alerts">
            <PriorityAlertUI />
          </SectionErrorBoundary>
          <SectionErrorBoundary label="Camera alarm popup">
            <AlarmVideoPopup />
          </SectionErrorBoundary>
          <SectionErrorBoundary label="Incident chat toasts">
            <IncidentChatToastStack />
          </SectionErrorBoundary>
        </PriorityAlertProvider>
      )}
    </AuthGuard>
  );
}

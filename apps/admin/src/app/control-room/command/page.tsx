'use client';

import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { CommandHubPanels, type PsimTab } from '@/components/psim/CommandHubPanels';
import { useSearchParams } from 'next/navigation';

const VALID_TABS = new Set<PsimTab>([
  'overview',
  'alarms',
  'access',
  'patrols',
  'compliance',
  'intelligence',
  'rules',
  'integrations',
  'events',
]);

export default function CommandHubPage() {
  const params = useSearchParams();
  const tabParam = (params.get('tab') ?? 'overview') as PsimTab;
  const initialTab = VALID_TABS.has(tabParam) ? tabParam : 'overview';

  return (
    <ControlRoomLayout title="Command Hub">
      <div className="page-content page-section">
        <header className="page-section__head">
          <div>
            <h1 className="page-section__title">Security Command Hub</h1>
            <p className="text-muted page-section__lede">
              PSIM — alarm ARC, event bus, access, patrols, compliance, and dispatch automation.
            </p>
          </div>
        </header>
        <CommandHubPanels initialTab={initialTab} />
      </div>
    </ControlRoomLayout>
  );
}

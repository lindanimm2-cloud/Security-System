'use client';

import { useMemo } from 'react';
import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function SupervisorSettingsPage() {
  return (
    <SupervisorLayout title="Settings">
      <SupervisorSettingsContent />
    </SupervisorLayout>
  );
}

function SupervisorSettingsContent() {
  const session = getSession('admin');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'My profile', icon: 'profile', href: '/supervisor/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
        ],
      },
      {
        title: 'Supervision',
        items: [
          { id: 'map', label: 'Officer map', icon: 'live-map', href: '/supervisor/map' },
          { id: 'shifts', label: 'Shifts', icon: 'officers', href: '/supervisor/shifts' },
          { id: 'patrol', label: 'Patrol', icon: 'safe-zones', href: '/supervisor/patrol' },
          { id: 'performance', label: 'Performance', icon: 'analytics', href: '/supervisor/performance' },
          { id: 'cr', label: 'Control room', icon: 'dispatch', href: '/control-room' },
          { id: 'org', label: 'Organisation settings', icon: 'account', href: '/control-room/settings', hint: 'Ops policies & alerts' },
        ],
      },
    ],
    [setAppearanceOpen, setPasswordOpen],
  );

  if (!user) {
    return <p className="text-muted">Sign in to manage settings.</p>;
  }

  return (
    <>
      <SettingsHub
        backHref="/supervisor"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Supervisor',
          orgLabel: user.tenant?.name ?? '4DS Solutions',
          profileHref: '/supervisor/profile',
        }}
        sections={sections}
        footer={
          <button
            type="button"
            className="settings-hub__signout"
            onClick={() => {
              clearSession('admin');
              window.location.href = '/login';
            }}
          >
            Sign out
          </button>
        }
      />
      {dialogs}
    </>
  );
}

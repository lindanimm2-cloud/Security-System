'use client';

import { useMemo } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function ControlRoomMySettingsPage() {
  return (
    <ControlRoomLayout>
      <ControlRoomMySettingsContent />
    </ControlRoomLayout>
  );
}

function ControlRoomMySettingsContent() {
  const session = getSession('admin');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'Profile details', icon: 'profile', href: '/control-room/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
          { id: 'chat', label: 'Internal chat', icon: 'chat', href: '/control-room/chat' },
          { id: 'comms', label: 'Communications', icon: 'communications', href: '/control-room/communications' },
        ],
      },
      {
        title: 'Organisation',
        items: [
          {
            id: 'ops',
            label: 'Ops settings',
            icon: 'account',
            href: '/control-room/settings',
            hint: 'Alerts, roles, integrations',
          },
          { id: 'teams', label: 'Teams & users', icon: 'teams', href: '/control-room/teams' },
          { id: 'devices', label: 'Device security', icon: 'devices', href: '/control-room/device-security' },
          { id: 'analytics', label: 'Analytics', icon: 'analytics', href: '/control-room/analytics' },
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
        backHref="/control-room"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Control room',
          orgLabel: user.tenant?.name ?? '4DS Solutions',
          profileHref: '/control-room/profile',
        }}
        sections={sections}
        footer={
          <button
            type="button"
            className="settings-hub__signout"
            onClick={() => {
              clearSession('admin');
              window.location.href = '/control-room/login';
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

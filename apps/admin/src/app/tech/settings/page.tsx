'use client';

import { useMemo } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function TechSettingsPage() {
  return (
    <TechLayout title="Settings">
      <TechSettingsContent />
    </TechLayout>
  );
}

function TechSettingsContent() {
  const session = getSession('technician');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'My profile', icon: 'profile', href: '/tech/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
          { id: 'chat', label: 'Team chat', icon: 'team-chat', href: '/tech/chat' },
        ],
      },
      {
        title: 'Field work',
        items: [
          { id: 'jobs', label: 'Install jobs', icon: 'install', href: '/tech/jobs' },
          { id: 'map', label: 'Job map', icon: 'live-map', href: '/tech/map' },
          { id: 'inventory', label: 'Inventory', icon: 'store', href: '/tech/inventory' },
          { id: 'cameras', label: 'Cameras', icon: 'surveillance', href: '/tech/cameras' },
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
        backHref="/tech"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Technician',
          orgLabel: user.tenant?.name ?? '4DS Install',
          profileHref: '/tech/profile',
        }}
        sections={sections}
        footer={
          <button
            type="button"
            className="settings-hub__signout"
            onClick={() => {
              clearSession('technician');
              window.location.href = '/tech/login';
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

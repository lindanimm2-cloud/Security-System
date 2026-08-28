'use client';

import { useMemo } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function OfficerSettingsPage() {
  return (
    <OfficerLayout title="Settings">
      <OfficerSettingsContent />
    </OfficerLayout>
  );
}

function OfficerSettingsContent() {
  const session = getSession('officer');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'Profile & shift', icon: 'profile', href: '/officer/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
          { id: 'calls', label: 'Call settings', icon: 'calls', href: '/officer/calls' },
          { id: 'dispatch', label: 'Dispatch chat', icon: 'dispatch-chat', href: '/officer/messages' },
        ],
      },
      {
        title: 'Field',
        items: [
          { id: 'jobs', label: 'Job queue', icon: 'queue', href: '/officer/queue' },
          { id: 'map', label: 'Navigation map', icon: 'navigation', href: '/officer/map' },
          { id: 'evidence', label: 'Evidence capture', icon: 'evidence', href: '/officer/record' },
          { id: 'report', label: 'Incident report', icon: 'report', href: '/officer/report' },
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
        backHref="/officer"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Officer',
          orgLabel: user.tenant?.name ?? '4DS Response',
          profileHref: '/officer/profile',
        }}
        sections={sections}
        footer={
          <button
            type="button"
            className="settings-hub__signout"
            onClick={() => {
              clearSession('officer');
              window.location.href = '/officer/login';
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

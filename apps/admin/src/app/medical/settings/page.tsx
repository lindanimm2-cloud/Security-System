'use client';

import { useMemo } from 'react';
import { MedicalLayout } from '@/components/medical/MedicalLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function MedicalSettingsPage() {
  return (
    <MedicalLayout title="Settings">
      <MedicalSettingsContent />
    </MedicalLayout>
  );
}

function MedicalSettingsContent() {
  const session = getSession('admin');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'My profile', icon: 'profile', href: '/medical/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
          { id: 'calls', label: 'Call control room', icon: 'calls', href: '/medical' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { id: 'queue', label: 'Medical queue', icon: 'emergency', href: '/medical' },
          { id: 'crew', label: 'Crew board', icon: 'fleet', href: '/medical/crew' },
          { id: 'map', label: 'Ops map', icon: 'live-map', href: '/medical/map' },
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
        backHref="/medical"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Medical',
          orgLabel: user.tenant?.name ?? '4DS Medical',
          profileHref: '/medical/profile',
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

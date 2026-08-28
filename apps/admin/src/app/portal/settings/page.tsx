'use client';

import { useMemo } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';

export default function PortalSettingsPage() {
  return (
    <PortalLayout>
      <PortalSettingsContent />
    </PortalLayout>
  );
}

function PortalSettingsContent() {
  const session = getSession('client');
  const user = session?.user;
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'Profile details', icon: 'profile', href: '/portal/profile' },
          { id: 'password', label: 'Password', icon: 'key', onClick: () => setPasswordOpen(true) },
          { id: 'notifications', label: 'Notifications', icon: 'updates', href: '/portal/updates' },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system', onClick: () => setAppearanceOpen(true) },
          { id: 'calls', label: 'Call settings', icon: 'calls', href: '/portal/chat', hint: 'Control room line' },
        ],
      },
      {
        title: 'Protection',
        items: [
          { id: 'devices', label: 'Trusted devices', icon: 'devices', href: '/portal/security/devices' },
          { id: 'lockdown', label: 'Account protection', icon: 'lock', href: '/portal/security/lockdown' },
          { id: 'activity', label: 'Security activity', icon: 'history', href: '/portal/security/activity' },
          { id: 'permissions', label: 'App permissions', icon: 'officers', href: '/portal/security/permissions' },
          { id: 'contacts', label: 'Emergency contacts', icon: 'contacts', href: '/portal/contacts' },
        ],
      },
      {
        title: 'Plan',
        items: [
          { id: 'subscription', label: 'Subscription', icon: 'subscription', href: '/portal/subscription' },
          { id: 'billing', label: 'Billing & documents', icon: 'documents', href: '/portal/billing' },
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
        backHref="/portal"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Client',
          orgLabel: user.tenant?.name ?? '4DS Solutions',
          profileHref: '/portal/profile',
        }}
        sections={sections}
        footer={
          <button
            type="button"
            className="settings-hub__signout"
            onClick={() => {
              clearSession('client');
              window.location.href = '/portal/login';
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

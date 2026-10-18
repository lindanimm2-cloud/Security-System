'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import {
  SettingsHub,
  useSettingsDialogs,
  type SettingsSection,
} from '@/components/settings/SettingsHub';
import { useTheme } from '@/components/ThemeProvider';
import { clearSession, getSession } from '@/lib/auth';
import { roleDisplayLabel } from '@/lib/role-labels';
import {
  THEME_PREFERENCE_HINTS,
  THEME_PREFERENCE_LABELS,
  type ThemePreference,
} from '@/lib/theme';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system', 'schedule'];

const OPS_MODULES = [
  { id: 'alerts', label: 'Alerts & escalation', hint: 'Panic, alarm routes, ack rules', href: '/control-room/settings' },
  { id: 'roles', label: 'Users & roles', hint: 'Access matrix and role guides', href: '/control-room/teams' },
  { id: 'integrations', label: 'Integrations', hint: 'CCTV, alarms, radio, webhooks', href: '/control-room/settings' },
  { id: 'security', label: 'Security', hint: 'Passkeys, sessions, device policy', href: '/control-room/device-security' },
] as const;

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
  const { theme, preference, setPreference } = useTheme();
  const { setAppearanceOpen, setPasswordOpen, dialogs } = useSettingsDialogs();
  const [activeId, setActiveId] = useState('ops');

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        title: 'Account',
        items: [
          { id: 'profile', label: 'Profile details', icon: 'profile', href: '/control-room/profile' },
          { id: 'password', label: 'Password', icon: 'key' },
          { id: 'appearance', label: 'Appearance', icon: 'personal', hint: 'Light, dark, or system' },
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
    [],
  );

  if (!user) {
    return <p className="text-muted">Sign in to manage settings.</p>;
  }

  const detail = (
    <SettingsHubDetail
      activeId={activeId}
      theme={theme}
      preference={preference}
      setPreference={setPreference}
      onOpenAppearance={() => setAppearanceOpen(true)}
      onOpenPassword={() => setPasswordOpen(true)}
      profileName={`${user.firstName} ${user.lastName}`.trim()}
      roleLabel={roleDisplayLabel(user.role) || 'Control room'}
      orgLabel={user.tenant?.name ?? '4DS Solutions'}
    />
  );

  return (
    <>
      <SettingsHub
        desk
        activeId={activeId}
        onActiveChange={setActiveId}
        backHref="/control-room"
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          roleLabel: roleDisplayLabel(user.role) || 'Control room',
          orgLabel: user.tenant?.name ?? '4DS Solutions',
          profileHref: '/control-room/profile',
        }}
        sections={sections}
        detail={detail}
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

function SettingsHubDetail({
  activeId,
  theme,
  preference,
  setPreference,
  onOpenAppearance,
  onOpenPassword,
  profileName,
  roleLabel,
  orgLabel,
}: {
  activeId: string;
  theme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  onOpenAppearance: () => void;
  onOpenPassword: () => void;
  profileName: string;
  roleLabel: string;
  orgLabel: string;
}) {
  if (activeId === 'appearance') {
    return (
      <section className="settings-hub-panel">
        <div className="settings-hub-panel__head">
          <div>
            <p className="settings-hub-panel__eyebrow">Appearance</p>
            <h2>Theme &amp; operator display</h2>
            <p className="text-muted">
              Keep the platform readable for control room staff across day and night shifts.
            </p>
          </div>
          <span className="badge">Current: {theme === 'dark' ? 'Dark' : 'Light'}</span>
        </div>

        <div className="settings-theme-grid" role="radiogroup" aria-label="Theme preference">
          {THEME_OPTIONS.map((option) => {
            const selected = preference === option;
            const label = THEME_PREFERENCE_LABELS[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label} theme. ${THEME_PREFERENCE_HINTS[option]}${selected ? ' Selected.' : ''}`}
                title={THEME_PREFERENCE_HINTS[option]}
                className={`settings-theme-btn ${selected ? 'is-active' : ''}`}
                onClick={() => setPreference(option)}
              >
                <span className="settings-theme-btn__face">{label}</span>
                <span className="settings-theme-btn__lamp" aria-hidden />
              </button>
            );
          })}
        </div>

        <div className="settings-hub-panel__actions">
          <button type="button" className="btn-secondary btn-sm" onClick={onOpenAppearance}>
            Advanced appearance
          </button>
        </div>
      </section>
    );
  }

  if (activeId === 'ops') {
    return (
      <>
        <section className="settings-hub-panel">
          <div className="settings-hub-panel__head">
            <div>
              <p className="settings-hub-panel__eyebrow">Organisation</p>
              <h2>Ops settings</h2>
              <p className="text-muted">
                Configure alerts, roles, integrations, and control-room policy from one desk.
              </p>
            </div>
            <Link href="/control-room/settings" className="btn-primary btn-sm">
              Open ops settings
            </Link>
          </div>

          <div className="settings-hub-kpis" aria-label="Ops overview">
            <div className="settings-hub-kpi">
              <span>System</span>
              <strong>Operational</strong>
            </div>
            <div className="settings-hub-kpi">
              <span>Modules</span>
              <strong>{OPS_MODULES.length}</strong>
            </div>
            <div className="settings-hub-kpi">
              <span>Desk</span>
              <strong>Live</strong>
            </div>
          </div>
        </section>

        <div className="settings-hub-tiles">
          {OPS_MODULES.map((mod) => (
            <Link key={mod.id} href={mod.href} className="settings-hub-tile">
              <strong>{mod.label}</strong>
              <em>{mod.hint}</em>
              <span aria-hidden>›</span>
            </Link>
          ))}
        </div>
      </>
    );
  }

  if (activeId === 'profile') {
    return (
      <section className="settings-hub-panel">
        <div className="settings-hub-panel__head">
          <div>
            <p className="settings-hub-panel__eyebrow">Account</p>
            <h2>Profile details</h2>
            <p className="text-muted">Name, role, and organisation identity used across the ops desk.</p>
          </div>
          <Link href="/control-room/profile" className="btn-primary btn-sm">
            Edit profile
          </Link>
        </div>
        <dl className="settings-hub-kv">
          <div>
            <dt>Name</dt>
            <dd>{profileName}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{roleLabel}</dd>
          </div>
          <div>
            <dt>Organisation</dt>
            <dd>{orgLabel}</dd>
          </div>
        </dl>
      </section>
    );
  }

  if (activeId === 'password') {
    return (
      <section className="settings-hub-panel">
        <div className="settings-hub-panel__head">
          <div>
            <p className="settings-hub-panel__eyebrow">Account</p>
            <h2>Password</h2>
            <p className="text-muted">
              Password changes are managed by your organisation admin or control room.
            </p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onOpenPassword}>
            View guidance
          </button>
        </div>
        <div className="settings-hub-note">
          Contact your organisation admin if you need a reset. Passkeys can be managed from your profile when
          enabled.
        </div>
      </section>
    );
  }

  const catalog: Record<
    string,
    { eyebrow: string; title: string; body: string; href: string; cta: string; points: string[] }
  > = {
    chat: {
      eyebrow: 'Account',
      title: 'Internal chat',
      body: 'Operator messaging for handoffs, site notes, and desk coordination.',
      href: '/control-room/chat',
      cta: 'Open chat',
      points: ['Incident threads', 'Desk handoffs', 'Quiet hours aware'],
    },
    comms: {
      eyebrow: 'Account',
      title: 'Communications',
      body: 'Radio, call, and notification channels used by the control room.',
      href: '/control-room/communications',
      cta: 'Open communications',
      points: ['Voice & radio', 'Outbound alerts', 'Channel health'],
    },
    teams: {
      eyebrow: 'Organisation',
      title: 'Teams & users',
      body: 'Manage operators, officers, and role assignments for this tenant.',
      href: '/control-room/teams',
      cta: 'Open teams',
      points: ['User directory', 'Role guides', 'Invite & access'],
    },
    devices: {
      eyebrow: 'Organisation',
      title: 'Device security',
      body: 'Track enrolled devices, wipe policy, and field hardware posture.',
      href: '/control-room/device-security',
      cta: 'Open device security',
      points: ['Enrolment', 'Remote actions', 'Compliance'],
    },
    analytics: {
      eyebrow: 'Organisation',
      title: 'Analytics',
      body: 'Response times, incident volume, and desk performance trends.',
      href: '/control-room/analytics',
      cta: 'Open analytics',
      points: ['SLA trends', 'Incident volume', 'Officer utilisation'],
    },
  };

  const item = catalog[activeId];
  if (!item) {
    return (
      <section className="settings-hub-panel">
        <div className="settings-hub-panel__head">
          <div>
            <p className="settings-hub-panel__eyebrow">Settings</p>
            <h2>Choose a module</h2>
            <p className="text-muted">Select an item on the left to configure account or organisation preferences.</p>
          </div>
        </div>
        <div className="settings-hub-empty-visual" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section className="settings-hub-panel">
      <div className="settings-hub-panel__head">
        <div>
          <p className="settings-hub-panel__eyebrow">{item.eyebrow}</p>
          <h2>{item.title}</h2>
          <p className="text-muted">{item.body}</p>
        </div>
        <Link href={item.href} className="btn-primary btn-sm">
          {item.cta}
        </Link>
      </div>
      <ul className="settings-hub-points">
        {item.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

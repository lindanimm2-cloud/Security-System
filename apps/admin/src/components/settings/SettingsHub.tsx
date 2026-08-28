'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ThemeSettings } from '@/components/ThemeSettings';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { NavIcon, type NavIconName } from '@/components/nav/NavIcon';

export type SettingsRow = {
  id: string;
  label: string;
  icon: NavIconName;
  href?: string;
  hint?: string;
  onClick?: () => void;
  trailing?: ReactNode;
};

export type SettingsSection = {
  title: string;
  items: SettingsRow[];
};

export type SettingsProfile = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  orgLabel?: string;
  avatarUrl?: string | null;
  profileHref?: string;
};

export function SettingsHub({
  title = 'Settings',
  backHref,
  backLabel = 'Back',
  profile,
  sections,
  footer,
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
  profile: SettingsProfile;
  sections: SettingsSection[];
  footer?: ReactNode;
}) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || 'Account';
  const meta = [profile.roleLabel, profile.orgLabel].filter(Boolean).join(' · ');

  return (
    <div className="page-content settings-hub">
      <header className="settings-hub__top">
        {backHref ? (
          <Link href={backHref} className="settings-hub__back" aria-label={backLabel}>
            <span aria-hidden>‹</span>
          </Link>
        ) : (
          <span className="settings-hub__back settings-hub__back--spacer" aria-hidden />
        )}
        <div className="settings-hub__heading">
          <h1>{title}</h1>
          <p className="settings-hub__lede">Account, appearance, and workspace preferences.</p>
        </div>
      </header>

      <div className="settings-hub__layout">
        <aside className="settings-hub__aside">
          <Link
            href={profile.profileHref ?? '#'}
            className="settings-hub__profile"
            aria-label={`Open profile for ${fullName}`}
          >
            <UserAvatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              avatarUrl={profile.avatarUrl}
              size="lg"
            />
            <div className="settings-hub__profile-text">
              <strong>{fullName}</strong>
              <span>{meta}</span>
              <em className="settings-hub__profile-go">View profile</em>
            </div>
            <span className="settings-hub__chevron" aria-hidden>
              ›
            </span>
          </Link>

          {footer ? <div className="settings-hub__footer">{footer}</div> : null}
        </aside>

        <div className="settings-hub__sections">
          {sections.map((section) => (
            <section key={section.title} className="settings-hub__section">
              <h2>{section.title}</h2>
              <ul className="settings-hub__list">
                {section.items.map((item) => {
                  const inner = (
                    <>
                      <span className="settings-hub__icon" aria-hidden>
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="settings-hub__label">
                        <strong>{item.label}</strong>
                        {item.hint ? <em>{item.hint}</em> : null}
                      </span>
                      {item.trailing ?? (
                        <span className="settings-hub__chevron" aria-hidden>
                          ›
                        </span>
                      )}
                    </>
                  );

                  if (item.href) {
                    return (
                      <li key={item.id}>
                        <Link href={item.href} className="settings-hub__row">
                          {inner}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button type="button" className="settings-hub__row" onClick={item.onClick}>
                        {inner}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Shared appearance dialog used from Settings hubs. */
export function AppearanceSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <OpsDialog onClose={onClose} title="Appearance" wide>
      <ThemeSettings compact />
    </OpsDialog>
  );
}

export function PasswordSettingsDialog({
  open,
  onClose,
  message = 'Password changes are managed by your organisation admin or control room. Contact them if you need a reset.',
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  if (!open) return null;
  return (
    <OpsDialog onClose={onClose} title="Password">
      <p className="text-muted" style={{ margin: 0 }}>
        {message}
      </p>
    </OpsDialog>
  );
}

export function useSettingsDialogs() {
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  return {
    appearanceOpen,
    setAppearanceOpen,
    passwordOpen,
    setPasswordOpen,
    dialogs: (
      <>
        <AppearanceSettingsDialog open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
        <PasswordSettingsDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      </>
    ),
  };
}

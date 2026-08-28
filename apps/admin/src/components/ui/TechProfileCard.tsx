'use client';

import type { ReactNode } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';

type TechProfileCardProps = {
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  teams?: string[];
  badge?: ReactNode;
  highlight?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
};

export function TechProfileCard({
  firstName,
  lastName,
  jobTitle,
  email,
  phone,
  teams,
  badge,
  highlight,
  footer,
  children,
}: TechProfileCardProps) {
  const teamLabel = teams?.length ? teams.join(', ') : teams !== undefined ? 'Unassigned' : null;

  return (
    <article className={`tech-profile-card${highlight ? ' tech-profile-card--highlight' : ''}`}>
      <div className="tech-profile-card__head">
        <UserAvatar firstName={firstName} lastName={lastName} size="md" />
        <div className="tech-profile-card__identity">
          <strong>
            {firstName} {lastName}
          </strong>
          {jobTitle ? <span className="tech-profile-card__role">{jobTitle}</span> : null}
        </div>
        {badge ? <div className="tech-profile-card__badge">{badge}</div> : null}
      </div>

      {(email || phone || teamLabel) && (
        <dl className="tech-profile-card__meta">
          {email ? (
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
          ) : null}
          {phone ? (
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${phone}`} className="interactive-text">
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
          {teamLabel ? (
            <div>
              <dt>Team</dt>
              <dd>{teamLabel}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {children}
      {footer ? <div className="tech-profile-card__footer">{footer}</div> : null}
    </article>
  );
}

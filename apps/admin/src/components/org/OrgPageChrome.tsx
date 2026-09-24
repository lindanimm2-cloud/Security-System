'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export function OrgPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="org-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="org-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function OrgPlaceholderPage({
  title,
  subtitle,
  bullets,
}: {
  title: string;
  subtitle: string;
  bullets?: string[];
}) {
  const params = useParams();
  const organizationId = String(params.organizationId ?? '');

  return (
    <div className="org-page">
      <OrgPageHeader title={title} subtitle={subtitle} />
      <div className="org-panel">
        <p className="org-panel__lede">
          Operational module ready for live integrations. Demo data and controls will expand here
          without affecting the personal client portal.
        </p>
        {bullets?.length ? (
          <ul className="org-bullet-list">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        {organizationId ? (
          <Link href={`/org/${organizationId}/dashboard`} className="org-inline-link">
            ← Back to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { OpsMenuDropdown, type OpsMenuItem } from '@/components/ops/OpsMenuDropdown';

export type QuickWorkAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

function ActionControl({
  action,
  className,
}: {
  action: QuickWorkAction;
  className: string;
}) {
  const label = action.loading ? '…' : action.label;
  if (action.onClick) {
    return (
      <button
        type="button"
        className={className}
        disabled={action.disabled || action.loading}
        onClick={action.onClick}
      >
        {label}
      </button>
    );
  }
  if (action.href) {
    const external =
      action.href.startsWith('http') ||
      action.href.startsWith('tel:') ||
      action.href.startsWith('mailto:');
    if (external) {
      return (
        <a
          className={className}
          href={action.href}
          target={action.href.startsWith('http') ? '_blank' : undefined}
          rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {label}
        </a>
      );
    }
    return (
      <Link className={className} href={action.href}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={className} disabled>
      {label}
    </button>
  );
}

export function OpsQuickWork({
  actions,
  hint,
  lead,
}: {
  actions: QuickWorkAction[];
  hint?: string;
  lead?: ReactNode;
}) {
  if (!actions.length && !lead) return null;

  const designatedPrimary = actions.filter((a) => a.primary && !a.disabled);
  const primary =
    designatedPrimary.length > 0
      ? designatedPrimary
      : lead
        ? []
        : actions.filter((a) => !a.disabled).slice(0, 2);
  const primaryIds = new Set(primary.map((a) => a.id));
  const secondary = actions.filter((a) => !primaryIds.has(a.id));

  const moreItems: OpsMenuItem[] = secondary.map((a) => ({
    id: a.id,
    label: a.loading ? '…' : a.label,
    href: a.href,
    onClick: a.onClick,
    tone: a.primary ? 'danger' : 'default',
  }));

  return (
    <section className="ops-quick-work" aria-label="Quick work">
      <div className="ops-quick-work__head">
        <h2>Quick work</h2>
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
      <div className="ops-quick-work__row">
        {lead}
        {primary.map((a) => (
          <ActionControl
            key={a.id}
            action={a}
            className={`ops-quick-work__btn ${a.primary ? 'ops-quick-work__btn--primary' : ''}`}
          />
        ))}
        {secondary.length > 0 ? (
          <>
            <div className="ops-quick-work__secondary">
              {secondary.map((a) => (
                <ActionControl
                  key={a.id}
                  action={a}
                  className={`ops-quick-work__btn ${a.primary ? 'ops-quick-work__btn--primary' : ''}`}
                />
              ))}
            </div>
            <div className="ops-quick-work__more">
              <OpsMenuDropdown label="More" align="right" items={moreItems} />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function OpsNeedsYou({
  items,
  viewAllHref,
}: {
  items: { id: string; title: string; detail: string; href: string }[];
  viewAllHref?: string;
}) {
  if (!items.length) {
    return (
      <section className="ops-needs ops-needs--clear">
        <strong>You&apos;re clear</strong>
        <p className="text-muted">No messages or alerts waiting for you.</p>
      </section>
    );
  }
  return (
    <section className="ops-needs" aria-label="Needs you">
      <div className="ops-needs__head">
        <h2>Needs you</h2>
        <span className="badge badge--alert">{items.length}</span>
        {viewAllHref ? (
          <Link href={viewAllHref} className="link-sm">
            View all
          </Link>
        ) : null}
      </div>
      <div className="ops-needs__track">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="ops-needs__slide" data-slide>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OpsCompactStats({
  items,
}: {
  items: { label: string; value: string; href?: string; warn?: boolean }[];
}) {
  return (
    <div className="ops-compact-stats">
      {items.map((item) => {
        const body = (
          <>
            <span>{item.label}</span>
            <strong className={item.warn ? 'is-warn' : undefined}>{item.value}</strong>
          </>
        );
        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className="ops-compact-stats__cell">
              {body}
            </Link>
          );
        }
        return (
          <div key={item.label} className="ops-compact-stats__cell">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function OpsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ops-section">
      <div className="ops-section__head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';

export type QuickWorkAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function OpsQuickWork({
  actions,
  hint,
}: {
  actions: QuickWorkAction[];
  hint?: string;
}) {
  if (!actions.length) return null;
  return (
    <section className="ops-quick-work" aria-label="Quick work">
      <div className="ops-quick-work__head">
        <h2>Quick work</h2>
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
      <div className="ops-quick-work__row">
        {actions.map((a) => {
          const className = `ops-quick-work__btn ${a.primary ? 'ops-quick-work__btn--primary' : ''}`;
          const label = a.loading ? '…' : a.label;
          if (a.href) {
            return (
              <a
                key={a.id}
                className={className}
                href={a.href}
                target={a.href.startsWith('http') ? '_blank' : undefined}
                rel={a.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {label}
              </a>
            );
          }
          return (
            <button
              key={a.id}
              type="button"
              className={className}
              disabled={a.disabled || a.loading}
              onClick={a.onClick}
            >
              {label}
            </button>
          );
        })}
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
          <a href={viewAllHref} className="link-sm">
            View all
          </a>
        ) : null}
      </div>
      <ul className="ops-needs__list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.href}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </a>
          </li>
        ))}
      </ul>
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
            <a key={item.label} href={item.href} className="ops-compact-stats__cell">
              {body}
            </a>
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
  action?: ReactNode;
  children: ReactNode;
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

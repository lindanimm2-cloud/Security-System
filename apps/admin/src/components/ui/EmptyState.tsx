'use client';

import type { ReactNode } from 'react';

export function EmptyState({
  kicker,
  title,
  body,
  action,
}: {
  kicker?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ds-empty" role="status">
      {kicker ? <p className="ec-kicker">{kicker}</p> : null}
      <strong className="ds-empty__title">{title}</strong>
      {body ? <p className="ds-empty__body">{body}</p> : null}
      {action ? <div className="ds-empty__action">{action}</div> : null}
    </div>
  );
}

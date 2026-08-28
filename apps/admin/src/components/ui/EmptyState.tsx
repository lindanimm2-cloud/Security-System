'use client';

import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ds-empty" role="status">
      <strong className="ds-empty__title">{title}</strong>
      {body ? <p className="ds-empty__body">{body}</p> : null}
      {action ? <div className="ds-empty__action">{action}</div> : null}
    </div>
  );
}

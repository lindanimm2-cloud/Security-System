'use client';

import { ActivitySpinner } from './ActivitySpinner';

export function ButtonSpinner({
  label,
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={`btn-spin ${className}`} role="status" aria-live="polite">
      <ActivitySpinner size="sm" className="btn-spin__icon" label={label || 'Loading'} />
      {label ? <span className="btn-spin__label">{label}</span> : null}
    </span>
  );
}

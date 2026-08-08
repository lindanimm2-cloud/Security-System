'use client';

export function ButtonSpinner({
  label,
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={`btn-spin ${className}`} role="status" aria-live="polite">
      <span className="btn-spin__ring" aria-hidden />
      {label ? <span className="btn-spin__label">{label}</span> : null}
    </span>
  );
}

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type OpsKpiProps = {
  label: string;
  value: ReactNode;
  href?: string;
  onClick?: () => void;
  hot?: boolean;
  active?: boolean;
  disabled?: boolean;
};

export function OpsKpi({
  label,
  value,
  href,
  onClick,
  hot,
  active,
  disabled,
}: OpsKpiProps) {
  const className = `ops-kpi ${hot ? 'ops-kpi--hot' : ''} ${href || onClick ? 'ops-kpi--btn' : ''} ${active ? 'ops-kpi--active' : ''}`.trim();

  const inner = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} aria-label={`${label}: ${String(value)}`}>
        {inner}
      </Link>
    );
  }

  if (onClick && !disabled) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={active}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

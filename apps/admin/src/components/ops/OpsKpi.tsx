'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type OpsKpiIconName =
  | 'active'
  | 'critical'
  | 'officers'
  | 'vehicles'
  | 'ambulances'
  | 'system'
  | 'ready'
  | 'maintenance'
  | 'duty'
  | 'scene'
  | 'available'
  | 'attention'
  | 'sites'
  | 'cameras'
  | 'events'
  | 'offline';

type OpsKpiProps = {
  label: string;
  value: ReactNode;
  href?: string;
  onClick?: () => void;
  hot?: boolean;
  active?: boolean;
  disabled?: boolean;
  icon?: OpsKpiIconName;
};

const ICONS: Record<OpsKpiIconName, ReactNode> = {
  active: (
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="10.5" />
    </>
  ),
  critical: (
    <>
      <path d="M12 3 3.5 20h17L12 3z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  officers: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  vehicles: (
    <>
      <path d="M3 11h13l4 4v4H3z" />
      <path d="M5 11V8a2 2 0 0 1 2-2h6l3 5" />
      <circle cx="7.5" cy="19" r="1.6" />
      <circle cx="16.5" cy="19" r="1.6" />
    </>
  ),
  ambulances: (
    <>
      <rect x="3" y="8" width="13" height="9" rx="1.5" />
      <path d="M16 12h4l1 3v2h-5" />
      <circle cx="7.5" cy="19" r="1.5" />
      <circle cx="16.5" cy="19" r="1.5" />
      <path d="M9.5 10.5v4M7.5 12.5h4" />
    </>
  ),
  system: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  ready: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M5 12h2M17 12h2M7.5 7.5l1.4 1.4M15.1 15.1l1.4 1.4M7.5 16.5l1.4-1.4M15.1 8.9l1.4-1.4" />
    </>
  ),
  maintenance: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.3-3.3a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
    </>
  ),
  duty: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  scene: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  available: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4 4.6-5" />
    </>
  ),
  attention: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  sites: (
    <>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  cameras: (
    <>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </>
  ),
  events: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  offline: (
    <>
      <rect x="2" y="6" width="13" height="11" rx="2" />
      <path d="m15 10 6-3v9l-6-3M4 4l16 16" />
    </>
  ),
};

function iconForLabel(label: string, override?: OpsKpiIconName): OpsKpiIconName {
  if (override) return override;
  const key = label.trim().toLowerCase();
  if (key.includes('critical') || key.includes('attention') || key.includes('triggered')) return 'critical';
  if (key.includes('officer')) return 'officers';
  if (key.includes('vehicle') || key.includes('fleet') || key.includes('dash')) return 'vehicles';
  if (key.includes('ambulance') || key.includes('medic')) return 'ambulances';
  if (key.includes('system')) return 'system';
  if (key.includes('ready') || key.includes('dispatch')) return 'ready';
  if (key.includes('maintenance')) return 'maintenance';
  if (key.includes('scene')) return 'scene';
  if (key.includes('available')) return 'available';
  if (key.includes('duty')) return 'duty';
  if (key.includes('site')) return 'sites';
  if (key.includes('camera') || key.includes('cctv')) return 'cameras';
  if (key.includes('event')) return 'events';
  if (key.includes('offline')) return 'offline';
  return 'active';
}

function KpiGlyph({ name }: { name: OpsKpiIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

export function OpsKpi({
  label,
  value,
  href,
  onClick,
  hot,
  active,
  disabled,
  icon,
}: OpsKpiProps) {
  const className = `ops-kpi ${hot ? 'ops-kpi--hot' : ''} ${href || onClick ? 'ops-kpi--btn' : ''} ${active ? 'ops-kpi--active' : ''}`.trim();
  const glyph = iconForLabel(label, icon);

  const inner = (
    <>
      <span className="ops-kpi__icon">
        <KpiGlyph name={glyph} />
      </span>
      <span className="ops-kpi__label">{label}</span>
      <strong className="ops-kpi__value">{value}</strong>
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

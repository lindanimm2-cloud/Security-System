/** Urgency-first priorities shared across 4DS portals. */

export type PortalPriority = 1 | 2 | 3 | 4 | 5;

export const PRIORITY_LABELS: Record<PortalPriority, string> = {
  1: 'Life / Emergency',
  2: 'Active security events',
  3: 'Live operations',
  4: 'Workflow',
  5: 'Administration',
};

export type PortalKind =
  | 'client'
  | 'control-room'
  | 'officer'
  | 'supervisor'
  | 'technician'
  | 'medical'
  | 'fleet'
  | 'company-admin'
  | 'owner'
  | 'system-admin';

/** What each portal should put first on home. */
export const PORTAL_HOME_PRIORITIES: Record<
  PortalKind,
  { p1: string; p2: string; p3: string; p4: string }
> = {
  client: {
    p1: 'Panic',
    p2: 'Home Security',
    p3: 'Family',
    p4: 'CCTV / Tracking',
  },
  'control-room': {
    p1: 'Active Alarms',
    p2: 'Dispatch',
    p3: 'Live Incidents',
    p4: 'Officers',
  },
  officer: {
    p1: 'Active Job',
    p2: 'Emergency Response',
    p3: 'Navigation',
    p4: 'Evidence',
  },
  supervisor: {
    p1: 'Active Incidents',
    p2: 'Officer Deployment',
    p3: 'Officer Safety',
    p4: 'Performance',
  },
  technician: {
    p1: 'Current Job',
    p2: 'Installation',
    p3: 'Equipment',
    p4: 'Schedule',
  },
  medical: {
    p1: 'Emergency',
    p2: 'Patient',
    p3: 'Ambulance',
    p4: 'Hospital',
  },
  fleet: {
    p1: 'Active Vehicles',
    p2: 'Dispatch',
    p3: 'Vehicle Status',
    p4: 'Maintenance',
  },
  'company-admin': {
    p1: 'Operations',
    p2: 'Staff',
    p3: 'Customers',
    p4: 'Finance',
  },
  owner: {
    p1: 'Emergencies',
    p2: 'Business',
    p3: 'Branches',
    p4: 'Performance',
  },
  'system-admin': {
    p1: 'System Health',
    p2: 'Tenants',
    p3: 'Access',
    p4: 'Developer',
  },
};

export type IncidentPriorityBand = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export function incidentPriorityBand(
  priority: string,
  type?: string,
): IncidentPriorityBand {
  const p = (priority ?? '').toUpperCase();
  const t = (type ?? '').toUpperCase();
  if (t === 'MEDICAL' || t === 'FIRE' || p === 'CRITICAL') return 'P0';
  if (t === 'PANIC' || p === 'HIGH') return 'P1';
  if (p === 'MEDIUM') return 'P2';
  if (p === 'LOW') return 'P3';
  return 'P4';
}

export function protectionStatusTone(opts: {
  activeIncidents: number;
  criticalIncidents?: number;
  alarmFault?: boolean;
}): 'ok' | 'attention' | 'emergency' {
  if ((opts.criticalIncidents ?? 0) > 0 || opts.activeIncidents > 0) return 'emergency';
  if (opts.alarmFault) return 'attention';
  return 'ok';
}

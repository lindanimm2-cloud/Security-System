import { developerTicketCode } from './developer-tickets';

export type DevSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type DevWorkflowStatus =
  | 'REPORTED'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'FIX_READY'
  | 'TESTING'
  | 'DEPLOYED'
  | 'VERIFIED'
  | 'RESOLVED'
  | 'DUPLICATE'
  | 'WONT_FIX'
  | 'NEEDS_USER_INFO';

export type LegacyReportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type DevErrorSnapshot = {
  errorCode?: string;
  stack?: string;
  digest?: string;
  componentStack?: string;
  apiEndpoint?: string;
  httpStatus?: number;
  requestId?: string;
  correlationId?: string;
  reportedAt?: string;
};

export type DevEnvironmentSnapshot = {
  appVersion?: string;
  buildNumber?: string;
  browser?: string;
  os?: string;
  deviceModel?: string;
  screenSize?: string;
  networkState?: string;
  online?: boolean;
  userAgent?: string;
};

export type DevUserSnapshot = {
  role?: string;
  branch?: string;
  feature?: string;
  sessionId?: string;
};

export type DevSystemSnapshot = {
  apiLatencyMs?: number;
  deploymentVersion?: string;
  serviceHealth?: string;
};

export type DevTicketSnapshot = {
  error?: DevErrorSnapshot;
  environment?: DevEnvironmentSnapshot;
  user?: DevUserSnapshot;
  system?: DevSystemSnapshot;
};

export type DevReproduction = {
  steps?: string[];
  reproducible?: boolean | null;
  notes?: string;
};

export type DevFix = {
  rootCause?: string;
  filesChanged?: string[];
  fixVersion?: string;
  status?: 'pending' | 'staging' | 'production' | 'verified';
};

export type DevAuditEntry = {
  at: string;
  action: string;
  actor?: string;
};

export type DevAffected = {
  totalUsers?: number;
  byRole?: Record<string, number>;
  feature?: string;
};

export type DevDeploymentHint = {
  firstDetectedAfter?: string;
  minutesAfterDeploy?: number;
  relatedFiles?: string[];
  relatedChanges?: string;
};

export type DevTicketMeta = {
  workflowStatus?: DevWorkflowStatus;
  severity?: DevSeverity;
  snapshot?: DevTicketSnapshot;
  reproduction?: DevReproduction;
  fix?: DevFix;
  audit?: DevAuditEntry[];
  affected?: DevAffected;
  deployment?: DevDeploymentHint;
  duplicateOf?: string;
  duplicateIds?: string[];
  errorFingerprint?: string;
  assignee?: string;
};

export type DevReporter = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type DevTicket = {
  id: string;
  ticketCode: string;
  message: string;
  path: string | null;
  context: string | null;
  status: LegacyReportStatus;
  workflowStatus: DevWorkflowStatus;
  severity: DevSeverity;
  createdAt: string;
  resolvedAt?: string | null;
  reporter: DevReporter;
  meta: DevTicketMeta;
};

export type DevServiceHealth = {
  id: string;
  label: string;
  status: 'operational' | 'degraded' | 'down';
  href?: string;
  detail?: string;
};

export type DevDeployment = {
  version: string;
  build: string;
  deployedAt: string;
  status: 'healthy' | 'degraded' | 'down';
  environment: 'production' | 'staging';
};

export type DevErrorAnalytics = {
  total24h: number;
  unique24h: number;
  affectedUsers24h: number;
  critical24h: number;
  resolved24h: number;
  topErrors: { fingerprint: string; label: string; count: number }[];
};

export type DevCommandDesk = {
  tenantName: string;
  canViewRevenue: boolean;
  revenueNote: string;
  openErrorReports: number;
  systemStatus: 'operational' | 'degraded' | 'incident';
  systemMessage: string;
  production: DevDeployment;
  recentDeployments: DevDeployment[];
  platformHealth: DevServiceHealth[];
  analytics: DevErrorAnalytics;
  duplicateGroups: { fingerprint: string; ticketIds: string[]; count: number }[];
  recentReports: {
    id: string;
    message: string;
    path: string | null;
    status: string;
    workflowStatus: DevWorkflowStatus;
    severity: DevSeverity;
    createdAt: string;
    reporter: string;
    ticketCode: string;
  }[];
  developers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  }[];
  developerAccess: {
    production: boolean;
    staging: boolean;
    database: boolean;
    serverLogs: boolean;
    deployments: boolean;
    monitoring: boolean;
  };
};

const WORKFLOW_LABELS: Record<DevWorkflowStatus, string> = {
  REPORTED: 'Reported',
  TRIAGED: 'Triaged',
  IN_PROGRESS: 'In progress',
  FIX_READY: 'Fix ready',
  TESTING: 'Testing',
  DEPLOYED: 'Deployed',
  VERIFIED: 'Verified',
  RESOLVED: 'Resolved',
  DUPLICATE: 'Duplicate',
  WONT_FIX: "Won't fix",
  NEEDS_USER_INFO: 'Needs user info',
};

const SEVERITY_LABELS: Record<DevSeverity, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

export function workflowLabel(status: DevWorkflowStatus): string {
  return WORKFLOW_LABELS[status] ?? status;
}

export function severityLabel(severity: DevSeverity): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function workflowToLegacy(status: DevWorkflowStatus): LegacyReportStatus {
  if (status === 'RESOLVED' || status === 'WONT_FIX' || status === 'VERIFIED' || status === 'DEPLOYED') {
    return 'RESOLVED';
  }
  if (
    status === 'IN_PROGRESS' ||
    status === 'FIX_READY' ||
    status === 'TESTING' ||
    status === 'TRIAGED'
  ) {
    return 'ACKNOWLEDGED';
  }
  return 'OPEN';
}

export function legacyToWorkflow(status: LegacyReportStatus, meta?: DevTicketMeta): DevWorkflowStatus {
  if (meta?.workflowStatus) return meta.workflowStatus;
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'ACKNOWLEDGED') return 'IN_PROGRESS';
  return 'REPORTED';
}

export function parseTicketContext(raw: string | null): DevTicketMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as DevTicketMeta & Record<string, unknown>;
    if (parsed.snapshot || parsed.workflowStatus || parsed.severity) {
      return parsed;
    }
    return {
      snapshot: {
        error: {
          stack: typeof parsed.stack === 'string' ? parsed.stack : undefined,
          digest: typeof parsed.digest === 'string' ? parsed.digest : undefined,
          componentStack: typeof parsed.componentStack === 'string' ? parsed.componentStack : undefined,
          reportedAt: typeof parsed.reportedAt === 'string' ? parsed.reportedAt : undefined,
          errorCode: typeof parsed.name === 'string' ? parsed.name : undefined,
        },
      },
    };
  } catch {
    return {};
  }
}

export function buildTicketContext(meta: DevTicketMeta): string {
  return JSON.stringify(meta).slice(0, 8000);
}

export function errorFingerprint(message: string, path?: string | null, code?: string): string {
  const base = `${code ?? ''}|${message.replace(/\d+/g, '#').slice(0, 120)}|${path ?? ''}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

export function inferSeverity(message: string, meta?: DevTicketMeta): DevSeverity {
  if (meta?.severity) return meta.severity;
  const m = message.toLowerCase();
  if (
    m.includes('security') ||
    m.includes('unauthorized') ||
    m.includes('payment') ||
    m.includes('panic') ||
    m.includes('breach')
  ) {
    return 'P0';
  }
  if (m.includes('failed') || m.includes('timeout') || m.includes('unavailable') || m.includes('required')) {
    return 'P1';
  }
  if (m.includes('warning') || m.includes('partial')) return 'P2';
  return 'P3';
}

export function enrichTicket(report: {
  id: string;
  message: string;
  path: string | null;
  context: string | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  reporter: DevReporter;
  ticketCode?: string;
}): DevTicket {
  const meta = parseTicketContext(report.context);
  const workflowStatus = legacyToWorkflow(report.status as LegacyReportStatus, meta);
  const fingerprint =
    meta.errorFingerprint ??
    errorFingerprint(report.message, report.path, meta.snapshot?.error?.errorCode);

  return {
    id: report.id,
    ticketCode: report.ticketCode ?? developerTicketCode(report.id),
    message: report.message,
    path: report.path,
    context: report.context,
    status: report.status as LegacyReportStatus,
    workflowStatus,
    severity: inferSeverity(report.message, meta),
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
    reporter: report.reporter,
    meta: {
      ...meta,
      errorFingerprint: fingerprint,
      workflowStatus,
      severity: inferSeverity(report.message, meta),
    },
  };
}

export function computeAnalytics(tickets: DevTicket[]): DevErrorAnalytics {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = tickets.filter((t) => new Date(t.createdAt).getTime() >= since);
  const fingerprints = new Map<string, { label: string; count: number }>();
  const users = new Set<string>();

  for (const t of recent) {
    users.add(t.reporter.id);
    const fp = t.meta.errorFingerprint ?? errorFingerprint(t.message, t.path);
    const existing = fingerprints.get(fp);
    if (existing) existing.count += 1;
    else fingerprints.set(fp, { label: t.message.slice(0, 48), count: 1 });
  }

  return {
    total24h: recent.length,
    unique24h: fingerprints.size,
    affectedUsers24h: users.size,
    critical24h: recent.filter((t) => t.severity === 'P0' || t.severity === 'P1').length,
    resolved24h: recent.filter((t) => t.workflowStatus === 'RESOLVED' || t.status === 'RESOLVED').length,
    topErrors: [...fingerprints.entries()]
      .map(([fingerprint, v]) => ({ fingerprint, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export function detectDuplicateGroups(tickets: DevTicket[]) {
  const groups = new Map<string, string[]>();
  for (const t of tickets) {
    const fp = t.meta.errorFingerprint ?? errorFingerprint(t.message, t.path);
    const ids = groups.get(fp) ?? [];
    ids.push(t.id);
    groups.set(fp, ids);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([fingerprint, ticketIds]) => ({
      fingerprint,
      ticketIds,
      count: ticketIds.length,
    }));
}

export const DEFAULT_PLATFORM_HEALTH: DevServiceHealth[] = [
  { id: 'api', label: 'API', status: 'operational', href: '/control-room' },
  { id: 'database', label: 'Database', status: 'operational' },
  { id: 'auth', label: 'Authentication', status: 'operational', href: '/control-room/device-security' },
  { id: 'map', label: 'Live map', status: 'operational', href: '/control-room/map' },
  { id: 'cctv', label: 'CCTV', status: 'operational', href: '/control-room/surveillance' },
  { id: 'dispatch', label: 'Dispatch', status: 'operational', href: '/control-room/dispatch' },
  { id: 'notifications', label: 'Notifications', status: 'degraded' },
  { id: 'payments', label: 'Payments', status: 'operational', href: '/control-room/customers' },
];

export const DEFAULT_PRODUCTION: DevDeployment = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.4.18',
  build: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? '8421',
  deployedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
  status: 'healthy',
  environment: 'production',
};

export const WORKFLOW_ACTIONS: Partial<Record<DevWorkflowStatus, { label: string; next: DevWorkflowStatus }[]>> = {
  REPORTED: [{ label: 'Triage', next: 'TRIAGED' }, { label: 'Take ticket', next: 'IN_PROGRESS' }],
  TRIAGED: [{ label: 'Start fix', next: 'IN_PROGRESS' }, { label: 'Needs user info', next: 'NEEDS_USER_INFO' }],
  IN_PROGRESS: [
    { label: 'Mark fix ready', next: 'FIX_READY' },
    { label: 'Send to testing', next: 'TESTING' },
    { label: "Won't fix", next: 'WONT_FIX' },
  ],
  FIX_READY: [{ label: 'Send to testing', next: 'TESTING' }],
  TESTING: [{ label: 'Deploy', next: 'DEPLOYED' }, { label: 'Back to progress', next: 'IN_PROGRESS' }],
  DEPLOYED: [{ label: 'Verify', next: 'VERIFIED' }],
  VERIFIED: [{ label: 'Resolve', next: 'RESOLVED' }],
  NEEDS_USER_INFO: [{ label: 'Resume', next: 'IN_PROGRESS' }],
};

export function appendAudit(meta: DevTicketMeta, action: string, actor?: string): DevTicketMeta {
  const audit = [...(meta.audit ?? []), { at: new Date().toISOString(), action, actor }];
  return { ...meta, audit: audit.slice(-30) };
}

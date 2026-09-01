import type { DevTicketMeta, DevTicketSnapshot } from './developer-desk';
import { errorFingerprint } from './developer-desk';
import { getSession } from './auth';

const SENSITIVE_PATTERN =
  /(password|token|secret|authorization|bearer|api[_-]?key|id[_-]?number|card|cvv|ssn|passport)/i;

function redact(value: string): string {
  if (SENSITIVE_PATTERN.test(value)) return '[REDACTED]';
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/("password"|"token"|"secret")\s*:\s*"[^"]*"/gi, '$1:"[REDACTED]"')
    .slice(0, 2000);
}

function parseBrowser(ua: string): { browser: string; os: string } {
  let browser = 'Unknown browser';
  let os = 'Unknown OS';
  if (/Edg\//.test(ua)) browser = `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ''}`.trim();
  else if (/Chrome\//.test(ua)) browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ''}`.trim();
  else if (/Firefox\//.test(ua)) browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ''}`.trim();
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    browser = `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ''}`.trim();
  }
  if (/Windows NT 10/.test(ua)) os = 'Windows 11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  return { browser, os };
}

function inferFeature(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.includes('camera')) return 'Camera testing';
  if (path.includes('dispatch')) return 'Dispatch';
  if (path.includes('map')) return 'Live map';
  if (path.includes('portal')) return 'Client portal';
  if (path.includes('control-room')) return 'Control room';
  if (path.includes('technician') || path.includes('/tech')) return 'Technician';
  return path.split('/').filter(Boolean).slice(0, 2).join(' / ') || undefined;
}

function inferApiFromMessage(message: string): { endpoint?: string; httpStatus?: number } {
  const apiMatch = message.match(/\/(?:api|v1)\/[a-z0-9/_-]+/i);
  const statusMatch = message.match(/\b(4\d{2}|5\d{2})\b/);
  return {
    endpoint: apiMatch?.[0],
    httpStatus: statusMatch ? Number(statusMatch[1]) : undefined,
  };
}

export type ErrorSnapshotInput = {
  message: string;
  path?: string;
  stack?: string;
  digest?: string;
  name?: string;
  componentStack?: string;
  apiEndpoint?: string;
  httpStatus?: number;
  requestId?: string;
};

export function collectErrorSnapshot(input: ErrorSnapshotInput): DevTicketMeta {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const { browser, os } = parseBrowser(ua);
  const api = inferApiFromMessage(input.message);
  const session =
    getSession('admin') ??
    getSession('officer') ??
    getSession('tech') ??
    getSession('client') ??
    getSession('supervisor');

  const snapshot: DevTicketSnapshot = {
    error: {
      errorCode: input.name ?? input.digest?.slice(0, 16).toUpperCase(),
      stack: input.stack ? redact(input.stack) : undefined,
      digest: input.digest,
      componentStack: input.componentStack ? redact(input.componentStack) : undefined,
      apiEndpoint: input.apiEndpoint ?? api.endpoint,
      httpStatus: input.httpStatus ?? api.httpStatus,
      requestId: input.requestId ?? `req_${Date.now().toString(36).toUpperCase()}`,
      correlationId: input.digest,
      reportedAt: new Date().toISOString(),
    },
    environment: {
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.4.18',
      buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? '8421',
      browser,
      os,
      deviceModel: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      screenSize:
        typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : undefined,
      networkState:
        typeof navigator !== 'undefined' && 'connection' in navigator
          ? String((navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? 'unknown')
          : undefined,
      online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      userAgent: ua.slice(0, 200),
    },
    user: {
      role: session?.user.role,
      feature: inferFeature(input.path),
      sessionId: session?.user.id ? `sess_${session.user.id.slice(0, 8)}` : undefined,
    },
    system: {
      deploymentVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.4.18',
      serviceHealth: 'monitoring_active',
    },
  };

  const fingerprint = errorFingerprint(input.message, input.path, snapshot.error?.errorCode);

  return {
    snapshot,
    errorFingerprint: fingerprint,
    workflowStatus: 'REPORTED',
    severity: undefined,
    audit: [{ at: new Date().toISOString(), action: 'Error reported automatically' }],
    affected: {
      totalUsers: 1,
      byRole: session?.user.role ? { [session.user.role]: 1 } : undefined,
      feature: inferFeature(input.path),
    },
    deployment: {
      firstDetectedAfter: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.4.18',
      relatedFiles: inferRelatedFiles(input.path, input.message),
    },
  };
}

function inferRelatedFiles(path?: string, message?: string): string[] {
  const files: string[] = [];
  if (path?.includes('camera')) {
    files.push('camera-test.ts', 'TestChecklist.tsx', '/api/tests/complete');
  }
  if (message?.toLowerCase().includes('checklist')) {
    files.push('TestChecklist.tsx');
  }
  return [...new Set(files)].slice(0, 5);
}

export function buildReportContext(input: ErrorSnapshotInput): string {
  const meta = collectErrorSnapshot(input);
  return JSON.stringify(meta).slice(0, 8000);
}

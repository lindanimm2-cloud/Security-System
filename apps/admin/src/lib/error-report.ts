import { clientApi } from './api-client';
import { getSession, type AuthPortal } from './auth';
import { resolveStaffSession, submitDeveloperErrorReport } from './developer-notify';
import { buildReportContext } from './error-snapshot';
import { REPORT_NEEDS_SIGN_IN_MESSAGE } from './friendly-error';
import { isLoginPath } from './login-path';

export type ErrorReportPayload = {
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

function buildContext(input: ErrorReportPayload): string {
  return buildReportContext(input);
}

async function copyReportToClipboard(input: ErrorReportPayload): Promise<void> {
  const lines = [
    input.message,
    input.path ? `Path: ${input.path}` : '',
    input.digest ? `Ref: ${input.digest}` : '',
    input.stack?.slice(0, 800) ?? '',
  ].filter(Boolean);
  await navigator.clipboard.writeText(lines.join('\n\n'));
}

/** Send technical error details to the developer desk (client portal or staff CRM). */
export async function reportErrorToDeveloper(
  input: ErrorReportPayload,
): Promise<{ channel: AuthPortal | 'client' | 'clipboard' | 'skipped' }> {
  const context = buildContext(input);
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

  const client = getSession('client');
  if (client) {
    await clientApi.post('/client/support/error-report', {
      message: input.message.slice(0, 2000),
      path: input.path,
      userAgent,
      context,
    });
    return { channel: 'client' };
  }

  const staff = resolveStaffSession(input.path ?? null);
  if (staff) {
    await submitDeveloperErrorReport({
      message: input.message.slice(0, 2000),
      path: input.path,
      context,
      portal: staff.portal,
      accessToken: staff.session.accessToken,
    });
    return { channel: staff.portal };
  }

  // Login screens must stay usable — never throw an auth wall over the form.
  if (isLoginPath(input.path)) {
    return { channel: 'skipped' };
  }

  try {
    await copyReportToClipboard(input);
    return { channel: 'clipboard' };
  } catch {
    const err = new Error(REPORT_NEEDS_SIGN_IN_MESSAGE);
    err.name = 'ReportNeedsSignInError';
    throw err;
  }
}

export function errorReference(error: Error & { digest?: string }): string {
  if (error.digest) return error.digest.slice(0, 12).toUpperCase();
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

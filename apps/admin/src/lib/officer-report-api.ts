import { getSession, logoutIfUnauthorized } from './auth';
import type { ApiResponse } from './api-client';
import { isDemoMode } from './demo/is-demo-mode';
import { handleDemoRequest } from './demo/handler';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export type ReportMedia = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  kind: string;
  createdAt: string;
};

async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  const session = getSession('officer');
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    return handleDemoRequest<T>({
      portal: 'officer',
      path,
      method: 'POST',
      session,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: form,
    });
  } catch {
    throw new Error('Request failed');
  }

  if (logoutIfUnauthorized('officer', res.status)) {
    throw new Error('Session expired');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Request failed');
  }

  return json as T;
}

export async function submitAssignmentReport(
  incidentId: string,
  content: string,
  files: File[],
) {
  const form = new FormData();
  form.append('content', content);
  for (const file of files) {
    form.append('files', file);
  }
  return postMultipart<ApiResponse<{ id: string; incidentId: string; content: string; media: ReportMedia[] }>>(
    `/officer/incidents/${incidentId}/report`,
    form,
  );
}

export async function submitFieldIncidentReport(
  fields: {
    type: string;
    title?: string;
    address?: string;
    description: string;
  },
  files: File[],
) {
  const form = new FormData();
  form.append('type', fields.type);
  if (fields.title) form.append('title', fields.title);
  if (fields.address) form.append('address', fields.address);
  form.append('description', fields.description);
  for (const file of files) {
    form.append('files', file);
  }
  return postMultipart<ApiResponse<{ id: string; type: string; status: string; media: ReportMedia[] }>>(
    '/officer/incidents/report',
    form,
  );
}

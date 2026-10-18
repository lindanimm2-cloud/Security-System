import { getSession, logoutIfUnauthorized, type AuthPortal } from './auth';
import type { ApiResponse } from './api-client';
import { isDemoMode } from './demo/is-demo-mode';
import { handleDemoRequest } from './demo/handler';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export type IncidentChatAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  kind: 'IMAGE' | 'VIDEO' | 'FILE';
};

export type IncidentChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  to?: string | null;
  sender: { id: string; firstName: string; lastName: string; role: string };
  attachments?: IncidentChatAttachment[];
};

export type IncidentChatSaveTarget = 'chat' | 'incident' | string;

function attachmentKind(mime: string): IncidentChatAttachment['kind'] {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'FILE';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

async function fileToDemoAttachment(file: File): Promise<Omit<IncidentChatAttachment, 'id'>> {
  const kind = attachmentKind(file.type || 'application/octet-stream');
  const useInline =
    file.size < 1_800_000 &&
    (kind === 'IMAGE' || file.type === 'application/pdf' || file.type.startsWith('text/'));
  const fileUrl = useInline ? await readAsDataUrl(file) : URL.createObjectURL(file);
  return {
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileUrl,
    fileSize: file.size,
    kind,
  };
}

export async function sendIncidentChatMessage(
  portal: AuthPortal,
  incidentId: string,
  opts: {
    content: string;
    to: string;
    files?: File[];
    saveTo?: IncidentChatSaveTarget;
  },
): Promise<ApiResponse<IncidentChatMessage>> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  const files = opts.files ?? [];
  const saveTo = opts.saveTo ?? 'chat';

  if (isDemoMode()) {
    const attachments =
      files.length > 0 ? await Promise.all(files.map((f) => fileToDemoAttachment(f))) : [];
    return handleDemoRequest<ApiResponse<IncidentChatMessage>>({
      portal,
      path: `/incidents/${incidentId}/chat`,
      method: 'POST',
      body: JSON.stringify({
        content: opts.content,
        to: opts.to,
        saveTo,
        attachments,
      }),
      session,
    });
  }

  const form = new FormData();
  form.append('content', opts.content);
  form.append('to', opts.to);
  form.append('saveTo', saveTo);
  for (const file of files) {
    form.append('files', file);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/incidents/${incidentId}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: form,
    });
  } catch {
    throw new Error('Request failed');
  }

  if (logoutIfUnauthorized(portal, res.status)) {
    throw new Error('Session expired');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Request failed');
  }

  return json as ApiResponse<IncidentChatMessage>;
}

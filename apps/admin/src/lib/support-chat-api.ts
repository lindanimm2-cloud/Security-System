import type { ApiResponse } from './api-client';
import { getSession, logoutIfUnauthorized } from './auth';
import { handleDemoRequest } from './demo/handler';
import { isDemoMode } from './demo/is-demo-mode';
import {
  unwrapFamilyReply,
  wrapFamilyReply,
  type FamilyReplyQuote,
} from './family-chat-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export type SupportChatAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  kind: 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO';
};

export type SupportChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
  attachments?: SupportChatAttachment[];
};

export function supportAttachmentKind(mime: string): SupportChatAttachment['kind'] {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

export function supportSenderLabel(
  sender: SupportChatMessage['sender'],
  staffRoles: Set<string>,
) {
  if (staffRoles.has(sender.role) || sender.role === 'OFFICER') return 'Control room';
  return `${sender.firstName} ${sender.lastName}`.trim();
}

export function supportMessagePreview(message: SupportChatMessage): string {
  const body = unwrapFamilyReply(message.content).body.trim();
  if (message.attachments?.length) {
    const kind = message.attachments[0].kind;
    if (kind === 'IMAGE') return 'Photo';
    if (kind === 'VIDEO') return 'Video';
    if (kind === 'AUDIO') return 'Voice note';
    return message.attachments[0].fileName || 'Attachment';
  }
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.startsWith('Sent ')) return 'Attachment';
  if (text.startsWith('🎤')) return 'Voice note';
  return text.slice(0, 80) || 'Message';
}

export async function sendSupportChatMessage(input: {
  content: string;
  files?: File[];
  replyTo?: FamilyReplyQuote | null;
}): Promise<ApiResponse<SupportChatMessage>> {
  const session = getSession('client');
  if (!session) throw new Error('Not authenticated');

  const files = input.files ?? [];
  let body = input.content.trim();
  if (!body && files.length) {
    const kind = supportAttachmentKind(files[0].type);
    body =
      kind === 'AUDIO'
        ? '🎤 Voice note'
        : kind === 'IMAGE'
          ? '📷 Photo'
          : kind === 'VIDEO'
            ? '🎥 Video'
            : `📎 ${files[0].name}`;
  }

  let content = body;
  if (input.replyTo) {
    content = wrapFamilyReply(content, input.replyTo);
  }

  if (!body && files.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (isDemoMode()) {
    const demo = await handleDemoRequest<ApiResponse<SupportChatMessage> & { message?: string }>({
      portal: 'client',
      path: '/client/messages',
      method: 'POST',
      body: JSON.stringify({
        content,
        replyToId: input.replyTo?.id,
        attachments: files.map((file) => ({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          kind: supportAttachmentKind(file.type),
          fileUrl: URL.createObjectURL(file),
        })),
      }),
      session,
    });
    if (!demo?.success || !demo.data) {
      throw new Error(demo?.message ?? 'Could not send that message');
    }
    return demo;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/client/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
  } catch {
    throw new Error('Request failed');
  }

  if (logoutIfUnauthorized('client', res.status)) {
    throw new Error('Session expired');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg ?? 'Request failed');
  }

  const payload = json as ApiResponse<SupportChatMessage>;
  if (files.length && payload.data) {
    payload.data = {
      ...payload.data,
      attachments: files.map((file, index) => ({
        id: `local-att-${Date.now()}-${index}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileUrl: URL.createObjectURL(file),
        fileSize: file.size,
        kind: supportAttachmentKind(file.type),
      })),
    };
  }
  return payload;
}

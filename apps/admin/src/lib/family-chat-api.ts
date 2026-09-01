import type { ApiResponse } from './api-client';
import { getSession, logoutIfUnauthorized } from './auth';
import { handleDemoRequest } from './demo/handler';
import { isDemoMode } from './demo/is-demo-mode';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export type FamilyChatAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  kind: 'IMAGE' | 'VIDEO' | 'FILE';
};

export type FamilyChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; phone?: string | null };
  attachments?: FamilyChatAttachment[];
};

export type FamilyReplyQuote = {
  id: string;
  name: string;
  text: string;
};

export type FamilyChatMember = {
  id: string;
  name: string;
  phone?: string | null;
};

export type FamilyLocation = { lat: number; lng: number };

const LOCATION_RE = /^📍 Live location\n(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/;
const REPLY_RE = /^«reply:([^|«»\n]+)\|([^|«»\n]*)\|([^«»]*)»\n?/;

export function formatFamilyLocationMessage(lat: number, lng: number) {
  return `📍 Live location\n${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function wrapFamilyReply(content: string, quote: FamilyReplyQuote) {
  const id = quote.id.replace(/[|«»]/g, '');
  const name = quote.name.replace(/[|«»\n]/g, ' ').trim().slice(0, 40);
  const text = quote.text.replace(/[«»]/g, ' ').replace(/\n/g, ' ').trim().slice(0, 80);
  return `«reply:${id}|${name}|${text}»\n${content}`;
}

export function unwrapFamilyReply(content: string): { quote: FamilyReplyQuote | null; body: string } {
  const match = content.match(REPLY_RE);
  if (!match) return { quote: null, body: content };
  return {
    quote: { id: match[1], name: match[2], text: match[3] },
    body: content.slice(match[0].length),
  };
}

export function parseFamilyLocation(content: string): FamilyLocation | null {
  const match = unwrapFamilyReply(content).body.trim().match(LOCATION_RE);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function familyLocationMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function familyMessagePreview(message: FamilyChatMessage): string {
  const body = unwrapFamilyReply(message.content).body.trim();
  if (parseFamilyLocation(body) || body.startsWith('📍 Live location')) return 'Live location';
  if (message.attachments?.length) {
    const kind = message.attachments[0].kind;
    if (kind === 'IMAGE') return 'Photo';
    if (kind === 'VIDEO') return 'Video';
    return message.attachments[0].fileName || 'Attachment';
  }
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.startsWith('Sent ')) return 'Attachment';
  return text.slice(0, 80) || 'Message';
}

export function familySenderName(sender: FamilyChatMessage['sender']) {
  return `${sender.firstName} ${sender.lastName}`.trim();
}

function attachmentKind(mime: string): FamilyChatAttachment['kind'] {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'FILE';
}

export async function sendFamilyChatMessage(input: {
  content: string;
  files?: File[];
  location?: FamilyLocation | null;
  replyToId?: string | null;
}): Promise<ApiResponse<FamilyChatMessage>> {
  const session = getSession('client');
  if (!session) throw new Error('Not authenticated');

  const files = input.files ?? [];
  const location = input.location ?? null;
  const replyToId = input.replyToId || undefined;

  if (isDemoMode()) {
    const demo = await handleDemoRequest<ApiResponse<FamilyChatMessage> & { message?: string }>({
      portal: 'client',
      path: '/client/family/messages',
      method: 'POST',
      body: JSON.stringify({
        content: input.content,
        lat: location?.lat,
        lng: location?.lng,
        replyToId,
        attachments: files.map((file) => ({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          kind: attachmentKind(file.type),
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

  const form = new FormData();
  form.append('content', input.content);
  if (location) {
    form.append('lat', String(location.lat));
    form.append('lng', String(location.lng));
  }
  if (replyToId) form.append('replyToId', replyToId);
  for (const file of files) {
    form.append('files', file);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/client/family/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: form,
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

  return json as ApiResponse<FamilyChatMessage>;
}

import { getSession, logoutIfUnauthorized, type AuthPortal } from './auth';
import type { ApiResponse } from './api-client';
import type { ChatMessage, ChatParticipant } from '@/components/InternalChat';
import { isDemoMode } from './demo/is-demo-mode';
import { handleDemoRequest } from './demo/handler';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export type ChatChannel = 'internal' | 'tech-team' | 'dev-support';

export type InternalChatData = {
  conversationId: string;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  team?: { id: string; name: string };
};

function channelPath(channel: ChatChannel) {
  if (channel === 'tech-team') return '/chat/tech-team';
  if (channel === 'dev-support') return '/chat/dev-support';
  return '/chat/internal';
}

export async function fetchInternalChat(
  portal: AuthPortal,
  channel: ChatChannel = 'internal',
): Promise<ApiResponse<InternalChatData>> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    return handleDemoRequest<ApiResponse<InternalChatData>>({
      portal,
      path: channelPath(channel),
      method: 'GET',
      session,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${channelPath(channel)}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
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

  return json as ApiResponse<InternalChatData>;
}

export async function sendInternalChatMessage(
  portal: AuthPortal,
  content: string,
  files: File[],
  channel: ChatChannel = 'internal',
): Promise<ApiResponse<ChatMessage>> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    return handleDemoRequest<ApiResponse<ChatMessage>>({
      portal,
      path: channelPath(channel),
      method: 'POST',
      body: JSON.stringify({ content }),
      session,
    });
  }

  const form = new FormData();
  form.append('content', content);
  for (const file of files) {
    form.append('files', file);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${channelPath(channel)}`, {
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

  return json as ApiResponse<ChatMessage>;
}

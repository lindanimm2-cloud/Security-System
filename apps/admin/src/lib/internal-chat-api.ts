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

const TEAM_THREAD_ID = '__team__';

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
  toUserId?: string | null,
): Promise<ApiResponse<ChatMessage>> {
  const session = getSession(portal);
  if (!session) throw new Error('Not authenticated');

  if (isDemoMode()) {
    return handleDemoRequest<ApiResponse<ChatMessage>>({
      portal,
      path: channelPath(channel),
      method: 'POST',
      body: JSON.stringify({ content, toUserId: toUserId || undefined }),
      session,
    });
  }

  const form = new FormData();
  form.append('content', content);
  if (toUserId) form.append('toUserId', toUserId);
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

function readReceiptsKey(portal: AuthPortal, channel: ChatChannel, userId: string) {
  return `4ds-chat-read:${portal}:${channel}:${userId}`;
}

function loadReceipts(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function fetchInternalChatUnreadCount(
  portal: AuthPortal,
  channel: ChatChannel = 'internal',
): Promise<number> {
  const session = getSession(portal);
  const currentUserId = session?.user.id ?? '';
  if (!currentUserId) return 0;

  const res = await fetchInternalChat(portal, channel);
  const data = res.data;
  const receipts = loadReceipts(readReceiptsKey(portal, channel, currentUserId));
  const teamReadAt = receipts[TEAM_THREAD_ID] ? new Date(receipts[TEAM_THREAD_ID]).getTime() : 0;

  const teamUnread = data.messages.filter(
    (message) =>
      message.sender.id !== currentUserId && new Date(message.createdAt).getTime() > teamReadAt,
  ).length;

  const directUnread = data.participants
    .filter((participant) => participant.id !== currentUserId)
    .reduce((sum, participant) => {
      const readAt = receipts[participant.id] ? new Date(receipts[participant.id]).getTime() : 0;
      return (
        sum +
        data.messages.filter(
          (message) =>
            message.sender.id === participant.id &&
            new Date(message.createdAt).getTime() > readAt,
        ).length
      );
    }, 0);

  return teamUnread + directUnread;
}

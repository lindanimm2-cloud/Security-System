'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';
import type { SupportChatMessage } from '@/components/portal/ControlRoomChat';

type ClientSummary = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
};

type ClientChatThread = {
  clientUserId: string;
  conversationId: string;
  client: ClientSummary;
  lastMessage: SupportChatMessage | null;
  updatedAt: string;
};

type ThreadDetail = {
  conversationId: string;
  client: ClientSummary;
  messages: SupportChatMessage[];
};

function formatListTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function previewText(msg: SupportChatMessage | null) {
  if (!msg?.content?.trim()) return 'No messages yet';
  return msg.content.trim();
}

export function ClientChatHub() {
  const session = getSession('admin');
  const staffUserId = session?.user.id ?? '';

  const { data: threadsRes, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<ClientChatThread[]>>('/control-room/client-chats'),
    [],
  );

  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [activeClient, setActiveClient] = useState<ClientSummary | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads = threadsRes?.data ?? [];

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const name = `${t.client.firstName} ${t.client.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        t.client.email.toLowerCase().includes(q) ||
        previewText(t.lastMessage).toLowerCase().includes(q)
      );
    });
  }, [threads, search]);

  const loadThread = useCallback(async (clientUserId: string) => {
    setThreadLoading(true);
    setThreadError(null);
    try {
      const res = await adminApi.get<ApiResponse<ThreadDetail>>(
        `/control-room/client-chats/${clientUserId}/messages`,
      );
      setActiveClientId(clientUserId);
      setActiveClient(res.data.client);
      setMessages(res.data.messages);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (threads.length > 0 && !activeClientId) {
      void loadThread(threads[0].clientUserId);
    }
  }, [threads, activeClientId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeClientId]);

  useEffect(() => {
    if (!session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on(
      'chat:client',
      (payload: SupportChatMessage & { clientUserId: string }) => {
        if (payload.clientUserId === activeClientId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
        reload();
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [session, activeClientId, reload]);

  const sendMessage = useCallback(async () => {
    if (!activeClientId || !content.trim() || sending) return;
    setSending(true);
    try {
      const res = await adminApi.post<ApiResponse<SupportChatMessage>>(
        `/control-room/client-chats/${activeClientId}/messages`,
        { content },
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setContent('');
      reload();
    } finally {
      setSending(false);
    }
  }, [activeClientId, content, reload, sending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  if (loading) return <LoadingSpinner label="Loading client chats..." />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="client-chat-hub">
      <aside className="client-chat-hub__list">
        <label className="client-chat-hub__search" htmlFor="client-chat-search">
          <input
            id="client-chat-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            autoComplete="off"
          />
        </label>
        {filteredThreads.length === 0 ? (
          <p className="text-muted client-chat-hub__empty">
            No client conversations yet. Messages appear when a client contacts control room.
          </p>
        ) : (
          <ul className="client-chat-hub__threads">
            {filteredThreads.map((thread) => {
              const active = thread.clientUserId === activeClientId;
              return (
                <li key={thread.clientUserId}>
                  <button
                    type="button"
                    className={`client-chat-hub__thread ${active ? 'client-chat-hub__thread--active' : ''}`}
                    onClick={() => void loadThread(thread.clientUserId)}
                  >
                    <strong>
                      {thread.client.firstName} {thread.client.lastName}
                    </strong>
                    <span className="text-muted">{previewText(thread.lastMessage)}</span>
                    {thread.lastMessage ? (
                      <time dateTime={thread.updatedAt}>{formatListTime(thread.updatedAt)}</time>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="client-chat-hub__pane">
        {!activeClientId ? (
          <p className="text-muted client-chat-hub__placeholder">
            Select a client conversation to view and reply.
          </p>
        ) : threadLoading ? (
          <LoadingSpinner label="Loading messages..." />
        ) : threadError ? (
          <ErrorAlert error={threadError} onRetry={() => void loadThread(activeClientId)} />
        ) : (
          <>
            <div className="client-chat-hub__head">
              <div>
                <strong>
                  {activeClient?.firstName} {activeClient?.lastName}
                </strong>
                <span className="text-muted">
                  {activeClient?.phone ?? activeClient?.email ?? 'Client'}
                </span>
              </div>
              <span className="badge badge--live">LIVE</span>
            </div>

            <div className="chat-messages client-chat-hub__messages">
              {messages.length === 0 ? (
                <p className="chat-empty text-muted">No messages in this thread yet.</p>
              ) : (
                messages.map((m) => {
                  const isSelf = m.sender.id === staffUserId;
                  const isClient = m.sender.role === 'USER' || m.sender.role === 'FAMILY_MEMBER';
                  return (
                    <div
                      key={m.id}
                      className={`chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}`}
                    >
                      {!isSelf && (
                        <span className="chat-sender">
                          {isClient
                            ? `${m.sender.firstName} ${m.sender.lastName}`
                            : `${m.sender.firstName} · Dispatch`}
                        </span>
                      )}
                      <p>{m.content}</p>
                      <span className="chat-time">{formatListTime(m.createdAt)}</span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form className="chat-composer client-chat-hub__composer" onSubmit={handleSend}>
              <textarea
                className="chat-composer__input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Reply to ${activeClient?.firstName ?? 'client'}…`}
                rows={2}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="submit"
                className="btn-primary chat-composer__send"
                disabled={sending || !content.trim()}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

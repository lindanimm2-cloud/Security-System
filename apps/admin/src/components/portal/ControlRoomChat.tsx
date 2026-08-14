'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';

export type SupportChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
};

type SupportChatData = {
  conversationId: string;
  clientUserId: string;
  messages: SupportChatMessage[];
};

const STAFF_ROLES = new Set([
  'DISPATCHER',
  'SUPERVISOR',
  'MANAGER',
  'TENANT_ADMIN',
  'OWNER',
  'SUPER_ADMIN',
  'SALES',
  'DEVELOPER',
]);

function isStaff(role: string) {
  return STAFF_ROLES.has(role) || role === 'OFFICER';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ControlRoomChat() {
  const session = getSession('client');
  const currentUserId = session?.user.id ?? '';

  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<SupportChatData>>('/client/messages'),
    [],
  );

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.data?.messages) setMessages(data.data.messages);
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!session || !currentUserId) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on(
      'chat:client',
      (payload: SupportChatMessage & { clientUserId: string }) => {
        if (payload.clientUserId !== currentUserId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [session, currentUserId]);

  const sendMessage = useCallback(async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await clientApi.post<ApiResponse<SupportChatMessage>>('/client/messages', {
        content,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setContent('');
    } finally {
      setSending(false);
    }
  }, [content, sending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  if (loading) return <LoadingSpinner label="Loading chat..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="chat-box chat-box--support">
      <div className="chat-header-bar">
        <div>
          <strong>Control room</strong>
          <p className="text-muted">
            Secure chat with dispatch — for updates, questions, and non-emergency support.
          </p>
        </div>
        <span className="badge badge--live">LIVE</span>
      </div>

      <div className="chat-support-notice">
        <p className="text-muted">
          For emergencies use{' '}
          <Link href="/portal/protect" className="interactive-text">
            Protect
          </Link>{' '}
          or hold panic. This chat is monitored during business hours and linked to your account.
        </p>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty text-muted">
            No messages yet. Say hello — a dispatcher will respond when available.
          </p>
        ) : (
          messages.map((m) => {
            const fromStaff = isStaff(m.sender.role);
            const isSelf = m.sender.id === currentUserId;
            return (
              <div
                key={m.id}
                className={`chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}`}
              >
                {!isSelf && (
                  <span className="chat-sender">
                    {fromStaff ? 'Control room' : `${m.sender.firstName} ${m.sender.lastName}`}
                  </span>
                )}
                <p>{m.content}</p>
                <span className="chat-time">{formatTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        <textarea
          className="chat-composer__input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message control room…"
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
    </div>
  );
}

'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { getSocketUrl } from '@/lib/socket';

type FamilyMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
};

type FamilyChatData = {
  familyId: string;
  familyMessagingEnabled: boolean;
  messages: FamilyMessage[];
  eligibleMembers: { id: string; name: string }[];
};

export function FamilyChat() {
  const session = getSession('client');
  const currentUserId = session?.user.id ?? '';

  const { data: settings, reload: reloadSettings } = useApi(
    () =>
      clientApi.get<
        ApiResponse<{
          familyMessagingEnabled: boolean;
          familyId: string | null;
          controlRoomAlwaysOn: boolean;
          eligibleMembers: { id: string; name: string }[];
        }>
      >('/client/communication-settings'),
    [],
  );

  const enabled = settings?.data?.familyMessagingEnabled ?? false;

  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clientApi.get<ApiResponse<FamilyChatData>>('/client/family/messages');
      setMessages(res.data.messages);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'load'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void loadMessages();
  }, [enabled, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!enabled || !settings?.data?.familyId || !session) return;

    const socket: Socket = io(`${getSocketUrl()}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('chat:family', (payload: FamilyMessage & { familyId: string }) => {
      if (payload.familyId !== settings.data.familyId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, settings?.data?.familyId, session]);

  const toggleMessaging = useCallback(async () => {
    const next = !enabled;
    setToggling(true);
    try {
      await clientApi.patch('/client/communication-settings', {
        familyMessagingEnabled: next,
      });
      await reloadSettings();
      if (next) void loadMessages();
      if (!next) setMessages([]);
    } finally {
      setToggling(false);
    }
  }, [enabled, loadMessages, reloadSettings]);

  const sendMessage = useCallback(async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await clientApi.post<ApiResponse<FamilyMessage>>('/client/family/messages', {
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

  if (!settings) return <LoadingSpinner label="Loading..." fullScreen />;

  if (!settings.data.familyId) {
    return (
      <div className="portal-card">
        <h2>Family messaging unavailable</h2>
        <p className="text-muted">
          Link a family group first. Only spouses and family members with the app can message each other.
        </p>
        <Link href="/portal/family" className="btn-primary">Go to Family Safety</Link>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="portal-card family-chat-disabled">
        <h2>Family messaging is off</h2>
        <p className="text-muted">
          For your privacy, messaging is disabled by default. When enabled, you can only chat with
          linked family members who also have the app and have turned messaging on.
        </p>
        <p className="text-muted">
          <strong>Control room contact is always available</strong> through the Emergency Hub — panic,
          medical, fire, and theft alerts reach dispatch directly. No outside communication is permitted.
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={toggling}
          onClick={() => void toggleMessaging()}
        >
          {toggling ? 'Enabling…' : 'Enable family messaging'}
        </button>
      </div>
    );
  }

  if (loading) return <LoadingSpinner label="Loading family chat..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={loadMessages} />;

  const eligible = settings.data.eligibleMembers;

  return (
    <div className="chat-box chat-box--family">
      <div className="chat-header-bar">
        <div>
          <strong>Family Chat</strong>
          <p className="text-muted">
            Private chat with linked family on the app only ({eligible.length} member
            {eligible.length === 1 ? '' : 's'} active)
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={toggling}
          onClick={() => void toggleMessaging()}
        >
          Turn off
        </button>
      </div>

      {eligible.length < 2 && (
        <div className="alert alert--info">
          Ask your spouse or family member to enable family messaging on their app to start chatting.
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty text-muted">No messages yet. Say hello to your family.</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.sender.id === currentUserId;
            return (
              <div
                key={m.id}
                className={`chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}`}
              >
                <span className="chat-sender">
                  {m.sender.firstName} {m.sender.lastName}
                </span>
                <p>{m.content}</p>
                <span className="chat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
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
          placeholder="Message your family…"
          rows={1}
          disabled={sending || eligible.length < 2}
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
          disabled={sending || !content.trim() || eligible.length < 2}
        >
          {sending ? <LoadingSpinner label="" size="sm" /> : 'Send'}
        </button>
      </form>
    </div>
  );
}

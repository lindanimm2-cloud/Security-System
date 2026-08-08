'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { FormEvent, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { DISPATCH_QUICK_MESSAGES } from '@/lib/dispatch-quick-messages';

type Message = {
  id: string;
  content: string;
  createdAt: string;
  sender: { firstName: string; lastName: string; role: string };
};

const OFFICER_QUICK = [
  { label: 'En route', text: 'En route to incident. ETA updating.' },
  { label: 'On scene', text: 'On scene — assessing situation.' },
  { label: 'Need backup', text: 'Requesting backup at current location.' },
  { label: 'All clear', text: 'Situation resolved. Clearing scene.' },
  { label: 'Traffic delay', text: 'Delayed due to traffic. Still en route.' },
  ...DISPATCH_QUICK_MESSAGES.slice(0, 4),
];

export default function OfficerMessagesPage() {
  return (
    <OfficerLayout title="Dispatch Chat">
      <MessagesContent />
    </OfficerLayout>
  );
}

function MessagesContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<{ messages: Message[] }>>('/officer/messages'),
    [],
  );
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await officerApi.post('/officer/messages', { content: text });
      setContent('');
      reload();
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage(content);
  }

  if (loading) return <LoadingSpinner label="Loading messages..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content page-content--chat">
      <div className="chat-box">
        <div className="chat-messages">
          {data!.data.messages.length === 0 ? (
            <p className="chat-empty text-muted">No messages yet. Contact control room below.</p>
          ) : (
            data!.data.messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.sender.role === 'OFFICER' ? 'chat-bubble--self' : 'chat-bubble--other'}`}
              >
                <span className="chat-sender">{m.sender.firstName} {m.sender.lastName}</span>
                <p>{m.content}</p>
                <span className="chat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>

        <div className="chat-quick-replies">
          <span className="chat-quick-replies-label">Quick updates</span>
          <div className="chat-quick-replies-grid">
            {OFFICER_QUICK.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chat-quick-reply"
                disabled={sending}
                onClick={() => sendMessage(item.text)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form className="chat-input" onSubmit={handleSend}>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message control room..."
            disabled={sending}
          />
          <button type="submit" className="btn-primary" disabled={sending || !content.trim()}>
            {sending ? <LoadingSpinner label="" size="sm" /> : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { type ApiResponse, adminApi, clientApi, officerApi } from '@/lib/api-client';
import type { AuthPortal } from '@/lib/auth';

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
};

function apiFor(portal: AuthPortal) {
  if (portal === 'officer') return officerApi;
  if (portal === 'client') return clientApi;
  return adminApi;
}

export function IncidentChat({
  incidentId,
  portal,
}: {
  incidentId: string;
  portal: AuthPortal;
}) {
  const api = apiFor(portal);
  const { data, reload } = useApi(
    () =>
      api.get<ApiResponse<{ conversationId: string; messages: ChatMessage[]; publicRef?: string }>>(
        `/incidents/${incidentId}/chat`,
      ),
    [incidentId, portal],
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  usePlatformEvents(portal, ['message.created'], () => reload(), incidentId);

  const send = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!draft.trim()) return;
      setSending(true);
      try {
        await api.post(`/incidents/${incidentId}/chat`, { content: draft.trim() });
        setDraft('');
        reload();
      } finally {
        setSending(false);
      }
    },
    [api, draft, incidentId, reload],
  );

  const messages = data?.data?.messages ?? [];

  return (
    <section className="incident-chat">
      <h3 className="incident-chat__title">Incident room</h3>
      <div className="incident-chat__log">
        {messages.length === 0 ? (
          <p className="text-muted">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <p key={m.id} className="incident-chat__msg">
              <strong>
                {m.sender.firstName} {m.sender.lastName}
              </strong>
              <span>{m.content}</span>
            </p>
          ))
        )}
      </div>
      <form className="incident-chat__form" onSubmit={(e) => void send(e)}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message this incident…"
        />
        <button type="submit" className="btn-sm btn-primary" disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}

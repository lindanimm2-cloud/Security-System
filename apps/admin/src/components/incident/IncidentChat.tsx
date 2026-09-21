'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { type ApiResponse, adminApi, clientApi, officerApi } from '@/lib/api-client';
import type { AuthPortal } from '@/lib/auth';

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  to?: string | null;
  sender: { id: string; firstName: string; lastName: string; role: string };
};

export type IncidentChatParty = {
  id: string;
  label: string;
  hint?: string;
};

function apiFor(portal: AuthPortal) {
  if (portal === 'officer') return officerApi;
  if (portal === 'client') return clientApi;
  return adminApi;
}

export function IncidentChat({
  incidentId,
  portal,
  parties,
  compact = false,
  defaultPartyId,
}: {
  incidentId: string;
  portal: AuthPortal;
  parties?: IncidentChatParty[];
  compact?: boolean;
  defaultPartyId?: string;
}) {
  const api = apiFor(portal);
  const options = useMemo<IncidentChatParty[]>(
    () =>
      parties?.length
        ? parties
        : [{ id: 'room', label: 'Incident room', hint: 'Everyone on this job' }],
    [parties],
  );
  const [to, setTo] = useState(defaultPartyId ?? options[0]?.id ?? 'room');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { data, reload } = useApi(
    () =>
      api.get<
        ApiResponse<{ conversationId: string; messages: ChatMessage[]; publicRef?: string }>
      >(`/incidents/${incidentId}/chat?to=${encodeURIComponent(to)}`),
    [incidentId, portal, to],
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  usePlatformEvents(portal, ['message.created'], () => reload(), incidentId);

  useEffect(() => {
    if (!options.some((p) => p.id === to)) {
      setTo(options[0]?.id ?? 'room');
    }
  }, [options, to]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const active = options.find((p) => p.id === to) ?? options[0];

  const send = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!draft.trim()) return;
      setSending(true);
      try {
        await api.post(`/incidents/${incidentId}/chat`, { content: draft.trim(), to });
        setDraft('');
        reload();
      } finally {
        setSending(false);
      }
    },
    [api, draft, incidentId, reload, to],
  );

  const messages = data?.data?.messages ?? [];

  return (
    <section className={`incident-chat ${compact ? 'incident-chat--compact' : ''}`.trim()}>
      {compact ? null : <h3 className="incident-chat__title">Incident room</h3>}

      {options.length > 1 ? (
        <div className="incident-chat__to" ref={menuRef}>
          <button
            type="button"
            className={`incident-chat__to-btn ${menuOpen ? 'is-open' : ''}`}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="incident-chat__to-kicker">To</span>
            <span className="incident-chat__to-label">{active?.label ?? 'Select'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {menuOpen ? (
            <ul className="incident-chat__to-menu" role="listbox" aria-label="Chat recipient">
              {options.map((party) => (
                <li key={party.id} role="option" aria-selected={party.id === to}>
                  <button
                    type="button"
                    className={`incident-chat__to-option ${party.id === to ? 'is-active' : ''}`}
                    onClick={() => {
                      setTo(party.id);
                      setMenuOpen(false);
                      setDraft('');
                    }}
                  >
                    <strong>{party.label}</strong>
                    {party.hint ? <span>{party.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

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
          placeholder={
            active?.label ? `Message ${active.label}…` : 'Message this incident…'
          }
        />
        <button type="submit" className="btn-sm btn-primary" disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}

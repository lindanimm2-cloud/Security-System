'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { pushIncidentChatToast } from '@/components/control-room/IncidentChatToast';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { type ApiResponse, adminApi, clientApi, officerApi } from '@/lib/api-client';
import type { AuthPortal } from '@/lib/auth';
import {
  sendIncidentChatMessage,
  type IncidentChatAttachment,
  type IncidentChatMessage,
  type IncidentChatSaveTarget,
} from '@/lib/incident-chat-api';
import { resolveMediaUrl } from '@/lib/media-url';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export type IncidentChatParty = {
  id: string;
  label: string;
  hint?: string;
  phone?: string | null;
  userId?: string | null;
};

type DocFolder = { id: string; name: string };

function apiFor(portal: AuthPortal) {
  if (portal === 'officer') return officerApi;
  if (portal === 'client') return clientApi;
  return adminApi;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentKindLabel(kind: IncidentChatAttachment['kind']) {
  if (kind === 'IMAGE') return 'Image';
  if (kind === 'VIDEO') return 'Video';
  return 'Document';
}

function AttachmentPreview({ attachment }: { attachment: IncidentChatAttachment }) {
  const url = resolveMediaUrl(attachment.fileUrl) ?? attachment.fileUrl;
  if (attachment.kind === 'IMAGE') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="incident-chat__attach-preview incident-chat__attach-preview--image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.fileName} />
      </a>
    );
  }
  if (attachment.kind === 'VIDEO') {
    return (
      <div className="incident-chat__attach-preview incident-chat__attach-preview--video">
        <video src={url} controls preload="metadata" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="incident-chat__attach-preview incident-chat__attach-preview--file"
    >
      <span aria-hidden>📎</span>
      <span>
        <strong>{attachment.fileName}</strong>
        <small>
          {attachmentKindLabel(attachment.kind)} · {formatFileSize(attachment.fileSize)}
        </small>
      </span>
    </a>
  );
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
  const calls = useCallsOptional();
  const options = useMemo<IncidentChatParty[]>(
    () =>
      parties?.length
        ? parties
        : [{ id: 'room', label: 'Incident room', hint: 'Everyone on this job' }],
    [parties],
  );
  const [to, setTo] = useState(defaultPartyId ?? options[0]?.id ?? 'room');
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saveTo, setSaveTo] = useState<IncidentChatSaveTarget>('chat');
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [sendError, setSendError] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const attachRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const { data, reload } = useApi(
    () =>
      api.get<
        ApiResponse<{
          conversationId: string;
          messages: IncidentChatMessage[];
          publicRef?: string;
        }>
      >(`/incidents/${incidentId}/chat?to=${encodeURIComponent(to)}`),
    [incidentId, portal, to],
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  usePlatformEvents(
    portal,
    ['message.created'],
    (payload) => {
      reload();
      if (portal !== 'admin') return;
      const msg = payload.message as
        | {
            id?: string;
            content?: string;
            sender?: { firstName?: string; lastName?: string };
          }
        | undefined;
      if (!msg?.content) return;
      const senderName = [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ');
      pushIncidentChatToast({
        id: msg.id,
        incidentId,
        title: senderName || 'Incident chat',
        body: msg.content,
      });
    },
    incidentId,
  );

  useEffect(() => {
    if (!options.some((p) => p.id === to)) {
      setTo(options[0]?.id ?? 'room');
    }
  }, [options, to]);

  useEffect(() => {
    if (portal !== 'admin') return;
    let cancelled = false;
    void adminApi
      .get<ApiResponse<{ folders?: DocFolder[] }>>('/control-room/documents/library')
      .then((res) => {
        if (cancelled) return;
        setFolders(res.data?.folders ?? []);
      })
      .catch(() => {
        if (!cancelled) setFolders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [portal]);

  useEffect(() => {
    if (!menuOpen && !attachOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (attachOpen && attachRef.current && !attachRef.current.contains(target)) {
        setAttachOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen, attachOpen]);

  const active = options.find((p) => p.id === to) ?? options[0];
  const canCall = Boolean(active?.phone || active?.userId) && Boolean(calls);

  const addFiles = useCallback((picked: File[]) => {
    if (!picked.length) return;
    setPendingFiles((prev) => [...prev, ...picked].slice(0, 5));
    setAttachOpen(false);
    setSendError('');
  }, []);

  const dial = useCallback(async () => {
    if (!calls || !active) return;
    if (!active.phone && !active.userId) return;
    setCallBusy(true);
    try {
      if (active.userId) {
        await calls.startCall('INTERNAL', {
          name: active.label,
          userId: active.userId,
          phone: active.phone ?? undefined,
          role: active.hint,
          incidentId,
        });
      } else if (active.phone) {
        await calls.startCall('EXTERNAL', {
          name: active.label,
          phone: active.phone,
          role: active.hint,
          incidentId,
        });
      }
    } catch (err) {
      alert(friendlyErrorMessage(err, 'call'));
    } finally {
      setCallBusy(false);
    }
  }, [active, calls, incidentId]);

  const send = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const content = draft.trim();
      if (!content && pendingFiles.length === 0) return;
      setSending(true);
      setSendError('');
      try {
        const res = await sendIncidentChatMessage(portal, incidentId, {
          content,
          to,
          files: pendingFiles,
          saveTo,
        });
        const sent = res.data;
        setDraft('');
        setPendingFiles([]);
        reload();
        if (portal === 'admin') {
          const preview =
            sent?.content ||
            (pendingFiles.length === 1
              ? `Sent ${pendingFiles[0].name}`
              : pendingFiles.length > 1
                ? `Sent ${pendingFiles.length} attachments`
                : 'Message sent');
          pushIncidentChatToast({
            id: sent?.id,
            incidentId,
            title: `To ${active?.label ?? 'incident'}`,
            body: preview,
          });
        }
      } catch (err) {
        setSendError(friendlyErrorMessage(err, 'upload'));
      } finally {
        setSending(false);
      }
    },
    [active?.label, draft, incidentId, pendingFiles, portal, reload, saveTo, to],
  );

  const messages = data?.data?.messages ?? [];

  return (
    <section className={`incident-chat ${compact ? 'incident-chat--compact' : ''}`.trim()}>
      {compact ? null : <h3 className="incident-chat__title">Incident chat</h3>}

      <div className="incident-chat__toolbar">
        {options.length > 1 ? (
          <div className="incident-chat__to" ref={menuRef}>
            <button
              type="button"
              className={`incident-chat__to-btn ${menuOpen ? 'is-open' : ''}`}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setAttachOpen(false);
                setMenuOpen((v) => !v);
              }}
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
        ) : (
          <div className="incident-chat__to-static">
            <span className="incident-chat__to-kicker">To</span>
            <span className="incident-chat__to-label">{active?.label ?? 'Incident room'}</span>
          </div>
        )}

        {canCall ? (
          <button
            type="button"
            className="incident-chat__call-btn"
            title={`Call ${active?.label ?? 'contact'}`}
            aria-label={`Call ${active?.label ?? 'contact'}`}
            disabled={callBusy || sending}
            onClick={() => void dial()}
          >
            <PhoneIcon />
            <span>{callBusy ? 'Calling…' : 'Call'}</span>
          </button>
        ) : null}
      </div>

      <div className="incident-chat__log">
        {messages.length === 0 ? (
          <p className="text-muted">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="incident-chat__msg">
              <strong>
                {m.sender.firstName} {m.sender.lastName}
              </strong>
              {m.content ? <span>{m.content}</span> : null}
              {m.attachments && m.attachments.length > 0 ? (
                <div className="incident-chat__msg-attachments">
                  {m.attachments.map((a) => (
                    <AttachmentPreview key={a.id} attachment={a} />
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {pendingFiles.length > 0 ? (
        <div className="incident-chat__pending">
          {pendingFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="incident-chat__pending-item">
              <span className="incident-chat__pending-name">{file.name}</span>
              <small>{formatFileSize(file.size)}</small>
              <button
                type="button"
                className="incident-chat__pending-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <label className="incident-chat__save">
            <span>Save to</span>
            <select
              value={saveTo}
              onChange={(e) => setSaveTo(e.target.value)}
              aria-label="Where to save attachments"
            >
              <option value="chat">Chat only</option>
              <option value="incident">This incident (evidence)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  Library · {folder.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {sendError ? <p className="incident-chat__error">{sendError}</p> : null}

      <form className="incident-chat__form" onSubmit={(e) => void send(e)}>
        <div className="incident-chat__composer">
          <div className="incident-chat__attach-wrap" ref={attachRef}>
            <button
              type="button"
              className={`incident-chat__tool-btn ${attachOpen ? 'is-active' : ''}`}
              title="Attach image, video, or document"
              aria-label="Attach image, video, or document"
              aria-expanded={attachOpen}
              disabled={sending}
              onClick={() => {
                setMenuOpen(false);
                setAttachOpen((o) => !o);
              }}
            >
              <AttachIcon />
            </button>
            {attachOpen ? (
              <div className="incident-chat__attach-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <span aria-hidden>🖼</span> Image
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <span aria-hidden>🎥</span> Video
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => docInputRef.current?.click()}
                >
                  <span aria-hidden>📄</span> Document
                </button>
              </div>
            ) : null}
            <input
              ref={imageInputRef}
              type="file"
              className="incident-chat__file-input"
              accept="image/*"
              multiple
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              className="incident-chat__file-input"
              accept="video/*"
              multiple
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              className="incident-chat__file-input"
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              multiple
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              active?.label ? `Message ${active.label}…` : 'Message this incident…'
            }
          />
        </div>
        <button
          type="submit"
          className="btn-sm btn-primary"
          disabled={sending || (!draft.trim() && pendingFiles.length === 0)}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}

function AttachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a6 6 0 0012 0V6h-1.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

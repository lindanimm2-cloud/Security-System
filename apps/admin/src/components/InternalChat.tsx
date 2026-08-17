'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { io, Socket } from 'socket.io-client';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { CHAT_EMOJIS } from '@/lib/chat-emojis';
import { fetchInternalChat, sendInternalChatMessage, type ChatChannel } from '@/lib/internal-chat-api';
import { type AuthPortal, getSession } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';
import { resolveMediaUrl } from '@/lib/media-url';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { UiSelect } from '@/components/ui/UiSelect';

export type ChatAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  kind: 'IMAGE' | 'VIDEO' | 'FILE';
};

export type ChatParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  branch?: { id: string; name: string; code: string } | null;
};

export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: ChatParticipant;
  attachments?: ChatAttachment[];
};

const TEAM_ID = '__team__';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Client',
  FAMILY_MEMBER: 'Family',
  OFFICER: 'Officer',
  DISPATCHER: 'Dispatch',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  TENANT_ADMIN: 'Admin',
  OWNER: 'Owner',
  SUPER_ADMIN: 'Super Admin',
  SALES: 'Sales',
  TECHNICIAN: 'Technician',
  DEVELOPER: 'Developer',
};

const CHANNEL_META: Record<
  ChatChannel,
  { title: string; teamLabel: string; teamHint: string }
> = {
  internal: {
    title: 'Team chat',
    teamLabel: 'Ops desk',
    teamHint: 'All staff · live channel',
  },
  'tech-team': {
    title: 'Team chat',
    teamLabel: 'Install team',
    teamHint: 'Cameras · alarms · access',
  },
  'dev-support': {
    title: 'Team chat',
    teamLabel: 'Dev support',
    teamHint: 'Developer desk',
  },
};

function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);
  if (dayDiff === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function readReceiptsKey(portal: AuthPortal, channel: ChatChannel, userId: string) {
  return `4ds-chat-read:${portal}:${channel}:${userId}`;
}

function loadReceipts(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveReceipts(key: string, value: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function previewText(message: ChatMessage | undefined) {
  if (!message) return 'No messages yet';
  if (message.content?.trim()) return message.content.trim();
  if (message.attachments?.length) {
    const kind = message.attachments[0].kind;
    if (kind === 'IMAGE') return 'Photo';
    if (kind === 'VIDEO') return 'Video';
    return 'Attachment';
  }
  return 'No messages yet';
}

function PendingFileThumb({ file }: { file: File }) {
  const url = useBlobUrl(file.type.startsWith('image/') ? file : null);
  if (url) {
    return <img src={url} alt={file.name} />;
  }
  return (
    <span className="chat-pending-file__icon">
      {file.type.startsWith('video/') ? '🎥' : '📎'}
    </span>
  );
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const url = resolveMediaUrl(attachment.fileUrl) ?? attachment.fileUrl;
  if (attachment.kind === 'IMAGE') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="chat-attachment chat-attachment--image">
        <img src={url} alt={attachment.fileName} />
      </a>
    );
  }
  if (attachment.kind === 'VIDEO') {
    return (
      <div className="chat-attachment chat-attachment--video">
        <video src={url} controls preload="metadata" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download className="chat-attachment chat-attachment--file">
      <span className="chat-attachment__icon">📎</span>
      <span>
        <strong>{attachment.fileName}</strong>
        <small>{formatFileSize(attachment.fileSize)}</small>
      </span>
    </a>
  );
}

type Thread = {
  id: string;
  kind: 'team' | 'direct';
  title: string;
  subtitle: string;
  preview: string;
  time: string | null;
  unread: number;
  participant?: ChatParticipant;
};

export function InternalChat({
  portal,
  channel = 'internal',
  embedded = false,
}: {
  portal: AuthPortal;
  channel?: ChatChannel;
  embedded?: boolean;
}) {
  const session = getSession(portal);
  const currentUserId = session?.user.id ?? '';
  const firstName = session?.user.firstName ?? 'there';
  const meta = CHANNEL_META[channel];
  const calls = useCallsOptional();

  const { data, loading, error, reload } = useApi(
    () => fetchInternalChat(portal, channel),
    [portal, channel],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(TEAM_ID);
  const [search, setSearch] = useState('');
  const [newChatUserId, setNewChatUserId] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [callBusy, setCallBusy] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const receiptsKey = currentUserId
    ? readReceiptsKey(portal, channel, currentUserId)
    : '';

  useEffect(() => {
    if (data?.data) {
      setMessages(data.data.messages);
      setParticipants(data.data.participants);
    }
  }, [data]);

  useEffect(() => {
    if (!receiptsKey) return;
    setReceipts(loadReceipts(receiptsKey));
  }, [receiptsKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeId]);

  useEffect(() => {
    const s = getSession(portal);
    if (!s) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: s.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [portal]);

  const markRead = useCallback(
    (threadId: string) => {
      if (!receiptsKey) return;
      const next = { ...receipts, [threadId]: new Date().toISOString() };
      setReceipts(next);
      saveReceipts(receiptsKey, next);
    },
    [receipts, receiptsKey],
  );

  useEffect(() => {
    if (!receiptsKey || !activeId) return;
    setReceipts((prev) => {
      const next = { ...prev, [activeId]: new Date().toISOString() };
      saveReceipts(receiptsKey, next);
      return next;
    });
  }, [activeId, messages.length, receiptsKey]);

  const others = useMemo(
    () => participants.filter((p) => p.id !== currentUserId),
    [participants, currentUserId],
  );

  const threads: Thread[] = useMemo(() => {
    const lastTeam = messages[messages.length - 1];
    const teamReadAt = receipts[TEAM_ID] ? new Date(receipts[TEAM_ID]).getTime() : 0;
    const teamUnread = messages.filter(
      (m) => m.sender.id !== currentUserId && new Date(m.createdAt).getTime() > teamReadAt,
    ).length;

    const teamThread: Thread = {
      id: TEAM_ID,
      kind: 'team',
      title: meta.teamLabel,
      subtitle: meta.teamHint,
      preview: lastTeam
        ? `${lastTeam.sender.firstName}: ${previewText(lastTeam)}`
        : 'Start the ops conversation',
      time: lastTeam ? lastTeam.createdAt : null,
      unread: teamUnread,
    };

    const people = others.map((p) => {
      const theirs = messages.filter((m) => m.sender.id === p.id);
      const last = theirs[theirs.length - 1];
      const readAt = receipts[p.id] ? new Date(receipts[p.id]).getTime() : 0;
      const unread = theirs.filter((m) => new Date(m.createdAt).getTime() > readAt).length;
      return {
        id: p.id,
        kind: 'direct' as const,
        title: fullName(p),
        subtitle: `${ROLE_LABELS[p.role] ?? p.role}${p.branch ? ` · ${p.branch.name}` : ''}`,
        preview: previewText(last),
        time: last ? last.createdAt : null,
        unread,
        participant: p,
      };
    });

    people.sort((a, b) => {
      const at = a.time ? new Date(a.time).getTime() : 0;
      const bt = b.time ? new Date(b.time).getTime() : 0;
      return bt - at;
    });

    return [teamThread, ...people];
  }, [messages, others, receipts, currentUserId, meta]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q),
    );
  }, [threads, search]);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unread, 0),
    [threads],
  );

  const activeThread = threads.find((t) => t.id === activeId) ?? threads[0];

  const visibleMessages = useMemo(() => {
    if (!activeThread || activeThread.kind === 'team') return messages;
    return messages.filter((m) => m.sender.id === activeThread.id);
  }, [messages, activeThread]);

  const messageGroups = useMemo(() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    for (const msg of visibleMessages) {
      const date = formatDateSep(msg.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.date !== date) {
        groups.push({ date, items: [msg] });
      } else {
        last.items.push(msg);
      }
    }
    return groups;
  }, [visibleMessages]);

  const insertEmoji = useCallback((emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)].slice(0, 5));
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!content.trim() && pendingFiles.length === 0) || sending) return;
    setSending(true);
    try {
      let body = content;
      if (activeThread?.kind === 'direct' && activeThread.participant) {
        const mention = `@${activeThread.participant.firstName}`;
        if (!body.trim().startsWith(mention)) {
          body = body.trim() ? `${mention} ${body.trim()}` : mention;
        }
      }
      const res = await sendInternalChatMessage(portal, body, pendingFiles, channel);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setContent('');
      setPendingFiles([]);
      setEmojiOpen(false);
    } catch {
      reload();
    } finally {
      setSending(false);
    }
  }, [activeThread, channel, content, pendingFiles, portal, reload, sending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  function openThread(id: string) {
    setActiveId(id);
    setMobileShowThread(true);
    markRead(id);
  }

  function startNewChat() {
    if (!newChatUserId) return;
    openThread(newChatUserId);
    setNewChatUserId('');
  }

  async function dial(
    key: string,
    channelKind: 'INTERNAL' | 'EXTERNAL' | 'WHATSAPP',
    target: { userId?: string; name: string; phone?: string; role?: string },
  ) {
    if (!calls) return;
    setCallBusy(key);
    try {
      await calls.startCall(channelKind, target);
    } catch (err) {
      alert(friendlyErrorMessage(err, 'call'));
    } finally {
      setCallBusy(null);
    }
  }

  const incidentsHref =
    portal === 'officer'
      ? '/officer/queue'
      : portal === 'technician'
        ? '/tech/jobs'
        : '/control-room/incidents';
  const incidentsLabel =
    portal === 'officer' ? 'Queue' : portal === 'technician' ? 'Jobs' : 'Incidents';
  const dispatchHref =
    portal === 'officer'
      ? '/officer/map'
      : portal === 'technician'
        ? '/tech/cameras'
        : '/control-room/dispatch';
  const dispatchLabel =
    portal === 'officer' ? 'Map' : portal === 'technician' ? 'Cams' : 'Dispatch';

  const callTarget = activeThread?.participant
    ? {
        userId: activeThread.participant.id,
        name: fullName(activeThread.participant),
        phone: activeThread.participant.phone ?? undefined,
        role: activeThread.participant.role,
      }
    : null;

  if (loading) return <LoadingSpinner label="Loading chat..." fullScreen={!embedded} />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className={`page-content page-content--chat team-chat${embedded ? ' team-chat--embedded' : ''}`}>
      {!embedded && (
        <header className="team-chat__top">
          <div className="team-chat__intro">
            <p className="team-chat__greeting">
              Hi {firstName}
              {totalUnread > 0 ? ` · ${totalUnread} unread` : ' · All caught up'}
            </p>
          </div>
          <div className="team-chat__top-actions">
            <button
              type="button"
              className="team-chat__pill"
              title="Open ops desk channel"
              onClick={() => openThread(TEAM_ID)}
            >
              <VideoIcon />
              <span>Briefing</span>
            </button>
            <a href={incidentsHref} className="team-chat__pill" title={incidentsLabel}>
              <TasksIcon />
              <span>{incidentsLabel}</span>
            </a>
            <a href={dispatchHref} className="team-chat__pill team-chat__pill--accent" title={dispatchLabel}>
              <CalendarIcon />
              <span>{dispatchLabel}</span>
            </a>
          </div>
        </header>
      )}

      <div
        className={`team-chat__shell ${mobileShowThread ? 'team-chat__shell--thread' : 'team-chat__shell--list'}`}
      >
        <aside className="team-chat__sidebar">
          <div className="team-chat__sidebar-head">
            <h2>Chats</h2>
            <div className="team-chat__sidebar-actions">
              <button
                type="button"
                className="team-chat__link-btn"
                disabled={!!callBusy || (!callTarget && !others[0])}
                onClick={() => {
                  const target = callTarget ?? (others[0]
                    ? {
                        userId: others[0].id,
                        name: fullName(others[0]),
                        phone: others[0].phone ?? undefined,
                        role: others[0].role,
                      }
                    : null);
                  if (!target) return;
                  void dial('sidebar-audio', 'INTERNAL', target);
                }}
              >
                Call
              </button>
              <button
                type="button"
                className="team-chat__new-btn"
                onClick={() => {
                  const el = document.getElementById('team-chat-new-select');
                  el?.focus();
                  if (!newChatUserId && others[0]) setNewChatUserId(others[0].id);
                }}
              >
                <PlusIcon />
                New
              </button>
            </div>
          </div>

          <label className="team-chat__search" htmlFor="team-chat-search">
            <SearchIcon />
            <input
              id="team-chat-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              autoComplete="off"
            />
          </label>

          <div className="team-chat__list">
            {filteredThreads.length === 0 ? (
              <p className="team-chat__empty-list">No chats match your search.</p>
            ) : (
              filteredThreads.map((thread) => {
                const active = thread.id === activeId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={`team-chat__item ${active ? 'team-chat__item--active' : ''}`}
                    onClick={() => openThread(thread.id)}
                  >
                    <span
                      className={`team-chat__avatar ${thread.kind === 'team' ? 'team-chat__avatar--team' : ''}`}
                    >
                      {thread.kind === 'team'
                        ? 'OPS'
                        : initials(thread.participant!)}
                    </span>
                    <span className="team-chat__item-body">
                      <span className="team-chat__item-row">
                        <strong>{thread.title}</strong>
                        <span className="team-chat__item-meta">
                          {thread.time && (
                            <time dateTime={thread.time}>{formatListTime(thread.time)}</time>
                          )}
                          {thread.unread > 0 && (
                            <span className="team-chat__unread">{thread.unread}</span>
                          )}
                        </span>
                      </span>
                      <span className="team-chat__item-preview">{thread.preview}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="team-chat__new">
            <span className="team-chat__new-label">New chat</span>
            <UiSelect
              ariaLabel="New chat teammate"
              className="team-chat__select-ui"
              compact={false}
              value={newChatUserId}
              onChange={setNewChatUserId}
              options={[
                { value: '', label: 'Select teammate…' },
                ...others.map((p) => ({
                  value: p.id,
                  label: fullName(p),
                  meta: ROLE_LABELS[p.role] ?? p.role,
                })),
              ]}
            />
            <button
              type="button"
              className="team-chat__start-btn"
              disabled={!newChatUserId}
              onClick={startNewChat}
            >
              Start chat
            </button>
          </div>
        </aside>

        <section className="team-chat__pane">
          <div className="team-chat__pane-head">
            <button
              type="button"
              className="team-chat__back"
              onClick={() => setMobileShowThread(false)}
              aria-label="Back to chats"
            >
              ←
            </button>
            <span
              className={`team-chat__avatar ${activeThread?.kind === 'team' ? 'team-chat__avatar--team' : ''}`}
            >
              {activeThread?.kind === 'team'
                ? 'OPS'
                : activeThread?.participant
                  ? initials(activeThread.participant)
                  : '?'}
            </span>
            <div className="team-chat__pane-meta">
              <strong>{activeThread?.title ?? meta.teamLabel}</strong>
              <span>{activeThread?.subtitle ?? meta.teamHint}</span>
            </div>
            <div className="team-chat__pane-actions">
              {callTarget && (
                <>
                  <button
                    type="button"
                    className="team-chat__call-btn team-chat__call-btn--primary"
                    disabled={!!callBusy}
                    onClick={() => void dial('video', 'INTERNAL', callTarget)}
                  >
                    <VideoIcon />
                    Video
                  </button>
                  <button
                    type="button"
                    className="team-chat__call-btn"
                    disabled={!!callBusy}
                    onClick={() => void dial('audio', 'INTERNAL', callTarget)}
                  >
                    <PhoneIcon />
                    Audio
                  </button>
                  {callTarget.phone && (
                    <button
                      type="button"
                      className="team-chat__call-btn team-chat__call-btn--icon"
                      disabled={!!callBusy}
                      title="Phone"
                      onClick={() => void dial('phone', 'EXTERNAL', callTarget)}
                    >
                      <PhoneIcon />
                    </button>
                  )}
                </>
              )}
              {!callTarget && (
                <span className="badge badge--live">LIVE</span>
              )}
            </div>
          </div>

          <div className="team-chat__messages">
            {visibleMessages.length === 0 ? (
              <p className="chat-empty text-muted">
                {activeThread?.kind === 'direct'
                  ? `No messages from ${activeThread.title} yet. Say hello below.`
                  : 'No messages yet. Start the conversation.'}
              </p>
            ) : (
              messageGroups.map((group) => (
                <div key={group.date} className="team-chat__day">
                  <div className="team-chat__day-sep">
                    <span>{group.date}</span>
                  </div>
                  {group.items.map((m) => {
                    const isSelf = m.sender.id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`chat-bubble team-chat__bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}`}
                      >
                        {!isSelf && (
                          <div className="chat-bubble__header">
                            <span className="chat-sender">
                              {fullName(m.sender)}
                              <span className="chat-role-badge">
                                {ROLE_LABELS[m.sender.role] ?? m.sender.role}
                              </span>
                              {m.sender.branch && (
                                <span className="chat-branch-badge">{m.sender.branch.code}</span>
                              )}
                            </span>
                            {m.sender.id !== currentUserId && (
                              <button
                                type="button"
                                className="chat-call-btn"
                                title={`Call ${m.sender.firstName}`}
                                onClick={() => openThread(m.sender.id)}
                              >
                                <PhoneIcon />
                              </button>
                            )}
                          </div>
                        )}
                        {m.content && <p>{m.content}</p>}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="chat-attachments">
                            {m.attachments.map((a) => (
                              <AttachmentPreview key={a.id} attachment={a} />
                            ))}
                          </div>
                        )}
                        <span className="chat-time">{formatBubbleTime(m.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {pendingFiles.length > 0 && (
            <div className="chat-pending-files">
              {pendingFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="chat-pending-file">
                  <PendingFileThumb file={file} />
                  <span className="chat-pending-file__name">{file.name}</span>
                  <button
                    type="button"
                    className="chat-pending-file__remove"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="chat-composer team-chat__composer" onSubmit={handleSend}>
            <div className="chat-composer__tools">
              <button
                type="button"
                className="chat-tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo, video, or file"
                aria-label="Attach file"
              >
                <AttachIcon />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="chat-file-input"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="chat-emoji-wrap">
                <button
                  type="button"
                  className={`chat-tool-btn ${emojiOpen ? 'chat-tool-btn--active' : ''}`}
                  onClick={() => setEmojiOpen((o) => !o)}
                  title="Insert emoji"
                  aria-label="Insert emoji"
                  aria-expanded={emojiOpen}
                >
                  <EmojiIcon />
                </button>
                {emojiOpen && (
                  <div className="chat-emoji-picker" role="menu">
                    {CHAT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="chat-emoji-btn"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              ref={inputRef}
              className="chat-composer__input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                activeThread?.kind === 'direct'
                  ? `Message ${activeThread.participant?.firstName ?? 'teammate'}...`
                  : 'Type a message...'
              }
              rows={1}
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
              className="team-chat__send"
              disabled={sending || (!content.trim() && pendingFiles.length === 0)}
            >
              {sending ? <LoadingSpinner label="" size="sm" /> : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a6 6 0 0012 0V6h-1.5z" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}

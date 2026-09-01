'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApi } from '@/hooks/useApi';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { CHAT_EMOJIS } from '@/lib/chat-emojis';
import { getSession } from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { getSocketUrl } from '@/lib/socket';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  familyLocationMapsUrl,
  familyMessagePreview,
  familySenderName,
  parseFamilyLocation,
  sendFamilyChatMessage,
  unwrapFamilyReply,
  type FamilyChatAttachment,
  type FamilyChatMember,
  type FamilyChatMessage,
  type FamilyLocation,
} from '@/lib/family-chat-api';

type FamilyChatData = {
  familyId: string;
  familyMessagingEnabled: boolean;
  messages: FamilyChatMessage[];
  eligibleMembers: FamilyChatMember[];
};

const LOCATION_FALLBACK: FamilyLocation = { lat: -29.8587, lng: 31.0218 };

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDateSep(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function splitMemberName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ')];
  return [name, ''];
}

function PendingFileThumb({ file }: { file: File }) {
  const url = useBlobUrl(file.type.startsWith('image/') ? file : null);
  if (url) return <img src={url} alt={file.name} />;
  return (
    <span className="chat-pending-file__icon">{file.type.startsWith('video/') ? '🎥' : '📎'}</span>
  );
}

function AttachmentPreview({ attachment }: { attachment: FamilyChatAttachment }) {
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

function LocationCard({ lat, lng, isSelf }: { lat: number; lng: number; isSelf: boolean }) {
  const maps = familyLocationMapsUrl(lat, lng);
  return (
    <div className={`fam-chat-loc${isSelf ? ' fam-chat-loc--self' : ''}`}>
      <a className="fam-chat-loc__map" href={maps} target="_blank" rel="noopener noreferrer">
        <span className="fam-chat-loc__pin" aria-hidden />
        <span className="fam-chat-loc__grid" aria-hidden />
        <span className="fam-chat-loc__live">Live</span>
      </a>
      <div className="fam-chat-loc__meta">
        <strong>Live location</strong>
        <span>
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
        <div className="fam-chat-loc__links">
          <a href={maps} target="_blank" rel="noopener noreferrer">
            Open map
          </a>
          <Link href="/portal/location">Family tracking</Link>
        </div>
      </div>
    </div>
  );
}

function readGps(): Promise<FamilyLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(LOCATION_FALLBACK);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(LOCATION_FALLBACK),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  });
}

export function FamilyChat() {
  const session = getSession('client');
  const currentUserId = session?.user.id ?? '';
  const calls = useCallsOptional();

  const { data: settings, reload: reloadSettings } = useApi(
    () =>
      clientApi.get<
        ApiResponse<{
          familyMessagingEnabled: boolean;
          familyId: string | null;
          controlRoomAlwaysOn: boolean;
          eligibleMembers: FamilyChatMember[];
        }>
      >('/client/communication-settings'),
    [],
  );

  const enabled = settings?.data?.familyMessagingEnabled ?? false;

  const [messages, setMessages] = useState<FamilyChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [callPick, setCallPick] = useState<'audio' | 'video' | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<FamilyChatMessage | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const swipeRef = useRef<{ id: string; x: number } | null>(null);

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
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    else bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFiles.length]);

  useEffect(() => {
    if (!enabled || !settings?.data?.familyId || !session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('chat:family', (payload: FamilyChatMessage & { familyId: string }) => {
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
    setMenuOpen(false);
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

  const eligible = settings?.data?.eligibleMembers ?? [];
  const canChat = eligible.length >= 2;
  const callTargets = useMemo(
    () => eligible.filter((m) => m.id !== currentUserId),
    [eligible, currentUserId],
  );

  const messageGroups = useMemo(() => {
    const groups: { date: string; items: FamilyChatMessage[] }[] = [];
    for (const msg of messages) {
      const date = formatDateSep(msg.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.date !== date) groups.push({ date, items: [msg] });
      else last.items.push(msg);
    }
    return groups;
  }, [messages]);

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const sendMessage = useCallback(
    async (opts?: { files?: File[]; location?: FamilyLocation | null; text?: string }) => {
      const text = opts?.text ?? content;
      const files = opts?.files ?? pendingFiles;
      const location = opts?.location ?? null;
      if ((!text.trim() && files.length === 0 && !location) || sending) return;
      if (!canChat) return;
      setSending(true);
      setSendError('');
      try {
        const res = await sendFamilyChatMessage({
          content: text,
          files,
          location,
          replyToId: replyTarget?.id,
        });
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setReplyTarget(null);
        if (!opts) {
          setContent('');
          setPendingFiles([]);
          if (inputRef.current) inputRef.current.style.height = 'auto';
        }
      } catch (err) {
        setSendError(friendlyErrorMessage(err, 'send'));
      } finally {
        setSending(false);
      }
    },
    [canChat, content, pendingFiles, replyTarget, sending],
  );

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  const shareLiveLocation = useCallback(async () => {
    if (!canChat || locBusy || sending) return;
    setLocBusy(true);
    setSendError('');
    try {
      const coords = await readGps();
      await clientApi.post('/client/tracking', coords).catch(() => undefined);
      await sendMessage({ text: '', files: [], location: coords });
    } catch (err) {
      setSendError(friendlyErrorMessage(err, 'share'));
    } finally {
      setLocBusy(false);
    }
  }, [canChat, locBusy, sendMessage, sending]);

  async function dial(member: FamilyChatMember, kind: 'audio' | 'video') {
    setCallBusy(true);
    setCallPick(null);
    try {
      if (calls) {
        await calls.startCall('INTERNAL', {
          name: member.name,
          phone: member.phone ?? undefined,
          userId: member.id,
          role: 'FAMILY_MEMBER',
        });
        return;
      }
      if (member.phone) {
        window.location.href = `tel:${member.phone}`;
        return;
      }
      setSendError(kind === 'video' ? 'In-app video is unavailable right now.' : 'In-app calling is unavailable right now.');
    } catch (err) {
      setSendError(friendlyErrorMessage(err, 'call'));
    } finally {
      setCallBusy(false);
    }
  }

  function startCall(kind: 'audio' | 'video') {
    if (callBusy) return;
    setMenuOpen(false);
    if (callTargets.length === 1) {
      void dial(callTargets[0], kind);
      return;
    }
    if (callTargets.length > 1) {
      setCallPick(kind);
    }
  }

  const startReply = useCallback(
    (message: FamilyChatMessage) => {
      if (!canChat) return;
      setReplyTarget(message);
      setEmojiOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [canChat],
  );

  function scrollToMessage(id: string) {
    const el = threadRef.current?.querySelector(`[data-fam-msg-id="${id}"]`);
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => {
      setFlashId((current) => (current === id ? null : current));
    }, 1400);
  }

  if (!settings) return <LoadingSpinner label="Loading..." fullScreen />;

  if (!settings.data.familyId) {
    return (
      <div className="portal-card">
        <h2>Family messaging unavailable</h2>
        <p className="text-muted">
          Link a family group first. Only spouses and family members with the app can message each other.
        </p>
        <Link href="/portal/family" className="btn-primary">
          Go to Family Safety
        </Link>
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
          <strong>Control room chat is always available</strong> on{' '}
          <Link href="/portal/chat" className="interactive-text">
            Control Room Chat
          </Link>
          . For emergencies use the Emergency Hub — panic, medical, fire, and theft alerts reach
          dispatch directly.
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

  const [avatarFirst, avatarLast] = splitMemberName(callTargets[0]?.name ?? 'Family Chat');

  return (
    <div className="chat-box chat-box--family">
      <header className="fam-chat-head">
        <Link href="/portal/family" className="fam-chat-head__back" aria-label="Back to Family Safety">
          <BackIcon />
        </Link>
        <UserAvatar firstName={avatarFirst} lastName={avatarLast} size="sm" />
        <div className="fam-chat-head__meta">
          <strong>Family Chat</strong>
          <p>
            Private · {eligible.length} member{eligible.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="fam-chat-head__actions">
          <button
            type="button"
            className="fam-chat-icon-btn"
            title="Video call"
            aria-label="Start a video call"
            disabled={callBusy || callTargets.length === 0}
            onClick={() => startCall('video')}
          >
            <VideoIcon />
          </button>
          <button
            type="button"
            className="fam-chat-icon-btn"
            title="Call family"
            aria-label="Start an internal call"
            disabled={callBusy || callTargets.length === 0}
            onClick={() => startCall('audio')}
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            className={`fam-chat-icon-btn${menuOpen ? ' fam-chat-icon-btn--on' : ''}`}
            title="More"
            aria-label="Chat options"
            aria-expanded={menuOpen}
            onClick={() => {
              setCallPick(null);
              setMenuOpen((o) => !o);
            }}
          >
            <MoreIcon />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fam-chat-menu" role="menu">
          <button type="button" role="menuitem" disabled={toggling} onClick={() => void toggleMessaging()}>
            {toggling ? 'Turning off…' : 'Turn off family chat'}
          </button>
          <Link href="/portal/location" role="menuitem" onClick={() => setMenuOpen(false)}>
            Family tracking
          </Link>
          <Link href="/portal/family" role="menuitem" onClick={() => setMenuOpen(false)}>
            Family safety
          </Link>
        </div>
      )}

      {callPick && (
        <div className="fam-chat-sheet" role="dialog" aria-label="Choose who to call">
          <p>Call with {callPick === 'video' ? 'video' : 'audio'}</p>
          {callTargets.map((member) => (
            <button
              key={member.id}
              type="button"
              disabled={callBusy}
              onClick={() => void dial(member, callPick)}
            >
              <UserAvatar firstName={splitMemberName(member.name)[0]} lastName={splitMemberName(member.name)[1]} size="sm" />
              <span>
                <strong>{member.name}</strong>
                <small>In-app {callPick === 'video' ? 'video' : 'call'}</small>
              </span>
            </button>
          ))}
          <button type="button" className="fam-chat-sheet__cancel" onClick={() => setCallPick(null)}>
            Cancel
          </button>
        </div>
      )}

      {!canChat && (
        <div className="alert alert--info fam-chat-notice">
          Ask your spouse or family member to enable family messaging on their app to start chatting.
        </div>
      )}

      <div className="fam-chat-thread" ref={threadRef}>
        {messages.length === 0 ? (
          <p className="chat-empty text-muted">No messages yet. Say hello to your family.</p>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date} className="fam-chat-day">
              <div className="fam-chat-day__sep">
                <span>{group.date}</span>
              </div>
              {group.items.map((m) => {
                const isSelf = m.sender.id === currentUserId;
                const parsed = unwrapFamilyReply(m.content);
                const location = parseFamilyLocation(parsed.body);
                const body = parsed.body;
                const showText =
                  !location &&
                  !!body &&
                  !(m.attachments?.length && body.startsWith('Sent '));
                return (
                  <div
                    key={m.id}
                    className={`fam-chat-row${isSelf ? ' fam-chat-row--self' : ''}`}
                    onTouchStart={(e) => {
                      swipeRef.current = { id: m.id, x: e.changedTouches[0]?.clientX ?? 0 };
                    }}
                    onTouchEnd={(e) => {
                      const start = swipeRef.current;
                      swipeRef.current = null;
                      if (!start || start.id !== m.id) return;
                      const dx = (e.changedTouches[0]?.clientX ?? 0) - start.x;
                      if (dx > 56) startReply(m);
                    }}
                  >
                    <button
                      type="button"
                      className="fam-chat-reply-btn"
                      title="Reply"
                      aria-label="Reply to this message"
                      disabled={!canChat}
                      onClick={() => startReply(m)}
                    >
                      <ReplyIcon />
                    </button>
                    <div
                      data-fam-msg-id={m.id}
                      className={`chat-bubble fam-chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}${flashId === m.id ? ' fam-chat-bubble--flash' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        startReply(m);
                      }}
                    >
                      {!isSelf && (
                        <span className="chat-sender">
                          {m.sender.firstName} {m.sender.lastName}
                        </span>
                      )}
                      {parsed.quote && (
                        <button
                          type="button"
                          className="fam-chat-quote"
                          onClick={() => scrollToMessage(parsed.quote!.id)}
                        >
                          <strong>{parsed.quote.name}</strong>
                          <span>{parsed.quote.text}</span>
                        </button>
                      )}
                      {location ? (
                        <LocationCard lat={location.lat} lng={location.lng} isSelf={isSelf} />
                      ) : (
                        showText && <p>{body}</p>
                      )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="chat-attachments">
                          {m.attachments.map((a) => (
                            <AttachmentPreview key={a.id} attachment={a} />
                          ))}
                        </div>
                      )}
                      <span className="chat-time">{formatBubbleTime(m.createdAt)}</span>
                    </div>
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

      {sendError && (
        <p className="fam-chat-error" role="alert">
          {sendError}
        </p>
      )}

      <form className="chat-composer fam-chat-composer" onSubmit={handleSend}>
        {replyTarget && (
          <div className="fam-chat-replying">
            <button
              type="button"
              className="fam-chat-replying__jump"
              onClick={() => scrollToMessage(replyTarget.id)}
            >
              <strong>Replying to {familySenderName(replyTarget.sender)}</strong>
              <span>{familyMessagePreview(replyTarget)}</span>
            </button>
            <button
              type="button"
              className="fam-chat-replying__close"
              aria-label="Cancel reply"
              onClick={() => setReplyTarget(null)}
            >
              ×
            </button>
          </div>
        )}
        <div className="fam-chat-composer__row">
          <div className="chat-composer__tools">
          <button
            type="button"
            className="chat-tool-btn fam-chat-tool"
            onClick={() => fileInputRef.current?.click()}
            title="Attach photo, video, or file"
            aria-label="Attach file"
            disabled={!canChat || sending}
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
              const picked = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (picked.length) {
                setPendingFiles((prev) => [...prev, ...picked].slice(0, 5));
              }
            }}
          />
          <button
            type="button"
            className="chat-tool-btn fam-chat-tool"
            onClick={() => void shareLiveLocation()}
            title="Share live location"
            aria-label="Share live location"
            disabled={!canChat || sending || locBusy}
          >
            {locBusy ? <LoadingSpinner label="" size="sm" /> : <PinIcon />}
          </button>
          <div className="chat-emoji-wrap">
            <button
              type="button"
              className={`chat-tool-btn fam-chat-tool${emojiOpen ? ' chat-tool-btn--active' : ''}`}
              onClick={() => setEmojiOpen((o) => !o)}
              title="Insert emoji"
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              disabled={!canChat}
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
                    onClick={() => {
                      setContent((prev) => prev + emoji);
                      setEmojiOpen(false);
                      inputRef.current?.focus();
                    }}
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
          className="chat-composer__input fam-chat-input"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            resizeInput();
          }}
          placeholder="Message"
          rows={1}
          disabled={sending || !canChat}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          type="submit"
          className="fam-chat-send"
          disabled={sending || !canChat || (!content.trim() && pendingFiles.length === 0)}
          aria-label="Send"
        >
          {sending ? <LoadingSpinner label="" size="sm" /> : <SendIcon />}
        </button>
        </div>
      </form>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M10 9V5L3 12l7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a6 6 0 0012 0V6h-1.5z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

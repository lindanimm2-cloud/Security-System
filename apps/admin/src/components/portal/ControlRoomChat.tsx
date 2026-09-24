'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApi } from '@/hooks/useApi';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { CHAT_EMOJIS } from '@/lib/chat-emojis';
import { getSession } from '@/lib/auth';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { unwrapFamilyReply } from '@/lib/family-chat-api';
import { resolveMediaUrl } from '@/lib/media-url';
import { getSocketUrl } from '@/lib/socket';
import {
  sendSupportChatMessage,
  supportMessagePreview,
  supportSenderLabel,
  type SupportChatAttachment,
  type SupportChatMessage,
} from '@/lib/support-chat-api';

export type { SupportChatMessage } from '@/lib/support-chat-api';

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

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
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

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PendingFileThumb({ file }: { file: File }) {
  const url = useBlobUrl(
    file.type.startsWith('image/') || file.type.startsWith('audio/') ? file : null,
  );
  if (file.type.startsWith('image/') && url) {
    return <img src={url} alt={file.name} />;
  }
  if (file.type.startsWith('audio/')) {
    return <span className="chat-pending-file__icon">🎤</span>;
  }
  if (file.type.startsWith('video/')) {
    return <span className="chat-pending-file__icon">🎥</span>;
  }
  return <span className="chat-pending-file__icon">📎</span>;
}

function AttachmentPreview({ attachment }: { attachment: SupportChatAttachment }) {
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
  if (attachment.kind === 'AUDIO' || attachment.fileType.startsWith('audio/')) {
    return (
      <div className="chat-attachment chat-attachment--audio">
        <span className="chat-attachment__icon" aria-hidden>
          🎤
        </span>
        <div className="chat-attachment--audio__body">
          <strong>Voice note</strong>
          <audio src={url} controls preload="metadata" />
        </div>
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

export function ControlRoomChat() {
  const session = getSession('client');
  const currentUserId = session?.user.id ?? '';

  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<SupportChatData>>('/client/messages'),
    [],
  );

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<SupportChatMessage | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [recordError, setRecordError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const swipeRef = useRef<{ id: string; x: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartedAtRef = useRef(0);

  useEffect(() => {
    if (data?.data?.messages) setMessages(data.data.messages);
  }, [data]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    else bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFiles.length, recording]);

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

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const messageGroups = useMemo(() => {
    const groups: { date: string; items: SupportChatMessage[] }[] = [];
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

  const startReply = useCallback((message: SupportChatMessage) => {
    setReplyTarget(message);
    setEmojiOpen(false);
    setAttachOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function scrollToMessage(id: string) {
    const el = threadRef.current?.querySelector(`[data-cr-msg-id="${id}"]`);
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => {
      setFlashId((current) => (current === id ? null : current));
    }, 1400);
  }

  const sendMessage = useCallback(
    async (opts?: { files?: File[]; text?: string }) => {
      const text = opts?.text ?? content;
      const files = opts?.files ?? pendingFiles;
      if ((!text.trim() && files.length === 0) || sending) return;
      setSending(true);
      setSendError('');
      try {
        const quote = replyTarget
          ? {
              id: replyTarget.id,
              name: supportSenderLabel(replyTarget.sender, STAFF_ROLES),
              text: supportMessagePreview(replyTarget),
            }
          : null;
        const res = await sendSupportChatMessage({
          content: text,
          files,
          replyTo: quote,
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
        setEmojiOpen(false);
        setAttachOpen(false);
      } catch (err) {
        setSendError(friendlyErrorMessage(err, 'send'));
      } finally {
        setSending(false);
      }
    },
    [content, pendingFiles, replyTarget, sending],
  );

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  function addFiles(picked: File[]) {
    if (!picked.length) return;
    setPendingFiles((prev) => [...prev, ...picked].slice(0, 5));
    setAttachOpen(false);
  }

  const stopRecording = useCallback((cancel = false) => {
    const recorder = mediaRecorderRef.current;
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (!recorder) {
      setRecording(false);
      setRecordMs(0);
      return;
    }
    recorder.onstop = () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      const chunks = recordChunksRef.current;
      recordChunksRef.current = [];
      setRecording(false);
      setRecordMs(0);
      if (cancel || !chunks.length) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size < 400) return;
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `voice-note-${Date.now()}.${ext}`, {
        type: blob.type || 'audio/webm',
      });
      setPendingFiles((prev) => [...prev, file].slice(0, 5));
    };
    if (recorder.state !== 'inactive') recorder.stop();
    else recorder.onstop(new Event('stop'));
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || sending) return;
    setRecordError('');
    setEmojiOpen(false);
    setAttachOpen(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : '';
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();
      setRecordMs(0);
      setRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordMs(Date.now() - recordStartedAtRef.current);
      }, 200);
      recorder.start(250);
    } catch {
      setRecordError('Microphone permission is required to record a voice note.');
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [recording, sending]);

  if (loading) return <LoadingSpinner label="Loading chat..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const hasDraft = !!content.trim() || pendingFiles.length > 0;
  const canSend = !sending && !recording && hasDraft;
  const showSend = hasDraft || sending;

  return (
    <div className="chat-box chat-box--support chat-box--messaging">
      <header className="fam-chat-head cr-chat-head">
        <UserAvatar firstName="Control" lastName="Room" size="sm" />
        <div className="fam-chat-head__meta">
          <strong>Control room</strong>
          <p>Dispatch · usually replies in minutes</p>
        </div>
        <div className="fam-chat-head__actions">
          <span className="badge badge--live cr-chat-live">LIVE</span>
          <Link
            href="/portal/protect"
            className="fam-chat-icon-btn"
            title="Emergency Protect"
            aria-label="Open Protect for emergencies"
          >
            <ShieldIcon />
          </Link>
        </div>
      </header>

      <div className="cr-chat-notice">
        <p>
          For emergencies use{' '}
          <Link href="/portal/protect" className="interactive-text">
            Protect
          </Link>{' '}
          or hold panic. This chat is for updates and non-emergency support.
        </p>
      </div>

      <div className="fam-chat-thread cr-chat-thread" ref={threadRef}>
        {messages.length === 0 ? (
          <div className="cr-chat-empty">
            <p className="chat-empty text-muted">No messages yet</p>
            <p className="text-muted">Say hello — a dispatcher will respond when available.</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date} className="fam-chat-day">
              <div className="fam-chat-day__sep">
                <span>{group.date}</span>
              </div>
              {group.items.map((m) => {
                const isSelf = m.sender.id === currentUserId;
                const fromStaff = STAFF_ROLES.has(m.sender.role) || m.sender.role === 'OFFICER';
                const parsed = unwrapFamilyReply(m.content);
                const body = parsed.body;
                const showText =
                  !!body &&
                  !(m.attachments?.length && (body.startsWith('Sent ') || body.startsWith('🎤') || body.startsWith('📷') || body.startsWith('🎥') || body.startsWith('📎')));
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
                      onClick={() => startReply(m)}
                    >
                      <ReplyIcon />
                    </button>
                    <div
                      data-cr-msg-id={m.id}
                      className={`chat-bubble fam-chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'}${flashId === m.id ? ' fam-chat-bubble--flash' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        startReply(m);
                      }}
                    >
                      {!isSelf && (
                        <span className="chat-sender">
                          {fromStaff ? 'Control room' : `${m.sender.firstName} ${m.sender.lastName}`}
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
                      {showText && <p>{body}</p>}
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
              <span className="chat-pending-file__name">
                {file.type.startsWith('audio/') ? 'Voice note' : file.name}
              </span>
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

      {(sendError || recordError) && (
        <p className="fam-chat-error" role="alert">
          {sendError || recordError}
        </p>
      )}

      <form className="chat-composer fam-chat-composer cr-chat-composer" onSubmit={handleSend}>
        {replyTarget && (
          <div className="fam-chat-replying">
            <button
              type="button"
              className="fam-chat-replying__jump"
              onClick={() => scrollToMessage(replyTarget.id)}
            >
              <strong>Replying to {supportSenderLabel(replyTarget.sender, STAFF_ROLES)}</strong>
              <span>{supportMessagePreview(replyTarget)}</span>
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

        {recording ? (
          <div className="cr-chat-record">
            <span className="cr-chat-record__dot" aria-hidden />
            <strong>Recording {formatDuration(recordMs)}</strong>
            <button
              type="button"
              className="cr-chat-record__cancel"
              onClick={() => stopRecording(true)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cr-chat-record__stop"
              onClick={() => stopRecording(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="fam-chat-composer__row">
            <div className="chat-composer__tools">
              <div className="cr-chat-attach-wrap">
                <button
                  type="button"
                  className={`chat-tool-btn fam-chat-tool${attachOpen ? ' chat-tool-btn--active' : ''}`}
                  onClick={() => {
                    setEmojiOpen(false);
                    setAttachOpen((o) => !o);
                  }}
                  title="Attach"
                  aria-label="Attach photo, file, or camera"
                  aria-expanded={attachOpen}
                  disabled={sending}
                >
                  <AttachIcon />
                </button>
                {attachOpen && (
                  <div className="cr-chat-attach-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <CameraIcon /> Photo
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileIcon /> File
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="chat-file-input"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  addFiles(picked);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                className="chat-file-input"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  addFiles(picked);
                }}
              />
              <div className="chat-emoji-wrap cr-chat-emoji">
                <button
                  type="button"
                  className={`chat-tool-btn fam-chat-tool${emojiOpen ? ' chat-tool-btn--active' : ''}`}
                  onClick={() => {
                    setAttachOpen(false);
                    setEmojiOpen((o) => !o);
                  }}
                  title="Insert emoji"
                  aria-label="Insert emoji"
                  aria-expanded={emojiOpen}
                  disabled={sending}
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
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            {showSend ? (
              <button type="submit" className="fam-chat-send" aria-label="Send" disabled={!canSend}>
                {sending ? <LoadingSpinner label="" size="sm" /> : <SendIcon />}
              </button>
            ) : (
              <button
                type="button"
                className="fam-chat-send fam-chat-send--mic"
                aria-label="Record voice note"
                title="Record voice note"
                disabled={sending}
                onClick={() => void startRecording()}
              >
                <MicIcon />
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
      <path d="M9 3l-1.8 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.2L15 3H9z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm1 7V3.5L19.5 9H15z" />
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

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" />
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

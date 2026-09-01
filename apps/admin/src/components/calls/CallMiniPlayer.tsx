'use client';

import { useEffect, useRef, useState } from 'react';
import { channelLabel, channelLiveSubtitle, isExternalCallChannel } from '@/lib/call-utils';
import { useCallsOptional } from './CallProvider';

function CallIcon({ channel }: { channel: string }) {
  if (channel === 'WHATSAPP') {
    return (
      <span className="call-lens__avatar call-lens__avatar--whatsapp" aria-hidden>
        WA
      </span>
    );
  }
  if (channel === 'DISPATCH_LINE') {
    return (
      <span className="call-lens__avatar call-lens__avatar--dispatch" aria-hidden>
        4DS
      </span>
    );
  }
  return (
    <span className="call-lens__avatar call-lens__avatar--internal" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
      </svg>
    </span>
  );
}

export function CallMiniPlayer() {
  const ctx = useCallsOptional();
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const activeCall = ctx?.activeCall;
  const incomingCall = ctx?.incomingCall;

  useEffect(() => {
    if (ctx?.panelExpanded) {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCall?.notes?.length, ctx?.panelExpanded]);

  if (!ctx) return null;

  if (incomingCall) {
    return (
      <div className="call-lens call-lens--incoming" role="dialog" aria-label="Incoming call">
        <div className="call-lens__info">
          <CallIcon channel={incomingCall.channel} />
          <div className="call-lens__meta">
            <span className="call-lens__title">Incoming call</span>
            <span className="call-lens__subtitle">
              {incomingCall.initiator.firstName} {incomingCall.initiator.lastName} ·{' '}
              {channelLabel(incomingCall.channel)}
            </span>
          </div>
        </div>
        <div className="call-lens__divider" />
        <div className="call-lens__controls">
          <button type="button" className="call-lens__btn call-lens__btn--decline" onClick={() => ctx.declineCall()}>
            Decline
          </button>
          <button type="button" className="call-lens__btn call-lens__btn--accept" onClick={() => ctx.acceptCall()}>
            Accept
          </button>
        </div>
      </div>
    );
  }

  if (!activeCall) return null;

  const isExternal = isExternalCallChannel(activeCall.channel);
  const isLive = ['CONNECTED', 'ON_HOLD'].includes(activeCall.status);
  const isRinging = activeCall.status === 'RINGING';

  async function handleAddNote(noteType: 'NOTE' | 'REPORT') {
    if (!noteText.trim() || !ctx) return;
    setSaving(true);
    try {
      await ctx.addNote(noteText.trim(), noteType);
      setNoteText('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={`call-lens ${ctx.panelExpanded ? 'call-lens--expanded' : ''}`}
        role="region"
        aria-label="Active call controls"
      >
        <div className="call-lens__info">
          <CallIcon channel={activeCall.channel} />
          <div className="call-lens__meta">
            <span className="call-lens__title">{activeCall.targetName}</span>
            <span className="call-lens__subtitle">
              {isExternal
                ? channelLiveSubtitle(activeCall.channel, activeCall.status, ctx.elapsedSec)
                : [
                    channelLabel(activeCall.channel),
                    isLive && channelLiveSubtitle(activeCall.channel, activeCall.status, ctx.elapsedSec),
                    isRinging && 'Ringing…',
                    activeCall.isMuted && 'Muted',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </div>
        </div>

        <div className="call-lens__divider" />

        <div className="call-lens__controls">
          {!isExternal && (
            <>
              <button
                type="button"
                className={`call-lens__icon-btn ${activeCall.isMuted ? 'call-lens__icon-btn--active' : ''}`}
                onClick={() => ctx.toggleMute()}
                title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                aria-label={activeCall.isMuted ? 'Unmute' : 'Mute'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  {activeCall.isMuted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.996.996 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                className={`call-lens__icon-btn ${activeCall.status === 'ON_HOLD' ? 'call-lens__icon-btn--active' : ''}`}
                onClick={() => ctx.toggleHold()}
                title={activeCall.status === 'ON_HOLD' ? 'Resume' : 'Hold'}
                aria-label={activeCall.status === 'ON_HOLD' ? 'Resume call' : 'Hold call'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            </>
          )}

          <button
            type="button"
            className={`call-lens__icon-btn ${ctx.panelExpanded ? 'call-lens__icon-btn--active' : ''}`}
            onClick={() => ctx.setPanelExpanded(!ctx.panelExpanded)}
            title="Notes & report"
            aria-label="Open call notes panel"
            aria-expanded={ctx.panelExpanded}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          </button>

          <button
            type="button"
            className="call-lens__end-btn"
            onClick={() => ctx.endCall()}
            title={isExternal ? 'End session' : 'End call'}
            aria-label={isExternal ? 'End session' : 'End call'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .55-.45 1-1 1H4.5c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h1.9c.55 0 1 .45 1 1v.88A11.94 11.94 0 0112 5c5.52 0 10 4.48 10 10h-2a8 8 0 00-8-8v2z" transform="rotate(135 12 12)" />
            </svg>
          </button>
        </div>
      </div>

      {ctx.panelExpanded && (
        <div className="call-lens-panel" role="dialog" aria-label="Call notes">
          <div className="call-lens-panel__header">
            <h3>Call notes · {activeCall.targetName}</h3>
            <button
              type="button"
              className="call-lens-panel__close"
              onClick={() => ctx.setPanelExpanded(false)}
              aria-label="Close notes panel"
            >
              ×
            </button>
          </div>

          <div className="call-lens-panel__notes">
            {activeCall.notes.length === 0 ? (
              <p className="call-lens-panel__empty">
                {activeCall.channel === 'WHATSAPP'
                  ? 'No notes yet — capture details from your WhatsApp conversation here.'
                  : isExternal
                    ? 'No notes yet — capture details from your external call here.'
                    : 'No notes yet — capture details while on the call.'}
              </p>
            ) : (
              activeCall.notes.map((note) => (
                <div
                  key={note.id}
                  className={`call-lens-panel__note ${note.noteType === 'REPORT' ? 'call-lens-panel__note--report' : ''}`}
                >
                  <div className="call-lens-panel__note-meta">
                    <strong>{note.authorName}</strong>
                    <span>{note.noteType === 'REPORT' ? 'Report' : 'Note'}</span>
                    <time>{new Date(note.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                  <p>{note.content}</p>
                </div>
              ))
            )}
            <div ref={notesEndRef} />
          </div>

          <div className="call-lens-panel__composer">
            <textarea
              className="call-lens-panel__input"
              rows={3}
              placeholder="Type notes during the call…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleAddNote('NOTE');
                }
              }}
            />
            <div className="call-lens-panel__actions">
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={saving || !noteText.trim()}
                onClick={() => void handleAddNote('NOTE')}
              >
                Save note
              </button>
              {activeCall.incidentId && (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={saving || !noteText.trim()}
                  onClick={() => void handleAddNote('REPORT')}
                >
                  File to incident
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

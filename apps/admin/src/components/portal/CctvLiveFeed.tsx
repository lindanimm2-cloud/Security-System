'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  detectTouchDevice,
  getVisibleControls,
  type CctvControlId,
} from '@/lib/cctv-player-controls';

export type CctvCamera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  status: string;
  snapshotUrl?: string | null;
  isLiveCapable?: boolean;
  isInterior?: boolean;
};

type CctvLiveFeedProps = {
  camera: CctvCamera;
  href?: string;
  featured?: boolean;
  compact?: boolean;
  className?: string;
  /** Hide toolbar (rare). Default shows intelligent controls. */
  showControls?: boolean;
};

const TOUCH_REVEAL_MS = 3200;
const FULLSCREEN_IDLE_MS = 2800;

function stopNav(e: MouseEvent | KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function CtrlBtn({
  title,
  active,
  danger,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  danger?: boolean;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`cctv-feed__ctrl ${active ? 'cctv-feed__ctrl--active' : ''} ${danger ? 'cctv-feed__ctrl--rec' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={(e) => {
        stopNav(e);
        onClick(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') stopNav(e);
      }}
    >
      {children}
    </button>
  );
}

function ExpandIcon({ exit }: { exit?: boolean }) {
  if (exit) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FeedControls({
  camera,
  stageRef,
  muted,
  recording,
  paused,
  isFullscreen,
  visibleIds,
  toolbarVisible,
  peekExpand,
  density,
  onMute,
  onRecord,
  onPlay,
  onReveal,
}: {
  camera: CctvCamera;
  stageRef: RefObject<HTMLDivElement | null>;
  muted: boolean;
  recording: boolean;
  paused: boolean;
  isFullscreen: boolean;
  visibleIds: CctvControlId[];
  toolbarVisible: boolean;
  peekExpand: boolean;
  density: 'minimal' | 'compact' | 'full';
  onMute: () => void;
  onRecord: () => void;
  onPlay: () => void;
  onReveal: () => void;
}) {
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void el.requestFullscreen?.().catch(() => undefined);
  }, [stageRef]);

  const takeSnapshot = useCallback(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${camera.name.replace(/\s+/g, '-').toLowerCase()}-${stamp}.jpg`;
    const url = camera.snapshotUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      a.click();
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(320, stage.clientWidth * 2);
    canvas.height = Math.max(180, stage.clientHeight * 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e5e5e5';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${camera.name} · CH ${camera.channel}`, 16, 28);
    ctx.fillText(new Date().toLocaleString('en-ZA'), 16, 52);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      'image/jpeg',
      0.92,
    );
  }, [camera, stageRef]);

  const show = (id: CctvControlId) => visibleIds.includes(id);
  const expandOnlyPeek = peekExpand && !toolbarVisible && show('expand');

  return (
    <div
      className={[
        'cctv-feed__controls',
        `cctv-feed__controls--${density}`,
        toolbarVisible ? 'is-visible' : '',
        expandOnlyPeek ? 'is-peek' : '',
        !toolbarVisible && !expandOnlyPeek ? 'is-hidden' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label={`${camera.name} camera controls`}
      aria-hidden={!toolbarVisible && !expandOnlyPeek}
      onMouseEnter={onReveal}
      onFocusCapture={onReveal}
    >
      <div className="cctv-feed__controls-scrim" aria-hidden />
      <div className="cctv-feed__controls-row">
        {show('expand') ? (
          <CtrlBtn
            title={isFullscreen ? 'Exit fullscreen' : 'Expand fullscreen'}
            onClick={toggleFullscreen}
          >
            <ExpandIcon exit={isFullscreen} />
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('play') ? (
          <CtrlBtn title={paused ? 'Play' : 'Pause'} active={paused} onClick={onPlay}>
            {paused ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('mute') ? (
          <CtrlBtn title={muted ? 'Unmute' : 'Mute'} active={muted} onClick={onMute}>
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('snapshot') ? (
          <CtrlBtn title="Take snapshot" onClick={takeSnapshot}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('record') ? (
          <CtrlBtn
            title={recording ? 'Stop recording' : 'Record'}
            active={recording}
            danger={recording}
            onClick={onRecord}
          >
            {recording ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </CtrlBtn>
        ) : null}
      </div>
    </div>
  );
}

function FeedInner({
  camera,
  featured,
  compact,
  showControls = true,
}: {
  camera: CctvCamera;
  featured?: boolean;
  compact?: boolean;
  showControls?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);

  const [muted, setMuted] = useState(true);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouchRevealed, setIsTouchRevealed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const recLabelId = useId();

  const status = (camera.status ?? 'offline').toLowerCase();
  const live =
    camera.isLiveCapable !== false && (status === 'online' || status === 'recording');
  const offline = status === 'offline' || status === 'fault';
  const isExpanded = Boolean(featured) || isFullscreen;

  useEffect(() => {
    setIsTouchDevice(detectTouchDevice());
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      setContainerWidth(el?.clientWidth ?? 0);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const bumpFullscreenIdle = useCallback(() => {
    if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
    if (!document.fullscreenElement) return;
    setIsTouchRevealed(true);
    idleTimer.current = window.setTimeout(() => {
      setIsTouchRevealed((open) => {
        // Keep open while keyboard focus remains on a control.
        return open && document.activeElement
          ? Boolean(stageRef.current?.contains(document.activeElement))
          : false;
      });
    }, FULLSCREEN_IDLE_MS);
  }, []);

  const scheduleTouchHide = useCallback(() => {
    if (touchTimer.current != null) window.clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(() => {
      if (document.activeElement && stageRef.current?.contains(document.activeElement)) return;
      setIsTouchRevealed(false);
    }, TOUCH_REVEAL_MS);
  }, []);

  const reveal = useCallback(() => {
    setIsTouchRevealed(true);
    if (document.fullscreenElement === stageRef.current) bumpFullscreenIdle();
    else if (detectTouchDevice()) scheduleTouchHide();
  }, [bumpFullscreenIdle, scheduleTouchHide]);

  useEffect(() => {
    function onFs() {
      const active = document.fullscreenElement === stageRef.current;
      setIsFullscreen(active);
      if (active) {
        setIsTouchRevealed(true);
        bumpFullscreenIdle();
      }
    }
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [bumpFullscreenIdle]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setTimeout(() => setRecording(false), 60_000);
    return () => window.clearTimeout(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (touchTimer.current != null) window.clearTimeout(touchTimer.current);
      if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
    };
  }, []);

  const visibility = getVisibleControls({
    isExpanded,
    isFullscreen,
    isHovered: isHovered && !isTouchDevice,
    isFocused,
    isTouchRevealed,
    containerWidth,
    isTouchDevice,
  });

  function onStagePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchDevice) return;
    // First tap reveals controls; don't fire accidental actions on the stage itself.
    if (!visibility.toolbarVisible) {
      e.preventDefault();
      e.stopPropagation();
      reveal();
    } else if (isFullscreen) {
      bumpFullscreenIdle();
    } else {
      scheduleTouchHide();
    }
  }

  return (
    <div
      ref={feedRef}
      className={[
        'cctv-feed',
        `cctv-feed--${status}`,
        featured ? 'cctv-feed--featured' : '',
        compact ? 'cctv-feed--compact' : '',
        live ? 'cctv-feed--live' : '',
        recording ? 'cctv-feed--user-rec' : '',
        paused ? 'cctv-feed--paused' : '',
        isFullscreen ? 'cctv-feed--fs' : '',
        visibility.toolbarVisible ? 'cctv-feed--controls-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={() => {
        if (!isTouchDevice) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => {
        setIsFocused(true);
        reveal();
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && feedRef.current?.contains(next)) return;
        setIsFocused(false);
      }}
    >
      <div
        className="cctv-feed__stage"
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        onMouseMove={() => {
          if (isFullscreen) bumpFullscreenIdle();
        }}
      >
        {camera.snapshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={camera.snapshotUrl} alt="" className="cctv-feed__img" />
        ) : (
          <div className="cctv-feed__sim" aria-hidden>
            <span className="cctv-feed__noise" />
            <span className="cctv-feed__scan" />
          </div>
        )}
        <div className="cctv-feed__overlay">
          {recording ? (
            <span className="cctv-feed__rec cctv-feed__rec--user" id={recLabelId}>
              <i aria-hidden />
              {compact ? null : ' REC'}
            </span>
          ) : live ? (
            <span className="cctv-feed__rec">
              <i aria-hidden />
              {compact ? null : ' LIVE'}
            </span>
          ) : (
            <span className="cctv-feed__rec cctv-feed__rec--off">
              {offline ? 'OFF' : status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
          <span className="cctv-feed__meta">
            {camera.isInterior ? <span className="cctv-feed__badge">Interior</span> : null}
            <span className="cctv-feed__ch">CH {camera.channel}</span>
          </span>
        </div>
        {showControls ? (
          <FeedControls
            camera={camera}
            stageRef={stageRef}
            muted={muted}
            recording={recording}
            paused={paused}
            isFullscreen={isFullscreen}
            visibleIds={visibility.controls}
            toolbarVisible={visibility.toolbarVisible}
            peekExpand={visibility.peekExpand}
            density={visibility.density}
            onMute={() => setMuted((m) => !m)}
            onRecord={() => setRecording((r) => !r)}
            onPlay={() => setPaused((p) => !p)}
            onReveal={reveal}
          />
        ) : null}
      </div>
      <div className="cctv-feed__footer">
        <strong>{camera.name}</strong>
        {compact ? null : <span className="cctv-feed__loc">{camera.locationLabel}</span>}
      </div>
    </div>
  );
}

export function CctvLiveFeed({
  camera,
  href,
  featured,
  compact,
  className = '',
  showControls = true,
}: CctvLiveFeedProps) {
  const body = (
    <FeedInner camera={camera} featured={featured} compact={compact} showControls={showControls} />
  );

  if (href) {
    return (
      <Link href={href} className={`cctv-feed-link ${className}`.trim()} aria-label={`View ${camera.name}`}>
        {body}
      </Link>
    );
  }

  return <div className={className.trim()}>{body}</div>;
}

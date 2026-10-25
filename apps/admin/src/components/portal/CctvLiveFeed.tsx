'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  detectTouchDevice,
  formatPlaybackSpeed,
  getVisibleControls,
  nextFastForwardSpeed,
  nextPlaybackSpeed,
  type CctvControlId,
  type CctvPlaybackSpeed,
} from '@/lib/cctv-player-controls';
import { startCctvAmbient, type CctvAmbientHandle } from '@/lib/cctv-audio';
import { openCctvMiniPlayer } from '@/lib/cctv-mini-player';

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
  /** Stay on the current screen and open context instead of navigating. */
  onSelect?: () => void;
  featured?: boolean;
  compact?: boolean;
  className?: string;
  /** Hide toolbar (rare). Default shows intelligent controls. */
  showControls?: boolean;
  /**
   * Larger focus / fullscreen view — dock rewind, FF, live, audio, and speed
   * in a persistent transport bar.
   */
  dockedControls?: boolean;
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
  volume,
  recording,
  paused,
  isFullscreen,
  isPlayback,
  reverse,
  speed,
  visibleIds,
  toolbarVisible,
  peekExpand,
  density,
  volumeOpen,
  onMute,
  onVolume,
  onVolumeOpen,
  onMini,
  onRecord,
  onPlay,
  onRewind,
  onForward,
  onSpeed,
  onLive,
  onReveal,
}: {
  camera: CctvCamera;
  stageRef: RefObject<HTMLDivElement | null>;
  muted: boolean;
  volume: number;
  recording: boolean;
  paused: boolean;
  isFullscreen: boolean;
  isPlayback: boolean;
  reverse: boolean;
  speed: CctvPlaybackSpeed;
  visibleIds: CctvControlId[];
  toolbarVisible: boolean;
  peekExpand: boolean;
  density: 'minimal' | 'compact' | 'full';
  volumeOpen: boolean;
  onMute: () => void;
  onVolume: (value: number) => void;
  onVolumeOpen: (open: boolean) => void;
  onMini: () => void;
  onRecord: () => void;
  onPlay: () => void;
  onRewind: () => void;
  onForward: () => void;
  onSpeed: () => void;
  onLive: () => void;
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
  const volPct = Math.round((muted ? 0 : volume) * 100);

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
        {toolbarVisible && show('rewind') ? (
          <CtrlBtn
            title={
              isPlayback && reverse
                ? `Rewinding ${formatPlaybackSpeed(speed, true)} — tap for forward`
                : 'Rewind recorded footage'
            }
            active={isPlayback && reverse}
            onClick={onRewind}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 18V6l-8.5 6L11 18zm.5-6 8.5 6V6l-8.5 6z" />
            </svg>
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
        {toolbarVisible && show('forward') ? (
          <CtrlBtn
            title={
              isPlayback && !reverse && speed > 1
                ? `Fast forward ${formatPlaybackSpeed(speed, false)} — tap to change`
                : 'Fast forward recorded footage'
            }
            active={isPlayback && !reverse && speed > 1}
            onClick={onForward}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 6v12l8.5-6L13 6zM4.5 6v12l8.5-6-8.5-6z" />
            </svg>
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('speed') ? (
          <CtrlBtn
            title={`Playback speed ${formatPlaybackSpeed(speed, reverse)} — tap to change`}
            active={isPlayback && speed !== 1}
            onClick={onSpeed}
          >
            <span className="cctv-feed__speed">{formatPlaybackSpeed(speed, reverse)}</span>
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('live') ? (
          <CtrlBtn title="Return to live" active onClick={onLive}>
            <span className="cctv-feed__live-jump">LIVE</span>
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('mute') ? (
          <div
            className={`cctv-feed__audio ${volumeOpen ? 'is-open' : ''}`}
            onMouseLeave={(e) => {
              if (e.buttons !== 0) return;
              onVolumeOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              onVolumeOpen(true);
            }}
          >
            <span
              className="cctv-feed__audio-hit"
              onMouseEnter={() => onVolumeOpen(true)}
              onFocusCapture={() => onVolumeOpen(true)}
            >
              <CtrlBtn
                title={muted ? 'Unmute camera audio' : `Mute · ${volPct}%`}
                active={muted}
                onClick={onMute}
              >
                {muted || volPct === 0 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M11 5 6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : volPct < 45 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M11 5 6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M11 5 6 9H2v6h4l5 4V5z" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </CtrlBtn>
            </span>
            <label className="cctv-feed__vol" title={`Volume ${volPct}%`}>
              <span className="sr-only">Camera volume</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volPct}
                aria-valuetext={`${volPct} percent`}
                style={{ ['--cctv-vol' as string]: `${volPct}%` }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onVolumeOpen(true);
                }}
                onChange={(e) => {
                  onVolume(Number(e.target.value) / 100);
                  onVolumeOpen(true);
                }}
              />
            </label>
          </div>
        ) : null}
        {toolbarVisible && show('record') ? (
          <CtrlBtn
            title={recording ? 'Stop recording' : 'Start recording'}
            active={recording}
            danger={recording}
            onClick={onRecord}
          >
            {recording ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="12" r="6.5" className="cctv-feed__rec-dot" />
              </svg>
            )}
          </CtrlBtn>
        ) : null}
        {toolbarVisible && show('mini') ? (
          <CtrlBtn title="Open mini player" onClick={onMini}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
            </svg>
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
      </div>
    </div>
  );
}

function FeedInner({
  camera,
  featured,
  compact,
  showControls = true,
  dockedControls = false,
  href,
  onSelect,
}: {
  camera: CctvCamera;
  featured?: boolean;
  compact?: boolean;
  showControls?: boolean;
  dockedControls?: boolean;
  href?: string;
  onSelect?: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const audioRef = useRef<CctvAmbientHandle | null>(null);
  const lastVolume = useRef(0.45);

  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.45);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isPlayback, setIsPlayback] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [speed, setSpeed] = useState<CctvPlaybackSpeed>(1);
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
  const isExpanded = Boolean(featured) || isFullscreen || dockedControls;

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

  useEffect(() => {
    if (offline || muted) {
      audioRef.current?.stop();
      audioRef.current = null;
      return;
    }
    if (!audioRef.current) {
      audioRef.current = startCctvAmbient({ muted: false, volume });
    } else {
      audioRef.current.setVolume(volume);
    }
  }, [muted, volume, offline]);

  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, []);

  const bumpFullscreenIdle = useCallback(() => {
    if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
    if (!document.fullscreenElement) return;
    setIsTouchRevealed(true);
    idleTimer.current = window.setTimeout(() => {
      setIsTouchRevealed((open) => {
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
    isPlayback,
    forceFullTransport: dockedControls,
  });

  const controlsEl =
    showControls ? (
      <FeedControls
        camera={camera}
        stageRef={stageRef}
        muted={muted}
        volume={volume}
        recording={recording}
        paused={paused}
        isFullscreen={isFullscreen}
        isPlayback={isPlayback}
        reverse={reverse}
        speed={speed}
        visibleIds={visibility.controls}
        toolbarVisible={visibility.toolbarVisible}
        peekExpand={visibility.peekExpand}
        density={visibility.density}
        volumeOpen={volumeOpen}
        onMute={toggleMute}
        onVolume={setVolumeValue}
        onVolumeOpen={setVolumeOpen}
        onMini={popMiniPlayer}
        onRecord={() => {
          setRecording((r) => {
            const next = !r;
            if (next) {
              // Operator clips start from the live edge.
              setIsPlayback(false);
              setReverse(false);
              setSpeed(1);
              setPaused(false);
            }
            return next;
          });
        }}
        onPlay={() => {
          if (!isPlayback) enterPlayback({ reverse: false });
          setPaused((p) => !p);
        }}
        onRewind={() => {
          if (!isPlayback) {
            enterPlayback({ reverse: true });
            return;
          }
          setReverse((r) => !r);
          setPaused(false);
        }}
        onForward={() => {
          if (!isPlayback || reverse) {
            enterPlayback({ reverse: false });
            setSpeed((s) => (s < 2 ? 2 : s));
            setPaused(false);
            return;
          }
          setSpeed((s) => nextFastForwardSpeed(s));
          setPaused(false);
        }}
        onSpeed={() => {
          if (!isPlayback) enterPlayback({ reverse: false });
          setSpeed((s) => nextPlaybackSpeed(s));
          setPaused(false);
        }}
        onLive={returnToLive}
        onReveal={reveal}
      />
    ) : null;

  function enterPlayback(opts?: { reverse?: boolean }) {
    setIsPlayback(true);
    setPaused(false);
    if (opts?.reverse != null) setReverse(opts.reverse);
  }

  function returnToLive() {
    setIsPlayback(false);
    setReverse(false);
    setSpeed(1);
    setPaused(false);
  }

  function onStagePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchDevice) return;
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

  function setVolumeValue(next: number) {
    const v = Math.min(1, Math.max(0, next));
    setVolume(v);
    if (v > 0.01) {
      lastVolume.current = v;
      setMuted(false);
    } else {
      setMuted(true);
    }
  }

  function toggleMute() {
    setMuted((m) => {
      if (m) {
        setVolume(lastVolume.current > 0.05 ? lastVolume.current : 0.45);
        return false;
      }
      lastVolume.current = volume > 0.05 ? volume : lastVolume.current;
      return true;
    });
  }

  function popMiniPlayer() {
    openCctvMiniPlayer(
      {
        id: camera.id,
        name: camera.name,
        locationLabel: camera.locationLabel,
        channel: camera.channel,
        status: camera.status,
        snapshotUrl: camera.snapshotUrl,
        isLiveCapable: camera.isLiveCapable,
        isInterior: camera.isInterior,
        href,
      },
      { muted, volume },
    );
  }

  return (
    <div
      ref={feedRef}
      className={[
        'cctv-feed',
        `cctv-feed--${status}`,
        featured ? 'cctv-feed--featured' : '',
        compact ? 'cctv-feed--compact' : '',
        dockedControls ? 'cctv-feed--docked' : '',
        live ? 'cctv-feed--live' : '',
        recording ? 'cctv-feed--user-rec' : '',
        paused ? 'cctv-feed--paused' : '',
        isPlayback ? 'cctv-feed--playback' : '',
        isPlayback && reverse ? 'cctv-feed--rewinding' : '',
        isPlayback && !reverse && speed > 1 ? 'cctv-feed--fast-forward' : '',
        isFullscreen ? 'cctv-feed--fs' : '',
        visibility.toolbarVisible ? 'cctv-feed--controls-open' : '',
        muted ? 'cctv-feed--muted' : 'cctv-feed--audio-on',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isPlayback && !paused
          ? ({
              ['--cctv-playback-rate' as string]: String(speed),
            } as CSSProperties)
          : undefined
      }
      onMouseEnter={() => {
        if (!isTouchDevice) setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onFocusCapture={() => {
        setIsFocused(true);
        reveal();
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && feedRef.current?.contains(next)) return;
        setIsFocused(false);
        setVolumeOpen(false);
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
        {onSelect ? (
          <button
            type="button"
            className="cctv-feed__open"
            aria-label={`Focus ${camera.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          />
        ) : href ? (
          <Link
            href={href}
            className="cctv-feed__open"
            aria-label={`View ${camera.name}`}
            tabIndex={-1}
          />
        ) : null}
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
              {compact && !dockedControls ? null : ' REC'}
            </span>
          ) : isPlayback ? (
            <span className="cctv-feed__rec cctv-feed__rec--playback">
              <i aria-hidden />
              {compact && !dockedControls
                ? null
                : ` ${reverse ? 'REW' : speed > 1 ? 'FF' : 'PLAY'} ${formatPlaybackSpeed(speed, false)}`}
            </span>
          ) : live ? (
            <span className="cctv-feed__rec">
              <i aria-hidden />
              {compact && !dockedControls ? null : ' LIVE'}
            </span>
          ) : (
            <span className="cctv-feed__rec cctv-feed__rec--off">
              {offline ? 'OFF' : status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
          <span className="cctv-feed__meta">
            {camera.isInterior ? <span className="cctv-feed__badge">Interior</span> : null}
            <span className="cctv-feed__ch">CH {camera.channel}</span>
            {!muted ? <span className="cctv-feed__audio-pill">AUDIO</span> : null}
          </span>
        </div>
        {dockedControls ? null : controlsEl}
      </div>
      {dockedControls ? controlsEl : null}
      <div className="cctv-feed__footer">
        {onSelect ? (
          <button type="button" className="cctv-feed__footer-link" onClick={onSelect}>
            <strong>{camera.name}</strong>
            {compact && !dockedControls ? null : (
              <span className="cctv-feed__loc">{camera.locationLabel}</span>
            )}
          </button>
        ) : href ? (
          <Link href={href} className="cctv-feed__footer-link" aria-label={`View ${camera.name}`}>
            <strong>{camera.name}</strong>
            {compact && !dockedControls ? null : (
              <span className="cctv-feed__loc">{camera.locationLabel}</span>
            )}
          </Link>
        ) : (
          <>
            <strong>{camera.name}</strong>
            {compact && !dockedControls ? null : (
              <span className="cctv-feed__loc">{camera.locationLabel}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function CctvLiveFeed({
  camera,
  href,
  onSelect,
  featured,
  compact,
  className = '',
  showControls = true,
  dockedControls = false,
}: CctvLiveFeedProps) {
  return (
    <div className={`cctv-feed-link ${className}`.trim()}>
      <FeedInner
        camera={camera}
        featured={featured}
        compact={compact}
        showControls={showControls}
        dockedControls={dockedControls}
        href={href}
        onSelect={onSelect}
      />
    </div>
  );
}

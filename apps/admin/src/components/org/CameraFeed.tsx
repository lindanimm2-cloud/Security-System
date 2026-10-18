'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { OrgCamera } from '@/lib/org';
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';
import { startCctvAmbient, type CctvAmbientHandle } from '@/lib/cctv-audio';
import { openCctvMiniPlayer } from '@/lib/cctv-mini-player';

function sceneClass(camera: OrgCamera) {
  return camera.scene ?? camera.group ?? 'entrance';
}

export function CameraFeed({
  camera,
  large = false,
  href,
}: {
  camera: OrgCamera;
  large?: boolean;
  href?: string;
}) {
  const offline = camera.status === 'OFFLINE';
  const [clock, setClock] = useState('--:--:--');
  const [recSec, setRecSec] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.45);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const audioRef = useRef<CctvAmbientHandle | null>(null);
  const lastVolume = useRef(0.45);

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setRecSec((n) => (n + 1) % 3600);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
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

  const mm = String(Math.floor(recSec / 60)).padStart(2, '0');
  const ss = String(recSec % 60).padStart(2, '0');
  const volPct = Math.round((muted ? 0 : volume) * 100);

  function stop(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function toggleMute(e: MouseEvent) {
    stop(e);
    setMuted((m) => {
      if (m) {
        setVolume(lastVolume.current > 0.05 ? lastVolume.current : 0.45);
        return false;
      }
      lastVolume.current = volume > 0.05 ? volume : lastVolume.current;
      return true;
    });
  }

  function popMini(e: MouseEvent) {
    stop(e);
    openCctvMiniPlayer(
      {
        id: camera.id,
        name: camera.name,
        locationLabel: camera.location,
        channel: Number(String(camera.id).replace(/\D/g, '').slice(-2) || 1) || 1,
        status: camera.status,
        href,
      },
      { muted, volume },
    );
  }

  return (
    <span
      className={`cam-feed cam-feed--${sceneClass(camera)} ${large ? 'cam-feed--large' : ''} ${offline ? 'is-offline' : ''} ${camera.status === 'DEGRADED' ? 'is-degraded' : ''} ${muted ? '' : 'cam-feed--audio-on'}`}
      onMouseLeave={() => setVolumeOpen(false)}
    >
      <span className="cam-feed__world" aria-hidden>
        <span className="cam-feed__sky" />
        <span className="cam-feed__ground" />
        <span className="cam-feed__structure cam-feed__structure--a" />
        <span className="cam-feed__structure cam-feed__structure--b" />
        <span className="cam-feed__actor cam-feed__actor--1" />
        <span className="cam-feed__actor cam-feed__actor--2" />
        <span className="cam-feed__vehicle" />
      </span>
      <span className="cam-feed__scan" aria-hidden />
      <span className="cam-feed__vignette" aria-hidden />
      <span className={`cam-feed__live ${offline ? 'is-off' : ''}`}>
        {offline ? 'OFFLINE' : camera.status === 'DEGRADED' ? 'DEGRADED' : 'LIVE'}
      </span>
      {!offline && (
        <span className="cam-feed__rec" aria-hidden>
          <i /> REC {mm}:{ss}
        </span>
      )}
      <span className="cam-feed__hud" aria-hidden>
        <span className="cam-feed__badge">HDR</span>
        <span className="cam-feed__badge">1080P · 24FPS</span>
        {!muted ? <span className="cam-feed__badge">AUDIO</span> : null}
      </span>

      {!offline ? (
        <span
          className={`cam-feed__audio ${volumeOpen ? 'is-open' : ''}`}
          onMouseLeave={() => setVolumeOpen(false)}
        >
          {camera.audio ? (
            <>
              <button
                type="button"
                className={`cam-feed__btn ${muted ? 'is-active' : ''}`}
                title={muted ? 'Unmute' : `Mute · ${volPct}%`}
                aria-label={muted ? 'Unmute camera audio' : 'Mute camera audio'}
                onMouseEnter={() => setVolumeOpen(true)}
                onFocus={() => setVolumeOpen(true)}
                onClick={toggleMute}
              >
                {muted || volPct === 0 ? (
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
              </button>
              <label className="cam-feed__vol" title={`Volume ${volPct}%`}>
                <span className="sr-only">Camera volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volPct}
                  style={{ ['--cctv-vol' as string]: `${volPct}%` }}
                  onClick={stop}
                  onChange={(e) => {
                    const next = Number(e.target.value) / 100;
                    setVolume(next);
                    if (next > 0.01) {
                      lastVolume.current = next;
                      setMuted(false);
                    } else setMuted(true);
                    setVolumeOpen(true);
                  }}
                />
              </label>
            </>
          ) : null}
          <button
            type="button"
            className="cam-feed__btn"
            title="Open mini player"
            aria-label="Open mini player"
            onClick={popMini}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </span>
      ) : null}

      <span className="cam-feed__meta">
        <strong>
          <OpsMarqueeText>{camera.name}</OpsMarqueeText>
        </strong>
        <em>
          <OpsMarqueeText>{camera.location}</OpsMarqueeText>
        </em>
      </span>
      <span className="cam-feed__clock">
        {offline ? camera.offlineFor ?? 'No signal' : `${clock} · ${camera.quality}`}
      </span>
    </span>
  );
}

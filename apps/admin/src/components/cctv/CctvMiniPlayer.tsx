'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { startCctvAmbient, type CctvAmbientHandle } from '@/lib/cctv-audio';
import {
  closeCctvMiniPlayer,
  getCctvMiniPlayer,
  subscribeCctvMiniPlayer,
  updateCctvMiniPlayerAudio,
  type CctvMiniPlayerState,
} from '@/lib/cctv-mini-player';
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';

export function CctvMiniPlayer() {
  const [state, setState] = useState<CctvMiniPlayerState>(null);
  const [ready, setReady] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const audioRef = useRef<CctvAmbientHandle | null>(null);
  const lastVolume = useRef(0.45);

  useEffect(() => {
    setState(getCctvMiniPlayer());
    setReady(true);
    return subscribeCctvMiniPlayer(() => setState(getCctvMiniPlayer()));
  }, []);

  useEffect(() => {
    if (!state || state.muted) {
      audioRef.current?.stop();
      audioRef.current = null;
      return;
    }
    if (!audioRef.current) {
      audioRef.current = startCctvAmbient({ muted: false, volume: state.volume });
    } else {
      audioRef.current.setVolume(state.volume);
    }
  }, [state?.camera.id, state?.muted, state?.volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, []);

  if (!ready || !state) return null;

  const { camera, muted, volume } = state;
  const status = (camera.status ?? 'offline').toLowerCase();
  const live =
    camera.isLiveCapable !== false && (status === 'online' || status === 'recording');
  const volPct = Math.round((muted ? 0 : volume) * 100);

  function toggleMute() {
    if (muted) {
      const next = lastVolume.current > 0.05 ? lastVolume.current : 0.45;
      updateCctvMiniPlayerAudio({ muted: false, volume: next });
    } else {
      lastVolume.current = volume > 0.05 ? volume : lastVolume.current;
      updateCctvMiniPlayerAudio({ muted: true });
    }
  }

  function onVolume(nextPct: number) {
    const next = Math.min(1, Math.max(0, nextPct / 100));
    if (next > 0.01) lastVolume.current = next;
    updateCctvMiniPlayerAudio({ muted: next <= 0.01, volume: next });
  }

  return (
    <aside className="cctv-mini" role="complementary" aria-label={`Mini player · ${camera.name}`}>
      <div className="cctv-mini__stage" aria-hidden>
        {camera.snapshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={camera.snapshotUrl} alt="" />
        ) : (
          <div className="cctv-mini__sim">
            <span className="cctv-mini__noise" />
            <span className="cctv-mini__scan" />
          </div>
        )}
        <span className={`cctv-mini__live ${live ? '' : 'is-off'}`}>
          {live ? 'LIVE' : status.replace(/_/g, ' ').toUpperCase()}
        </span>
        {!muted ? <span className="cctv-mini__audio-pill">AUDIO</span> : null}
      </div>

      <div className="cctv-mini__body">
        <div className="cctv-mini__copy">
          <strong>
            <OpsMarqueeText>{camera.name}</OpsMarqueeText>
          </strong>
          <em>
            <OpsMarqueeText>
              CH {camera.channel} · {camera.locationLabel}
            </OpsMarqueeText>
          </em>
        </div>

        <div
          className={`cctv-mini__audio ${volumeOpen ? 'is-open' : ''}`}
          onMouseLeave={(e) => {
            if (e.buttons !== 0) return;
            setVolumeOpen(false);
          }}
        >
          <button
            type="button"
            className={`cctv-mini__btn ${muted ? 'is-active' : ''}`}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : `Mute · ${volPct}%`}
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
          <label className="cctv-mini__vol" title={`Volume ${volPct}%`}>
            <span className="sr-only">Mini player volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volPct}
              style={{ ['--cctv-vol' as string]: `${volPct}%` }}
              onChange={(e) => {
                onVolume(Number(e.target.value));
                setVolumeOpen(true);
              }}
            />
          </label>
        </div>

        <div className="cctv-mini__acts">
          {camera.href ? (
            <Link href={camera.href} className="cctv-mini__btn" title="Open camera" aria-label="Open camera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </Link>
          ) : null}
          <button
            type="button"
            className="cctv-mini__btn"
            title="Close mini player"
            aria-label="Close mini player"
            onClick={() => closeCctvMiniPlayer()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

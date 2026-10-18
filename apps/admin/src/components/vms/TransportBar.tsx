'use client';

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function TransportBar({
  playing,
  speed,
  onPlayPause,
  onStop,
  onStep,
  onSpeed,
  synced,
  onSync,
  extra,
}: {
  playing: boolean;
  speed: PlaybackSpeed;
  onPlayPause: () => void;
  onStop: () => void;
  onStep: (deltaMs: number) => void;
  onSpeed: (speed: PlaybackSpeed) => void;
  synced?: boolean;
  onSync?: (synced: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="vms-transport" role="toolbar" aria-label="Playback controls">
      <button type="button" className="vms-icon-btn" onClick={() => onStep(-30_000)} title="Back 30 s" aria-label="Back 30 seconds">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11 6v12l-8.5-6zM21 6v12l-8.5-6z" />
        </svg>
      </button>
      <button
        type="button"
        className="vms-icon-btn vms-icon-btn--primary"
        onClick={onPlayPause}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 5v14l12-7z" />
          </svg>
        )}
      </button>
      <button type="button" className="vms-icon-btn" onClick={onStop} aria-label="Stop" title="Stop">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </button>
      <button type="button" className="vms-icon-btn" onClick={() => onStep(30_000)} title="Forward 30 s" aria-label="Forward 30 seconds">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 6v12l8.5-6zM13 6v12l8.5-6z" />
        </svg>
      </button>
      <div className="vms-seg vms-seg--sm" role="radiogroup" aria-label="Playback speed">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            className={speed === s ? 'is-on' : ''}
            onClick={() => onSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
      {onSync ? (
        <label className="vms-check">
          <input type="checkbox" checked={Boolean(synced)} onChange={(e) => onSync(e.target.checked)} />
          Sync playback
        </label>
      ) : null}
      {extra ? <div className="vms-transport__extra">{extra}</div> : null}
    </div>
  );
}

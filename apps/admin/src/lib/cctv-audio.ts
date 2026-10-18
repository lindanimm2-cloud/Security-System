/** Demo CCTV ambient mic — soft filtered noise so mute/volume has a real effect. */

export type CctvAmbientHandle = {
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
};

export function startCctvAmbient(opts?: {
  muted?: boolean;
  volume?: number;
}): CctvAmbientHandle | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx = new AudioCtx();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.08;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);

  let muted = opts?.muted ?? true;
  let volume = clamp01(opts?.volume ?? 0.45);

  function apply() {
    const level = muted ? 0 : volume * 0.35;
    gain.gain.setTargetAtTime(level, ctx.currentTime, 0.05);
  }
  apply();

  void ctx.resume().catch(() => undefined);

  return {
    setMuted(next) {
      muted = next;
      apply();
      if (!muted) void ctx.resume().catch(() => undefined);
    },
    setVolume(next) {
      volume = clamp01(next);
      if (volume > 0.01 && muted) muted = false;
      apply();
      if (!muted) void ctx.resume().catch(() => undefined);
    },
    stop() {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      void ctx.close().catch(() => undefined);
    },
  };
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

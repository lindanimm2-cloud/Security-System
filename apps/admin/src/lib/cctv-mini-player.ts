export type CctvMiniPlayerCamera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  status: string;
  snapshotUrl?: string | null;
  isLiveCapable?: boolean;
  isInterior?: boolean;
  href?: string;
};

export type CctvMiniPlayerState = {
  camera: CctvMiniPlayerCamera;
  muted: boolean;
  volume: number;
} | null;

const STORAGE_KEY = '4ds-cctv-mini-player-v1';
const EVENT = '4ds-cctv-mini-player';

function read(): CctvMiniPlayerState {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CctvMiniPlayerState;
    if (!parsed?.camera?.id) return null;
    return {
      camera: parsed.camera,
      muted: parsed.muted !== false,
      volume: typeof parsed.volume === 'number' ? parsed.volume : 0.45,
    };
  } catch {
    return null;
  }
}

function write(next: CctvMiniPlayerState) {
  if (typeof window === 'undefined') return;
  if (!next) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getCctvMiniPlayer(): CctvMiniPlayerState {
  return read();
}

export function openCctvMiniPlayer(
  camera: CctvMiniPlayerCamera,
  opts?: { muted?: boolean; volume?: number },
) {
  const prev = read();
  write({
    camera,
    muted: opts?.muted ?? prev?.muted ?? true,
    volume: opts?.volume ?? prev?.volume ?? 0.45,
  });
}

export function updateCctvMiniPlayerAudio(patch: { muted?: boolean; volume?: number }) {
  const prev = read();
  if (!prev) return;
  write({
    ...prev,
    muted: patch.muted ?? prev.muted,
    volume: patch.volume ?? prev.volume,
  });
}

export function closeCctvMiniPlayer() {
  write(null);
}

export function subscribeCctvMiniPlayer(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

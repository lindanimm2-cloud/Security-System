export type CctvControlId =
  | 'expand'
  | 'rewind'
  | 'play'
  | 'forward'
  | 'speed'
  | 'mute'
  | 'mini'
  | 'snapshot'
  | 'record'
  | 'live';

/** Playback rates available on recorded / buffered CCTV (not true live). */
export const CCTV_PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type CctvPlaybackSpeed = (typeof CCTV_PLAYBACK_SPEEDS)[number];

/** Fast-forward steps only (skip slow / 1×). */
export const CCTV_FAST_FORWARD_SPEEDS = [2, 4, 8] as const;

export type CctvPlayerUiState = {
  /** Primary / featured tile (large layout). */
  isExpanded: boolean;
  isFullscreen: boolean;
  isHovered: boolean;
  isFocused: boolean;
  /** Touch: user tapped stage to reveal the toolbar. */
  isTouchRevealed: boolean;
  containerWidth: number;
  isTouchDevice: boolean;
  /** True once the operator has left live for buffered playback. */
  isPlayback?: boolean;
};

export type CctvVisibleControls = {
  /** Which action buttons to render (space-aware). */
  controls: CctvControlId[];
  /** Whether the toolbar chrome is revealed (opacity / pointer). */
  toolbarVisible: boolean;
  /** Always keep Expand mounted as a peek affordance when not fullscreen. */
  peekExpand: boolean;
  density: 'minimal' | 'compact' | 'full';
};

/** Approx control chip + gap — keep in sync with CSS. */
const WIDTH_EXPAND_ONLY = 120;
const WIDTH_EXPAND_MUTE = 180;
const WIDTH_EXPAND_MUTE_MINI = 230;
const WIDTH_EXPAND_MUTE_SNAP = 290;
const WIDTH_WITH_PLAY = 360;
const WIDTH_WITH_FF = 420;
const WIDTH_FULL = 500;

function maxControlsForWidth(
  width: number,
  wantPlaybackTools: boolean,
  isPlayback: boolean,
): CctvControlId[] {
  const w = Math.max(0, width);

  if (w < WIDTH_EXPAND_ONLY) return ['expand'];
  if (w < WIDTH_EXPAND_MUTE) return ['expand', 'mute'];
  if (w < WIDTH_EXPAND_MUTE_MINI) return ['expand', 'mute', 'mini'];
  if (w < WIDTH_EXPAND_MUTE_SNAP) return ['expand', 'mute', 'mini', 'snapshot'];

  const base: CctvControlId[] = ['expand', 'mute', 'mini', 'snapshot', 'record'];
  if (!wantPlaybackTools) return base;

  if (w < WIDTH_WITH_PLAY) {
    return isPlayback
      ? ['expand', 'play', 'live', 'mute', 'mini']
      : base;
  }

  if (w < WIDTH_WITH_FF) {
    return isPlayback
      ? ['expand', 'rewind', 'play', 'forward', 'live', 'mute', 'mini']
      : ['expand', 'rewind', 'play', 'forward', 'mute', 'mini', 'snapshot'];
  }

  if (w < WIDTH_FULL) {
    return isPlayback
      ? ['expand', 'rewind', 'play', 'forward', 'speed', 'live', 'mute', 'mini']
      : ['expand', 'rewind', 'play', 'forward', 'mute', 'mini', 'snapshot', 'record'];
  }

  return isPlayback
    ? ['expand', 'rewind', 'play', 'forward', 'speed', 'live', 'mute', 'mini', 'snapshot']
    : ['expand', 'rewind', 'play', 'forward', 'mute', 'mini', 'snapshot', 'record'];
}

/**
 * Single source of truth for which CCTV media controls to show.
 * Used by every camera tile — featured, compact, mosaic, fullscreen.
 *
 * Rewind / variable speed apply to recorded (NVR/DVR) playback only.
 * True live streams stay live until the operator enters playback.
 */
export function getVisibleControls(state: CctvPlayerUiState): CctvVisibleControls {
  const {
    isExpanded,
    isFullscreen,
    isHovered,
    isFocused,
    isTouchRevealed,
    containerWidth,
    isTouchDevice,
    isPlayback = false,
  } = state;

  const width = Number.isFinite(containerWidth) ? containerWidth : 0;
  const wantPlaybackTools = isFullscreen || isExpanded || isPlayback;
  const controls = maxControlsForWidth(width, wantPlaybackTools, isPlayback);

  const density: CctvVisibleControls['density'] =
    controls.length <= 1 ? 'minimal' : controls.length <= 2 ? 'compact' : 'full';

  const interactionOpen = isHovered || isFocused || isTouchRevealed;

  // Fullscreen / large expanded: full toolbar when interacting (auto-hide driven by caller).
  if (isFullscreen) {
    return {
      controls,
      toolbarVisible: interactionOpen || isFocused,
      peekExpand: false,
      density: 'full',
    };
  }

  // Tiny tiles: never expose secondary actions even on hover.
  if (controls.length <= 1) {
    return {
      controls: ['expand'],
      toolbarVisible: true,
      peekExpand: true,
      density: 'minimal',
    };
  }

  // Compact / secondary: Expand peek by default; secondary only when revealed.
  if (!isExpanded) {
    return {
      controls,
      toolbarVisible: interactionOpen,
      peekExpand: true,
      density,
    };
  }

  // Primary / featured: Expand always; rest on hover/focus/touch (or always if very wide).
  const keepSecondaryVisible = width >= 360 && !isTouchDevice;
  return {
    controls,
    toolbarVisible: interactionOpen || keepSecondaryVisible || isPlayback,
    peekExpand: true,
    density: width >= 280 ? 'full' : density,
  };
}

export function nextPlaybackSpeed(current: CctvPlaybackSpeed): CctvPlaybackSpeed {
  const idx = CCTV_PLAYBACK_SPEEDS.indexOf(current);
  return CCTV_PLAYBACK_SPEEDS[(idx + 1) % CCTV_PLAYBACK_SPEEDS.length] ?? 1;
}

export function nextFastForwardSpeed(current: CctvPlaybackSpeed): CctvPlaybackSpeed {
  const idx = CCTV_FAST_FORWARD_SPEEDS.indexOf(
    current as (typeof CCTV_FAST_FORWARD_SPEEDS)[number],
  );
  if (idx < 0) return CCTV_FAST_FORWARD_SPEEDS[0];
  return CCTV_FAST_FORWARD_SPEEDS[(idx + 1) % CCTV_FAST_FORWARD_SPEEDS.length] ?? 2;
}

export function formatPlaybackSpeed(speed: CctvPlaybackSpeed, reverse: boolean): string {
  const label = speed === 1 ? '1×' : `${speed}×`;
  return reverse ? `−${label}` : label;
}

export function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

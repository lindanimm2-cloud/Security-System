export type CctvControlId = 'expand' | 'play' | 'mute' | 'snapshot' | 'record';

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
const WIDTH_EXPAND_MUTE_SNAP = 240;
const WIDTH_FULL = 300;

function maxControlsForWidth(width: number, wantPlay: boolean): CctvControlId[] {
  const w = Math.max(0, width);

  if (w < WIDTH_EXPAND_ONLY) return ['expand'];
  if (w < WIDTH_EXPAND_MUTE) return ['expand', 'mute'];
  if (w < WIDTH_EXPAND_MUTE_SNAP) return ['expand', 'mute', 'snapshot'];

  const base: CctvControlId[] = ['expand', 'mute', 'snapshot', 'record'];
  if (!wantPlay) return base;
  if (w < WIDTH_FULL) return base;
  return ['expand', 'play', 'mute', 'snapshot', 'record'];
}

/**
 * Single source of truth for which CCTV media controls to show.
 * Used by every camera tile — featured, compact, mosaic, fullscreen.
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
  } = state;

  const width = Number.isFinite(containerWidth) ? containerWidth : 0;
  const wantPlay = isFullscreen || isExpanded;
  const controls = maxControlsForWidth(width, wantPlay);

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
    toolbarVisible: interactionOpen || keepSecondaryVisible,
    peekExpand: true,
    density: width >= 280 ? 'full' : density,
  };
}

export function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

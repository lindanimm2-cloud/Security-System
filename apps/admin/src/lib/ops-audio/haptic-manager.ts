import { HAPTIC_CATALOG } from './catalog';
import { loadOpsAudioPrefs } from './profiles';
import type { HapticPatternId } from './types';

function expand(pattern: number[], repeats = 1): number[] {
  if (!pattern.length) return [];
  const out: number[] = [];
  for (let i = 0; i < Math.max(1, repeats); i++) {
    if (i > 0) out.push(420);
    out.push(...pattern);
  }
  return out;
}

export function hapticSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Central haptic language — maps to native haptics later. */
export function playHaptic(id: HapticPatternId, opts?: { force?: boolean }) {
  const prefs = loadOpsAudioPrefs();
  if (!prefs.hapticsEnabled && !opts?.force) return false;
  if (!hapticSupported()) return false;
  const def = HAPTIC_CATALOG[id];
  if (!def?.pattern.length) return false;
  try {
    return navigator.vibrate(expand(def.pattern, def.repeats));
  } catch {
    return false;
  }
}

export function stopHaptic() {
  if (hapticSupported()) {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

export function listHapticPatterns() {
  return Object.values(HAPTIC_CATALOG);
}

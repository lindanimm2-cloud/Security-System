/**
 * Emergency vibration profiles — web uses navigator.vibrate when available.
 * Native apps can map the same profile ids to platform haptics / FCM vibrate channels.
 */

export type VibrationProfileId = 'short' | 'long' | 'sos' | 'panic' | 'critical' | 'normal' | 'off';

export type VibrationProfile = {
  id: VibrationProfileId;
  label: string;
  description: string;
  /** Vibration pattern in ms (vibrate API). Empty = off. */
  pattern: number[];
  /** How many times to repeat the pattern for emergency (web soft-loop). */
  repeats?: number;
};

/** Morse-like SOS + emergency patterns described in the 4DS brief. */
export const VIBRATION_PROFILES: VibrationProfile[] = [
  {
    id: 'short',
    label: 'Short pulse',
    description: 'Single short buzz for quick feedback.',
    pattern: [80],
  },
  {
    id: 'long',
    label: 'Long pulse',
    description: 'Single sustained buzz.',
    pattern: [420],
  },
  {
    id: 'normal',
    label: 'Normal notification',
    description: 'Light tap for non-critical updates.',
    pattern: [40],
  },
  {
    id: 'critical',
    label: 'Critical',
    description: 'Triple-pulse burst, twice.',
    pattern: [90, 50, 90, 50, 90, 220, 90, 50, 90, 50, 90],
  },
  {
    id: 'sos',
    label: 'SOS pattern',
    description: 'Three short · three long · three short.',
    pattern: [110, 70, 110, 70, 110, 220, 320, 70, 320, 70, 320, 220, 110, 70, 110, 70, 110],
  },
  {
    id: 'panic',
    label: 'Repeating emergency',
    description: 'Panic cadence: short · short · short — pause — short · short · short.',
    pattern: [160, 90, 160, 90, 160, 380, 160, 90, 160, 90, 160],
    repeats: 2,
  },
  {
    id: 'off',
    label: 'Off',
    description: 'No vibration (sound and visuals still work if enabled).',
    pattern: [],
  },
];

export type EmergencyAlertKind = 'panic' | 'critical' | 'normal' | 'officer' | 'test';

export type EmergencyHapticPrefs = {
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  /** Profile used for panic / P0 client alerts */
  panicProfile: VibrationProfileId;
  /** Profile used for high / critical updates */
  criticalProfile: VibrationProfileId;
  /** Profile used for normal notifications */
  normalProfile: VibrationProfileId;
  phoneCallsEnabled: boolean;
  contactsPickerEnabled: boolean;
  bluetoothEnabled: boolean;
  backgroundEnabled: boolean;
};

const PREFS_KEY = '4ds-emergency-haptic-prefs';

export const DEFAULT_HAPTIC_PREFS: EmergencyHapticPrefs = {
  vibrationEnabled: true,
  soundEnabled: true,
  panicProfile: 'panic',
  criticalProfile: 'critical',
  normalProfile: 'normal',
  phoneCallsEnabled: true,
  contactsPickerEnabled: false,
  bluetoothEnabled: false,
  backgroundEnabled: true,
};

export function loadHapticPrefs(): EmergencyHapticPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_HAPTIC_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_HAPTIC_PREFS };
    return { ...DEFAULT_HAPTIC_PREFS, ...(JSON.parse(raw) as Partial<EmergencyHapticPrefs>) };
  } catch {
    return { ...DEFAULT_HAPTIC_PREFS };
  }
}

export function saveHapticPrefs(next: Partial<EmergencyHapticPrefs>): EmergencyHapticPrefs {
  const merged = { ...loadHapticPrefs(), ...next };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota */
  }
  return merged;
}

export function vibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function profileById(id: VibrationProfileId): VibrationProfile {
  return VIBRATION_PROFILES.find((p) => p.id === id) ?? VIBRATION_PROFILES[0]!;
}

function expandPattern(profile: VibrationProfile): number[] {
  if (!profile.pattern.length) return [];
  const reps = Math.max(1, profile.repeats ?? 1);
  const out: number[] = [];
  for (let i = 0; i < reps; i++) {
    if (i > 0) out.push(450);
    out.push(...profile.pattern);
  }
  return out;
}

export function profileForAlertKind(kind: EmergencyAlertKind, prefs = loadHapticPrefs()): VibrationProfile {
  if (!prefs.vibrationEnabled) return profileById('off');
  if (kind === 'panic' || kind === 'test') return profileById(prefs.panicProfile);
  if (kind === 'critical' || kind === 'officer') return profileById(prefs.criticalProfile);
  return profileById(prefs.normalProfile);
}

/** Fire vibration if supported + enabled. Returns false when unavailable (expected on many desktops). */
export function triggerEmergencyVibration(
  kind: EmergencyAlertKind = 'critical',
  opts?: { forceProfile?: VibrationProfileId; prefs?: EmergencyHapticPrefs },
): boolean {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false;
  const prefs = opts?.prefs ?? loadHapticPrefs();
  if (!prefs.vibrationEnabled && !opts?.forceProfile) return false;
  const profile = opts?.forceProfile
    ? profileById(opts.forceProfile)
    : profileForAlertKind(kind, prefs);
  const pattern = expandPattern(profile);
  if (!pattern.length) {
    navigator.vibrate(0);
    return false;
  }
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function stopEmergencyVibration() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

/** Pattern preview for settings UI (does not require “enabled” if force). */
export function previewVibration(id: VibrationProfileId) {
  return triggerEmergencyVibration('test', {
    forceProfile: id,
    prefs: { ...loadHapticPrefs(), vibrationEnabled: true },
  });
}

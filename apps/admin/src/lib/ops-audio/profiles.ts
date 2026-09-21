import type { AudioCueDef, OpsAudioPrefs, OpsAudioProfileId } from './types';
import { OPS_AUDIO_CHANGED, OPS_AUDIO_PREFS_KEY } from './types';

export const DEFAULT_OPS_AUDIO_PREFS: OpsAudioPrefs = {
  profile: 'standard',
  masterVolume: 0.85,
  uiSounds: true,
  hapticsEnabled: true,
  radioFlavour: true,
  p1AlwaysAudible: true,
};

export const PROFILE_LABELS: Record<OpsAudioProfileId, { label: string; detail: string }> = {
  full: { label: 'Full Alerts', detail: 'Everything enabled — UI, ops, communications, emergency.' },
  standard: {
    label: 'Standard',
    detail: 'Normal notifications quieter; emergency alerts full volume.',
  },
  quiet: {
    label: 'Quiet Operations',
    detail: 'Normal sounds off; critical and P1 remain.',
  },
  emergency_only: {
    label: 'Emergency Only',
    detail: 'Only P1 / SOS / emergency cues produce sound or haptics.',
  },
  test: {
    label: 'Test Mode',
    detail: 'Uses the distinct test tone identity for previews.',
  },
  night: {
    label: 'Night Operations',
    detail: 'Reduced UI sounds; emergency alerts unchanged.',
  },
  radio: {
    label: 'Radio Operations',
    detail: 'Adds radio squelch / TX flavour to dispatch and ACK cues.',
  },
  silent: {
    label: 'Silent',
    detail: 'No UI/ops audio. P1 still audible when p1AlwaysAudible is on.',
  },
};

export function loadOpsAudioPrefs(): OpsAudioPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_OPS_AUDIO_PREFS };
  try {
    const raw = localStorage.getItem(OPS_AUDIO_PREFS_KEY);
    if (!raw) return { ...DEFAULT_OPS_AUDIO_PREFS };
    return { ...DEFAULT_OPS_AUDIO_PREFS, ...(JSON.parse(raw) as Partial<OpsAudioPrefs>) };
  } catch {
    return { ...DEFAULT_OPS_AUDIO_PREFS };
  }
}

export function saveOpsAudioPrefs(patch: Partial<OpsAudioPrefs>): OpsAudioPrefs {
  const next = { ...loadOpsAudioPrefs(), ...patch };
  try {
    localStorage.setItem(OPS_AUDIO_PREFS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(OPS_AUDIO_CHANGED));
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * Profile gating. Emergency severity always allowed when p1AlwaysAudible.
 * Silent/quiet never permanently kills P1.
 */
export function cueAllowedByProfile(
  cue: AudioCueDef,
  prefs: OpsAudioPrefs,
  opts?: { force?: boolean },
): boolean {
  if (opts?.force) return true;
  const sev = cue.severity;
  const isEmergency = sev === 'emergency' || sev === 'critical';

  if (isEmergency && prefs.p1AlwaysAudible) return true;

  switch (prefs.profile) {
    case 'full':
    case 'radio':
      return true;
    case 'standard':
      return sev !== 'ui' || prefs.uiSounds;
    case 'night':
      if (sev === 'ui') return false;
      return true;
    case 'quiet':
      return sev === 'warning' || sev === 'critical' || sev === 'emergency' || sev === 'important';
    case 'emergency_only':
      return isEmergency;
    case 'test':
      return true;
    case 'silent':
      return false;
    default:
      return true;
  }
}

export function volumeForCue(cue: AudioCueDef, prefs: OpsAudioPrefs): number {
  const base = Math.max(0, Math.min(1, prefs.masterVolume));
  if (cue.severity === 'emergency') return base;
  if (prefs.profile === 'standard' && (cue.severity === 'normal' || cue.severity === 'ui')) {
    return base * 0.55;
  }
  if (prefs.profile === 'night' && cue.severity !== 'emergency') {
    return base * 0.4;
  }
  return base;
}
